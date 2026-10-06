"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashConteudo } from "@/lib/textoCasoTokens";
import { MENSAGENS_APLICAR } from "@/lib/rascunhoIA/apresentacao";
import { aplicarRascunhoIA, pedirRascunhoIAManual, rascunhoIAAtivo } from "@/lib/rascunhoIA/servidor";

// Ações da equipa sobre a sugestão do texto pela IA. requireAdmin primeiro;
// só depois a service role. Nenhuma destas ações envia nada ao cliente: o
// envio continua a ser "Enviar ao cliente para revisão", que a base de dados
// recusa enquanto uma sugestão da IA não estiver marcada como revista.

function voltar(casoId: string, chave: "texto_ok" | "texto_erro", msg: string): never {
  revalidatePath(`/backoffice/casos/${casoId}`);
  redirect(`/backoffice/casos/${casoId}?${chave}=${encodeURIComponent(msg)}#texto`);
}

/** "Gerar rascunho com IA" / "Tentar novamente" / "Gerar nova sugestão". */
export async function gerarRascunhoIAAcao(casoId: string, finalidade: "reclamacao" | "nova_comunicacao" = "reclamacao") {
  const { user } = await requireAdmin();
  if (!rascunhoIAAtivo()) voltar(casoId, "texto_erro", "A sugestão por IA está desativada neste ambiente (RASCUNHO_IA_ATIVO).");
  let geracaoId: string | null = null;
  try {
    geracaoId = await pedirRascunhoIAManual(casoId, user.id, finalidade === "nova_comunicacao" ? "nova_comunicacao" : "reclamacao");
  } catch {
    voltar(casoId, "texto_erro", "Não foi possível iniciar a geração.");
  }
  if (!geracaoId) {
    voltar(
      casoId,
      "texto_erro",
      finalidade === "nova_comunicacao" ? "Não foi possível gerar: já há uma sugestão em curso ou ainda não há nenhuma comunicação enviada." : "Já há uma sugestão a ser gerada para este caso.",
    );
  }
  voltar(casoId, "texto_ok", "A gerar a sugestão com IA. A página atualiza quando terminar.");
}

/** Usa uma sugestão já gerada; substituir texto editado exige confirmação. */
export async function aplicarSugestaoIA(casoId: string, geracaoId: string, formData: FormData) {
  const { user } = await requireAdmin();
  const { data: geracao } = await createAdminClient().from("casos_rascunhos_ia").select("caso_id").eq("id", geracaoId).maybeSingle();
  if (geracao?.caso_id !== casoId) voltar(casoId, "texto_erro", MENSAGENS_APLICAR.invalido);
  const resultado = await aplicarRascunhoIA(geracaoId, user.id, formData.get("confirmar") === "on");
  voltar(casoId, resultado === "aplicado" ? "texto_ok" : "texto_erro", MENSAGENS_APLICAR[resultado] ?? MENSAGENS_APLICAR.invalido);
}

/**
 * Guarda o rascunho e regista a revisão humana da sugestão da IA. A revisão
 * fica presa ao conteúdo guardado (hash): só esse texto pode seguir para o
 * cliente. Não envia nada.
 */
export async function guardarTextoRevisto(casoId: string, formData: FormData) {
  const { user } = await requireAdmin();
  const conteudo = ((formData.get("conteudo") as string | null) ?? "").replace(/\r\n/g, "\n").trim();
  if (!conteudo) voltar(casoId, "texto_erro", "O texto não pode estar vazio.");
  if (conteudo.length > 50000) voltar(casoId, "texto_erro", "O texto é demasiado longo.");

  const admin = createAdminClient();
  const { data: textoId, error } = await admin.rpc("texto_guardar", { p_caso_id: casoId, p_conteudo: conteudo, p_admin: user.id });
  if (error || !textoId) voltar(casoId, "texto_erro", "Não foi possível guardar o texto.");

  const { data, error: erroRevisao } = await admin.rpc("texto_marcar_revisto", {
    p_texto_id: textoId,
    p_conteudo_sha256: hashConteudo(conteudo),
    p_admin: user.id,
  });
  const r = (data as { resultado?: string } | null)?.resultado;
  if (erroRevisao || (r !== "revisto" && r !== "ja_revisto")) {
    voltar(casoId, "texto_erro", "Texto guardado, mas não foi possível registar a revisão. Tente de novo.");
  }
  voltar(casoId, "texto_ok", "Texto guardado e marcado como revisto. Já pode ser enviado ao cliente para aprovação.");
}
