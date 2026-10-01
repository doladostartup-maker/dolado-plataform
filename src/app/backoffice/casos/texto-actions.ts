"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ehCanalEnvio } from "@/lib/textoCaso";
import { emitirLinksEEnviarEmail } from "@/lib/textoCasoServidor";

// Ações da equipa sobre o texto. requireAdmin primeiro; só depois a service
// role. Não existe — nem pode existir — uma ação para autorizar ou marcar
// como autorizado: a autorização é sempre do cliente (link ou portal) e a
// base de dados recusa estados sem autorização.

function voltar(casoId: string, chave: "texto_ok" | "texto_erro", msg: string): never {
  revalidatePath(`/backoffice/casos/${casoId}`);
  redirect(`/backoffice/casos/${casoId}?${chave}=${encodeURIComponent(msg)}#texto`);
}

/** Guarda o texto: edita o rascunho atual ou cria uma nova versão. */
export async function guardarTexto(casoId: string, formData: FormData) {
  const { user } = await requireAdmin();
  const conteudo = ((formData.get("conteudo") as string | null) ?? "").replace(/\r\n/g, "\n").trim();
  if (!conteudo) voltar(casoId, "texto_erro", "O texto não pode estar vazio.");
  if (conteudo.length > 50000) voltar(casoId, "texto_erro", "O texto é demasiado longo.");

  const { error } = await createAdminClient().rpc("texto_guardar", {
    p_caso_id: casoId,
    p_conteudo: conteudo,
    p_admin: user.id,
  });
  if (error) voltar(casoId, "texto_erro", "Não foi possível guardar o texto.");
  voltar(casoId, "texto_ok", "Texto guardado.");
}

/** Envia a versão atual ao cliente para revisão (ou reenvia, com links novos). */
export async function enviarTextoParaRevisao(casoId: string, textoId: string) {
  await requireAdmin();
  let msg: string;
  try {
    const { emailEnviado } = await emitirLinksEEnviarEmail(textoId);
    msg = emailEnviado
      ? "Texto enviado ao cliente para revisão."
      : "A versão está à espera de aprovação, mas o e-mail falhou. Use “Reenviar ao cliente” para tentar de novo.";
  } catch {
    voltar(casoId, "texto_erro", "Não foi possível enviar: a versão já não está em rascunho/à espera, ou o caso não tem e-mail.");
  }
  voltar(casoId, "texto_ok", msg);
}

const ERROS_ENVIO: Record<string, string> = {
  nao_autorizado: "Envio bloqueado: esta versão não tem autorização do cliente.",
  versao_antiga: "Envio bloqueado: existe uma versão mais recente.",
  conteudo_diferente: "Envio bloqueado: o texto mudou desde que abriu a página. Atualize e confirme de novo.",
  ja_enviado: "Esta versão já tinha sido registada como enviada.",
  invalido: "Versão inexistente.",
};

/**
 * Regista o envio ao terceiro. A verificação é feita na base de dados
 * (texto_registar_envio + triggers): só a versão atual, autorizada, com o
 * conteúdo autorizado — mesmo que esta ação seja chamada diretamente.
 */
export async function registarEnvioTexto(casoId: string, textoId: string, formData: FormData) {
  const { user } = await requireAdmin();
  const destinatario = ((formData.get("destinatario") as string | null) ?? "").trim();
  const canal = formData.get("canal");
  const resultado = ((formData.get("resultado") as string | null) ?? "").trim();
  const hash = formData.get("conteudo_sha256") as string | null;
  if (!destinatario || destinatario.length > 300) voltar(casoId, "texto_erro", "Indique o destinatário.");
  if (!ehCanalEnvio(canal)) voltar(casoId, "texto_erro", "Escolha o canal de envio.");

  const { data, error } = await createAdminClient().rpc("texto_registar_envio", {
    p_texto_id: textoId,
    p_conteudo_sha256: hash,
    p_destinatario: destinatario,
    p_canal: canal,
    p_resultado: resultado.slice(0, 1000),
    p_admin: user.id,
  });
  const r = (data as { resultado?: string } | null)?.resultado;
  if (error || r !== "enviado") voltar(casoId, "texto_erro", ERROS_ENVIO[r ?? ""] ?? "Não foi possível registar o envio.");
  voltar(casoId, "texto_ok", "Envio registado.");
}
