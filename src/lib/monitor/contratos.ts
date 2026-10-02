// DoLado — regras puras dos contratos monitorizados (sem I/O; `npm test`).

import type { CampoContrato } from "./extracaoFatura.ts";

export const SETORES_CONTRATO = ["telecomunicacoes", "eletricidade", "gas", "agua", "outro", "nao_indicado"] as const;
export type SetorContratoMonitor = (typeof SETORES_CONTRATO)[number];

export const ROTULO_SETOR: Record<SetorContratoMonitor, string> = {
  telecomunicacoes: "Telecomunicações",
  eletricidade: "Eletricidade",
  gas: "Gás",
  agua: "Água",
  outro: "Outro",
  nao_indicado: "Setor por indicar",
};

// Setor para pré-preencher "Tratar o meu caso" (listas de src/lib/pedidoCaso.ts).
export function setorTratarCaso(setor: string): "Telecomunicações" | "Energia" | "Água" | null {
  if (setor === "telecomunicacoes") return "Telecomunicações";
  if (setor === "eletricidade" || setor === "gas") return "Energia";
  if (setor === "agua") return "Água";
  return null;
}

export const ROTULO_CAMPO: Record<CampoContrato, string> = {
  fornecedor: "Fornecedor",
  referencia_contrato: "Referência do contrato",
  servico: "Serviço",
  data_inicio: "Início do contrato",
  data_fim_fidelizacao: "Fim da fidelização",
  data_fim_promocao: "Fim da promoção",
  descricao_promocao: "Promoção",
  mensalidade_cents: "Mensalidade",
  vantagem_cents: "Valor da vantagem da fidelização",
  cessacao_operador_cents: "Valor de cessação indicado na fatura",
  cessacao_operador_data: "Data desse valor",
  cpe: "CPE",
  cui: "CUI",
  tipo_fidelizacao: "Tipo de fidelização",
  nova_instalacao: "Houve nova instalação",
  equipamento_subsidiado: "Equipamento subsidiado",
};

const ROTULO_OPCAO: Record<string, string> = {
  primeira: "Primeira fidelização",
  refidelizacao: "Refidelização",
  sim: "Sim",
  nao: "Não",
};

export const ROTULO_ORIGEM: Record<string, string> = {
  cliente: "Indicado por si",
  contrato: "Lido do contrato",
  fatura: "Lido da fatura",
  admin: "Corrigido pela DoLado",
};

// Mesmo fornecedor apesar de maiúsculas, acentos, espaços e pontuação
// ("Vodafone ", "vodafone", "VODAFONE Portugal" não — só a forma escrita).
export function chaveFornecedor(nome: string | null | undefined): string {
  return (nome ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function diasAte(dataIso: string, hojeIso: string): number {
  const d = Date.UTC(+dataIso.slice(0, 4), +dataIso.slice(5, 7) - 1, +dataIso.slice(8, 10));
  const h = Date.UTC(+hojeIso.slice(0, 4), +hojeIso.slice(5, 7) - 1, +hojeIso.slice(8, 10));
  return Math.round((d - h) / 86_400_000);
}

export type ProximaData = { tipo: "fidelizacao" | "promocao"; data: string; dias: number } | null;

// Próxima data relevante ainda por chegar (ou de hoje).
export function proximaData(
  c: { data_fim_fidelizacao: string | null; data_fim_promocao: string | null },
  hojeIso: string,
): ProximaData {
  const candidatas = [
    c.data_fim_fidelizacao ? { tipo: "fidelizacao" as const, data: c.data_fim_fidelizacao } : null,
    c.data_fim_promocao ? { tipo: "promocao" as const, data: c.data_fim_promocao } : null,
  ]
    .filter((x): x is { tipo: "fidelizacao" | "promocao"; data: string } => x !== null)
    .map((x) => ({ ...x, dias: diasAte(x.data, hojeIso) }))
    .filter((x) => x.dias >= 0)
    .sort((a, b) => a.dias - b.dias);
  return candidatas[0] ?? null;
}

export function textoProximaData(p: ProximaData): string {
  if (!p) return "Sem datas por acompanhar";
  const oque = p.tipo === "fidelizacao" ? "A fidelização termina" : "A promoção termina";
  if (p.dias === 0) return `${oque} hoje`;
  if (p.dias === 1) return `${oque} amanhã`;
  return `${oque} dentro de ${p.dias} dias`;
}

export function formatarEurosCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function formatarDataPt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

// Valor de um campo (jsonb) apresentado ao cliente.
export function formatarValorCampo(campo: CampoContrato, valor: unknown): string {
  if (valor == null) return "—";
  if (campo.endsWith("_cents") && typeof valor === "number") return formatarEurosCents(valor);
  if ((campo.startsWith("data_") || campo === "cessacao_operador_data") && typeof valor === "string") return formatarDataPt(valor);
  if (typeof valor === "string" && ROTULO_OPCAO[valor] && ["tipo_fidelizacao", "nova_instalacao", "equipamento_subsidiado"].includes(campo)) {
    return ROTULO_OPCAO[valor];
  }
  return String(valor);
}

// Conversão de um valor em euros escrito pelo cliente ("42,99", "42.99 €").
export function lerEurosParaCents(texto: string): number | null {
  const limpo = texto.replace(/[€\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return Math.round(Number(limpo) * 100);
}
