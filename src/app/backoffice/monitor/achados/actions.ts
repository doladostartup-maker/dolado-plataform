"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MSG_ERRO_GUARDAR } from "@/lib/mensagensErro";
import { enviarEmailBrevo } from "@/lib/email/brevo";
import { ASSUNTO_ACHADO_MONITOR, montarHtmlAchadoMonitor } from "@/lib/email/achadoMonitor";

// Revisão humana dos achados do Monitor (F2/F4). Nada chega ao cliente sem
// uma decisão aqui; cada decisão fica em achados_revisoes (só inserção).

const POR_DECIDIR = ["detetado", "em_revisao", "confirmado"];
const TAMANHO_MAXIMO_TEXTO = 1500;

function voltar(id: string, params: Record<string, string>): never {
  redirect(`/backoffice/monitor/achados/${id}?${new URLSearchParams(params).toString()}`);
}

async function achado(id: string) {
  const { user } = await requireAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("achados_monitor")
    .select("id, contrato_id, utilizador_id, estado, evidencia")
    .eq("id", id)
    .maybeSingle();
  if (!data) redirect("/backoffice/monitor/achados");
  return { admin, revisorId: user.id, achado: data };
}

export async function comunicarAchado(formData: FormData) {
  const { admin, revisorId, achado: a } = await achado(String(formData.get("achado_id") ?? ""));
  if (!POR_DECIDIR.includes(a.estado)) voltar(a.id, { erro: "Este achado já foi decidido." });
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto || texto.length > TAMANHO_MAXIMO_TEXTO) voltar(a.id, { erro: `Escreva o texto para o cliente (até ${TAMANHO_MAXIMO_TEXTO} caracteres).` });
  if (formData.get("revisto") !== "sim") voltar(a.id, { erro: "Confirme que reviu a situação e o texto." });

  const { error: erroRevisao } = await admin.from("achados_revisoes").insert({
    achado_id: a.id,
    decisao: "confirmar",
    notas: String(formData.get("notas") ?? "").trim() || null,
    alteracoes: { texto_proposto: (a.evidencia as Record<string, unknown>)?.texto_proposto ?? null, texto_comunicado: texto },
    revisor_id: revisorId,
  });
  if (erroRevisao) voltar(a.id, { erro: MSG_ERRO_GUARDAR });

  const { error } = await admin
    .from("achados_monitor")
    .update({ estado: "comunicado", texto_cliente: texto, comunicado_em: new Date().toISOString() })
    .eq("id", a.id)
    .in("estado", POR_DECIDIR);
  if (error) voltar(a.id, { erro: MSG_ERRO_GUARDAR });

  // E-mail só para o e-mail atual e confirmado da conta. Uma falha no envio
  // não desfaz a comunicação: fica visível no portal.
  let enviado = false;
  try {
    const [{ data: conta }, { data: contrato }] = await Promise.all([
      admin.auth.admin.getUserById(a.utilizador_id),
      admin.from("contratos_monitorizados").select("fornecedor").eq("id", a.contrato_id).maybeSingle(),
    ]);
    const u = conta?.user;
    if (u?.email && u.email_confirmed_at) {
      await enviarEmailBrevo(
        u.email,
        ASSUNTO_ACHADO_MONITOR,
        montarHtmlAchadoMonitor({ fornecedor: contrato?.fornecedor ?? null, texto, url: `https://portal.dolado.pt/portal/contratos/${a.contrato_id}` }),
      );
      enviado = true;
    }
  } catch (erro) {
    console.error("Falha ao enviar o e-mail do achado:", erro);
  }

  revalidatePath("/backoffice/monitor/achados");
  voltar(a.id, { comunicado: enviado ? "email" : "portal" });
}

export async function decidirAchado(formData: FormData) {
  const { admin, revisorId, achado: a } = await achado(String(formData.get("achado_id") ?? ""));
  if (!POR_DECIDIR.includes(a.estado)) voltar(a.id, { erro: "Este achado já foi decidido." });
  const decisao = String(formData.get("decisao") ?? "");
  if (!["descartar", "corrigir_dados", "pedir_informacao"].includes(decisao)) voltar(a.id, { erro: "Decisão inválida." });
  const notas = String(formData.get("notas") ?? "").trim();
  if (decisao === "descartar" && !notas) voltar(a.id, { erro: "Indique porque descarta (fica no registo da revisão)." });

  const { error: erroRevisao } = await admin.from("achados_revisoes").insert({ achado_id: a.id, decisao, notas: notas || null, revisor_id: revisorId });
  if (erroRevisao) voltar(a.id, { erro: MSG_ERRO_GUARDAR });

  const estado = decisao === "descartar" ? "descartado" : "em_revisao";
  await admin.from("achados_monitor").update({ estado }).eq("id", a.id).in("estado", POR_DECIDIR);
  revalidatePath("/backoffice/monitor/achados");
  voltar(a.id, { guardado: "1" });
}
