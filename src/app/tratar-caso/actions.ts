"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { dadosContaNova, guardarDestinoPosLogin, urlCallbackAuth } from "@/lib/authServidor";
import { DESTINO_PEDIDO_POR_PAGAR } from "@/lib/destinoAuth";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";
import { agendarRascunhoIA } from "@/lib/rascunhoIA/servidor";
import { lerDadosPedido, pedidoPorPagar, validEmail } from "@/lib/pedidoCaso";
import {
  converterPedidoEmCaso,
  gravarPedido,
  pedidoDaConta,
  tokenHashDoCookie,
} from "@/lib/pedidoCasoServidor";
import { registarOrigemDaConta } from "@/lib/origemAquisicaoServidor";

// "Tratar o meu caso": formulário → conta → modalidade → pagamento.
//
// Nenhuma destas ações cria um caso ou dá acesso pago:
// - guardarPedido grava só um pedido (pedidos_caso);
// - as ações de conta só criam/abrem a sessão;
// - usarCasoDisponivel gasta um caso JÁ PAGO (case_credits) — sem casos
//   disponíveis, a função SQL não cria nada.
// O caso pago pelo Checkout é criado pelo webhook Stripe.

const MODALIDADE = "/tratar-caso/modalidade";

async function obterIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

async function utilizadorDaSessao() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: (data?.claims?.sub as string | undefined) ?? null };
}

// ---------------------------------------------------------------------------
// 1. Formulário do caso
// ---------------------------------------------------------------------------

export type EstadoPedidoForm = { erro: string | null };

export async function guardarPedido(_anterior: EstadoPedidoForm, formData: FormData): Promise<EstadoPedidoForm> {
  // Honeypot: só um robô preenche este campo. Sem gravar nada.
  if ((formData.get("website") as string)?.trim()) redirect("/tratar-caso/conta");

  if (excedeuLimiteTaxa(`pedido:${await obterIp()}`)) {
    return { erro: "Demasiados pedidos. Tente novamente dentro de alguns minutos." };
  }

  const lido = lerDadosPedido((campo) => formData.get(campo));
  if (!lido.ok) return { erro: lido.erro };

  const { userId } = await utilizadorDaSessao();
  const pedidoId = await gravarPedido(lido.dados, userId);
  if (!pedidoId) return { erro: "Não foi possível guardar o seu pedido. Tente novamente." };

  redirect(userId ? `${MODALIDADE}?pedido=${pedidoId}` : "/tratar-caso/conta");
}

// ---------------------------------------------------------------------------
// 2. Conta (antes do pagamento, para a sessão continuar depois do Checkout)
// ---------------------------------------------------------------------------
// A confirmação do e-mail está ativa na Supabase (e os alertas dependem
// dela): a conta nova só tem sessão depois de confirmar o e-mail. Por isso a
// confirmação acontece aqui, antes do pagamento — com o código enviado por
// e-mail (sem sair da página) ou com a ligação do mesmo e-mail. Com a sessão
// aberta neste domínio, o regresso do Stripe já chega autenticado.

export type EstadoConta = {
  erro: string | null;
  passo: "conta" | "codigo";
  email?: string;
  info?: string;
};

const MSG_LIMITE = "Demasiadas tentativas. Aguarde alguns minutos e tente novamente.";

function mensagemErroAuth(codigo: string | undefined, mensagem: string | undefined) {
  if (codigo === "user_already_exists" || /already registered/i.test(mensagem ?? "")) {
    return "Já existe uma conta com este e-mail. Use “Já tenho conta” para entrar.";
  }
  if (codigo === "weak_password" || /password/i.test(mensagem ?? "")) {
    return "A palavra-passe não cumpre os requisitos. Use pelo menos 8 caracteres, com letras e números.";
  }
  if (codigo === "over_email_send_rate_limit" || codigo === "over_request_rate_limit" || /rate limit/i.test(mensagem ?? "")) {
    return MSG_LIMITE;
  }
  if (codigo === "invalid_credentials") return "E-mail ou palavra-passe incorretos.";
  if (codigo === "otp_expired" || /expired|invalid/i.test(mensagem ?? "")) {
    return "O código é inválido ou expirou. Peça um novo código.";
  }
  return "Não foi possível concluir. Tente novamente.";
}

async function nomeDoPedidoNoBrowser() {
  const tokenHash = await tokenHashDoCookie();
  if (!tokenHash) return null;
  const { data } = await createAdminClient().from("pedidos_caso").select("nome").eq("token_hash", tokenHash).maybeSingle();
  return (data?.nome as string | undefined) ?? null;
}

