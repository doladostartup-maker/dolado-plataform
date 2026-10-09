"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL, enviarEmailBrevo } from "@/lib/email/brevo";
import {
  ASSUNTO_CONFIRMACAO_LIVRE_RESOLUCAO,
  montarHtmlAvisoLivreResolucao,
  montarHtmlConfirmacaoLivreResolucao,
} from "@/lib/email/livreResolucao";
import {
  FORMULARIO_LIVRE_RESOLUCAO_VERSAO,
  MAX_PEDIDOS_POR_EMAIL_24H,
  MENSAGENS_ERRO_PEDIDO,
  lerPedidoLivreResolucao,
} from "@/lib/livreResolucao";

// Função online de livre resolução. Pública (sem login: quem compra pode
// ainda não ter criado a conta). Grava a prova em pedidos_livre_resolucao e
// avisa a DoLado. A confirmação de receção por e-mail só é enviada a
// e-mails de clientes conhecidos — evita que o formulário sirva para a
// DoLado enviar e-mails a terceiros; nos restantes, a DoLado confirma a
// identidade e responde manualmente. Sem efeitos automáticos no Stripe.

export type EstadoPedidoLivreResolucao =
  | { ok: true; referencia: string; recebidoEm: string; confirmacaoEnviada: boolean }
  | { ok: false; erro: string }
  | null;

/** Escapa os caracteres especiais do ILIKE para comparar um e-mail sem distinguir maiúsculas. */
function padraoExato(valor: string) {
  return valor.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function pedirLivreResolucao(
  _anterior: EstadoPedidoLivreResolucao,
  formData: FormData,
): Promise<EstadoPedidoLivreResolucao> {
  // Campo armadilha (invisível): bots preenchem-no.
  if (String(formData.get("website") ?? "") !== "") return { ok: false, erro: "Não foi possível registar o pedido." };

  const hoje = new Date().toISOString().slice(0, 10);
  const lido = lerPedidoLivreResolucao(Object.fromEntries(formData), hoje);
  if (!lido.ok) return { ok: false, erro: MENSAGENS_ERRO_PEDIDO[lido.erro] };
  const pedido = lido.pedido;

  const admin = createAdminClient();
  const padrao = padraoExato(pedido.email);

  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await admin
    .from("pedidos_livre_resolucao")
    .select("id", { count: "exact", head: true })
    .ilike("email", padrao)
    .gte("pedido_em", desde);
  if ((count ?? 0) >= MAX_PEDIDOS_POR_EMAIL_24H) {
    return {
      ok: false,
      erro: "Já recebemos vários pedidos com este e-mail nas últimas 24 horas. Se precisar de acrescentar algo, escreva para o nosso e-mail de contacto.",
    };
  }

  // Cliente conhecido: conta com este e-mail ou compra feita com ele.
  const [{ data: conta }, { data: compra }, { data: consentimento }] = await Promise.all([
    admin.from("utilizadores").select("id").ilike("email", padrao).limit(1).maybeSingle(),
    admin.from("stripe_payments").select("id").ilike("email", padrao).limit(1).maybeSingle(),
    admin.from("consentimentos_compra").select("id").ilike("email", padrao).limit(1).maybeSingle(),
  ]);
  const contaConhecida = Boolean(conta || compra || consentimento);

  const { data: registo, error } = await admin
    .from("pedidos_livre_resolucao")
    .insert({
      ...pedido,
      user_id: conta?.id ?? null,
      versao_formulario: FORMULARIO_LIVRE_RESOLUCAO_VERSAO,
    })
    .select("id, pedido_em")
    .single();
  if (error || !registo) {
    console.error("[livre-resolucao] falha ao gravar o pedido:", error?.code);
    return {
      ok: false,
      erro: "Não foi possível registar o pedido. Tente novamente ou escreva para o nosso e-mail de contacto.",
    };
  }

  let confirmacaoEnviada = false;
  if (contaConhecida) {
    try {
      await enviarEmailBrevo(
        pedido.email,
        ASSUNTO_CONFIRMACAO_LIVRE_RESOLUCAO,
        montarHtmlConfirmacaoLivreResolucao(pedido, registo.id, registo.pedido_em),
      );
      confirmacaoEnviada = true;
      await admin
        .from("pedidos_livre_resolucao")
        .update({ confirmacao_enviada_em: new Date().toISOString() })
        .eq("id", registo.id);
    } catch (erro) {
      console.error("[livre-resolucao] falha na confirmação ao cliente:", (erro as { code?: string }).code);
    }
  }

  try {
    await enviarEmailBrevo(
      ADMIN_EMAIL,
      `Pedido de livre resolução — ${pedido.email}`,
      montarHtmlAvisoLivreResolucao(pedido, registo.id, registo.pedido_em, { contaConhecida, confirmacaoEnviada }),
    );
  } catch (erro) {
    console.error("[livre-resolucao] falha no aviso interno:", (erro as { code?: string }).code);
  }

  return { ok: true, referencia: registo.id, recebidoEm: registo.pedido_em, confirmacaoEnviada };
}
