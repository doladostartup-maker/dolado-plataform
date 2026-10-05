// Próxima cobrança da subscrição, na Gestão de Subscrição do portal.
//
// O preço-base do plano (PLANOS) não é o valor que o Stripe vai cobrar: um
// cupão (ex.: 100% vitalício do piloto Remax) baixa o valor efetivo. Aqui só
// se LÊ e APRESENTA — nada altera a cobrança no Stripe.
//
// Fonte do valor, por ordem:
//   1. a pré-visualização da próxima fatura calculada pelo Stripe
//      (invoices.createPreview → amount_due), que já aplica todos os
//      descontos em vigor nessa data;
//   2. sem pré-visualização, o preço-base com os descontos ativos aplicados
//      aqui (percentagem e/ou valor fixo).
// Sem dados do Stripe, não se mostra valor nenhum (nunca o preço-base como se
// fosse a cobrança).
//
// Sem imports de runtime: os testes correm com `node --test`. Quem chama o
// Stripe é src/lib/stripe/proximaCobranca.ts (Gestão de Subscrição e painel).

import type Stripe from "stripe";
import { formatarPreco } from "./planos.ts";

export type DuracaoDesconto = "forever" | "once" | "repeating";
const DURACOES: ReadonlySet<string> = new Set(["forever", "once", "repeating"]);

export type DescontoSubscricao = {
  nome: string | null;
  percentOff: number | null;
  amountOffCentimos: number | null;
  duracao: DuracaoDesconto;
  /** Fim do desconto (ISO). Só nos descontos "repeating"; null = sem fim. */
  fim: string | null;
};

export type DadosCobranca = {
  precoBaseCentimos: number;
  /** Data da próxima cobrança (ISO) — o fim do período pago atual. */
  dataCobranca: string;
  descontos: DescontoSubscricao[];
  /** amount_due da pré-visualização do Stripe; null se não foi possível obtê-la. */
  valorPrevistoStripe: number | null;
};

export type ResumoCobranca = {
  precoBaseCentimos: number;
  /** Descontos que se aplicam à próxima cobrança (os expirados ficam de fora). */
  descontosAplicaveis: DescontoSubscricao[];
  valorProximaCobrancaCentimos: number;
  /** Fim do primeiro desconto temporário em vigor, a partir do qual o valor muda (null = não muda). */
  mudaEm: string | null;
};

function aplicaNaData(desconto: DescontoSubscricao, dataCobranca: string) {
  if (!desconto.fim) return true;
  return new Date(desconto.fim).getTime() > new Date(dataCobranca).getTime();
}

/** Preço-base com os descontos aplicados (percentagens primeiro, depois valores fixos). Nunca negativo. */
export function valorComDescontos(precoBaseCentimos: number, descontos: DescontoSubscricao[]) {
  let valor = precoBaseCentimos;
  for (const d of descontos) {
    if (d.percentOff) valor -= Math.round((precoBaseCentimos * Math.min(d.percentOff, 100)) / 100);
  }
  for (const d of descontos) {
    if (d.amountOffCentimos) valor -= d.amountOffCentimos;
  }
  return Math.max(0, valor);
}

export function resumirCobranca(dados: DadosCobranca): ResumoCobranca {
  const descontosAplicaveis = dados.descontos.filter((d) => aplicaNaData(d, dados.dataCobranca));
  const valor =
    dados.valorPrevistoStripe !== null
      ? Math.max(0, dados.valorPrevistoStripe)
      : valorComDescontos(dados.precoBaseCentimos, descontosAplicaveis);

  // O valor volta a mudar quando acaba o primeiro desconto temporário que se
  // aplica agora.
  const mudaEm =
    descontosAplicaveis
      .map((d) => d.fim)
      .filter((f): f is string => !!f)
      .sort()[0] ?? null;

  return {
    precoBaseCentimos: dados.precoBaseCentimos,
    descontosAplicaveis,
    valorProximaCobrancaCentimos: valor,
    mudaEm: valor === dados.precoBaseCentimos ? null : mudaEm,
  };
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Lisbon",
  });
}

/** "100% vitalício", "50% até 5 de janeiro de 2027", "2,00 € na próxima cobrança". */
export function textoDesconto(d: DescontoSubscricao) {
  const quanto = d.percentOff ? `${String(d.percentOff).replace(".", ",")}%` : formatarPreco(d.amountOffCentimos ?? 0);
  if (d.duracao === "forever") return `${quanto} vitalício`;
  if (d.duracao === "once") return `${quanto} na próxima cobrança`;
  return d.fim ? `${quanto} até ${formatarData(d.fim)}` : quanto;
}

export function textoProximaCobranca(resumo: ResumoCobranca) {
  const valor = formatarPreco(resumo.valorProximaCobrancaCentimos);
  if (resumo.valorProximaCobrancaCentimos > 0) return valor;
  const vitalicio = resumo.descontosAplicaveis.some((d) => d.duracao === "forever" && d.percentOff === 100);
  return vitalicio
    ? `${valor} — sem cobrança prevista, desconto de 100% vitalício ativo`
    : `${valor} — sem cobrança prevista`;
}

/**
 * Linhas a mostrar a seguir ao preço do plano (Gestão de Subscrição e painel
 * do portal): desconto(s), próxima cobrança e, num desconto temporário, o
 * valor depois de ele terminar.
 */
export function linhasDaCobranca(resumo: ResumoCobranca): { label: string; valor: string }[] {
  const linhas: { label: string; valor: string }[] = [];
  if (resumo.descontosAplicaveis.length > 0) {
    linhas.push({
      label: resumo.descontosAplicaveis.length === 1 ? "Desconto" : "Descontos",
      valor: resumo.descontosAplicaveis.map(textoDesconto).join("; "),
    });
  }
  linhas.push({ label: "Próxima cobrança", valor: textoProximaCobranca(resumo) });
  if (resumo.mudaEm) {
    linhas.push({
      label: "Depois do desconto",
      valor: `${formatarPreco(resumo.precoBaseCentimos)}/mês a partir de ${formatarData(resumo.mudaEm)}`,
    });
  }
  return linhas;
}

// ---------------------------------------------------------------------------
// Conversão dos objetos do Stripe (só tipos; a chamada é feita pela página).

function epochParaIso(segundos: number | null | undefined) {
  return segundos ? new Date(segundos * 1000).toISOString() : null;
}

/** Descontos da subscrição com o cupão expandido (`discounts.source.coupon`). Ignora o que não se consegue ler. */
export function descontosDaSubscricao(
  discounts: Array<string | Stripe.Discount> | null | undefined,
  agora: Date = new Date(),
): DescontoSubscricao[] {
  const lista: DescontoSubscricao[] = [];
  for (const discount of discounts ?? []) {
    if (typeof discount === "string") continue;
    const coupon = discount.source?.coupon;
    if (!coupon || typeof coupon === "string") continue;
    const fim = epochParaIso(discount.end);
    // Desconto já terminado (o Stripe remove-o, mas pode ainda vir na resposta).
    if (fim && new Date(fim).getTime() <= agora.getTime()) continue;
    lista.push({
      nome: coupon.name,
      percentOff: coupon.percent_off,
      amountOffCentimos: coupon.amount_off,
      // Duração desconhecida (nova no Stripe): tratada como temporária — o
      // texto mostra só o valor e, se houver, a data de fim.
      duracao: DURACOES.has(coupon.duration) ? (coupon.duration as DuracaoDesconto) : "repeating",
      fim,
    });
  }
  return lista;
}
