import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  montarHtmlBoasVindasPagamento,
  montarHtmlNotificacaoNovoPagamento,
} from "@/lib/email/pagamento";
import { getStripe } from "@/lib/stripe/client";

async function enviarEmailBrevo(destinatario: string, assunto: string, html: string) {
  // Falha de e-mail nunca deve derrubar o webhook — o pagamento já está
  // registado; um e-mail perdido não é motivo para o Stripe reenviar o
  // evento e arriscar duplicar o registo.
  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "DoLado", email: process.env.BREVO_SENDER_EMAIL },
        to: [{ email: destinatario }],
        subject: assunto,
        htmlContent: html,
      }),
    });
  } catch {
    // silencioso de propósito — ver comentário acima
  }
}

export async function POST(request: Request) {
  const assinatura = request.headers.get("stripe-signature");
  const corpoBruto = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      corpoBruto,
      assinatura!,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "erro desconhecido";
    return NextResponse.json(
      { erro: `Assinatura do webhook inválida: ${mensagem}` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const plano = session.metadata?.plano as "avulso" | "assinatura" | undefined;
    const ehUpgrade = session.metadata?.upgrade === "true";
    const email = session.customer_details?.email;

    if (plano && email) {
      const cupao = session.discounts?.[0]?.coupon;
      const codigoDesconto = typeof cupao === "string" ? cupao : (cupao?.id ?? null);
      // Só vem preenchido no upgrade Avulso→Assinatura (iniciarUpgradeParaAssinatura
      // grava-o nos metadados) — uma compra de raiz ainda não tem conta,
      // por isso é sempre /criar-conta a ligar o user_id depois.
      const userId = session.metadata?.user_id ?? null;

      // upsert (não insert) — /criar-conta também pode já ter gravado esta
      // sessão antes do webhook chegar; onConflict evita duplicar e garante
      // que os dois caminhos convergem para a mesma linha.
      const { error: erroPagamento } = await admin.from("stripe_payments").upsert(
        {
          stripe_session_id: session.id,
          user_id: userId,
          stripe_customer_id:
            typeof session.customer === "string" ? session.customer : session.customer?.id,
          stripe_subscription_id:
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id,
          email,
          plano,
          valor_total_centimos: session.amount_total,
          moeda: session.currency ?? "eur",
          codigo_desconto: codigoDesconto,
          upgrade_de_avulso: ehUpgrade,
        },
        { onConflict: "stripe_session_id" },
      );
      if (erroPagamento) {
        console.error("[stripe webhook] falha ao gravar stripe_payments:", erroPagamento);
      }

      // Upgrade de um cliente já existente — a conta já está ligada, só é
      // preciso subir o nível de acesso. Uma assinatura comprada de raiz
      // só ganha acesso depois de /criar-conta ligar o pagamento à conta
      // nova (a linha em user_access ainda não existe nesse caso).
      if (plano === "assinatura" && ehUpgrade) {
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;

        if (userId) {
          const { error: erroAcesso } = await admin.from("user_access").upsert(
            {
              user_id: userId,
              nivel_acesso: "assinatura",
              stripe_customer_id: customerId ?? null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
          if (erroAcesso) {
            console.error("[stripe webhook] falha ao actualizar user_access (upgrade):", erroAcesso);
          }
        }
      }

      await enviarEmailBrevo(
        email,
        "Pagamento confirmado — Falta criar a sua palavra-passe ✓",
        montarHtmlBoasVindasPagamento(plano),
      );
      if (process.env.BREVO_SENDER_EMAIL) {
        await enviarEmailBrevo(
          process.env.BREVO_SENDER_EMAIL,
          "Novo pagamento — DoLado",
          montarHtmlNotificacaoNovoPagamento(email, plano),
        );
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;

    await admin
      .from("stripe_payments")
      .update({ estado: "assinatura_cancelada" })
      .eq("stripe_subscription_id", subscription.id);

    // Ao cancelar, volta a "avulso" — já pagou pelo menos uma reclamação —
    // nunca a "nenhum".
    await admin
      .from("user_access")
      .update({ nivel_acesso: "avulso", updated_at: new Date().toISOString() })
      .eq("stripe_customer_id", subscription.customer as string);
  }

  return NextResponse.json({ recebido: true });
}
