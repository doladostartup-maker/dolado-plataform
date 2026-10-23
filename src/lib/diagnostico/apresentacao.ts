// Diagnóstico gratuito — organização do resultado (revisão de 23/10/2026:
// demonstrar valor antes da Protecção). Só apresentação, sem I/O e sem IA:
// tudo o que aparece aqui vem do diagnóstico já gravado (factos lidos com
// confiança alta/média e cálculos feitos em código em regras.ts), mais
// contas simples feitas aqui (valor por ano de uma mensalidade).
//
// Três níveis, pela ordem em que a pessoa os lê:
//   1. O que encontrámos agora — descobertas concretas (datas, euros), por
//      prioridade, cada uma com "o que isto significa": uma explicação geral
//      e condicional do tipo de facto (nunca uma conclusão sobre o caso da
//      pessoa, nem que algo está errado — regras 2 e 4 do "Uso de IA").
//   2. Vale a pena confirmar — o que não foi possível ler com segurança.
//   3. A Protecção como continuação — o que a DoLado faria a seguir com
//      estas mesmas descobertas (`continuidade`).
// O resto (tudo o que foi lido, linhas, contas) fica num detalhe recolhido.

import type { Calculo, Diagnostico, Facto } from "./regras.ts";

/** Datas de fim (fidelização, promoção) a este número de dias ou menos contam como próximas. */
export const DIAS_DATA_PROXIMA = 90;
/** Descobertas mostradas em destaque (as restantes ficam no detalhe). */
export const MAX_DESCOBERTAS = 4;

type TipoData = "fidelizacao" | "promocao";

export type Descoberta =
  | { chave: "data_proxima"; tipo: TipoData; data: string; dias: number }
  | { chave: "data_passada"; tipo: TipoData; data: string }
  | { chave: "acima_mensalidade"; diferencaCents: number; mensalidadeCents: number }
  | { chave: "cobrancas_pontuais"; quantidade: number; totalCents: number }
  | { chave: "descontos"; valorCents: number }
  | { chave: "cessacao"; valorCents: number }
  | { chave: "soma_difere"; somaCents: number; totalCents: number }
  | { chave: "data_futura"; tipo: TipoData; data: string; dias: number }
  | { chave: "custo_anual"; mensalCents: number; anualCents: number }
  | { chave: "recorrentes_anual"; quantidade: number; mensalCents: number; anualCents: number };

/** Descobertas que, por regra fixa, merecem ser vistas (datas próximas, valores fora da mensalidade…). */
const RELEVANTES = new Set<Descoberta["chave"]>([
  "data_proxima",
  "data_passada",
  "acima_mensalidade",
  "cobrancas_pontuais",
  "descontos",
  "cessacao",
  "soma_difere",
]);

export function ehRelevante(d: Descoberta): boolean {
  return RELEVANTES.has(d.chave);
}

/** O que a Protecção faria a seguir com estas descobertas (só o que o Monitor faz). */
export type Continuidade =
  | { chave: "aviso_data"; tipo: TipoData; data: string; dias: number }
  | { chave: "comparar_proxima" }
  | { chave: "juntar_contrato" };

export type ResultadoApresentado = {
  /** "encontrou": pelo menos uma descoberta relevante; senão, "sem_destaques". */
  estado: "encontrou" | "sem_destaques";
  descobertas: Descoberta[];
  porConfirmar: string[];
  continuidade: Continuidade[];
  /** Contas que ficam só no detalhe. */
  calculosDetalhe: Calculo[];
  /** Factura de um período mensal: as cobranças que se repetem podem mostrar o valor por ano. */
  periodoMensal: boolean;
};

function tipoData(c: Calculo): TipoData {
  return c.chave.includes("promocao") ? "promocao" : "fidelizacao";
}

function factoEuros(factos: Facto[], ...chaves: string[]): number | null {
  for (const chave of chaves) {
    const f = factos.find((x) => x.chave === chave && x.tipo === "euros" && typeof x.valor === "number");
    if (f) return f.valor as number;
  }
  return null;
}

function factoData(factos: Facto[], chave: string): string | null {
  const f = factos.find((x) => x.chave === chave && x.tipo === "data" && typeof x.valor === "string");
  return f ? (f.valor as string) : null;
}

