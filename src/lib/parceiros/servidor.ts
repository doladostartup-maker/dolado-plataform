import { createHash, createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe as stripeReal } from "@/lib/stripe/client";
import { COOKIE_INDICACAO, INDICACAO_JANELA_DIAS, gerarCodigo } from "@/lib/indicacoes/regras";
import {
  CHAVE_CODIGO_PARCEIRO,
  lerResultadoAtribuicao,
  normalizarCodigoParceiro,
  parceirosAtivos,
  visitaParceiroDoCookie,
  type Candidatura,
  type ResultadoAtribuicao,
} from "./regras";
import type { DependenciasParceiros } from "./webhook";

// Programa de Parceiros (Parceiro de Indicação) no servidor: visitas,
// atribuição, candidaturas e as dependências do webhook. Usa a service role —
// quem chama já validou a sessão (o userId vem sempre da sessão, nunca do
// browser), o admin, ou a assinatura do Stripe. Regras em ./regras.ts;
// decisões atómicas nas funções parceiro_* da base de dados.

function falhar(contexto: string, erro: { code?: string } | null) {
  if (!erro) return;
  // Só o código: a mensagem do Postgres pode trazer valores das linhas.
  throw Object.assign(new Error(`${contexto} falhou`), { code: erro.code || contexto });
}

// ---------------------------------------------------------------------------
// Visitas e atribuição
// ---------------------------------------------------------------------------

/** Visita por /r/<código> de um parceiro (depois do consentimento). null = não é um código de parceiro activo. */
export async function registarVisitaParceiro(codigo: string, visitaAtual: string | null): Promise<string | null> {
  if (!parceirosAtivos()) return null;
  const admin = createAdminClient();
  if (visitaAtual) {
    const { data } = await admin.from("parceiros_visitas").select("id, codigo").eq("id", visitaAtual).maybeSingle();
    if (data?.codigo === codigo) return data.id as string;
  }
  const { data, error } = await admin.rpc("parceiro_registar_visita", { p_codigo: codigo });
  falhar("parceiro_registar_visita", error);
  return (data as string | null) ?? null;
}

async function atribuir(userId: string, args: { visita?: string; codigo?: string }): Promise<ResultadoAtribuicao> {
  const { data, error } = await createAdminClient().rpc("parceiro_atribuir", {
    p_user: userId,
    p_visita: args.visita ?? null,
    p_codigo: args.codigo ?? null,
    p_janela_dias: INDICACAO_JANELA_DIAS,
  });
  falhar("parceiro_atribuir", error);
  return lerResultadoAtribuicao(data);
}

/**
 * Código escrito pelo cliente (registo ou antes do Checkout). A base de
 * dados decide e recusa: código inexistente/inactivo, auto-indicação, conta
 * já cliente, conta já atribuída (a primeira atribuição nunca muda).
 */
export async function atribuirCodigoParceiro(userId: string, codigoEscrito: string): Promise<ResultadoAtribuicao | "desligado"> {
  if (!parceirosAtivos()) return "desligado";
  const codigo = normalizarCodigoParceiro(codigoEscrito);
  if (!codigo) return "codigo_invalido";
  return atribuir(userId, { codigo });
}

/**
 * A conta ainda pode escrever um código de parceiro? (programa ligado e
 * conta sem nenhuma atribuição, de amigo ou de parceiro). Só apresentação:
 * a base de dados decide de novo.
 */
export async function podeUsarCodigoParceiro(userId: string) {
  if (!parceirosAtivos()) return false;
  const admin = createAdminClient();
  const [{ count: p }, { count: a }] = await Promise.all([
    admin.from("parceiros_atribuicoes").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("indicacoes").select("id", { count: "exact", head: true }).eq("referred_user_id", userId),
  ]);
  return (p ?? 0) === 0 && (a ?? 0) === 0;
}

/** Código de parceiro activo (de um parceiro de indicação activo)? Só leitura. */
export async function codigoParceiroExiste(codigo: string) {
  const { data } = await createAdminClient()
    .from("parceiros_codigos")
    .select("codigo, parceiros!inner(estado, indicacao)")
    .eq("codigo", codigo)
    .eq("ativo", true)
    .eq("parceiros.estado", "ativo")
    .eq("parceiros.indicacao", true)
    .maybeSingle();
  return !!data;
}

/**
 * Atribuição pelo que este browser e esta conta trazem: o cookie de uma
 * visita de parceiro ("p.<uuid>") e/ou o código escrito no registo
 * (metadado da conta). Chamada de atribuirIndicacaoDoBrowser — nos mesmos
 * momentos que a indicação de amigos. null = nada de parceiro.
 */
export async function atribuirParceiroDoBrowser(userId: string): Promise<ResultadoAtribuicao | null> {
  if (!parceirosAtivos()) return null;
  const jar = await cookies();
  const visita = visitaParceiroDoCookie(jar.get(COOKIE_INDICACAO)?.value);
  if (visita) return atribuir(userId, { visita });
  const { data } = await createAdminClient().auth.admin.getUserById(userId);
  const escrito = data?.user?.user_metadata?.[CHAVE_CODIGO_PARCEIRO];
  const codigo = normalizarCodigoParceiro(escrito);
  return codigo ? atribuir(userId, { codigo }) : null;
}

// ---------------------------------------------------------------------------
// Candidaturas
// ---------------------------------------------------------------------------

