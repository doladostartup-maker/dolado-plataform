// DoLado Empresas — alertas e resumo mensal (regras sem I/O). Fase 8.
// Os alertas das empresas saem pela rota interna das empresas, nunca pela
// Edge Function dos particulares. Só português (D1). Valores com IVA (V7).

import {
  despesasPorMes,
  eurosComIva,
  mesDaFatura,
  nomeServico,
  porInstalacao,
  proximosPrazos,
  rotuloMes,
  TEXTO_PRAZO,
  type FaturaPainel,
  type InstalacaoPainel,
  type ServicoPainel,
} from "./painel.ts";

export const RESUMO_EMPRESA_MODELO = "resumo_empresa_v1";

/** Hora e dia em Lisboa. */
export function agoraLisboa(agora = new Date()): { hoje: string; mes: string; dia: number; hora: number } {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
      .formatToParts(agora)
      .map((p) => [p.type, p.value]),
  );
  const hoje = `${partes.year}-${partes.month}-${partes.day}`;
  return { hoje, mes: hoje.slice(0, 7), dia: Number(partes.day), hora: Number(partes.hour) };
}

/** Alertas de prazo e de factura em falta: só entre as 8h e as 21h (Lisboa). */
export function horaDeAlertas(hora: number): boolean {
  return hora >= 8 && hora < 21;
}

/** Resumo do mês anterior: dias 1 a 5, a partir das 9h (Lisboa). Devolve o mês de referência (AAAA-MM-01) ou null. */
export function mesDoResumo(agora: { hoje: string; dia: number; hora: number }): string | null {
  if (agora.dia > 5 || agora.hora < 9) return null;
  const [a, m] = agora.hoje.split("-").map(Number);
  const anterior = m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
  return `${anterior}-01`;
}

export type RegraPrazo = "fidelizacao_60d" | "fidelizacao_30d" | "fidelizacao_fim" | "promocao_60d" | "promocao_30d" | "promocao_fim";

/** Assunto do alerta de prazo. */
export function assuntoPrazo(regra: RegraPrazo, dias: number): string {
  const oque = regra.startsWith("fidelizacao") ? "A fidelização de um serviço" : "A promoção de um serviço";
  return dias > 1 ? `${oque} termina dentro de ${dias} dias` : dias === 1 ? `${oque} termina amanhã` : dias === 0 ? `${oque} termina hoje` : `${oque} terminou`;
}

/** Frase do alerta de prazo (texto simples; o HTML faz o escape). */
export function fraseQuando(dias: number, data: string): string {
  return dias > 1 ? `termina dentro de ${dias} dias, a ${data}` : dias === 1 ? `termina amanhã, a ${data}` : dias === 0 ? `termina hoje, ${data}` : `terminou a ${data}`;
}

/** Com pré-aviso, o primeiro aviso da fidelização lembra o prazo para denunciar. */
export function notaPreaviso(regra: RegraPrazo, preavisoDias: number | null, dias: number): string | null {
  if (!regra.startsWith("fidelizacao") || !preavisoDias || dias <= 0) return null;
  const restam = dias - preavisoDias;
  return restam > 0
    ? `Indicou um pré-aviso de ${preavisoDias} dias: para não renovar, a comunicação ao fornecedor deve ser feita nos próximos ${restam} dias.`
    : `Indicou um pré-aviso de ${preavisoDias} dias: o prazo para comunicar ao fornecedor pode já ter passado. Confirme as condições do contrato.`;
}

export const ASSUNTO_FACTURA_EM_FALTA = "Falta uma factura de um serviço acompanhado";
export const ASSUNTO_ACHADO_EMPRESA = "Detectámos uma alteração numa factura que merece ser verificada";

