// DoLado — Proteção: a fatura enviada num caso como primeiro documento (servidor).
//
// Quem chama já validou a sessão e a Proteção (requireProtecao). A posse do
// caso é verificada aqui com o cliente da sessão (RLS de casos) antes de usar
// a service role nos anexos (só o admin os lê pela RLS); a base de dados
// verifica-a de novo ao gravar (documentos_monitor_anexo_dono).
//
// O ficheiro é copiado dentro do Storage (anexos-casos → documentos-monitor):
// o documento da Proteção tem o seu próprio ciclo de vida (apagado se
// repetido, em "Deixar de acompanhar", 6 meses depois do fim da Proteção) e
// nunca pode apagar o anexo do caso. O anexo do caso não é alterado.

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EXTENSAO_FATURA_DO_CASO,
  anexoReutilizavel,
  escolherFaturaDoCaso,
  type AnexoCaso,
  type FaturaDoCaso,
} from "./faturaDoCaso";

const BUCKET_CASOS = "anexos-casos";
const BUCKET_MONITOR = "documentos-monitor";
const COLUNAS_ANEXO = "id, caso_id, nome_ficheiro, caminho_storage, tipo_mime, tamanho_bytes, pedido_cliente_id, created_at";

/** A fatura de um caso do cliente que ainda não foi usada na Proteção, ou null. */
export async function carregarFaturaDoCaso(supabase: SupabaseClient, userId: string): Promise<FaturaDoCaso | null> {
  const { data: casos } = await supabase.from("casos").select("id, empresa").eq("utilizador_id", userId);
  if (!casos?.length) return null;
  const empresas = new Map(casos.map((c) => [c.id as string, (c.empresa as string | null) ?? null]));

  const [{ data: anexos }, { data: usados }] = await Promise.all([
    createAdminClient().from("anexos").select(COLUNAS_ANEXO).in("caso_id", [...empresas.keys()]),
    supabase.from("documentos_monitor").select("anexo_origem_id").eq("utilizador_id", userId).not("anexo_origem_id", "is", null),
  ]);
  return escolherFaturaDoCaso(
    (anexos ?? []) as AnexoCaso[],
    (usados ?? []).map((u) => u.anexo_origem_id as string),
    (casoId) => empresas.get(casoId) ?? null,
  );
}

export type ResultadoFaturaDoCaso = { ok: true; documentoId: string; novo: boolean } | { ok: false; erro: string };

const ERRO_GERAL = "Não foi possível usar esta fatura. Carregue o documento.";

/**
 * Cria o documento da Proteção a partir do anexo (cópia no Storage + linha em
 * documentos_monitor com anexo_origem_id). Idempotente: o mesmo anexo devolve
 * sempre o mesmo documento. Não inicia a leitura — quem chama decide (after()).
 */
export async function criarDocumentoDaFaturaDoCaso(
  supabase: SupabaseClient,
  userId: string,
  anexoId: string,
): Promise<ResultadoFaturaDoCaso> {
  if (!/^[0-9a-f-]{36}$/i.test(anexoId)) return { ok: false, erro: ERRO_GERAL };
  const admin = createAdminClient();

  const { data: anexo } = await admin.from("anexos").select(COLUNAS_ANEXO).eq("id", anexoId).maybeSingle();
  if (!anexo) return { ok: false, erro: ERRO_GERAL };
  // Posse: o caso tem de ser visível ao cliente da sessão (RLS) e ser dele.
  const { data: caso } = await supabase.from("casos").select("id").eq("id", anexo.caso_id).eq("utilizador_id", userId).maybeSingle();
  if (!caso || !anexoReutilizavel(anexo as AnexoCaso)) return { ok: false, erro: ERRO_GERAL };

  const existente = async () =>
    (await admin.from("documentos_monitor").select("id").eq("anexo_origem_id", anexo.id).eq("utilizador_id", userId).maybeSingle()).data;
  const ja = await existente();
  if (ja) return { ok: true, documentoId: ja.id, novo: false };

  const mime = anexo.tipo_mime as keyof typeof EXTENSAO_FATURA_DO_CASO;
  const destino = `${userId}/${randomUUID()}.${EXTENSAO_FATURA_DO_CASO[mime]}`;
  const { error: erroCopia } = await admin.storage
    .from(BUCKET_CASOS)
    .copy(anexo.caminho_storage, destino, { destinationBucket: BUCKET_MONITOR });
  if (erroCopia) return { ok: false, erro: ERRO_GERAL };

  const { data: doc, error } = await admin
    .from("documentos_monitor")
    .insert({
      utilizador_id: userId,
      tipo: "fatura",
      bucket: BUCKET_MONITOR,
      storage_path: destino,
      nome_ficheiro: ((anexo.nome_ficheiro as string | null) ?? "").slice(0, 200) || null,
      mime_type: mime,
      anexo_origem_id: anexo.id,
      etapa: "recebido",
      etapa_atualizada_em: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !doc) {
    // Só a cópia é desfeita; o anexo do caso nunca é tocado.
    await admin.storage.from(BUCKET_MONITOR).remove([destino]);
    // Duplo clique: o outro pedido já criou o documento.
    const outro = await existente();
    return outro ? { ok: true, documentoId: outro.id, novo: false } : { ok: false, erro: ERRO_GERAL };
  }
  return { ok: true, documentoId: doc.id, novo: true };
}