/** Período da factura entre 27 e 32 dias (inclusive): conta como mensal. */
export function ehPeriodoMensal(factos: Facto[]): boolean {
  const inicio = factoData(factos, "periodo_inicio");
  const fim = factoData(factos, "periodo_fim");
  if (!inicio || !fim) return false;
  const dias = Math.round((Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86_400_000) + 1;
  return dias >= 27 && dias <= 32;
}

const ORDEM: Descoberta["chave"][] = [
  "data_proxima",
  "acima_mensalidade",
  "cobrancas_pontuais",
  "descontos",
  "cessacao",
  "data_passada",
  "soma_difere",
  "custo_anual",
  "recorrentes_anual",
  "data_futura",
];

export function apresentarDiagnostico(d: Diagnostico): ResultadoApresentado {
  const descobertas: Descoberta[] = [];
  const calculosDetalhe: Calculo[] = [];
  const periodoMensal = d.tipo === "fatura" && ehPeriodoMensal(d.factos);

  for (const c of d.calculos) {
    switch (c.chave) {
      case "soma_linhas":
        if (c.coincide) calculosDetalhe.push(c);
        else descobertas.push({ chave: "soma_difere", somaCents: c.somaCents, totalCents: c.totalCents });
        break;
      case "diferenca_mensalidade":
        // Só uma factura com mais do que a mensalidade é descoberta; com menos
        // (descontos, créditos), a conta fica no detalhe.
        if (c.diferencaCents > 0) descobertas.push({ chave: "acima_mensalidade", diferencaCents: c.diferencaCents, mensalidadeCents: c.mensalidadeCents });
        else calculosDetalhe.push(c);
        break;
      case "dias_fim_fidelizacao":
      case "dias_fim_promocao":
        descobertas.push({ chave: c.dias <= DIAS_DATA_PROXIMA ? "data_proxima" : "data_futura", tipo: tipoData(c), data: c.data, dias: c.dias });
        break;
      case "fidelizacao_terminada":
      case "promocao_terminada":
        descobertas.push({ chave: "data_passada", tipo: tipoData(c), data: c.data });
        break;
      default:
        calculosDetalhe.push(c);
    }
  }

  const pontuais = d.linhas.filter((l) => l.recorrente === false && l.valorCents > 0);
  if (pontuais.length) {
    descobertas.push({ chave: "cobrancas_pontuais", quantidade: pontuais.length, totalCents: pontuais.reduce((s, l) => s + l.valorCents, 0) });
  }

  const descontos = factoEuros(d.factos, "descontos", "desconto_promocao_cents");
  if (descontos && descontos > 0) descobertas.push({ chave: "descontos", valorCents: descontos });

  const cessacao = factoEuros(d.factos, "cessacao");
  if (cessacao && cessacao > 0) descobertas.push({ chave: "cessacao", valorCents: cessacao });

  // Valor por ano: a mensalidade é, por definição, um valor mensal. Sem ela,
  // só numa factura de um período mensal se somam as cobranças que se repetem.
  const mensalidade = factoEuros(d.factos, "mensalidade", "mensalidade_cents");
  if (mensalidade && mensalidade > 0) {
    descobertas.push({ chave: "custo_anual", mensalCents: mensalidade, anualCents: mensalidade * 12 });
  } else if (periodoMensal) {
    const recorrentes = d.linhas.filter((l) => l.recorrente === true && l.valorCents > 0);
    const mensal = recorrentes.reduce((s, l) => s + l.valorCents, 0);
    if (mensal > 0) descobertas.push({ chave: "recorrentes_anual", quantidade: recorrentes.length, mensalCents: mensal, anualCents: mensal * 12 });
  }

  descobertas.sort((a, b) => ORDEM.indexOf(a.chave) - ORDEM.indexOf(b.chave));

  const continuidade: Continuidade[] = [];
  for (const x of descobertas) {
    if ((x.chave === "data_proxima" || x.chave === "data_futura") && x.dias > 0) {
      continuidade.push({ chave: "aviso_data", tipo: x.tipo, data: x.data, dias: x.dias });
    }
  }
  if (descobertas.some((x) => x.chave === "acima_mensalidade" || x.chave === "cobrancas_pontuais" || x.chave === "descontos")) {
    continuidade.push({ chave: "comparar_proxima" });
  }
  // Uma factura mostra o que foi cobrado; as condições acordadas constam do
  // contrato, que a Protecção também acompanha.
  if (d.tipo === "fatura") continuidade.push({ chave: "juntar_contrato" });

  return {
    estado: descobertas.some(ehRelevante) ? "encontrou" : "sem_destaques",
    descobertas: descobertas.slice(0, MAX_DESCOBERTAS),
    porConfirmar: d.porConfirmar,
    continuidade,
    calculosDetalhe,
    periodoMensal,
  };
}
