"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MSG_ERRO_GUARDAR } from "@/lib/mensagensErro";
import { processarDocumento } from "@/lib/monitor/servidor";
import { SETORES_CONTRATO, lerEurosParaCents } from "@/lib/monitor/contratos";
import { dataValida, type CampoContrato } from "@/lib/monitor/extracaoFatura";

// Backoffice do Monitor: revisão de documentos que a leitura automática não
// resolveu. As correções do admin ficam com origem "admin" na proveniência.

const TIPO_CAMPO: Partial<Record<CampoContrato, "texto" | "data" | "euros">> = {
  fornecedor: "texto",
  referencia_contrato: "texto",
  servico: "texto",
  data_inicio: "data",
  data_fim_fidelizacao: "data",
  data_fim_promocao: "data",
  descricao_promocao: "texto",
  mensalidade_cents: "euros",
  vantagem_cents: "euros",
  cessacao_operador_cents: "euros",
  cessacao_operador_data: "data",
  cpe: "texto",
  cui: "texto",
};

async function documento(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: doc } = await admin.from("documentos_monitor").select("id, utilizador_id, contrato_id, estado").eq("id", id).maybeSingle();
  if (!doc) redirect("/backoffice/monitor");
  return { admin, doc };
}

function voltar(id: string, params: Record<string, string>): never {
  redirect(`/backoffice/monitor/${id}?${new URLSearchParams(params).toString()}`);
}

export async function reprocessarDocumento(formData: FormData) {
  const { admin, doc } = await documento(String(formData.get("documento_id") ?? ""));
  await admin.from("documentos_monitor").update({ estado: "pendente" }).eq("id", doc.id);
  const r = await processarDocumento(doc.id);
  revalidatePath("/backoffice/monitor");
  voltar(doc.id, { resultado: r.estado, ...(r.motivo ? { motivo: r.motivo } : {}), ...(r.detalhe ? { detalhe: r.detalhe } : {}) });
}

export async function marcarDocumento(formData: FormData) {
  const { admin, doc } = await documento(String(formData.get("documento_id") ?? ""));
  const estado = formData.get("estado") === "ilegivel" ? "ilegivel" : "processado";
  await admin.from("documentos_monitor").update({ estado }).eq("id", doc.id);
  revalidatePath("/backoffice/monitor");
  voltar(doc.id, { resultado: estado });
}

export async function criarContratoParaDocumento(formData: FormData) {
  const { admin, doc } = await documento(String(formData.get("documento_id") ?? ""));
  if (doc.contrato_id) voltar(doc.id, {});
  const setor = String(formData.get("setor") ?? "nao_indicado");
  const fornecedor = String(formData.get("fornecedor") ?? "").trim();
  if (!SETORES_CONTRATO.includes(setor as (typeof SETORES_CONTRATO)[number]) || !fornecedor) {
    voltar(doc.id, { erro: "Indique o setor e o fornecedor." });
  }
  const { data: contrato, error } = await admin
    .from("contratos_monitorizados")
    .insert({ utilizador_id: doc.utilizador_id, setor })
    .select("id")
    .single();
  if (error || !contrato) voltar(doc.id, { erro: MSG_ERRO_GUARDAR });
  await admin.rpc("monitor_campo_definir", {
    p_contrato: contrato.id,
    p_campo: "fornecedor",
    p_valor: fornecedor.slice(0, 200),
    p_origem: "admin",
    p_documento: doc.id,
  });
  await admin.from("documentos_monitor").update({ contrato_id: contrato.id }).eq("id", doc.id);
  revalidatePath("/backoffice/monitor");
  voltar(doc.id, { guardado: "1" });
}

export async function definirCampoAdmin(formData: FormData) {
  const { admin, doc } = await documento(String(formData.get("documento_id") ?? ""));
  if (!doc.contrato_id) voltar(doc.id, { erro: "Crie primeiro o contrato." });
  const campo = String(formData.get("campo") ?? "") as CampoContrato;
  const tipo = TIPO_CAMPO[campo];
  const bruto = String(formData.get("valor") ?? "").trim();
  if (!tipo || !bruto) voltar(doc.id, { erro: "Escolha o campo e indique o valor." });

  const valor = tipo === "texto" ? bruto.slice(0, 200) : tipo === "data" ? (dataValida(bruto) ? bruto : null) : lerEurosParaCents(bruto);
  if (valor === null) voltar(doc.id, { erro: "Valor inválido (datas AAAA-MM-DD; montantes como 42,99)." });

  const { error } = await admin.rpc("monitor_campo_definir", {
    p_contrato: doc.contrato_id,
    p_campo: campo,
    p_valor: valor,
    p_origem: "admin",
    p_documento: doc.id,
  });
  if (error) voltar(doc.id, { erro: MSG_ERRO_GUARDAR });
  revalidatePath("/backoffice/monitor");
  voltar(doc.id, { guardado: "1" });
}
