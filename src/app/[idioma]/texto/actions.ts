"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";
import { ehResultadoAcaoTexto, tokenComFormatoValido, type ResultadoAcaoTexto } from "@/lib/textoCaso";
import { hashToken } from "@/lib/textoCasoTokens";
import { avisarEquipaAlteracoes, reemitirLinksPorLinkAntigo } from "@/lib/textoCasoServidor";

// Ações das páginas públicas de revisão (sem login). Só correm com um POST
// explícito (Server Action, protegida pelo Next.js contra pedidos de outras
// origens). Abrir o link (GET) nunca chega aqui. O token é validado de novo
// em cada ação pela base de dados (hash, finalidade, validade, uso, versão).

export type EstadoAcaoTexto = {
  resultado: ResultadoAcaoTexto | null;
  autorizadoEm?: string | null;
  novoLinkPedido?: boolean;
};

function lerResultado(dados: unknown): EstadoAcaoTexto {
  const r = (dados ?? {}) as { resultado?: unknown; autorizado_em?: string | null };
  return { resultado: ehResultadoAcaoTexto(r.resultado) ? r.resultado : "erro", autorizadoEm: r.autorizado_em ?? null };
}

export async function autorizarPorLink(_anterior: EstadoAcaoTexto, formData: FormData): Promise<EstadoAcaoTexto> {
  const token = formData.get("token");
  if (!tokenComFormatoValido(token)) return { resultado: "invalido" };
  const { data, error } = await createAdminClient().rpc("texto_autorizar_por_link", { p_hash: hashToken(token) });
  if (error) return { resultado: "erro" };
  return lerResultado(data);
}

export async function pedirAlteracoesPorLink(_anterior: EstadoAcaoTexto, formData: FormData): Promise<EstadoAcaoTexto> {
  const token = formData.get("token");
  const mensagem = formData.get("mensagem");
  if (!tokenComFormatoValido(token)) return { resultado: "invalido" };
  if (typeof mensagem !== "string" || !mensagem.trim()) return { resultado: "mensagem_invalida" };

  const admin = createAdminClient();
  const hash = hashToken(token);
  const { data, error } = await admin.rpc("texto_pedir_alteracoes_por_link", { p_hash: hash, p_mensagem: mensagem });
  if (error) return { resultado: "erro" };
  const estado = lerResultado(data);
  if (estado.resultado === "pedido_registado") {
    const { data: link } = await admin.from("casos_textos_links").select("caso_id").eq("token_hash", hash).maybeSingle();
    if (link?.caso_id) await avisarEquipaAlteracoes(link.caso_id as string, (data as { versao?: number }).versao ?? null);
  }
  return estado;
}

/** Link expirado: pede um novo. Resposta sempre igual (não revela nada). */
export async function pedirNovoLink(_anterior: EstadoAcaoTexto, formData: FormData): Promise<EstadoAcaoTexto> {
  const token = formData.get("token");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
  if (tokenComFormatoValido(token) && !excedeuLimiteTaxa(`novo-link:${ip}`)) {
    await reemitirLinksPorLinkAntigo(token);
  }
  return { resultado: null, novoLinkPedido: true };
}
