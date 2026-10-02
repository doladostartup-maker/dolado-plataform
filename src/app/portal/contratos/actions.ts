"use server";

import { createHash, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProtecao } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";
import { MSG_ERRO_GUARDAR } from "@/lib/mensagensErro";
import { MIME_ACEITES, type MimeAceite } from "@/lib/monitor/claudeDocumentos";
import { processarDocumento } from "@/lib/monitor/servidor";
import { SETORES_CONTRATO, lerEurosParaCents } from "@/lib/monitor/contratos";
import { dataValida, type CampoContrato } from "@/lib/monitor/extracaoFatura";

// Monitor de Proteção — ações do cliente. O cliente não escreve nas tabelas
// do Monitor (RLS só de leitura): cada ação valida sessão, Proteção e posse
// (pelo cliente da sessão, com RLS) e só depois usa a service role.

const BUCKET = "documentos-monitor";
const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10 MB
const EXTENSOES: Record<MimeAceite, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Campos que o cliente pode introduzir ou corrigir, e o tipo de cada um.
type TipoCampo = "texto" | "data" | "euros" | "tipo" | "simnao";

const CAMPOS_EDITAVEIS: Partial<Record<CampoContrato, TipoCampo>> = {
  fornecedor: "texto",
  referencia_contrato: "texto",
  servico: "texto",
  data_inicio: "data",
  data_fim_fidelizacao: "data",
  data_fim_promocao: "data",
  descricao_promocao: "texto",
  mensalidade_cents: "euros",
  vantagem_cents: "euros",
  tipo_fidelizacao: "tipo",
  nova_instalacao: "simnao",
  equipamento_subsidiado: "simnao",
};

function irPara(caminho: string, params: Record<string, string>): never {
  redirect(`${caminho}?${new URLSearchParams(params).toString()}`);
}

async function contratoDoCliente(contratoId: string) {
  const { supabase, user } = await requireProtecao("contratos");
  const { data: contrato } = await supabase
    .from("contratos_monitorizados")
    .select("id, desativado_em")
    .eq("id", contratoId)
    .eq("utilizador_id", user.id)
    .maybeSingle();
  if (!contrato || contrato.desativado_em) redirect("/portal/contratos");
  return { supabase, user, contrato };
}

function lerValor(tipo: TipoCampo, bruto: string): string | number | null {
  const texto = bruto.trim();
  if (!texto) return null;
  if (tipo === "tipo") return texto === "primeira" || texto === "refidelizacao" ? texto : null;
  if (tipo === "simnao") return texto === "sim" || texto === "nao" ? texto : null;
  if (tipo === "texto") return texto.slice(0, 200);
  if (tipo === "data") return dataValida(texto) ? texto : null;
  return lerEurosParaCents(texto);
}

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------

export type EstadoUploadDocumento =
  | { ok: true; caminho: string; token: string }
  | { ok: false; erro: string };

export async function prepararUploadDocumento(tipoMime: string, tamanho: number): Promise<EstadoUploadDocumento> {
  const { user } = await requireProtecao("contratos");
  if (!MIME_ACEITES.includes(tipoMime as MimeAceite)) {
    return { ok: false, erro: "Formato não suportado. Envie um PDF ou uma imagem JPG, PNG ou WebP." };
  }
  if (tamanho > TAMANHO_MAXIMO) return { ok: false, erro: "O ficheiro excede o limite de 10 MB." };

  // O caminho é decidido no servidor e não inclui o nome do ficheiro.
  const caminho = `${user.id}/${randomUUID()}.${EXTENSOES[tipoMime as MimeAceite]}`;
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(caminho);
  if (error || !data) return { ok: false, erro: "Não foi possível preparar o envio do ficheiro." };
  return { ok: true, caminho, token: data.token };
}

