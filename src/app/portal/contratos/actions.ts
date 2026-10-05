"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireProtecao } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";
import { MSG_ERRO_GUARDAR } from "@/lib/mensagensErro";
import { MIME_ACEITES, type MimeAceite } from "@/lib/monitor/claudeDocumentos";
import {
  apagarServicoAcompanhado,
  cancelarDocumentoPorAssociar,
  concluirAssociacao,
  processarDocumentoEmSegundoPlano,
  recalcularAcompanhamentoEmSegundoPlano,
  registarRespostaFatura,
  reiniciarProcessamento,
} from "@/lib/monitor/servidor";
import { LIMITE_SEM_AVANCO_MS } from "@/lib/monitor/processamento";
import { CAMPOS_EDITAVEIS, SETORES_CONTRATO, lerEurosParaCents, lerMeses, type TipoCampo } from "@/lib/monitor/contratos";
import { dataValida, type CampoContrato } from "@/lib/monitor/extracaoFatura";

// Monitor de Proteção (serviços acompanhados) — ações do cliente. O cliente não escreve nas tabelas
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
  if (tipo === "meses") return lerMeses(texto);
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

export type ResultadoRegisto = { ok: true; documentoId: string } | { ok: false; erro: string };

/**
 * Regista o documento já carregado e responde logo: a leitura corre a seguir,
 * no servidor (after), e o browser acompanha as etapas pela base de dados.
 * Nenhum pedido HTTP fica à espera da Claude API.
 */
export async function registarDocumento(dados: {
  caminho: string;
  nomeFicheiro: string;
  tipo: string;
  contratoId?: string | null;
}): Promise<ResultadoRegisto> {
  const { supabase, user } = await requireProtecao("contratos");
  const caminho = String(dados.caminho ?? "");
  const nomeFicheiro = String(dados.nomeFicheiro ?? "").slice(0, 200) || null;
  const tipo = dados.tipo === "contrato" ? "contrato" : "fatura";
  const contratoId = dados.contratoId ? String(dados.contratoId) : null;

  // O ficheiro é lido com a service role: só caminhos gerados para este
  // utilizador por prepararUploadDocumento().
  const extensao = caminho.split(".").pop() as string;
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/.test(caminho) || !caminho.startsWith(`${user.id}/`)) {
    return { ok: false, erro: "Ficheiro inválido. Carregue o documento novamente." };
  }
  if (contratoId) {
    const { data: c } = await supabase.from("contratos_monitorizados").select("id").eq("id", contratoId).eq("utilizador_id", user.id).maybeSingle();
    if (!c) return { ok: false, erro: "Contrato não encontrado." };
  }
  if (excedeuLimiteTaxa(`monitor-documento:${user.id}`)) {
    return { ok: false, erro: "Já carregou vários documentos nos últimos minutos. Tente de novo daqui a pouco." };
  }

  const mime = (Object.entries(EXTENSOES).find(([, ext]) => ext === extensao)?.[0] ?? null) as MimeAceite | null;
  const { data: doc, error } = await createAdminClient()
    .from("documentos_monitor")
    .insert({
      utilizador_id: user.id,
      contrato_id: contratoId,
      tipo,
      storage_path: caminho,
      nome_ficheiro: nomeFicheiro,
      mime_type: mime,
      etapa: "recebido",
      etapa_atualizada_em: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !doc) return { ok: false, erro: MSG_ERRO_GUARDAR };

  after(() => processarDocumentoEmSegundoPlano(doc.id));
  return { ok: true, documentoId: doc.id };
}

async function documentoDoCliente(documentoId: string) {
  const { supabase, user } = await requireProtecao("contratos");
  const { data: doc } = await supabase
    .from("documentos_monitor")
    .select("id, contrato_id, etapa, estado")
    .eq("id", documentoId)
    .eq("utilizador_id", user.id)
    .maybeSingle();
  return doc;
}

