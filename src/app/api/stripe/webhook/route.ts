import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { processarEventoStripe } from "@/lib/stripe/webhook";
import { criarDependenciasWebhook } from "@/lib/stripe/webhookDependencias";

// Eventos tratados (ver src/lib/stripe/webhook.ts para as regras de acesso):
// checkout.session.completed, checkout.session.async_payment_succeeded,
// checkout.session.async_payment_failed, invoice.paid,
// invoice.payment_failed, invoice.payment_action_required,
// customer.subscription.updated, customer.subscription.deleted,
// refund.created, refund.updated, refund.failed (reembolsos de conversão
// Avulso → assinatura), charge.dispute.created (programa de indicação:
// reverte a indicação da primeira compra contestada). Qualquer outro evento
// é aceite (200) e ignorado.

export async function POST(request: Request) {
  const assinatura = request.headers.get("stripe-signature");
  // Corpo em bruto: a assinatura é calculada sobre os bytes exatos enviados
  // pelo Stripe — um JSON reinterpretado deixava de validar.
  const corpoBruto = await request.text();

  if (!assinatura || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ erro: "Assinatura do webhook em falta." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      corpoBruto,
      assinatura,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ erro: "Assinatura do webhook inválida." }, { status: 400 });
  }

  const { status, corpo } = await processarEventoStripe(event, criarDependenciasWebhook());
  return NextResponse.json(corpo, { status });
}
