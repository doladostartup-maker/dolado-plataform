// Consentimentos obrigatórios antes de abrir uma Stripe Checkout Session.
// Sem efeitos — quem grava e fala com o Stripe é app/actions/stripe.ts, por
// `DependenciasCheckout`, para os testes correrem com `node --test`.
//
// Ordem garantida por `abrirCheckoutComConsentimento`:
//   1. o servidor valida as duas checkboxes (nunca confia só no browser);
//   2. grava o registo de prova (versões e texto definidos AQUI, no servidor,
//      com a hora do servidor);
//   3. só depois cria a Checkout Session, com o id do registo na metadata;
//   4. liga o registo à sessão (o webhook completa pagamento/subscrição).
// Se a validação falhar, nada é gravado e nenhuma sessão é criada.
//
// O pedido de início imediato é só isso: um pedido e um reconhecimento.
// Nenhum código decide reembolsos ou a perda do direito de livre resolução
// a partir dele.

import { ehPlanoId, type PlanoId } from "./planos.ts";
import {
  CONSENTIMENTO_INICIO_IMEDIATO_VERSAO,
  PRIVACIDADE_VERSAO,
  TERMOS_VERSAO,
  TEXTO_ACEITACAO_TERMOS,
  consentimentoInicioImediato,
} from "./legal.ts";

export const CAMPO_ACEITA_TERMOS = "aceita_termos";
export const CAMPO_INICIO_IMEDIATO = "pede_inicio_imediato";
export const VALOR_ACEITE = "sim";

/** Onde a compra começou (só para registo — não decide nada). */
export const ORIGENS_COMPRA = ["landing", "portal", "novo_caso", "repetir_pagamento", "tratar_caso"] as const;
export type OrigemCompra = (typeof ORIGENS_COMPRA)[number];

/**
 * Fluxo de checkout. "publico": preçário, sem sessão (a conta é criada
 * depois do pagamento). "avulso_conta": compra Avulso com sessão iniciada.
 * "adesao": subscrição com sessão iniciada (com conversão do Avulso, se houver).
 * "pedido_caso": modalidade escolhida para um pedido de caso já preenchido
 * ("Tratar o meu caso"), com sessão iniciada — Avulso ou Caso + Proteção.
 */
export const FLUXOS_COMPRA = ["publico", "avulso_conta", "adesao", "pedido_caso"] as const;
export type FluxoCompra = (typeof FLUXOS_COMPRA)[number];

export type TipoCompra = "avulso" | "subscricao" | "conversao_avulso";

export type PedidoCompra = {
  plano: PlanoId;
  fluxo: FluxoCompra;
  origem: OrigemCompra;
  /** Só no fluxo "pedido_caso": o pedido a pagar (a posse é validada no servidor). */
  pedidoId?: string;
};

const UUID_PEDIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ErroConsentimento = "dados_invalidos" | "termos" | "inicio_imediato";

export const MENSAGENS_ERRO_CONSENTIMENTO: Record<ErroConsentimento, string> = {
  dados_invalidos: "Não foi possível iniciar a compra. Atualize a página e tente novamente.",
  termos: "Para avançar, tem de aceitar os Termos e Condições.",
  inicio_imediato: "Para avançar, tem de pedir o início imediato do serviço.",
};

/**
 * Lê e valida o que o browser enviou. Só aceita a escolha do utilizador
 * (plano, fluxo, origem e as duas checkboxes) — versões, textos e horas
 * nunca vêm do browser.
 */