export async function criarContaPedido(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = (formData.get("password") as string) || "";
  if (!validEmail(email)) return { erro: "Insira um e-mail válido.", passo: "conta" };
  if (password.length < 8) return { erro: "A palavra-passe tem de ter pelo menos 8 caracteres.", passo: "conta" };
  if (excedeuLimiteTaxa(`conta:${await obterIp()}`)) return { erro: MSG_LIMITE, passo: "conta" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Única página com campo para o código: o e-mail mostra-o
    // (mostrar_codigo) e também a ligação, que volta à modalidade.
    options: dadosContaNova({ nome: await nomeDoPedidoNoBrowser(), mostrarCodigo: true }),
  });
  if (error) return { erro: mensagemErroAuth(error.code, error.message), passo: "conta" };

  // Origem de aquisição (?ref=): só atribuição, nunca acesso.
  if (data.user && (data.user.identities?.length ?? 0) > 0) await registarOrigemDaConta(data.user.id);

  // Sem confirmação de e-mail ativa (ex.: stack local), já há sessão.
  if (data.session) redirect(`${MODALIDADE}?conta=nova`);

  // E-mail já registado: a Supabase não revela a conta (sem identidades).
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return { erro: "Já existe uma conta com este e-mail. Use “Já tenho conta” para entrar.", passo: "conta" };
  }

  await guardarDestinoPosLogin(DESTINO_PEDIDO_POR_PAGAR);
  return {
    erro: null,
    passo: "codigo",
    email,
    info: "Enviámos-lhe um e-mail para confirmar o endereço.",
  };
}

export async function verificarCodigo(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const codigo = ((formData.get("codigo") as string) || "").replace(/\s/g, "");
  if (!validEmail(email)) return { erro: "Insira um e-mail válido.", passo: "conta" };
  if (!/^\d{6,10}$/.test(codigo)) return { erro: "Introduza o código que recebeu por e-mail.", passo: "codigo", email };
  if (excedeuLimiteTaxa(`codigo:${await obterIp()}`)) return { erro: MSG_LIMITE, passo: "codigo", email };

  const supabase = await createClient();
  let { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: "email" });
  if (error) ({ error } = await supabase.auth.verifyOtp({ email, token: codigo, type: "signup" }));
  if (error) return { erro: mensagemErroAuth(error.code, error.message), passo: "codigo", email };

  const { data: sessao } = await supabase.auth.getUser();
  if (sessao.user) await registarOrigemDaConta(sessao.user.id);
  redirect(`${MODALIDADE}?conta=nova`);
}

export async function reenviarCodigo(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  if (!validEmail(email)) return { erro: "Insira um e-mail válido.", passo: "conta" };
  if (excedeuLimiteTaxa(`reenvio:${await obterIp()}`)) return { erro: MSG_LIMITE, passo: "codigo", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: urlCallbackAuth() },
  });
  if (error) return { erro: mensagemErroAuth(error.code, error.message), passo: "codigo", email };
  return { erro: null, passo: "codigo", email, info: "Enviámos um novo e-mail de confirmação." };
}

export async function entrarPedido(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = (formData.get("password") as string) || "";
  if (!validEmail(email) || !password) return { erro: "Indique o e-mail e a palavra-passe.", passo: "conta" };
  if (excedeuLimiteTaxa(`entrar:${await obterIp()}`)) return { erro: MSG_LIMITE, passo: "conta" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: urlCallbackAuth() } });
      await guardarDestinoPosLogin(DESTINO_PEDIDO_POR_PAGAR);
      return {
        erro: null,
        passo: "codigo",
        email,
        info: "Ainda não confirmou o seu e-mail. Enviámos-lhe um novo e-mail de confirmação.",
      };
    }
    return { erro: mensagemErroAuth(error.code, error.message), passo: "conta" };
  }
  redirect(MODALIDADE);
}

// ---------------------------------------------------------------------------
// 3. Usar um caso disponível já pago (ex.: Caso + Proteção com casos por usar)
// ---------------------------------------------------------------------------

export async function usarCasoDisponivel(formData: FormData) {
  const { user } = await requireUser();
  const pedido = await pedidoDaConta((formData.get("pedido_id") as string) || null, user.id);
  if (!pedido) redirect("/tratar-caso");
  const recebido = `/tratar-caso/recebido?pedido=${pedido.id}`;
  if (pedido.estado === "convertido") redirect(recebido);
  if (!pedidoPorPagar(pedido.estado)) redirect("/tratar-caso");

  // Um checkout ainda aberto para este pedido deixa de ser preciso.
  const sessionId = pedido.checkout_session_id;
  if (sessionId) {
    await Promise.resolve()
      .then(async () => {
        const stripe = getStripe();
        const sessao = await stripe.checkout.sessions.retrieve(sessionId);
        if (sessao.status === "open") await stripe.checkout.sessions.expire(sessao.id);
      })
      .catch(() => undefined);
  }

  // Atómico: só cria o caso se gastar um caso disponível (pago).
  const casoId = await converterPedidoEmCaso(pedido.id, user.id).catch(() => null);
  if (!casoId) redirect(`${MODALIDADE}?pedido=${pedido.id}&erro=sem-casos`);
  // Sugestão do texto pela IA: depois da resposta, nunca bloqueia o caso.
  agendarRascunhoIA(casoId);
  redirect(recebido);
}