/** Chave do limite de tentativas: pseudónimo do e-mail (nunca em claro). */
export function chaveLimiteCandidatura(email: string) {
  const segredo = process.env.PARCEIROS_CHAVE ?? "";
  const valor = `parceiros:candidatura:${email.trim().toLowerCase()}`;
  const hash = segredo.length >= 32 ? createHmac("sha256", segredo).update(valor).digest("hex") : createHash("sha256").update(valor).digest("hex");
  return `candidatura:${hash}`;
}

export async function criarCandidatura(c: Candidatura, aceitacao: { versao: string; texto: string }, idioma: string) {
  const { data, error } = await createAdminClient().rpc("parceiro_candidatura_criar", {
    p_nome: c.nome,
    p_email: c.email,
    p_empresa: c.empresa,
    p_tipo: c.tipo,
    p_descricao: c.descricao,
    p_condicoes_versao: aceitacao.versao,
    p_texto_aceite: aceitacao.texto,
    p_idioma: idioma,
    p_chave_limite: chaveLimiteCandidatura(c.email),
  });
  falhar("parceiro_candidatura_criar", error);
  return ((data ?? {}) as { resultado?: string; id?: string }).resultado === "criada" ? "criada" : "limite";
}

/**
 * Aprovação (gera o código, tenta outro se colidir) ou rejeição. Devolve o
 * parceiro e o código para o e-mail de boas-vindas.
 */
export async function decidirCandidatura(id: string, aprovar: boolean, motivo: string | null, adminId: string) {
  const admin = createAdminClient();
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = aprovar ? gerarCodigo(randomBytes(8)) : null;
    const { data, error } = await admin.rpc("parceiro_candidatura_decidir", {
      p_id: id,
      p_aprovar: aprovar,
      p_motivo: motivo,
      p_codigo: codigo,
      p_admin: adminId,
    });
    if (error?.code === "23505") continue; // código já usado (amigo ou parceiro): outro
    falhar("parceiro_candidatura_decidir", error);
    return (data ?? {}) as { resultado?: string; parceiro_id?: string; codigo?: string | null };
  }
  throw Object.assign(new Error("parceiro_candidatura_decidir: sem código livre"), { code: "codigo" });
}

/** Novo código para um parceiro de indicação existente (ex.: campanha). */
export async function criarCodigoParceiro(parceiroId: string) {
  const admin = createAdminClient();
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = gerarCodigo(randomBytes(8));
    const { error } = await admin.from("parceiros_codigos").insert({ codigo, parceiro_id: parceiroId });
    if (error?.code === "23505") continue;
    falhar("parceiros_codigos.insert", error);
    return codigo;
  }
  throw Object.assign(new Error("parceiros_codigos: sem código livre"), { code: "codigo" });
}

// ---------------------------------------------------------------------------
// Webhook Stripe — dependências reais
// ---------------------------------------------------------------------------

function idDe(valor: string | { id?: string } | null | undefined) {
  if (!valor) return null;
  return typeof valor === "string" ? valor : (valor.id ?? null);
}

export function criarDependenciasParceiros(opcoes: {
  notificarAdmin(assunto: string, texto: string): Promise<void>;
  registar(linha: { evento: string; resultado: string; erro_codigo?: string }): void;
  stripe?: Pick<Stripe, "invoicePayments">;
}): DependenciasParceiros {
  const admin = createAdminClient();
  const stripe = () => opcoes.stripe ?? stripeReal();
  async function rpc<T>(nome: string, args: Record<string, unknown>) {
    const { data, error } = await admin.rpc(nome, args);
    falhar(nome, error);
    return data as T;
  }
  return {
    async temAtribuicao(userId) {
      const { count, error } = await admin
        .from("parceiros_atribuicoes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      falhar("parceiros_atribuicoes.count", error);
      return (count ?? 0) > 0;
    },
    async paymentIntentDaFatura(invoiceId) {
      try {
        const pagamentos = await stripe().invoicePayments.list({ invoice: invoiceId, limit: 1 });
        return idDe(pagamentos.data[0]?.payment?.payment_intent);
      } catch {
        return null; // sem PaymentIntent: um reembolso desta fatura fica para o admin
      }
    },
    async registarFatura(d) {
      return rpc("parceiro_registar_fatura", {
        p_user: d.userId,
        p_invoice: d.invoiceId,
        p_subscription: d.subscriptionId,
        p_produto: d.produto,
        p_valor_pago_cents: d.valorPagoCents,
        p_iva_cents: d.ivaCents,
        p_desconto_cents: d.descontoCents,
        p_payment_intent: d.paymentIntentId,
        p_customer: d.customerId,
        p_pago_em: d.pagoEm,
        p_suspeita: null,
      });
    },
    async reverterFatura(paymentIntentId, motivo) {
      return rpc("parceiro_reverter_fatura", { p_invoice: null, p_payment_intent: paymentIntentId, p_motivo: motivo });
    },
    async valorPagoDoPagamento(paymentIntentId) {
      const { data, error } = await admin
        .from("parceiros_faturas")
        .select("valor_pago_cents")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle();
      falhar("parceiros_faturas.select", error);
      return (data?.valor_pago_cents as number | undefined) ?? null;
    },
    async subscricaoTerminada(subscriptionId) {
      return rpc<string>("parceiro_subscricao_terminada", { p_subscription: subscriptionId });
    },
    notificarAdmin: opcoes.notificarAdmin,
    registar: opcoes.registar,
  };
}