export async function registarDocumento(formData: FormData) {
  const { supabase, user } = await requireProtecao("contratos");
  const caminho = String(formData.get("caminho") ?? "");
  const nomeFicheiro = String(formData.get("nome_ficheiro") ?? "").slice(0, 200) || null;
  const tipo = formData.get("tipo") === "contrato" ? "contrato" : "fatura";
  const contratoId = String(formData.get("contrato_id") ?? "") || null;
  const voltar = contratoId ? `/portal/contratos/${contratoId}` : "/portal/contratos";

  // O ficheiro é lido com a service role: só caminhos gerados para este
  // utilizador por prepararUploadDocumento().
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/.test(caminho) || !caminho.startsWith(`${user.id}/`)) {
    irPara(voltar, { erro: "Ficheiro inválido. Carregue o documento novamente." });
  }
  if (contratoId) {
    const { data: c } = await supabase.from("contratos_monitorizados").select("id").eq("id", contratoId).eq("utilizador_id", user.id).maybeSingle();
    if (!c) redirect("/portal/contratos");
  }
  if (excedeuLimiteTaxa(`monitor-documento:${user.id}`)) {
    irPara(voltar, { erro: "Já carregou vários documentos nos últimos minutos. Tente de novo daqui a pouco." });
  }

  const admin = createAdminClient();
  const { data: ficheiro } = await admin.storage.from(BUCKET).download(caminho);
  if (!ficheiro) irPara(voltar, { erro: "Não encontrámos o ficheiro carregado. Tente novamente." });
  if (ficheiro.size > TAMANHO_MAXIMO || !MIME_ACEITES.includes(ficheiro.type as MimeAceite)) {
    await admin.storage.from(BUCKET).remove([caminho]);
    irPara(voltar, { erro: "Formato ou tamanho não suportado." });
  }

  const sha256 = createHash("sha256").update(Buffer.from(await ficheiro.arrayBuffer())).digest("hex");
  const { data: repetido } = await admin
    .from("documentos_monitor")
    .select("id, contrato_id")
    .eq("utilizador_id", user.id)
    .eq("sha256", sha256)
    .maybeSingle();
  if (repetido) {
    await admin.storage.from(BUCKET).remove([caminho]);
    irPara(repetido.contrato_id ? `/portal/contratos/${repetido.contrato_id}` : "/portal/contratos", { aviso: "repetido" });
  }

  const { data: doc, error } = await admin
    .from("documentos_monitor")
    .insert({
      utilizador_id: user.id,
      contrato_id: contratoId,
      tipo,
      storage_path: caminho,
      nome_ficheiro: nomeFicheiro,
      mime_type: ficheiro.type,
      tamanho_bytes: ficheiro.size,
      sha256,
    })
    .select("id")
    .single();
  if (error || !doc) irPara(voltar, { erro: MSG_ERRO_GUARDAR });

  const resultado = await processarDocumento(doc.id);
  revalidatePath("/portal/contratos");
  const destino = resultado.contratoId ? `/portal/contratos/${resultado.contratoId}` : "/portal/contratos";
  irPara(destino, { documento: resultado.estado });
}

// ---------------------------------------------------------------------------
// Valores do contrato
// ---------------------------------------------------------------------------

async function campoDoCliente(campoId: string) {
  const { supabase, user } = await requireProtecao("contratos");
  const { data: campo } = await supabase
    .from("contratos_campos")
    .select("id, contrato_id, estado")
    .eq("id", campoId)
    .eq("utilizador_id", user.id)
    .maybeSingle();
  if (!campo) redirect("/portal/contratos");
  return campo;
}

export async function confirmarValor(formData: FormData) {
  const campo = await campoDoCliente(String(formData.get("campo_id") ?? ""));
  if (campo.estado === "proposto" || campo.estado === "em_conflito") {
    const { error } = await createAdminClient().rpc("monitor_campo_aceitar", { p_campo_id: campo.id, p_por: "cliente" });
    if (error) irPara(`/portal/contratos/${campo.contrato_id}`, { erro: MSG_ERRO_GUARDAR });
  }
  revalidatePath(`/portal/contratos/${campo.contrato_id}`);
  redirect(`/portal/contratos/${campo.contrato_id}`);
}

export async function rejeitarValor(formData: FormData) {
  const campo = await campoDoCliente(String(formData.get("campo_id") ?? ""));
  if (campo.estado === "proposto" || campo.estado === "em_conflito") {
    const { error } = await createAdminClient().rpc("monitor_campo_rejeitar", { p_campo_id: campo.id });
    if (error) irPara(`/portal/contratos/${campo.contrato_id}`, { erro: MSG_ERRO_GUARDAR });
  }
  revalidatePath(`/portal/contratos/${campo.contrato_id}`);
  redirect(`/portal/contratos/${campo.contrato_id}`);
}

