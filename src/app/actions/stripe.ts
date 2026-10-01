"use server";

import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { obterAcesso, requireUser } from "@/lib/auth";
import { MARKETING_SITE_URL } from "@/lib/site";
import { getStripe } from "@/lib/stripe/client";
import {
  CUPAO_CONVERSAO,
  escolherAvulsoParaConversao,
  parametrosCheckoutConversao,
  sessoesAvulsoDisponiveis,
  type ConversaoExistente,
  type CreditoConcedido,
  type PagamentoAvulso,
} from "@/lib/stripe/conversao";
import {
  MENSAGENS_ERRO_CONSENTIMENTO,
  abrirCheckoutComConsentimento,
  lerPedidoCompra,
  montarRegistoConsentimento,
  type DependenciasCheckout,
  type PedidoCompra,
  type RegistoConsentimento,
} from "@/lib/consentimentoCompra";
import { PRECO_AVULSO_ID, precoDoPlano } from "@/lib/stripe/planos";
import { DIAS_VALIDADE_PEDIDO, pedidoPorPagar } from "@/lib/pedidoCaso";
import { pedidoDaConta } from "@/lib/pedidoCasoServidor";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

// Única porta de entrada para abrir uma Stripe Checkout Session.
//
// Todos os pontos de compra (preçário, painel, novo caso, tentar pagar de
// novo, conversão do Avulso, cupões incluídos) passam pelo modal de
// confirmação, que chama `confirmarCompra`. Aqui:
//   1. valida as checkboxes obrigatórias no servidor (lerPedidoCompra);
//   2. grava o registo de prova em consentimentos_compra;
//   3. só então cria a sessão, com o id do registo na metadata.
// As funções de cada fluxo NÃO são exportadas: uma Server Action exportada
// é um endpoint público, e nenhuma pode criar uma sessão sem passar por 1–2.
// Há uma única chamada a checkout.sessions.create (em dependenciasCheckout).
//
// O browser envia só plano, fluxo, origem e as checkboxes. O Price ID, as
// versões legais, os textos e as horas são decididos aqui; o acesso só é
// dado pelo webhook depois de o Stripe confirmar o pagamento.

export type EstadoCompra = { erro: string | null };

type Destino = { destino: string; sessionId?: string };

/**
 * Pedido de caso a pagar neste checkout ("Tratar o meu caso"): o id vai na
 * metadata (o webhook converte o pedido em caso depois de o pagamento ser
 * confirmado) e o regresso é para as páginas do pedido. O regresso ao
 * success_url não prova nada — a página só lê o estado gravado pelo webhook.
 */
type ContextoPedido = { pedidoId: string };

function urlsDoPedido(ctx: ContextoPedido) {
  const id = encodeURIComponent(ctx.pedidoId);
  return {
    success_url: `${SITE_URL}/tratar-caso/recebido?pedido=${id}`,
    cancel_url: `${SITE_URL}/tratar-caso/modalidade?pedido=${id}&cancelado=1`,
  };
}

function dependenciasCheckout(
  parametros: (metadata: Record<string, string>) => Stripe.Checkout.SessionCreateParams,
): DependenciasCheckout {
  const admin = createAdminClient();
  return {
    async registarConsentimento(registo: RegistoConsentimento) {
      const { data, error } = await admin.from("consentimentos_compra").insert(registo).select("id").single();
      if (error || !data) throw Object.assign(new Error("consentimentos_compra.insert falhou"), { code: error?.code });
      return data.id as string;
    },
    async criarSessao(metadata) {
      const session = await getStripe().checkout.sessions.create(parametros(metadata));
      return { id: session.id, url: session.url };
    },
    async ligarSessao(consentimentoId, sessionId) {
      await admin
        .from("consentimentos_compra")
        .update({ checkout_session_id: sessionId })
        .eq("id", consentimentoId)
        .is("checkout_session_id", null);
    },
  };
}

