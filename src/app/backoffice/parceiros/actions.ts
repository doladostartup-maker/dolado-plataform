"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAXIMO_CODIGOS_POR_EMISSAO, csvCodigos } from "@/lib/acessoPatrocinado";
import { emitirCodigosDoPacote } from "@/lib/acessoPatrocinadoServidor";

// Programa de Parceiros — acções do backoffice (Parceiro de Distribuição).
// Cada acção verifica o admin primeiro; a service role só é usada depois. As
// regras (pagamento confirmado antes dos códigos, quantidade, estados finais,
// histórico) estão na base de dados — aqui só se valida a forma do pedido.
// As alterações directas gravam alterado_por/criado_por para o histórico.

const ESTADOS_PARCEIRO = ["em_negociacao", "ativo", "suspenso", "encerrado"] as const;

function texto(form: FormData, nome: string, max = 200) {
  const v = String(form.get(nome) ?? "").trim();
  return v ? v.slice(0, max) : null;
}

function voltar(caminho: string, chave: "erro" | "ok", mensagem: string): never {
  redirect(`${caminho}?${chave}=${encodeURIComponent(mensagem)}`);
}

export async function criarParceiroDistribuicao(form: FormData) {
  const { user } = await requireAdmin();
  const nome = texto(form, "nome", 160);
  if (!nome || nome.length < 2) voltar("/backoffice/parceiros", "erro", "Indique o nome da empresa.");
  const email = texto(form, "contacto_email", 254);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) voltar("/backoffice/parceiros", "erro", "E-mail de contacto inválido.");
  const { data, error } = await createAdminClient()
    .from("parceiros")
    .insert({
      distribuicao: true,
      nome,
      contacto_nome: texto(form, "contacto_nome", 120),
      contacto_email: email?.toLowerCase() ?? null,
      estado: "em_negociacao",
      notas: texto(form, "notas", 4000),
      alterado_por: user.id,
    })
    .select("id")
    .single();
  if (error || !data) voltar("/backoffice/parceiros", "erro", "Não foi possível criar o parceiro.");
  redirect(`/backoffice/parceiros/${data.id}?ok=${encodeURIComponent("Parceiro criado (em negociação).")}`);
}

export async function alterarEstadoParceiro(parceiroId: string, form: FormData) {
  const { user } = await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  const estado = String(form.get("estado") ?? "");
  if (!(ESTADOS_PARCEIRO as readonly string[]).includes(estado)) voltar(caminho, "erro", "Estado inválido.");
  const { data: atual } = await createAdminClient().from("parceiros").select("data_inicio").eq("id", parceiroId).maybeSingle();
  const { error } = await createAdminClient()
    .from("parceiros")
    .update({
      estado,
      alterado_por: user.id,
      ...(estado === "ativo" && !atual?.data_inicio
        ? { data_inicio: new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Lisbon" }) }
        : {}),
    })
    .eq("id", parceiroId);
  if (error) voltar(caminho, "erro", "Não foi possível alterar o estado.");
  revalidatePath(caminho);
  voltar(caminho, "ok", "Estado alterado.");
}

export async function criarPacote(parceiroId: string, form: FormData) {
  const { user } = await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  const nome = texto(form, "nome", 120);
  const quantidade = Number(form.get("quantidade"));
  const duracao = Number(form.get("duracao_meses"));
  const valor = Number(String(form.get("valor") ?? "").replace(",", "."));
  const ativacaoAte = String(form.get("ativacao_ate") ?? "");
  if (!nome) voltar(caminho, "erro", "Indique o nome do pacote.");
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 10000) voltar(caminho, "erro", "Quantidade entre 1 e 10 000.");
  if (!Number.isInteger(duracao) || duracao < 1 || duracao > 24) voltar(caminho, "erro", "Duração entre 1 e 24 meses.");
  if (!Number.isFinite(valor) || valor < 0) voltar(caminho, "erro", "Valor acordado inválido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ativacaoAte)) voltar(caminho, "erro", "Indique a data limite de activação.");
  const { error } = await createAdminClient().from("parceiros_pacotes").insert({
    parceiro_id: parceiroId,
    nome,
    quantidade,
    duracao_meses: duracao,
    valor_acordado_cents: Math.round(valor * 100),
    ativacao_ate: ativacaoAte,
    condicoes: texto(form, "condicoes", 4000),
    criado_por: user.id,
    alterado_por: user.id,
  });
  if (error) voltar(caminho, "erro", "Não foi possível criar o pacote.");
  revalidatePath(caminho);
  voltar(caminho, "ok", "Pacote criado. Confirme o pagamento antes de emitir códigos.");
}

export async function confirmarPagamentoPacote(parceiroId: string, pacoteId: string, form: FormData) {
  const { user } = await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  const { data, error } = await createAdminClient().rpc("parceiro_pacote_confirmar_pagamento", {
    p_pacote: pacoteId,
    p_referencia: texto(form, "referencia", 120),
    p_admin: user.id,
  });
  if (error) voltar(caminho, "erro", "Não foi possível confirmar o pagamento.");
  revalidatePath(caminho);
  voltar(caminho, "ok", data === "confirmado" ? "Pagamento confirmado." : "O pagamento já estava confirmado.");
}

export async function prolongarActivacaoPacote(parceiroId: string, pacoteId: string, form: FormData) {
  const { user } = await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  const ativacaoAte = String(form.get("ativacao_ate") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ativacaoAte)) voltar(caminho, "erro", "Data inválida.");
  const { error } = await createAdminClient()
    .from("parceiros_pacotes")
    .update({ ativacao_ate: ativacaoAte, alterado_por: user.id })
    .eq("id", pacoteId)
    .eq("parceiro_id", parceiroId);
  if (error) voltar(caminho, "erro", "Não foi possível alterar a data.");
  revalidatePath(caminho);
  voltar(caminho, "ok", "Data limite de activação alterada.");
}