export function lerPedidoCompra(
  ler: (campo: string) => unknown,
): { ok: true; pedido: PedidoCompra } | { ok: false; erro: ErroConsentimento } {
  const plano = ler("plano");
  const fluxo = ler("fluxo");
  const origem = ler("origem");
  if (!ehPlanoId(plano)) return { ok: false, erro: "dados_invalidos" };
  if (!FLUXOS_COMPRA.includes(fluxo as FluxoCompra)) return { ok: false, erro: "dados_invalidos" };
  if (!ORIGENS_COMPRA.includes(origem as OrigemCompra)) return { ok: false, erro: "dados_invalidos" };
  // O fluxo tem de bater certo com o produto.
  if (fluxo === "avulso_conta" && plano !== "avulso") return { ok: false, erro: "dados_invalidos" };
  if (fluxo === "adesao" && plano === "avulso") return { ok: false, erro: "dados_invalidos" };
  // Pedido de caso: só modalidades que tratam um caso, e sempre com o pedido.
  const pedidoId = ler("pedido_id");
  if (fluxo === "pedido_caso") {
    if (plano === "protecao" || origem !== "tratar_caso") return { ok: false, erro: "dados_invalidos" };
    if (typeof pedidoId !== "string" || !UUID_PEDIDO.test(pedidoId)) return { ok: false, erro: "dados_invalidos" };
  } else if (origem === "tratar_caso") {
    return { ok: false, erro: "dados_invalidos" };
  }

  if (ler(CAMPO_ACEITA_TERMOS) !== VALOR_ACEITE) return { ok: false, erro: "termos" };
  if (ler(CAMPO_INICIO_IMEDIATO) !== VALOR_ACEITE) return { ok: false, erro: "inicio_imediato" };

  return {
    ok: true,
    pedido: {
      plano,
      fluxo: fluxo as FluxoCompra,
      origem: origem as OrigemCompra,
      ...(fluxo === "pedido_caso" ? { pedidoId: pedidoId as string } : {}),
    },
  };
}

export type RegistoConsentimento = {
  user_id: string | null;
  email: string | null;
  plano: PlanoId;
  tipo_compra: TipoCompra;
  origem: OrigemCompra;
  conversao_id: string | null;
  termos_versao: string;
  privacidade_versao: string;
  consentimento_inicio_imediato_versao: string;
  texto_aceitacao_termos: string;
  texto_consentimento_inicio_imediato: string;
  aceitou_termos_em: string;
  pediu_inicio_imediato_em: string;
};

/** Registo de prova com as versões e textos em vigor no servidor. */
export function montarRegistoConsentimento(
  dados: {
    plano: PlanoId;
    tipo: TipoCompra;
    origem: OrigemCompra;
    userId: string | null;
    email: string | null;
    conversaoId?: string | null;
  },
  agora: Date = new Date(),
): RegistoConsentimento {
  const inicio = consentimentoInicioImediato(dados.plano);
  const em = agora.toISOString();
  return {
    user_id: dados.userId,
    email: dados.email,
    plano: dados.plano,
    tipo_compra: dados.tipo,
    origem: dados.origem,
    conversao_id: dados.conversaoId ?? null,
    termos_versao: TERMOS_VERSAO,
    privacidade_versao: PRIVACIDADE_VERSAO,
    consentimento_inicio_imediato_versao: inicio.versao || CONSENTIMENTO_INICIO_IMEDIATO_VERSAO,
    texto_aceitacao_termos: TEXTO_ACEITACAO_TERMOS,
    texto_consentimento_inicio_imediato: inicio.texto,
    aceitou_termos_em: em,
    pediu_inicio_imediato_em: em,
  };
}

/** Metadata acrescentada à Checkout Session (e à subscrição, quando há). */
export function metadataConsentimento(consentimentoId: string, plano: PlanoId, tipo: TipoCompra) {
  return { consentimento_compra_id: consentimentoId, produto: plano, tipo_compra: tipo };
}

export interface DependenciasCheckout {
  /** Grava o registo e devolve o id. Lança se falhar — sem registo não há Checkout. */
  registarConsentimento(registo: RegistoConsentimento): Promise<string>;
  /** Cria a Checkout Session com esta metadata extra. */
  criarSessao(metadata: Record<string, string>): Promise<{ id: string; url: string | null }>;
  /** Liga o registo à sessão criada (o webhook também o faz, pela metadata). */
  ligarSessao(consentimentoId: string, sessionId: string): Promise<void>;
}

export async function abrirCheckoutComConsentimento(
  registo: RegistoConsentimento,
  deps: DependenciasCheckout,
): Promise<{ consentimentoId: string; sessionId: string; url: string | null }> {
  const consentimentoId = await deps.registarConsentimento(registo);
  const sessao = await deps.criarSessao(metadataConsentimento(consentimentoId, registo.plano, registo.tipo_compra));
  try {
    await deps.ligarSessao(consentimentoId, sessao.id);
  } catch {
    // Não bloqueia o pagamento: o webhook liga pela metadata.
  }
  return { consentimentoId, sessionId: sessao.id, url: sessao.url };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** id do consentimento lido da metadata Stripe (só formato UUID). */
export function consentimentoDaMetadata(metadata: Record<string, string> | null | undefined) {
  const id = metadata?.consentimento_compra_id;
  return id && UUID.test(id) ? id : null;
}
