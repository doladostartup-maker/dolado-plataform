import type Stripe from "stripe";

// Decide se uma Checkout Session (lida no servidor, junto do Stripe — nunca
// dados do browser) permite criar uma conta em /criar-conta. Sem efeitos,
// para ser testável com `node --test`.
//
// - A sessão tem de estar concluída (status "complete") e ser deste fluxo
//   (metadata.plano + e-mail), sem user_id nos metadados — essas sessões
//   pertencem a contas que já existem.
// - Pagamento pendente (ex.: SEPA, payment_status "unpaid") também deixa
//   criar a conta, mas sem acesso: o acesso chega depois, pelo webhook.
// - Só uma conta por compra: se a compra já estiver ligada a um utilizador,
//   a criação é recusada.

export type AvaliacaoSessao =
  | { ok: false; motivo: "sessao_invalida" | "compra_com_conta" | "ja_tem_conta" }
  | { ok: true; email: string; pagamentoConfirmado: boolean };

export function avaliarSessaoParaCriarConta(
  session: Pick<Stripe.Checkout.Session, "status" | "payment_status" | "metadata" | "customer_details">,
  utilizadorJaLigado: string | null,
): AvaliacaoSessao {
  const email = session.customer_details?.email;
  if (session.status !== "complete" || !session.metadata?.plano || !email) {
    return { ok: false, motivo: "sessao_invalida" };
  }
  if (session.metadata.user_id) return { ok: false, motivo: "compra_com_conta" };
  if (utilizadorJaLigado) return { ok: false, motivo: "ja_tem_conta" };

  const pagamentoConfirmado =
    session.payment_status === "paid" || session.payment_status === "no_payment_required";
  return { ok: true, email, pagamentoConfirmado };
}
