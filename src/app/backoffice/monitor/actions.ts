"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MSG_ERRO_GUARDAR } from "@/lib/mensagensErro";
import { alterarTipoDocumento as alterarTipo, marcarDocumentoAdmin, reprocessarDocumentoAdmin } from "@/lib/monitor/servidor";
import { MSG_ERRO_ALTERAR_TIPO } from "@/lib/monitor/tipoDocumento";
import { SETORES_CONTRATO, lerEurosParaCents, lerMeses } from "@/lib/monitor/contratos";
import { dataValida, type CampoContrato } from "@/lib/monitor/extracaoFatura";

// Backoffice do Monitor: revisão de documentos que a leitura automática não
// resolveu. As correções do admin ficam com origem "admin" na proveniência.

const TIPO_CAMPO: Partial<Record<CampoContrato, "texto" | "data" | "euros" | "meses">> = {
  fornecedor: "texto",
  referencia_contrato: "texto",
  servico: "texto",
  data_assinatura: "data",
  data_ativacao: "data",
  data_inicio: "data",
  duracao_fidelizacao_meses: "meses",
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
  const { user } = await requireAdmin();
  const admin = createAdminClient();
  const { data: doc } = await admin.from("documentos_monitor").select("id, utilizador_id, contrato_id, estado").eq("id", id).maybeSingle();
  if (!doc) redirect("/backoffice/monitor");
  return { admin, doc, user };
}

function voltar(id: string, params: Record<string, string>): never {
  redirect(`/backoffice/monitor/${id}?${new URLSearchParams(params).toString()}`);
}

export async function reprocessarDocumento(formData: FormData) {
  const { doc } = await documento(String(formData.get("documento_id") ?? ""));
  const r = await reprocessarDocumentoAdmin(doc.id);
  revalidatePath("/backoffice/monitor");
  // Uma fatura repetida detetada nesta leitura fica "repetido", como no segundo plano.
  const resultado = "repetido" in r && r.repetido ? "repetido" : r.estado;
  const params: Record<string, string> = { resultado };
  if ("motivo" in r && r.motivo) params.motivo = r.motivo;
  if ("detalhe" in r && r.detalhe) params.detalhe = r.detalhe;
  voltar(doc.id, params);
}

// O revisor corrige o tipo (ex.: contrato enviado como fatura) e o mesmo
// ficheiro é lido de novo com o pipeline do tipo novo. A confirmação é pedida
// no ecrã antes de submeter; a auditoria fica em documentos_tipo_alteracoes.
export async function alterarTipoDocumento(formData: FormData) {
  const { doc, user } = await documento(String(formData.get("documento_id") ?? ""));
  const r = await alterarTipo({ documentoId: doc.id, novoTipo: String(formData.get("tipo") ?? ""), por: user.id });
  revalidatePath("/backoffice/monitor");
  if (!r.ok) voltar(doc.id, { erro: MSG_ERRO_ALTERAR_TIPO[r.erro] });
  const p = r.processamento;
  voltar(doc.id, {
    tipo_alterado: "1",
    resultado: p.repetido ? "repetido" : p.estado,
    ...(p.motivo ? { motivo: p.motivo } : {}),
    ...(p.detalhe ? { detalhe: p.detalhe } : {}),
  });
}

export async function marcarDocumento(formData: FormData) {
  const { doc } = await documento(String(formData.get("documento_id") ?? ""));
  const estado = formData.get("estado") === "ilegivel" ? "ilegivel" : "processado";
  try {
    await marcarDocumentoAdmin(doc.id, estado);
  } catch (erro) {
    console.error(erro instanceof Error ? erro.message : erro);
    voltar(doc.id, { erro: MSG_ERRO_GUARDAR });
  }
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

  const valor =
    tipo === "texto"
      ? bruto.slice(0, 200)
      : tipo === "data"
        ? dataValida(bruto) ? bruto : null
        : tipo === "meses"
          ? lerMeses(bruto)
          : lerEurosParaCents(bruto);
  if (valor === null) voltar(doc.id, { erro: "Valor inválido (datas AAAA-MM-DD; montantes como 42,99; meses entre 1 e 60)." });

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
