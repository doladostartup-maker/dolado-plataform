import type Stripe from "stripe";
import { reembolsoIntegral, valoresDaFatura } from "./regras.ts";

// Programa de Parceiros no webhook Stripe — chamado por src/lib/stripe/webhook.ts
// depois de o acesso e o pagamento estarem gravados. Sem I/O próprio: tudo
// entra por `DependenciasParceiros` (src/lib/parceiros/servidor.ts), para os
// testes correrem com `node --test`.
//
// Regras (decididas na base de dados, atómicas e idempotentes):
//   - cada fatura paga (> 0 €) da primeira subscrição de uma conta atribuída
//     a um parceiro conta uma mensalidade; à 3.ª, a comissão fica elegível
//     (parceiro_registar_fatura). Reenvios do Stripe nunca contam duas vezes.
//   - reembolso integral de uma mensalidade → recontagem; disputa → em
//     validação; comissão já paga → nada automático, aviso ao admin.
//   - subscrição terminada antes de elegível → comissão cancelada.
// Contas sem atribuição a parceiro: nada é gravado (nem a fatura).

export type DadosFaturaParceiro = {
  userId: string;
  invoiceId: string;
  subscriptionId: string;
  produto: "protecao" | "caso_protecao";
  valorPagoCents: number;
  ivaCents: number;
  descontoCents: number;
  paymentIntentId: string | null;
  customerId: string | null;
  pagoEm: string;
};

export type ResultadoParceiro = { resultado: string; comissao_id?: string | null; parceiro_id?: string | null };

export interface DependenciasParceiros {
  /** A conta foi atribuída a um parceiro? (evita chamadas ao Stripe para todas as outras). */
  temAtribuicao(userId: string): Promise<boolean>;
  paymentIntentDaFatura(invoiceId: string): Promise<string | null>;
  registarFatura(dados: DadosFaturaParceiro): Promise<ResultadoParceiro>;
  reverterFatura(paymentIntentId: string, motivo: "reembolso" | "disputa"): Promise<ResultadoParceiro>;
  valorPagoDoPagamento(paymentIntentId: string): Promise<number | null>;
  subscricaoTerminada(subscriptionId: string): Promise<string>;
  notificarAdmin(assunto: string, texto: string): Promise<void>;
  registar(linha: { evento: string; resultado: string; erro_codigo?: string }): void;
}

function idDe(valor: string | { id?: string } | null | undefined) {
  if (!valor) return null;
  return typeof valor === "string" ? valor : (valor.id ?? null);
}

/** Data do pagamento da fatura; sem data no evento, agora (nunca uma data inválida que faça falhar o webhook). */
function pagoEm(invoice: Stripe.Invoice) {
  const ts = invoice.status_transitions?.paid_at ?? invoice.created;
  return typeof ts === "number" && Number.isFinite(ts) ? new Date(ts * 1000).toISOString() : new Date().toISOString();
}

/** invoice.paid, depois de o acesso estar aplicado às contas. */
export async function parceiroAoPagarFatura(
  invoice: Stripe.Invoice,
  subscriptionId: string,
  contas: string[],
  plano: string,
  deps: DependenciasParceiros,
): Promise<string> {
  if (!invoice.id || (plano !== "protecao" && plano !== "caso_protecao")) return "ignorado";
  const valores = valoresDaFatura(invoice as unknown as Parameters<typeof valoresDaFatura>[0]);
  if (valores.valorPagoCents <= 0) return "sem_pagamento";

  let resultado = "sem_atribuicao";
  for (const userId of contas) {
    if (!(await deps.temAtribuicao(userId))) continue;
    const r = await deps.registarFatura({
      userId,
      invoiceId: invoice.id,
      subscriptionId,
      produto: plano,
      ...valores,
      paymentIntentId: await deps.paymentIntentDaFatura(invoice.id),
      customerId: idDe(invoice.customer),
      pagoEm: pagoEm(invoice),
    });
    deps.registar({ evento: "parceiro_fatura", resultado: r.resultado });
    resultado = r.resultado;
  }
  return resultado;
}

async function reverter(paymentIntentId: string, motivo: "reembolso" | "disputa", deps: DependenciasParceiros) {
  const r = await deps.reverterFatura(paymentIntentId, motivo);
  deps.registar({ evento: `parceiro_${motivo}`, resultado: r.resultado });
  if (r.resultado === "ja_paga") {
    await deps.notificarAdmin(
      "Comissão de parceiro já paga — DoLado",
      `Uma mensalidade que contou para uma comissão de parceiro já paga teve ${motivo === "reembolso" ? "um reembolso integral" : "uma disputa"} (comissão ${r.comissao_id ?? "?"}, parceiro ${r.parceiro_id ?? "?"}). Nada foi alterado automaticamente — decidir no backoffice.`,
    );
  }
  return r.resultado;
}

/** Reembolso (fora de uma conversão). Só o integral reverte; o parcial avisa o admin se contava. */
export async function parceiroAoReembolso(refund: Stripe.Refund, deps: DependenciasParceiros): Promise<string> {
  const paymentIntentId = idDe(refund.payment_intent);
  if (refund.status !== "succeeded" || !paymentIntentId) return "ignorado";
  const pago = await deps.valorPagoDoPagamento(paymentIntentId);
  if (pago === null) return "sem_fatura";
  if (!reembolsoIntegral(refund, pago)) {
    await deps.notificarAdmin(
      "Reembolso parcial de uma mensalidade de cliente de parceiro — DoLado",
      `O pagamento ${paymentIntentId} (mensalidade que conta para uma comissão de parceiro) foi reembolsado parcialmente (${refund.id}). A contagem não foi alterada — decidir no backoffice.`,
    );
    return "reembolso_parcial";
  }
  return reverter(paymentIntentId, "reembolso", deps);
}

export async function parceiroAoDisputar(paymentIntentId: string, deps: DependenciasParceiros): Promise<string> {
  return reverter(paymentIntentId, "disputa", deps);
}

export async function parceiroAoTerminarSubscricao(subscriptionId: string, deps: DependenciasParceiros): Promise<string> {
  const r = await deps.subscricaoTerminada(subscriptionId);
  deps.registar({ evento: "parceiro_subscricao_terminada", resultado: r });
  return r;
}
