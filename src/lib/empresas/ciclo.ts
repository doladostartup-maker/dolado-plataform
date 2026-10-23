// DoLado Empresas — ciclo de pagamento manual (regras sem I/O). Fase 5.
// A base de dados decide (20261103090000_empresas_ciclo.sql: empresa_activar,
// empresa_ciclo_diario, empresa_confirmar_pagamento…); aqui ficam o espelho
// das datas e dos prazos (para mostrar e testar), os textos dos avisos e as
// contas de medição. Só em português (D1).

import { formatarData } from "../../i18n/formatar.ts";

/** Prazos do ciclo (espelho de public.empresa_prazos()). */
export const PRAZOS_CICLO = {
  avisoVencimentoDias: 7,
  suspensaoDias: 7,
  cancelamentoDias: 30,
  consultaDias: 30,
  eliminacaoDias: 90,
} as const;

/** "AAAA-MM-DD" → [ano, mês 1-12, dia]. */
function partes(data: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!m) throw new Error(`Data inválida: ${data}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function iso(ano: number, mes: number, dia: number) {
  return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * Fim do período n (espelho de public.empresa_fim_periodo): âncora + n meses,
 * com o dia ajustado ao último do mês quando não existe (31/01 → 28/02 → 31/03).
 * Sempre a partir da âncora: nunca acumula o ajuste.
 */
export function fimDoPeriodo(ancora: string, numero: number): string {
  const [ano, mes, dia] = partes(ancora);
  const total = ano * 12 + (mes - 1) + numero;
  const anoFim = Math.floor(total / 12);
  const mesFim = (total % 12) + 1;
  const ultimo = new Date(Date.UTC(anoFim, mesFim, 0)).getUTCDate();
  return iso(anoFim, mesFim, Math.min(dia, ultimo));
}

export function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = partes(data);
  const d = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Dias de `de` até `ate` (datas AAAA-MM-DD). */
export function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = partes(de);
  const [a2, m2, d2] = partes(ate);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

/** Datas-chave de um período por pagar (o que o cliente e o admin vêem). */
export function prazosDoVencimento(venceEm: string) {
  return {
    suspensaEm: somarDias(venceEm, PRAZOS_CICLO.suspensaoDias),
    canceladaEm: somarDias(venceEm, PRAZOS_CICLO.suspensaoDias + PRAZOS_CICLO.cancelamentoDias),
  };
}

/** Mensalidade sem IVA (excepção B2B): "49,00 € + IVA". */
export function precoSemIva(cents: number): string {
  const valor = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);
  return `${valor} + IVA`;
}

/** Data "23 de Outubro de 2026" (meses com maiúscula). */
export function dataPorExtenso(data: string): string {
  return formatarData("pt-PT", data);
}

export type PeriodoResumo = {
  numero: number | null;
  inicio: string;
  fim: string;
  valor_cents: number;
  estado_pagamento: "por_pagar" | "pago" | "anulado";
  pago_em: string | null;
  referencia_factura: string | null;
};

/** Medição por organização: períodos pagos, receita sem IVA e dias de atraso. */
export function medicaoPagamentos(periodos: PeriodoResumo[]) {
  const pagos = periodos.filter((p) => p.estado_pagamento === "pago");
  const diasAtraso = pagos.reduce((s, p) => {
    const pago = p.pago_em ? p.pago_em.slice(0, 10) : p.inicio;
    return s + Math.max(0, diasEntre(p.inicio, pago));
  }, 0);
  return { periodosPagos: pagos.length, receitaCents: pagos.reduce((s, p) => s + p.valor_cents, 0), diasAtraso };
}

export type TipoAviso =
  | "ativada"
  | "a_vencer"
  | "pagamento_confirmado"
  | "atraso"
  | "suspensa"
  | "reativada"
  | "cancelada_falta_pagamento"
  | "cancelamento_agendado"
  | "cancelamento_retirado"
  | "cancelada_pedido"
  | "cancelada_admin"
  | "encerrada";

/** Avisos com mais de 3 dias por enviar já não saem (ex.: rota sem segredo durante dias). */
export const VALIDADE_AVISO_MS = 3 * 24 * 60 * 60 * 1000;
export const MAX_TENTATIVAS_AVISO = 3;

export function avisoAindaValido(criadoEm: string, agora = Date.now()): boolean {
  return agora - Date.parse(criadoEm) <= VALIDADE_AVISO_MS;
}

/** Acções do admin na ficha da organização (espelho de empresa_admin_transicao). */
export const ACOES_ADMIN = {
  suspender: { rotulo: "Suspender", estados: ["ativa", "pagamento_em_atraso"] },
  reativar: { rotulo: "Reactivar", estados: ["suspensa", "pagamento_em_atraso"] },
  cancelar: { rotulo: "Cancelar", estados: ["ativa", "pagamento_em_atraso", "suspensa"] },
} as const;

export type AcaoAdmin = keyof typeof ACOES_ADMIN;

export function ehAcaoAdmin(valor: unknown): valor is AcaoAdmin {
  return typeof valor === "string" && Object.hasOwn(ACOES_ADMIN, valor);
}

/** Resultado de empresa_admin_transicao / empresa_activar → mensagem no backoffice. */
export function mensagemTransicao(resultado: string): { ok: boolean; texto: string } {
  const mapa: Record<string, { ok: boolean; texto: string }> = {
    ativa: { ok: true, texto: "Organização activa. O cliente foi avisado por e-mail." },
    suspensa: { ok: true, texto: "Organização suspensa (só consulta). O cliente foi avisado por e-mail." },
    cancelada: { ok: true, texto: "Organização cancelada, com 30 dias de consulta. O cliente foi avisado por e-mail." },
    lista_espera: { ok: true, texto: "Sem vaga: a organização ficou em lista de espera. Nada foi activado." },
    sem_permissao: { ok: false, texto: "Sem permissão." },
    motivo_em_falta: { ok: false, texto: "Indique o motivo." },
    referencia_em_falta: { ok: false, texto: "Indique a referência da factura emitida." },
    pagamento_em_falta: { ok: false, texto: "Há uma mensalidade vencida por pagar: confirme primeiro o pagamento." },
  };
  return mapa[resultado] ?? { ok: false, texto: "Esta acção não é possível no estado actual da organização." };
}
