import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONSENTIMENTO_COMUNICACOES_VERSAO, TEXTO_CONSENTIMENTO_COMUNICACOES } from "@/lib/legal";
import {
  COOKIE_PEDIDO,
  DIAS_VALIDADE_PEDIDO,
  ehUuid,
  posseDoPedido,
  pedidoPorPagar,
  type DadosPedido,
  type EstadoPedido,
} from "@/lib/pedidoCaso";

// Leitura e escrita de pedidos_caso — só no servidor, com service_role.
// Quem chama tem de ter a sessão validada (ou estar a gravar um pedido novo
// do próprio browser). As regras estão em src/lib/pedidoCaso.ts.

export type PedidoCaso = {
  id: string;
  user_id: string | null;
  token_hash: string | null;
  estado: EstadoPedido;
  nome: string;
  sector: string;
  empresa: string;
  problema_tipo: string;
  descricao: string | null;
  plano_escolhido: "avulso" | "caso_protecao" | null;
  checkout_session_id: string | null;
  caso_id: string | null;
};

const COLUNAS =
  "id, user_id, token_hash, estado, nome, sector, empresa, problema_tipo, descricao, plano_escolhido, checkout_session_id, caso_id";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Hash do token do cookie do pedido deste browser (null se não houver). */
export async function tokenHashDoCookie() {
  const token = (await cookies()).get(COOKIE_PEDIDO)?.value;
  return token && /^[A-Za-z0-9_-]{32,}$/.test(token) ? hashToken(token) : null;
}

/** Só em Server Actions / Route Handlers (é lá que se podem escrever cookies). */
export async function apagarCookiePedido() {
  (await cookies()).delete(COOKIE_PEDIDO);
}

function linhaDoPedido(dados: DadosPedido) {
  const agora = new Date().toISOString();
  return {
    nome: dados.nome,
    telefone: dados.telefone,
    sector: dados.sector,
    empresa: dados.empresa,
    problema_tipo: dados.problema_tipo,
    descricao: dados.descricao,
    momento_cliente: dados.momento_cliente,
    origem: dados.origem,
    autorizacao: true,
    pedido_confirmado_em: agora,
    consentimento_alertas: dados.consentimento_alertas,
    consentimento_alertas_em: dados.consentimento_alertas ? agora : null,
    // Versão e texto aceites: sempre do servidor, nunca do browser. O
    // trigger da base de dados regista a autorização na conta.
    consentimento_comunicacoes_versao: dados.consentimento_alertas ? CONSENTIMENTO_COMUNICACOES_VERSAO : null,
    consentimento_comunicacoes_texto: dados.consentimento_alertas ? TEXTO_CONSENTIMENTO_COMUNICACOES : null,
    anexo_caminho: dados.anexo?.caminho ?? null,
    anexo_nome: dados.anexo?.nome ?? null,
    anexo_tipo: dados.anexo?.tipo ?? null,
    anexo_tamanho: dados.anexo?.tamanho ?? null,
    expira_em: new Date(Date.now() + DIAS_VALIDADE_PEDIDO * 24 * 3600 * 1000).toISOString(),
  };
}

/**
 * Grava o pedido preenchido. Se este browser já tem um pedido por pagar
 * (ex.: voltou atrás no formulário), atualiza-o em vez de criar outro.
 * Nunca toca em casos.
 */
export async function gravarPedido(dados: DadosPedido, userId: string | null): Promise<string | null> {
  const admin = createAdminClient();
  const tokenHash = await tokenHashDoCookie();

  if (tokenHash) {
    const { data: existente } = await admin
      .from("pedidos_caso")
      .select(COLUNAS)
      .eq("token_hash", tokenHash)
      .maybeSingle<PedidoCaso>();
    if (existente && pedidoPorPagar(existente.estado)) {
      const posse = userId ? posseDoPedido(existente, userId, tokenHash) : existente.user_id ? "negado" : "reclamar";
      if (posse !== "negado") {
        const { error } = await admin
          .from("pedidos_caso")
          .update({ ...linhaDoPedido(dados), ...(userId ? { user_id: userId } : {}) })
          .eq("id", existente.id)
          .in("estado", ["rascunho", "aguarda_pagamento"]);
        if (!error) return existente.id;
      }
    }
  }

  const token = randomBytes(32).toString("base64url");
  const { data, error } = await admin
    .from("pedidos_caso")
    .insert({ ...linhaDoPedido(dados), user_id: userId, token_hash: hashToken(token) })
    .select("id")
    .single();
  if (error || !data) return null;

  (await cookies()).set(COOKIE_PEDIDO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DIAS_VALIDADE_PEDIDO * 24 * 3600,
  });
  return data.id as string;
}

/**
 * Pedido que esta conta pode usar: pelo id (ex.: retomado no portal) ou,
 * sem id, o do cookie deste browser. Um pedido ainda sem conta, com o cookie
 * certo, passa a pertencer a esta conta (atómico: só se continuar sem dono).
 * null = não existe ou não é desta conta.
 */
export async function pedidoDaConta(pedidoId: string | null, userId: string): Promise<PedidoCaso | null> {
  const admin = createAdminClient();
  const tokenHash = await tokenHashDoCookie();

  let consulta = admin.from("pedidos_caso").select(COLUNAS);
  if (pedidoId) {
    if (!ehUuid(pedidoId)) return null;
    consulta = consulta.eq("id", pedidoId);
  } else if (tokenHash) {
    consulta = consulta.eq("token_hash", tokenHash);
  } else {
    return null;
  }
  const { data: pedido } = await consulta.maybeSingle<PedidoCaso>();
  if (!pedido) return null;

  const posse = posseDoPedido(pedido, userId, tokenHash);
  if (posse === "negado") return null;
  if (posse === "dono") return pedido;

  const { data: reclamado } = await admin
    .from("pedidos_caso")
    .update({ user_id: userId })
    .eq("id", pedido.id)
    .is("user_id", null)
    .select(COLUNAS)
    .maybeSingle<PedidoCaso>();
  return reclamado ?? null;
}

/**
 * Há um pedido por pagar, ainda sem conta, ligado a este browser? (para
 * seguir para a conta / retomar depois do login). Um pedido que já é de
 * outra conta não conta — ex.: computador partilhado.
 */
export async function haPedidoPorPagarNoBrowser() {
  const tokenHash = await tokenHashDoCookie();
  if (!tokenHash) return false;
  const { data } = await createAdminClient()
    .from("pedidos_caso")
    .select("estado, user_id")
    .eq("token_hash", tokenHash)
    .maybeSingle<{ estado: EstadoPedido; user_id: string | null }>();
  return !!data && !data.user_id && pedidoPorPagar(data.estado);
}

/**
 * Cria o caso a partir do pedido, a gastar 1 caso disponível (função SQL
 * atómica e idempotente). Só chamar depois de confirmar a posse e o direito
 * (pagamento confirmado pelo webhook, ou caso disponível já pago).
 */
export async function converterPedidoEmCaso(pedidoId: string, userId: string): Promise<string | null> {
  const { data, error } = await createAdminClient().rpc("converter_pedido_em_caso", {
    p_pedido_id: pedidoId,
    p_user_id: userId,
  });
  if (error) throw Object.assign(new Error("converter_pedido_em_caso falhou"), { code: error.code });
  return (data as string | null) ?? null;
}