export async function corrigirContrato(formData: FormData) {
  const contratoId = String(formData.get("contrato_id") ?? "");
  const { contrato } = await contratoDoCliente(contratoId);
  const admin = createAdminClient();
  const voltar = `/portal/contratos/${contrato.id}`;

  const setor = String(formData.get("setor") ?? "");
  if (SETORES_CONTRATO.includes(setor as (typeof SETORES_CONTRATO)[number])) {
    await admin.from("contratos_monitorizados").update({ setor }).eq("id", contrato.id);
  }

  const { data: atuais } = await admin
    .from("contratos_campos")
    .select("campo, valor")
    .eq("contrato_id", contrato.id)
    .eq("estado", "atual");
  const valorAtual = new Map((atuais ?? []).map((a) => [a.campo, JSON.stringify(a.valor)]));

  for (const [campo, tipo] of Object.entries(CAMPOS_EDITAVEIS)) {
    if (!formData.has(campo)) continue;
    const bruto = String(formData.get(campo) ?? "");
    if (!bruto.trim()) continue; // apagar um valor não é suportado: só corrigir
    const valor = lerValor(tipo, bruto);
    if (valor === null) irPara(voltar, { erro: "Verifique os valores indicados (datas e montantes).", editar: "1" });
    if (valorAtual.get(campo) === JSON.stringify(valor)) continue;
    const { error } = await admin.rpc("monitor_campo_definir", {
      p_contrato: contrato.id,
      p_campo: campo,
      p_valor: valor,
      p_origem: "cliente",
    });
    if (error) irPara(voltar, { erro: MSG_ERRO_GUARDAR, editar: "1" });
  }

  revalidatePath(voltar);
  irPara(voltar, { guardado: "1" });
}

export async function criarContratoManual(formData: FormData) {
  const { user } = await requireProtecao("contratos");
  const fornecedor = String(formData.get("fornecedor") ?? "").trim();
  const setor = String(formData.get("setor") ?? "");
  if (!fornecedor) irPara("/portal/contratos/novo", { erro: "Indique o fornecedor." });
  if (!SETORES_CONTRATO.includes(setor as (typeof SETORES_CONTRATO)[number])) {
    irPara("/portal/contratos/novo", { erro: "Escolha o setor." });
  }

  const valores: [CampoContrato, string | number][] = [["fornecedor", fornecedor.slice(0, 200)]];
  for (const [campo, tipo] of Object.entries(CAMPOS_EDITAVEIS) as [CampoContrato, TipoCampo][]) {
    if (campo === "fornecedor" || !formData.has(campo)) continue;
    const bruto = String(formData.get(campo) ?? "");
    if (!bruto.trim()) continue;
    const valor = lerValor(tipo, bruto);
    if (valor === null) irPara("/portal/contratos/novo", { erro: "Verifique os valores indicados (datas e montantes)." });
    valores.push([campo, valor]);
  }
  if (valores.some(([c]) => c === "data_fim_promocao") && !valores.some(([c]) => c === "descricao_promocao")) {
    irPara("/portal/contratos/novo", { erro: "Descreva a promoção (por exemplo, \"Desconto de 10 € na mensalidade\")." });
  }

  const admin = createAdminClient();
  const { data: contrato, error } = await admin
    .from("contratos_monitorizados")
    .insert({ utilizador_id: user.id, setor })
    .select("id")
    .single();
  if (error || !contrato) irPara("/portal/contratos/novo", { erro: MSG_ERRO_GUARDAR });

  for (const [campo, valor] of valores) {
    await admin.rpc("monitor_campo_definir", { p_contrato: contrato.id, p_campo: campo, p_valor: valor, p_origem: "cliente" });
  }

  revalidatePath("/portal/contratos");
  irPara(`/portal/contratos/${contrato.id}`, { guardado: "1" });
}

// Deixar de acompanhar: apaga o contrato, os documentos (ficheiros primeiro)
// e toda a informação associada. Irreversível — a página pede confirmação.
export async function deixarDeAcompanhar(formData: FormData) {
  const { contrato } = await contratoDoCliente(String(formData.get("contrato_id") ?? ""));
  if (formData.get("confirmar") !== "sim") redirect(`/portal/contratos/${contrato.id}`);

  const admin = createAdminClient();
  const { data: docs } = await admin.from("documentos_monitor").select("bucket, storage_path").eq("contrato_id", contrato.id);
  const porBucket = new Map<string, string[]>();
  for (const d of docs ?? []) porBucket.set(d.bucket, [...(porBucket.get(d.bucket) ?? []), d.storage_path]);
  for (const [bucket, caminhos] of porBucket) {
    const { error } = await admin.storage.from(bucket).remove(caminhos);
    if (error) irPara(`/portal/contratos/${contrato.id}`, { erro: MSG_ERRO_GUARDAR });
  }
  const { error } = await admin.from("contratos_monitorizados").delete().eq("id", contrato.id);
  if (error) irPara(`/portal/contratos/${contrato.id}`, { erro: MSG_ERRO_GUARDAR });

  revalidatePath("/portal/contratos");
  irPara("/portal/contratos", { removido: "1" });
}
