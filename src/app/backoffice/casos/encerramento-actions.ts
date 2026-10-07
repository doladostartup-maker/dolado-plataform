"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { avisarCliente } from "@/lib/comunicacoes/servidor";
import { gerarDossieDoCaso } from "@/lib/dossie/servidor";

// Encerramento do caso com encaminhamento externo e dossiê. requireAdmin
// primeiro; só depois a service role. As regras (transição, idempotência,
// bloqueio de novas ações, versões do dossiê) estão na base de dados
// (20261007100000_encerramento_encaminhamento_externo.sql).

function voltar(casoId: string, chave: "ok" | "erro", msg: string): never {
  revalidatePath(`/backoffice/casos/${casoId}`);
  revalidatePath(`/portal/casos/${casoId}`);
  redirect(`/backoffice/casos/${casoId}?acomp_${chave}=${encodeURIComponent(msg)}#encerramento`);
}

const MENSAGENS_ENCERRAR: Record<string, string> = {
  motivo_invalido: "Indique o motivo do encerramento (5 a 1000 caracteres).",
  transicao_invalida: "Este caso não pode ser encerrado com encaminhamento externo no estado atual.",
  comunicacoes_por_analisar: "Há comunicações recebidas por analisar. Analise-as antes de encerrar o caso.",
  invalido: "Caso inválido.",
};

const MENSAGENS_DOSSIE: Record<string, string> = {
  estado_invalido: "O dossiê só é gerado para casos encerrados com encaminhamento externo.",
  falha_storage: "Não foi possível guardar o PDF. Tente gerar o dossiê de novo.",
};

/** Encerra o caso do lado da DoLado, gera o dossiê e avisa o cliente. */
export async function encerrarEncaminhamentoExterno(casoId: string, formData: FormData) {
  const { user } = await requireAdmin();
  const motivo = ((formData.get("motivo") as string | null) ?? "").replace(/\r\n/g, "\n").trim().slice(0, 1000);
  if (motivo.length < 5) voltar(casoId, "erro", MENSAGENS_ENCERRAR.motivo_invalido);

  const { data, error } = await createAdminClient().rpc("caso_encerrar_encaminhamento_externo", {
    p_caso_id: casoId,
    p_motivo: motivo,
    p_admin: user.id,
  });
  const r = (data as { resultado?: string } | null)?.resultado;
  if (error || (r !== "ok" && r !== "ja_encerrado")) voltar(casoId, "erro", MENSAGENS_ENCERRAR[r ?? ""] ?? "Não foi possível encerrar o caso.");
  if (r === "ja_encerrado") voltar(casoId, "ok", "O caso já estava encerrado.");

  // O dossiê é gerado logo a seguir; se falhar, o caso fica encerrado e a
  // equipa gera-o com "Gerar dossiê" (o cliente vê que está a ser preparado).
  const dossie = await gerarDossieDoCaso(casoId, user.id);
  await avisarCliente(casoId, "caso_encerrado_externo");
  if (!dossie.ok) {
    voltar(casoId, "erro", `Caso encerrado, mas o dossiê não foi gerado (${MENSAGENS_DOSSIE[dossie.motivo] ?? dossie.motivo}). Use “Gerar dossiê”.`);
  }
  voltar(casoId, "ok", "Caso encerrado na DoLado. O dossiê foi gerado e o cliente foi avisado.");
}

/** Gera uma versão nova do dossiê (ex.: falhou no encerramento, ou chegou informação nova). */
export async function gerarDossie(casoId: string) {
  const { user } = await requireAdmin();
  const dossie = await gerarDossieDoCaso(casoId, user.id);
  if (!dossie.ok) voltar(casoId, "erro", MENSAGENS_DOSSIE[dossie.motivo] ?? "Não foi possível gerar o dossiê.");
  voltar(casoId, "ok", `Dossiê gerado (versão ${dossie.versao}).`);
}