/** Preçário público: compra sem sessão; a conta é criada depois do pagamento. */
async function checkoutPublico(pedido: PedidoCompra): Promise<Destino> {
  const avulso = pedido.plano === "avulso";
  const registo = montarRegistoConsentimento({
    plano: pedido.plano,
    tipo: avulso ? "avulso" : "subscricao",
    origem: pedido.origem,
    userId: null,
    email: null, // ainda desconhecido: o webhook preenche com o e-mail do Checkout
  });

  const { url } = await abrirCheckoutComConsentimento(
    registo,
    dependenciasCheckout((metadata) => ({
      mode: avulso ? "payment" : "subscription",
      // "always" garante que existe sempre um Customer Stripe associado,
      // mesmo numa compra Avulso a 0 € por cupão de 100% — sem isto, um
      // upgrade posterior não tem onde aplicar o crédito nem a quem ligar a
      // nova assinatura.
      ...(avulso
        ? { customer_creation: "always" as const, payment_intent_data: { metadata } }
        : { subscription_data: { metadata } }),
      line_items: [{ price: precoDoPlano(pedido.plano), quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${SITE_URL}/criar-conta?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${MARKETING_SITE_URL}/#precario`,
      // metadata.plano continua a ser o tipo de compra que o webhook e
      // /criar-conta esperam; o plano da subscrição é lido do price.
      metadata: { ...metadata, plano: avulso ? "avulso" : "assinatura" },
    })),
  );
  return { destino: url ?? `${MARKETING_SITE_URL}/#precario` };
}

/** Customer Stripe já associado à conta (se houver), para não criar outro. */
async function customerDaConta(userId: string) {
  const admin = createAdminClient();
  const { data: acesso } = await admin
    .from("user_access")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (acesso?.stripe_customer_id) return acesso.stripe_customer_id as string;

  const { data: pagamento } = await admin
    .from("stripe_payments")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (pagamento?.stripe_customer_id as string | undefined) ?? null;
}

/**
 * Compra de um caso Avulso por quem já tem conta (ex.: plano Proteção sem
 * casos, ou depois de um pagamento falhado). O user_id vai nos metadados —
 * definidos aqui, no servidor — para o webhook creditar a conta certa.
 */
async function compraAvulsoComConta(pedido: PedidoCompra, ctx?: ContextoPedido): Promise<Destino> {
  const { user } = await requireUser();
  const customerId = await customerDaConta(user.id);
  const voltar = pedido.origem === "novo_caso" ? "/portal/casos/novo" : "/portal";
  const metadataPedido: Record<string, string> = ctx ? { pedido_id: ctx.pedidoId } : {};

  const registo = montarRegistoConsentimento({
    plano: "avulso",
    tipo: "avulso",
    origem: pedido.origem,
    userId: user.id,
    email: user.email ?? null,
  });
  const { url, sessionId } = await abrirCheckoutComConsentimento(
    registo,
    dependenciasCheckout((metadata) => ({
      mode: "payment",
      ...(customerId
        ? { customer: customerId }
        : { customer_creation: "always" as const, customer_email: user.email }),
      line_items: [{ price: PRECO_AVULSO_ID, quantity: 1 }],
      allow_promotion_codes: true,
      payment_intent_data: { metadata: { ...metadata, ...metadataPedido } },
      ...(ctx
        ? urlsDoPedido(ctx)
        : { success_url: `${SITE_URL}/portal/casos/novo?pagamento=1`, cancel_url: `${SITE_URL}${voltar}` }),
      metadata: { ...metadata, ...metadataPedido, plano: "avulso", user_id: user.id },
    })),
  );
  return { destino: url ?? "/portal", sessionId };
}

async function garantirCupaoConversao(stripe: ReturnType<typeof getStripe>) {
  try {
    const cupao = await stripe.coupons.retrieve(CUPAO_CONVERSAO.id);
    // Nunca aplicar um cupão com outra configuração (ex.: editado à mão).
    if (cupao.percent_off !== 100 || cupao.duration !== "once" || !cupao.valid) {
      throw new Error("cupão de conversão com configuração inesperada");
    }
  } catch (erro) {
    if ((erro as { code?: string }).code !== "resource_missing") throw erro;
    await stripe.coupons.create({
      id: CUPAO_CONVERSAO.id,
      percent_off: CUPAO_CONVERSAO.percent_off,
      duration: CUPAO_CONVERSAO.duration,
      name: CUPAO_CONVERSAO.name,
    });
  }
}

/**
 * Adesão a uma subscrição por quem já tem conta. Se a conta tiver uma
 * compra Avulso elegível, a 1.ª mensalidade fica coberta por ela (cupão de
 * 100% só na 1.ª fatura) e a diferença é reembolsada — mas só depois de o
 * webhook confirmar a subscrição. Abrir o Checkout não consome nada: se o
 * cliente desistir, o Avulso continua elegível.
 */
async function adesao(pedido: PedidoCompra, ctx?: ContextoPedido): Promise<Destino> {
  const plano = pedido.plano as "protecao" | "caso_protecao";
  const stripe = getStripe();
  const { supabase, user } = await requireUser();
  const acesso = await obterAcesso(supabase, user.id);
  const metadataPedido: Record<string, string> = ctx ? { pedido_id: ctx.pedidoId } : {};

  // Já tem uma subscrição ativa: não abre uma segunda.
  if (acesso.temProtecao) {
    return { destino: ctx ? `/tratar-caso/modalidade?pedido=${encodeURIComponent(ctx.pedidoId)}` : "/portal" };
  }

  const admin = createAdminClient();
  const precoId = precoDoPlano(plano);
  const customerId = await customerDaConta(user.id);
  const cliente = customerId ? { customer: customerId } : { customer_email: user.email };

  const [{ data: pagamentos }, { data: conversoes }, { data: creditos }] = await Promise.all([
    admin
      .from("stripe_payments")
      .select("id, stripe_session_id, user_id, plano, estado, valor_total_centimos, created_at")
      .eq("user_id", user.id)
      .eq("plano", "avulso"),
    admin
      .from("conversoes_avulso")
      .select("id, stripe_payment_id, estado, checkout_session_id")
      .eq("user_id", user.id),
    // Só Avulsos com o caso ainda por usar podem ser convertidos.
    admin.from("case_credit_grants").select("origem, estado").eq("user_id", user.id).eq("estado", "disponivel"),
  ]);
  const escolha = escolherAvulsoParaConversao(
    (pagamentos ?? []) as PagamentoAvulso[],
    (conversoes ?? []) as ConversaoExistente[],
    user.id,
    plano,
    sessoesAvulsoDisponiveis((creditos ?? []) as CreditoConcedido[]),
  );

  if (!escolha) {
    // Sem Avulso por converter: adesão normal, cobrada desde o 1.º mês.
    const registo = montarRegistoConsentimento({
      plano,
      tipo: "subscricao",
      origem: pedido.origem,
      userId: user.id,
      email: user.email ?? null,
    });
    const { url, sessionId } = await abrirCheckoutComConsentimento(
      registo,
      dependenciasCheckout((metadata) => ({
        mode: "subscription",
        ...cliente,
        line_items: [{ price: precoId, quantity: 1 }],
        allow_promotion_codes: true,
        ...(ctx
          ? urlsDoPedido(ctx)
          : { success_url: `${SITE_URL}/portal?upgraded=true`, cancel_url: `${SITE_URL}/portal` }),
        metadata: { ...metadata, ...metadataPedido, plano: "assinatura", upgrade: "false", user_id: user.id },
        subscription_data: { metadata },
      })),
    );
    return { destino: url ?? "/portal", sessionId };
  }

  // Um checkout de conversão de cada vez: um anterior ainda aberto é
  // expirado, para só o novo poder converter este Avulso.
  const anteriorId = escolha.conversao?.checkout_session_id;
  if (anteriorId) {
    const anterior = await stripe.checkout.sessions.retrieve(anteriorId).catch(() => null);
    if (anterior?.status === "complete") return { destino: "/portal?upgraded=true" }; // já concluído, o webhook trata
    if (anterior?.status === "open") await stripe.checkout.sessions.expire(anteriorId).catch(() => undefined);
  }

  await garantirCupaoConversao(stripe);

  const valores = {
    plano_destino: plano,
    valor_avulso_centimos: escolha.calculo.valorAvulso,
    valor_primeira_mensalidade_centimos: escolha.calculo.mensalidade,
    refund_montante_centimos: escolha.calculo.reembolso,
    checkout_session_id: null,
    updated_at: new Date().toISOString(),
  };
  let conversaoId: string | undefined;
  if (escolha.conversao) {
    // Só reabre se ainda não foi convertida (entretanto, noutro separador).
    const { data } = await admin
      .from("conversoes_avulso")
      .update(valores)
      .eq("id", escolha.conversao.id)
      .eq("estado", "checkout_aberto")
      .select("id")
      .maybeSingle();
    conversaoId = data?.id;
  } else {
    const { data } = await admin
      .from("conversoes_avulso")
      .insert({ ...valores, stripe_payment_id: escolha.pagamento.id, user_id: user.id })
      .select("id")
      .maybeSingle();
    conversaoId = data?.id;
  }
  if (!conversaoId) return { destino: "/portal?erro=conversao-indisponivel" };

  const registo = montarRegistoConsentimento({
    plano,
    tipo: "conversao_avulso",
    origem: pedido.origem,
    userId: user.id,
    email: user.email ?? null,
    conversaoId,
  });
  const { sessionId, url } = await abrirCheckoutComConsentimento(
    registo,
    dependenciasCheckout((metadata) =>
      parametrosCheckoutConversao({
        precoId,
        cliente,
        conversaoId: conversaoId!,
        userId: user.id,
        plano,
        siteUrl: SITE_URL,
        metadataExtra: { ...metadata, ...metadataPedido },
        ...(ctx ? { successUrl: urlsDoPedido(ctx).success_url, cancelUrl: urlsDoPedido(ctx).cancel_url } : {}),
      }),
    ),
  );
  await admin
    .from("conversoes_avulso")
    .update({ checkout_session_id: sessionId, updated_at: new Date().toISOString() })
    .eq("id", conversaoId)
    .eq("estado", "checkout_aberto");

  return { destino: url ?? "/portal", sessionId };
}

/**
 * Modalidade escolhida para um pedido de caso ("Tratar o meu caso"). Exige
 * sessão e a posse do pedido (validada aqui, nunca pelo browser). Um pedido
 * tem no máximo um checkout aberto: o anterior é expirado; se o anterior já
 * foi pago (ou está em confirmação), não abre outro — evita pagar duas
 * vezes o mesmo pedido.
 */
async function checkoutPedidoCaso(pedido: PedidoCompra): Promise<Destino> {
  const { user } = await requireUser();
  const p = await pedidoDaConta(pedido.pedidoId ?? null, user.id);
  if (!p) return { destino: "/tratar-caso" };
  const recebido = `/tratar-caso/recebido?pedido=${encodeURIComponent(p.id)}`;
  if (p.estado === "convertido") return { destino: recebido };
  if (!pedidoPorPagar(p.estado)) return { destino: "/tratar-caso" };

  const admin = createAdminClient();
  if (p.checkout_session_id) {
    const stripe = getStripe();
    const anterior = await stripe.checkout.sessions.retrieve(p.checkout_session_id).catch(() => null);
    if (anterior?.status === "complete") {
      // Pago, ou pagamento assíncrono (ex.: SEPA) em confirmação: não se
      // cobra outra vez. Só um pagamento que falhou deixa tentar de novo.
      const { data: pagamento } = await admin
        .from("stripe_payments")
        .select("estado")
        .eq("stripe_session_id", anterior.id)
        .maybeSingle();
      if (pagamento?.estado !== "falhado") return { destino: recebido };
    } else if (anterior?.status === "open") {
      await stripe.checkout.sessions.expire(anterior.id).catch(() => undefined);
    }
  }

  const ctx = { pedidoId: p.id };
  const r = pedido.plano === "avulso" ? await compraAvulsoComConta(pedido, ctx) : await adesao(pedido, ctx);
  if (r.sessionId) {
    await admin
      .from("pedidos_caso")
      .update({
        estado: "aguarda_pagamento",
        plano_escolhido: pedido.plano,
        checkout_session_id: r.sessionId,
        // Um pagamento SEPA pode demorar dias: o pedido não expira entretanto.
        expira_em: new Date(Date.now() + DIAS_VALIDADE_PEDIDO * 24 * 3600 * 1000).toISOString(),
      })
      .eq("id", p.id)
      .in("estado", ["rascunho", "aguarda_pagamento"]);
  }
  return r;
}

/**
 * Confirmação da compra (modal ConfirmarCompra). Recusa — sem gravar nada
 * nem criar sessão — se faltar alguma checkbox obrigatória ou os dados não
 * baterem certo.
 */
export async function confirmarCompra(_anterior: EstadoCompra, formData: FormData): Promise<EstadoCompra> {
  const lido = lerPedidoCompra((campo) => formData.get(campo));
  if (!lido.ok) return { erro: MENSAGENS_ERRO_CONSENTIMENTO[lido.erro] };

  let destino: string;
  try {
    const { pedido } = lido;
    const r =
      pedido.fluxo === "publico"
        ? await checkoutPublico(pedido)
        : pedido.fluxo === "avulso_conta"
          ? await compraAvulsoComConta(pedido)
          : pedido.fluxo === "pedido_caso"
            ? await checkoutPedidoCaso(pedido)
            : await adesao(pedido);
    destino = r.destino;
  } catch (erro) {
    // requireUser() sem sessão faz redirect: deixa passar.
    if ((erro as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw erro;
    console.error(JSON.stringify({ origem: "checkout", erro_codigo: (erro as { code?: string })?.code ?? "erro" }));
    return { erro: "Não foi possível abrir o pagamento. Tente novamente dentro de alguns minutos." };
  }
  redirect(destino);
}
