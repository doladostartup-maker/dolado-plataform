// DoLado — Monitor do Custo de Saída (F4, telecomunicações).
//
// Código puro (sem I/O; `npm test`). Reutiliza a regra da Calculadora de
// Cancelamento pública: o cliente não volta a preencher dados que o Monitor
// já conhece. A estimativa é o encargo MÁXIMO de uma cessação antecipada por
// iniciativa do cliente quando não exista motivo para cessar sem encargos;
// não inclui equipamento subsidiado e não é parecer jurídico.

import {
  DURACAO_MAXIMA_MESES,
  calcularEncargoCancelamento,
  somarMeses,
  type DadosCalculadora,
  type ResultadoCalculadora,
} from "../calculadoraCancelamento/regras.ts";
import { formatarDataPt, formatarEurosCents } from "./contratos.ts";

export const VERSAO_REGRA_CESSACAO = "f4_cessacao_v1";

export type ContratoCustoSaida = {
  setor: string;
  data_inicio: string | null;
  data_fim_fidelizacao: string | null;
  mensalidade_cents: number | null;
  vantagem_cents: number | null;
  tipo_fidelizacao: string | null;
  nova_instalacao: string | null;
  equipamento_subsidiado: string | null;
};

export type DadoEmFalta =
  | "data_inicio"
  | "data_fim_fidelizacao"
  | "mensalidade_cents"
  | "vantagem_cents"
  | "tipo_fidelizacao"
  | "nova_instalacao"
  | "equipamento_subsidiado";

export type DadosParaCalculo =
  | { ok: true; dados: DadosCalculadora }
  | { ok: false; motivo: "setor"; faltam: [] }
  | { ok: false; motivo: "faltam_dados"; faltam: DadoEmFalta[] }
  | { ok: false; motivo: "duracao_nao_inteira" | "duracao_invalida"; faltam: [] };

function euros(cents: number) {
  return (cents / 100).toFixed(2);
}

function diaAnterior(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Duração em meses inteiros entre o início e o fim da fidelização. Aceita o
// fim no dia do aniversário ou na véspera (01/03/2025 → 28/02/2027 = 24 meses).
export function duracaoEmMeses(inicio: string, fim: string): number | null {
  for (let m = 1; m <= 60; m += 1) {
    const d = somarMeses(inicio, m);
    if (d === fim || diaAnterior(d) === fim) return m;
    if (diaAnterior(d) > fim) return null;
  }
  return null;
}

export function dadosCalculoDoContrato(c: ContratoCustoSaida): DadosParaCalculo {
  if (c.setor !== "telecomunicacoes") return { ok: false, motivo: "setor", faltam: [] };

  const faltam: DadoEmFalta[] = [];
  if (!c.data_inicio) faltam.push("data_inicio");
  if (!c.data_fim_fidelizacao) faltam.push("data_fim_fidelizacao");
  if (c.mensalidade_cents == null) faltam.push("mensalidade_cents");
  if (c.vantagem_cents == null) faltam.push("vantagem_cents");
  if (!c.tipo_fidelizacao) faltam.push("tipo_fidelizacao");
  if (c.tipo_fidelizacao === "refidelizacao" && !c.nova_instalacao) faltam.push("nova_instalacao");
  if (!c.equipamento_subsidiado) faltam.push("equipamento_subsidiado");
  if (faltam.length) return { ok: false, motivo: "faltam_dados", faltam };

  const meses = duracaoEmMeses(c.data_inicio!, c.data_fim_fidelizacao!);
  if (meses === null) return { ok: false, motivo: "duracao_nao_inteira", faltam: [] };
  if (meses > DURACAO_MAXIMA_MESES) return { ok: false, motivo: "duracao_invalida", faltam: [] };

  return {
    ok: true,
    dados: {
      dataInicio: c.data_inicio!,
      duracaoMeses: String(meses),
      tipo: c.tipo_fidelizacao as "primeira" | "refidelizacao",
      novaInstalacao: c.tipo_fidelizacao === "refidelizacao" ? (c.nova_instalacao as "sim" | "nao") : "",
      mensalidade: euros(c.mensalidade_cents!),
      vantagem: euros(c.vantagem_cents!),
      equipamento: c.equipamento_subsidiado as "sim" | "nao",
    },
  };
}

export type Estimativa = { data: string; cents: number };

// Estimativas para hoje e para daqui a 3 meses (enquanto houver fidelização).
export function evolucaoCustoSaida(dados: DadosCalculadora, hoje: string): { hoje: ResultadoCalculadora; futuro: Estimativa[] } {
  const atual = calcularEncargoCancelamento(dados, hoje);
  const futuro: Estimativa[] = [];
  const daqui3 = somarMeses(hoje, 3);
  const r = calcularEncargoCancelamento(dados, daqui3);
  if (r.ok && r.estado === "calculado") futuro.push({ data: daqui3, cents: r.resultadoCentimos });
  return { hoje: atual, futuro };
}

// ---------------------------------------------------------------------------
// Valor indicado na fatura vs. estimativa da DoLado
// ---------------------------------------------------------------------------

// Diferença tolerada: 2 € ou 5% da estimativa, o que for maior
// (arredondamentos e contagem de dias do operador).
const TOLERANCIA_CENTS = 200;
const TOLERANCIA_PCT = 5;

export type ComparacaoCessacao =
  | { resultado: "sem_dados" | "equipamento" }
  | { resultado: "proximo"; operadorCents: number; estimativaCents: number }
  | { resultado: "divergente"; operadorCents: number; estimativaCents: number; diferencaCents: number };

export function compararCessacao(
  c: ContratoCustoSaida,
  operadorCents: number | null,
  dataOperador: string | null,
): ComparacaoCessacao {
  if (operadorCents == null || !dataOperador) return { resultado: "sem_dados" };
  const d = dadosCalculoDoContrato(c);
  if (!d.ok) return { resultado: "sem_dados" };
  // O valor do operador pode incluir equipamento, que a estimativa não inclui.
  if (d.dados.equipamento === "sim") return { resultado: "equipamento" };
  const r = calcularEncargoCancelamento(d.dados, dataOperador);
  if (!r.ok) return { resultado: "sem_dados" };
  const estimativa = r.resultadoCentimos;
  const diferenca = Math.abs(operadorCents - estimativa);
  const tolerancia = Math.max(TOLERANCIA_CENTS, Math.round((estimativa * TOLERANCIA_PCT) / 100));
  if (diferenca <= tolerancia) return { resultado: "proximo", operadorCents, estimativaCents: estimativa };
  return { resultado: "divergente", operadorCents, estimativaCents: estimativa, diferencaCents: diferenca };
}

export function textoCessacaoDivergente(operadorCents: number, dataOperador: string, estimativaCents: number): string {
  return (
    `O valor indicado na fatura para terminar o contrato antecipadamente (${formatarEurosCents(operadorCents)}, a ${formatarDataPt(dataOperador)}) ` +
    `é diferente da estimativa da DoLado com os dados do contrato que temos registados (${formatarEurosCents(estimativaCents)}). ` +
    "A diferença merece ser verificada; outras condições do contrato podem explicar o valor."
  );
}