/** "Tentar novamente" depois de uma leitura que falhou ou parou. */
export async function tentarNovamenteDocumento(documentoId: string): Promise<{ ok: boolean }> {
  const doc = await documentoDoCliente(String(documentoId ?? ""));
  if (!doc) return { ok: false };
  const limite = new Date(Date.now() - LIMITE_SEM_AVANCO_MS).toISOString();
  if (!(await reiniciarProcessamento(doc.id, limite))) return { ok: false };
  after(() => processarDocumentoEmSegundoPlano(doc.id));
  return { ok: true };
}

/** O cliente já viu o aviso de documento repetido: a linha deixa de ser precisa. */
export async function descartarDocumentoRepetido(documentoId: string) {
  const doc = await documentoDoCliente(String(documentoId ?? ""));
  if (doc?.etapa === "repetido") {
    await createAdminClient().from("documentos_monitor").delete().eq("id", doc.id).eq("etapa", "repetido");
  }
}

// ---------------------------------------------------------------------------
// Valores lidos do documento — decisões do cliente, gravadas em lote
// ---------------------------------------------------------------------------

export type DecisaoCampo = { campoId: string; acao: "aceitar" | "rejeitar" | "corrigir"; valor?: string };
export type ResultadoDecisoes = { ok: true } | { ok: false; erro: string };

/**
 * Grava de uma vez as decisões do cliente sobre os valores lidos (correto,
 * não está correto, corrigido). Uma só ida à base de dados, atómica
 * (monitor_campos_decidir); sem redirecionar — o browser atualiza a página.
 */
export type AlteracaoContrato = { desde: string; motivo: string } | null;

const MOTIVOS_ALTERACAO = ["renegociacao", "alteracao_tarifaria", "nova_promocao", "mudanca_pacote", "outro"];