export async function anularCodigoAcesso(parceiroId: string, codigoId: string, form: FormData) {
  const { user } = await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  const motivo = texto(form, "motivo", 500);
  if (!motivo) voltar(caminho, "erro", "Indique o motivo da anulação.");
  const { data, error } = await createAdminClient().rpc("parceiro_codigo_acesso_anular", {
    p_id: codigoId,
    p_motivo: motivo,
    p_admin: user.id,
  });
  if (error) voltar(caminho, "erro", "Não foi possível anular o código.");
  revalidatePath(caminho);
  voltar(caminho, "ok", data === "anulado" ? "Código anulado." : "O código já tinha sido usado ou anulado.");
}

export type EstadoEmissao =
  | { tipo: "inicio" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "emitidos"; csv: string; quantidade: number; nomeFicheiro: string };

const MENSAGENS_EMISSAO: Record<string, string> = {
  pagamento_por_confirmar: "Confirme primeiro o pagamento do pacote.",
  quantidade_excedida: "A quantidade pedida ultrapassa os acessos do pacote.",
  pacote_anulado: "O pacote está anulado.",
  pacote_expirado: "A data limite de activação do pacote já passou.",
  parceiro_nao_ativo: "O parceiro tem de estar activo.",
  inexistente: "Pacote inexistente.",
};

/**
 * Emite códigos e devolve-os uma única vez, em CSV, ao browser do admin.
 * Não ficam guardados em claro em lado nenhum (nem em registos).
 */
export async function emitirCodigos(pacoteId: string, _: EstadoEmissao, form: FormData): Promise<EstadoEmissao> {
  const { user } = await requireAdmin();
  const quantidade = Number(form.get("quantidade"));
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > MAXIMO_CODIGOS_POR_EMISSAO) {
    return { tipo: "erro", mensagem: `Quantidade entre 1 e ${MAXIMO_CODIGOS_POR_EMISSAO} por emissão.` };
  }
  const { data: pacote } = await createAdminClient()
    .from("parceiros_pacotes")
    .select("nome, ativacao_ate")
    .eq("id", pacoteId)
    .maybeSingle();
  if (!pacote) return { tipo: "erro", mensagem: MENSAGENS_EMISSAO.inexistente };
  try {
    const r = await emitirCodigosDoPacote(pacoteId, quantidade, user.id);
    if (!("codigos" in r)) {
      const extra = r.resultado === "quantidade_excedida" && r.disponiveis !== null ? ` Ainda pode emitir ${r.disponiveis}.` : "";
      return { tipo: "erro", mensagem: (MENSAGENS_EMISSAO[r.resultado] ?? "Não foi possível emitir os códigos.") + extra };
    }
    revalidatePath("/backoffice/parceiros");
    return {
      tipo: "emitidos",
      quantidade: r.codigos.length,
      csv: csvCodigos({ pacote: pacote.nome, validade: pacote.ativacao_ate, codigos: r.codigos }),
      nomeFicheiro: `codigos-${pacote.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}.csv`,
    };
  } catch (erro) {
    console.error(JSON.stringify({ origem: "parceiros_emitir_codigos", erro_codigo: (erro as { code?: string })?.code ?? "erro" }));
    return { tipo: "erro", mensagem: "Não foi possível emitir os códigos." };
  }
}
