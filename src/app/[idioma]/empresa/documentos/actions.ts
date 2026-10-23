"use server";

// Monitor da DoLado Empresas (Fase 6A): instalações, carregamento de
// documentos e decisão sobre documentos por associar. Cada acção começa por
// requireEmpresa (sessão aal2 com os dois factores); a base de dados volta a
// validar a organização activa, a instalação, os limites e a quota
// (empresa_criar_instalacao, empresa_registar_documento,
// empresa_pode_criar_servico). O pipeline de leitura é o do Monitor.

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireEmpresa } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";
import { MIME_ACEITES, type MimeAceite } from "@/lib/monitor/claudeDocumentos";
import { cancelarDocumentoPorAssociar, concluirAssociacao, processarDocumentoEmSegundoPlano } from "@/lib/monitor/servidor";
import { MENSAGENS_CARREGAMENTO, MENSAGENS_INSTALACAO } from "@/lib/empresas/monitorPortal";

const BUCKET = "documentos-monitor";
const TAMANHO_MAXIMO = 10 * 1024 * 1024;
const EXTENSOES: Record<MimeAceite, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function comMensagem(caminho: string, chave: "erro" | "info", texto: string): never {
  redirect(`${caminho}?${chave}=${encodeURIComponent(texto)}`);
}

export async function criarInstalacao(formData: FormData) {
  const { user } = await requireEmpresa("empresa/instalacoes:criar");
  const { data, error } = await createAdminClient().rpc("empresa_criar_instalacao", {
    p_user: user.id,
    p_nome: String(formData.get("nome") ?? ""),
    p_morada: String(formData.get("morada") ?? ""),
  });
  if (error) throw new Error(`empresa_criar_instalacao: ${error.message}`);
  const resultado = (data as { resultado: keyof typeof MENSAGENS_INSTALACAO }).resultado;
  revalidatePath("/empresa/instalacoes");
  comMensagem("/empresa/instalacoes", resultado === "criada" ? "info" : "erro", MENSAGENS_INSTALACAO[resultado] ?? MENSAGENS_INSTALACAO.sem_acesso);
}

export type PreparacaoUpload = { ok: true; caminho: string; token: string } | { ok: false; erro: string };

export async function prepararUploadEmpresa(tipoMime: string, tamanho: number): Promise<PreparacaoUpload> {
  const { user } = await requireEmpresa("empresa/documentos:preparar");
  if (!MIME_ACEITES.includes(tipoMime as MimeAceite)) return { ok: false, erro: "Formato não suportado. Envie um PDF ou uma imagem JPG, PNG ou WebP." };
  if (tamanho > TAMANHO_MAXIMO) return { ok: false, erro: "O ficheiro excede o limite de 10 MB." };
  if (excedeuLimiteTaxa(`empresa-documento:${user.id}`)) {
    return { ok: false, erro: "Já carregou vários documentos nos últimos minutos. Tente de novo daqui a pouco." };
  }
  // Caminho decidido no servidor (sem o nome do ficheiro).
  const caminho = `${user.id}/${randomUUID()}.${EXTENSOES[tipoMime as MimeAceite]}`;
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(caminho);
  if (error || !data) return { ok: false, erro: "Não foi possível preparar o envio do ficheiro." };
  return { ok: true, caminho, token: data.token };
}

export type ResultadoRegistoEmpresa = { ok: true; documentoId: string } | { ok: false; erro: string };

export async function registarDocumentoEmpresa(dados: {
  caminho: string;
  nomeFicheiro: string;
  tipo: string;
  instalacaoId: string;
  configuracaoInicial: boolean;
}): Promise<ResultadoRegistoEmpresa> {
  const { user } = await requireEmpresa("empresa/documentos:registar");
  const caminho = String(dados.caminho ?? "");
  const mime = (Object.entries(EXTENSOES).find(([, ext]) => ext === caminho.split(".").pop())?.[0] ?? null) as MimeAceite | null;
  const { data, error } = await createAdminClient().rpc("empresa_registar_documento", {
    p_user: user.id,
    p_instalacao: String(dados.instalacaoId ?? ""),
    p_tipo: dados.tipo === "contrato" ? "contrato" : "fatura",
    p_configuracao_inicial: dados.configuracaoInicial === true,
    p_storage_path: caminho,
    p_nome_ficheiro: String(dados.nomeFicheiro ?? "").slice(0, 200) || null,
    p_mime: mime,
  });
  if (error) return { ok: false, erro: MENSAGENS_CARREGAMENTO.erro };
  const r = data as { resultado: keyof typeof MENSAGENS_CARREGAMENTO; documento_id?: string };
  if (r.resultado !== "registado" || !r.documento_id) return { ok: false, erro: MENSAGENS_CARREGAMENTO[r.resultado] ?? MENSAGENS_CARREGAMENTO.erro };
  const documentoId = r.documento_id;
  after(() => processarDocumentoEmSegundoPlano(documentoId));
  revalidatePath("/empresa/documentos");
  return { ok: true, documentoId };
}

/** Documento "possível": associar à sugestão, a outro serviço da mesma instalação, criar serviço novo ou cancelar. */
export async function decidirDocumentoEmpresa(formData: FormData) {
  const { user } = await requireEmpresa("empresa/documentos:decidir");
  const documentoId = String(formData.get("documento_id") ?? "");
  const decisao = String(formData.get("decisao") ?? "");
  const voltar = `/empresa/documentos/${documentoId}`;

  if (decisao === "cancelar") {
    const ok = await cancelarDocumentoPorAssociar(documentoId, user.id);
    revalidatePath("/empresa/documentos");
    comMensagem("/empresa/documentos", ok ? "info" : "erro", ok ? "O documento foi retirado." : MENSAGENS_CARREGAMENTO.erro);
  }
  if (decisao !== "associar_mesmo_assim" && decisao !== "outro_servico" && decisao !== "novo_servico") comMensagem(voltar, "erro", MENSAGENS_CARREGAMENTO.erro);
  const servicoId = decisao === "outro_servico" ? String(formData.get("servico_id") ?? "") : null;
  if (decisao === "outro_servico" && !servicoId) comMensagem(voltar, "erro", "Escolha o serviço a que pertence o documento.");

  const r = await concluirAssociacao({
    documentoId,
    utilizadorId: user.id,
    decisao: decisao as "associar_mesmo_assim" | "outro_servico" | "novo_servico",
    servicoId,
    papel: "cliente",
    por: user.id,
  });
  revalidatePath("/empresa/documentos");
  if (!r.ok) {
    if (r.erro === "nao_encontrado") redirect("/empresa/documentos");
    comMensagem(
      voltar,
      "erro",
      r.erro === "servico_invalido"
        ? "Escolha um serviço da mesma instalação do documento."
        : r.erro === "limite_servicos"
          ? "O plano já tem o número máximo de serviços. Associe a um serviço existente ou contacte-nos."
          : MENSAGENS_CARREGAMENTO.erro,
    );
  }
  comMensagem("/empresa/documentos", "info", r.repetido ? "Este documento já estava registado." : "Documento associado.");
}
