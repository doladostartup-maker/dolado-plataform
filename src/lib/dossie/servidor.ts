// Dossiê do caso: leitura dos dados, geração do PDF, gravação no storage
// privado e registo da versão. Só no servidor, com a service role — quem
// chama já validou o papel de admin (requireAdmin). O cliente nunca gera
// dossiês; descarrega-os por /api/dossies/[id].
//
// O PDF reflete só o que existe no sistema no momento da geração; cada
// geração é uma versão nova (casos_dossies), nunca uma substituição.
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { DOSSIE_MODELO_VERSAO, montarDossie, nomeFicheiroDossie, type DadosDossie } from "./modelo";
import { gerarPdfDossie } from "./pdf";

export const BUCKET_DOSSIES = "dossies-casos";
/** Validade das URLs assinadas para descarregar um dossiê. */
export const DOSSIE_URL_SEGUNDOS = 60;

export type ResultadoDossie = { ok: true; dossieId: string; versao: number } | { ok: false; motivo: string };

function falhou(onde: string, error: { message?: string } | null) {
  if (error) throw new Error(`${onde}: ${error.message ?? "erro"}`);
}

/** Lê do sistema tudo o que entra no dossiê (sem notas internas, análises nem endereços técnicos). */
export async function carregarDadosDossie(casoId: string, versao: number, geradoEm: string): Promise<DadosDossie | null> {
  const admin = createAdminClient();
  const { data: caso, error } = await admin
    .from("casos")
    .select("id, nome, empresa, sector, tipo_problema, problema_tipo, descricao, created_at")
    .eq("id", casoId)
    .maybeSingle();
  falhou("casos", error);
  if (!caso) return null;

  const [eventos, envios, comprovativos, recebidas, anexosRecebidos, decisoes, pedidos, documentos, encerramento] = await Promise.all([
    admin.from("casos_eventos").select("tipo, created_at, texto_id, dados").eq("caso_id", casoId).eq("visivel_cliente", true).order("created_at"),
    admin.from("casos_textos_envios").select("id, texto_id, enviado_em, canal, destinatario, referencia").eq("caso_id", casoId).order("enviado_em"),
    admin
      .from("casos_comprovativos")
      .select("envio_id, tipo, nome, identificador_externo, created_at")
      .eq("caso_id", casoId)
      .is("substituido_em", null),
    admin
      .from("casos_comunicacoes_recebidas")
      .select("id, recebida_em, data_mensagem, canal, remetente_nome, remetente_email, assunto, corpo_apresentacao, estado_analise, classificacao, suspeita_spam")
      .eq("caso_id", casoId)
      .order("recebida_em"),
    admin.from("casos_comunicacoes_anexos").select("comunicacao_id, nome, indice").eq("caso_id", casoId).eq("estado", "guardado").order("indice"),
    admin
      .from("casos_analises")
      .select("decisao, mensagem_cliente, created_at")
      .eq("caso_id", casoId)
      .in("decisao", ["resolucao_proposta", "encaminhar"])
      .order("created_at"),
    admin
      .from("casos_pedidos_cliente")
      .select("pedido, created_at, estado, respondido_em, resposta_texto, resposta_anexos")
      .eq("caso_id", casoId)
      .order("created_at"),
    admin.from("anexos").select("nome_ficheiro, created_at").eq("caso_id", casoId).order("created_at"),
    admin.from("casos_encerramentos").select("encerrado_em").eq("caso_id", casoId).order("encerrado_em", { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const [onde, r] of Object.entries({ eventos, envios, comprovativos, recebidas, anexosRecebidos, decisoes, pedidos, documentos, encerramento })) {
    falhou(onde, r.error);
  }

  // Texto de cada envio: a versão apontada pelo registo de envio (imutável).
  const idsTextos = (envios.data ?? []).map((e) => e.texto_id as string);
  const { data: textos, error: erroTextos } = idsTextos.length
    ? await admin.from("casos_textos").select("id, versao, conteudo").in("id", idsTextos)
    : { data: [], error: null };
  falhou("casos_textos", erroTextos);
  const textoPorId = new Map((textos ?? []).map((t) => [t.id as string, t]));

  const anexosPorComunicacao = new Map<string, string[]>();
  for (const a of anexosRecebidos.data ?? []) {
    const lista = anexosPorComunicacao.get(a.comunicacao_id as string) ?? [];
    lista.push(a.nome as string);
    anexosPorComunicacao.set(a.comunicacao_id as string, lista);
  }

  return {
    caso: caso as DadosDossie["caso"],
    eventos: (eventos.data ?? []) as DadosDossie["eventos"],
    envios: (envios.data ?? []).map((e) => ({
      id: e.id as string,
      texto_id: e.texto_id as string,
      enviado_em: e.enviado_em as string,
      canal: e.canal as string,
      destinatario: (e.destinatario as string | null) ?? null,
      referencia: (e.referencia as string | null) ?? null,
      versao: (textoPorId.get(e.texto_id as string)?.versao as number | undefined) ?? null,
      conteudo: (textoPorId.get(e.texto_id as string)?.conteudo as string | undefined) ?? null,
    })),
    comprovativos: (comprovativos.data ?? []) as DadosDossie["comprovativos"],
    recebidas: (recebidas.data ?? []).map((r) => ({
      ...(r as Omit<DadosDossie["recebidas"][number], "anexos">),
      anexos: anexosPorComunicacao.get(r.id as string) ?? [],
    })),
    mensagensCliente: (decisoes.data ?? []) as DadosDossie["mensagensCliente"],
    pedidosCliente: ((pedidos.data ?? []) as DadosDossie["pedidosCliente"]).map((p) => ({
      ...p,
      resposta_anexos: Array.isArray(p.resposta_anexos) ? p.resposta_anexos : [],
    })),
    documentos: (documentos.data ?? []) as DadosDossie["documentos"],
    encerradoEm: (encerramento.data?.encerrado_em as string | undefined) ?? null,
    geradoEm,
    versao,
  };
}

/**
 * Gera uma versão nova do dossiê de um caso encerrado com encaminhamento
 * externo: PDF → storage privado → registo (dossie_registar, que confirma o
 * estado e numera a versão). Nunca lança: devolve o motivo.
 */
export async function gerarDossieDoCaso(casoId: string, adminId: string): Promise<ResultadoDossie> {
  const admin = createAdminClient();
  try {
    const { data: caso } = await admin.from("casos").select("status").eq("id", casoId).maybeSingle();
    if (!caso) return { ok: false, motivo: "caso_inexistente" };
    if (caso.status !== "Encerrado com encaminhamento externo") return { ok: false, motivo: "estado_invalido" };

    // Número previsto para o documento; a base de dados confirma a versão
    // ao registar (gerações em simultâneo dão versões diferentes).
    const { data: ultima } = await admin.from("casos_dossies").select("versao").eq("caso_id", casoId).order("versao", { ascending: false }).limit(1).maybeSingle();
    const versao = ((ultima?.versao as number | undefined) ?? 0) + 1;
    const geradoEm = new Date().toISOString();

    const dados = await carregarDadosDossie(casoId, versao, geradoEm);
    if (!dados) return { ok: false, motivo: "caso_inexistente" };
    const bytes = await gerarPdfDossie(montarDossie(dados));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const nome = nomeFicheiroDossie(casoId, versao);
    const path = `${casoId}/${geradoEm.replace(/[:.]/g, "-")}-${sha256.slice(0, 16)}.pdf`;

    const { error: erroUpload } = await admin.storage.from(BUCKET_DOSSIES).upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (erroUpload) return { ok: false, motivo: "falha_storage" };

    const { data: r, error } = await admin.rpc("dossie_registar", {
      p_caso_id: casoId,
      p_storage_path: path,
      p_nome: nome,
      p_tamanho_bytes: bytes.byteLength,
      p_ficheiro_sha256: sha256,
      p_modelo_versao: DOSSIE_MODELO_VERSAO,
      p_admin: adminId,
    });
    const resultado = r as { resultado?: string; dossie_id?: string; versao?: number } | null;
    if (error || resultado?.resultado !== "ok" || !resultado.dossie_id) {
      // Sem registo, o ficheiro não serve a ninguém: retirar.
      await admin.storage.from(BUCKET_DOSSIES).remove([path]).catch(() => undefined);
      return { ok: false, motivo: resultado?.resultado ?? "falha_registo" };
    }
    return { ok: true, dossieId: resultado.dossie_id, versao: resultado.versao ?? versao };
  } catch (erro) {
    console.error(JSON.stringify({ origem: "dossie", fase: "gerar", resultado: "erro", detalhe: erro instanceof Error ? erro.message.slice(0, 160) : "erro" }));
    return { ok: false, motivo: "erro" };
  }
}