export function assuntoResumo(mes: string): string {
  return `O resumo da Protecção Empresas de ${rotuloMesLongo(mes)}`;
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export function rotuloMesLongo(mes: string): string {
  return `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;
}

// ---------------------------------------------------------------------------
// Resumo mensal (resumo_empresa_v1)
// ---------------------------------------------------------------------------

export type ConteudoResumoEmpresa = {
  mes: string; // AAAA-MM
  organizacao: string;
  facturas: number;
  despesa: { totalCents: number; completo: boolean } | null;
  /** Mês anterior, só quando os dois meses estão completos. */
  anterior: { mes: string; totalCents: number } | null;
  porInstalacao: { nome: string; totalCents: number }[];
  situacoes: number;
  emVerificacao: number;
  prazos: { tipo: "fidelizacao" | "promocao"; data: string; servico: string }[];
};

export type DadosResumo = {
  organizacao: string;
  instalacoes: InstalacaoPainel[];
  servicos: ServicoPainel[];
  faturas: FaturaPainel[];
  achados: { comunicado_em: string }[];
};

/**
 * Conteúdo do resumo do mês `mes` (AAAA-MM), calculado com as mesmas
 * funções do painel. Só contagens e valores; nunca o texto livre das
 * situações comunicadas. `hoje` (AAAA-MM-DD) para os próximos prazos.
 */
export function montarResumoEmpresa(d: DadosResumo, mes: string, hoje: string): ConteudoResumoEmpresa {
  const mesSeguinte = (() => {
    const [a, m] = mes.split("-").map(Number);
    return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
  })();
  // Como se o mês seguinte fosse o actual: o mês de referência já pode estar
  // completo. Todas as facturas entram, para uma em falta nesse mês (com
  // facturas antes e depois) o deixar incompleto.
  const meses = despesasPorMes(d.faturas, mesSeguinte, 1000);
  const atual = meses.find((m) => m.mes === mes) ?? null;
  const idx = meses.findIndex((m) => m.mes === mes);
  const ant = idx > 0 ? meses[idx - 1] : null;
  const nomeInst = new Map(d.instalacoes.map((i) => [i.id, i.nome]));
  const servico = new Map(d.servicos.map((s) => [s.id, s]));
  return {
    mes,
    organizacao: d.organizacao,
    facturas: d.faturas.filter((f) => mesDaFatura(f) === mes).length,
    despesa: atual ? { totalCents: atual.totalCents, completo: atual.completo } : null,
    anterior: atual?.completo && ant?.completo && ant.mes === mesAnterior(mes) ? { mes: ant.mes, totalCents: ant.totalCents } : null,
    porInstalacao: porInstalacao(d.faturas, d.servicos, d.instalacoes, [mes]).map((p) => ({ nome: p.nome, totalCents: p.totalCents })),
    situacoes: d.achados.filter((a) => String(a.comunicado_em).slice(0, 7) === mes).length,
    emVerificacao: d.faturas.filter((f) => f.em_verificacao).length,
    prazos: proximosPrazos(d.servicos, hoje, 90)
      .slice(0, 5)
      .map((p) => {
        const s = servico.get(p.servicoId);
        const inst = s?.instalacao_id ? nomeInst.get(s.instalacao_id) : null;
        return { tipo: p.tipo, data: p.data, servico: s ? `${nomeServico(s)}${inst ? ` · ${inst}` : ""}` : "Serviço" };
      }),
  };
}

function mesAnterior(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

export type SeccaoResumo = { titulo: string; linhas: string[] };

/** Texto do resumo (o mesmo no e-mail e no portal). `data` formata AAAA-MM-DD por extenso. */
export function seccoesResumo(c: ConteudoResumoEmpresa, data: (iso: string) => string): SeccaoResumo[] {
  const despesa: string[] = [];
  if (c.despesa) {
    despesa.push(
      `Total das facturas de ${rotuloMesLongo(c.mes)}: ${eurosComIva(c.despesa.totalCents)}${c.despesa.completo ? "." : " (mês ainda sem as facturas de todos os serviços)."}`,
    );
    if (c.anterior) {
      const dif = c.despesa.totalCents - c.anterior.totalCents;
      despesa.push(
        dif === 0
          ? `Igual a ${rotuloMes(c.anterior.mes)}.`
          : `${dif > 0 ? "Mais" : "Menos"} ${eurosComIva(Math.abs(dif))} do que em ${rotuloMes(c.anterior.mes)}.`,
      );
    }
    for (const p of c.porInstalacao) despesa.push(`${p.nome}: ${eurosComIva(p.totalCents)}`);
  } else {
    despesa.push(`Ainda não recebemos facturas de ${rotuloMesLongo(c.mes)}.`);
  }

  const verificacao: string[] = [
    c.facturas === 1 ? "Analisámos 1 factura deste mês." : `Analisámos ${c.facturas} facturas deste mês.`,
  ];
  if (c.situacoes > 0) {
    verificacao.push(c.situacoes === 1 ? "Comunicámos 1 situação que merece ser verificada. Veja-a nos alertas." : `Comunicámos ${c.situacoes} situações que merecem ser verificadas. Veja-as nos alertas.`);
  }
  if (c.emVerificacao > 0) {
    verificacao.push(c.emVerificacao === 1 ? "1 factura está em verificação pela DoLado." : `${c.emVerificacao} facturas estão em verificação pela DoLado.`);
  } else if (c.situacoes === 0 && c.facturas > 0) {
    verificacao.push("Nas facturas analisadas, não encontrámos alterações que mereçam ser verificadas.");
  }

  const prazos =
    c.prazos.length === 0
      ? ["Nenhum fim de fidelização ou de promoção nos próximos 90 dias, com base nos documentos carregados."]
      : c.prazos.map((p) => `${TEXTO_PRAZO[p.tipo]}: ${data(p.data)} — ${p.servico}`);

  return [
    { titulo: "Despesas (com IVA)", linhas: despesa },
    { titulo: "O que verificámos", linhas: verificacao },
    { titulo: "Próximos prazos", linhas: prazos },
  ];
}

/** Leitura defensiva do jsonb gravado (resumos antigos ou incompletos não partem a página). */
export function lerConteudoResumo(v: unknown): ConteudoResumoEmpresa | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Partial<ConteudoResumoEmpresa>;
  if (typeof c.mes !== "string" || typeof c.facturas !== "number") return null;
  return {
    mes: c.mes,
    organizacao: typeof c.organizacao === "string" ? c.organizacao : "",
    facturas: c.facturas,
    despesa: c.despesa && typeof c.despesa.totalCents === "number" ? { totalCents: c.despesa.totalCents, completo: !!c.despesa.completo } : null,
    anterior: c.anterior && typeof c.anterior.totalCents === "number" && typeof c.anterior.mes === "string" ? c.anterior : null,
    porInstalacao: Array.isArray(c.porInstalacao) ? c.porInstalacao.filter((p) => p && typeof p.nome === "string" && typeof p.totalCents === "number") : [],
    situacoes: typeof c.situacoes === "number" ? c.situacoes : 0,
    emVerificacao: typeof c.emVerificacao === "number" ? c.emVerificacao : 0,
    prazos: Array.isArray(c.prazos) ? c.prazos.filter((p) => p && (p.tipo === "fidelizacao" || p.tipo === "promocao") && typeof p.data === "string") : [],
  };
}