export async function confirmarDadosContrato(
  contratoId: string,
  decisoes: DecisaoCampo[],
  alteracao: AlteracaoContrato = null,
): Promise<ResultadoDecisoes> {
  const { user, contrato } = await contratoDoCliente(String(contratoId ?? ""));
  if (alteracao && (!dataValida(alteracao.desde) || !MOTIVOS_ALTERACAO.includes(alteracao.motivo))) {
    return { ok: false, erro: "Indique a data a partir da qual as novas condições se aplicam." };
  }
  if (!Array.isArray(decisoes) || decisoes.length === 0 || decisoes.length > 50) {
    return { ok: false, erro: "Indique pelo menos uma decisão." };
  }

  // Tipo de cada campo proposto, para validar as correções.
  const ids = decisoes.map((d) => String(d.campoId));
  const admin = createAdminClient();
  const { data: campos } = await admin
    .from("contratos_campos")
    .select("id, campo")
    .eq("contrato_id", contrato.id)
    .eq("utilizador_id", user.id)
    .in("id", ids);
  const campoPorId = new Map((campos ?? []).map((c) => [c.id as string, c.campo as CampoContrato]));

  const lote: { campo_id: string; acao: string; valor?: string | number }[] = [];
  for (const d of decisoes) {
    const campo = campoPorId.get(String(d.campoId));
    if (!campo || !["aceitar", "rejeitar", "corrigir"].includes(d.acao)) return { ok: false, erro: MSG_ERRO_GUARDAR };
    if (d.acao !== "corrigir") {
      lote.push({ campo_id: d.campoId, acao: d.acao });
      continue;
    }
    const tipo = CAMPOS_EDITAVEIS[campo];
    const valor = tipo ? lerValor(tipo, String(d.valor ?? "")) : null;
    if (valor === null) return { ok: false, erro: "Verifique os valores corrigidos (datas e montantes)." };
    lote.push({ campo_id: d.campoId, acao: "corrigir", valor });
  }

  // Alteração legítima do contrato (renegociação, nova promoção…): a versão
  // em vigor fecha na véspera, na mesma transação das decisões, e as faturas
  // anteriores continuam a ser comparadas com ela.
  const { error } = await admin.rpc("monitor_campos_decidir", {
    p_utilizador: user.id,
    p_contrato: contrato.id,
    p_decisoes: lote,
    p_alteracao_desde: alteracao?.desde ?? null,
    p_alteracao_motivo: alteracao?.motivo ?? null,
  });
  if (error) {
    console.error("[monitor] falha ao gravar decisões:", error.code, error.message);
    if (alteracao && error.code === "22023") return { ok: false, erro: "A data indicada tem de ser posterior ao início das condições atuais." };
    return { ok: false, erro: MSG_ERRO_GUARDAR };
  }
  // Comparação retroativa das faturas com as condições confirmadas (sem IA).
  after(() => recalcularAcompanhamentoEmSegundoPlano(contrato.id));
  revalidatePath(`/portal/contratos/${contrato.id}`);
  revalidatePath("/portal/contratos");
  return { ok: true };
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

  after(() => recalcularAcompanhamentoEmSegundoPlano(contrato.id));
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

// ---------------------------------------------------------------------------
// Documento por associar — decisão explícita do cliente (auditada)
// ---------------------------------------------------------------------------

export async function decidirDocumento(formData: FormData) {
  const { user } = await requireProtecao("contratos");
  const documentoId = String(formData.get("documento_id") ?? "");
  const decisao = String(formData.get("decisao") ?? "");
  const voltar = `/portal/contratos/documentos/${documentoId}`;

  if (decisao === "cancelar") {
    const ok = await cancelarDocumentoPorAssociar(documentoId, user.id);
    if (!ok) irPara(voltar, { erro: MSG_ERRO_GUARDAR });
    revalidatePath("/portal/contratos");
    irPara("/portal/contratos", { documento: "cancelado" });
  }
  if (decisao !== "associar_mesmo_assim" && decisao !== "outro_servico" && decisao !== "novo_servico") irPara(voltar, { erro: MSG_ERRO_GUARDAR });

  const servicoId = decisao === "outro_servico" ? String(formData.get("servico_id") ?? "") : null;
  if (decisao === "outro_servico" && !servicoId) irPara(voltar, { erro: "Escolha o serviço a que pertence o documento." });

  let r: Awaited<ReturnType<typeof concluirAssociacao>>;
  try {
    r = await concluirAssociacao({ documentoId, utilizadorId: user.id, decisao, servicoId, papel: "cliente", por: user.id });
  } catch {
    irPara(voltar, { erro: MSG_ERRO_GUARDAR });
  }
  if (!r.ok) {
    if (r.erro === "nao_encontrado") redirect("/portal/contratos");
    irPara(voltar, { erro: r.erro === "servico_invalido" ? "Escolha o serviço a que pertence o documento." : MSG_ERRO_GUARDAR });
  }
  revalidatePath("/portal/contratos");
  revalidatePath(`/portal/contratos/${r.servicoId}`);
  irPara(`/portal/contratos/${r.servicoId}`, r.repetido ? { aviso: "repetido" } : { associado: decisao });
}

/** "Confirmar fatura" / "Os valores não estão corretos". */
export async function responderFatura(formData: FormData) {
  const { user } = await requireProtecao("contratos");
  const faturaId = String(formData.get("fatura_id") ?? "");
  const contratoId = String(formData.get("contrato_id") ?? "");
  const acao = formData.get("acao") === "contestar" ? "contestar" : "confirmar";
  await registarRespostaFatura(faturaId, user.id, acao);
  revalidatePath(`/portal/contratos/${contratoId}`);
  irPara(`/portal/contratos/${contratoId}`, { fatura: acao === "confirmar" ? "confirmada" : "contestada" });
}

// Deixar de acompanhar: apaga o serviço e toda a informação associada (base
// de dados primeiro, numa só operação; ficheiros depois). Irreversível — a
// página pede confirmação. Ficar sem serviços acompanhados é válido.
export async function deixarDeAcompanhar(formData: FormData) {
  const { user, contrato } = await contratoDoCliente(String(formData.get("contrato_id") ?? ""));
  if (formData.get("confirmar") !== "sim") redirect(`/portal/contratos/${contrato.id}`);

  const r = await apagarServicoAcompanhado(contrato.id, user.id);
  if (!r.ok) {
    if (r.erro === "nao_encontrado") redirect("/portal/contratos");
    irPara(`/portal/contratos/${contrato.id}`, { erro: MSG_ERRO_GUARDAR });
  }

  revalidatePath("/portal/contratos");
  irPara("/portal/contratos", { removido: r.restantes === 0 ? "ultimo" : "1" });
}
