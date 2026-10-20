"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAXIMO_CODIGOS_POR_EMISSAO, csvCodigos } from "@/lib/acessoPatrocinado";
import { emitirCodigosDoPacote } from "@/lib/acessoPatrocinadoServidor";
import { after } from "next/server";
import { enviarEmailBrevo } from "@/lib/email/brevo";
import { montarEmailCandidaturaAprovada, montarEmailPagamentoComissoes, montarEmailPrimeiroContacto } from "@/lib/email/parceiros";
import { AVISO_PRIMEIRO_CONTACTO_VERSAO } from "@/lib/legal";
import { lerIva, urlParceiro } from "@/lib/parceiros/regras";
import { criarCodigoParceiro, decidirCandidatura } from "@/lib/parceiros/servidor";

// Programa de Parceiros — acções do backoffice (Distribuição e Indicação).
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

export async function criarParceiro(form: FormData) {
  const { user } = await requireAdmin();
  const indicacao = form.get("indicacao") === "sim";
  const distribuicao = form.get("distribuicao") === "sim";
  if (!indicacao && !distribuicao) voltar("/backoffice/parceiros", "erro", "Escolha pelo menos um tipo de parceria.");
  const nome = texto(form, "nome", 160);
  if (!nome || nome.length < 2) voltar("/backoffice/parceiros", "erro", "Indique o nome da empresa.");
  const email = texto(form, "contacto_email", 254);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) voltar("/backoffice/parceiros", "erro", "E-mail de contacto inválido.");
  const { data, error } = await createAdminClient()
    .from("parceiros")
    .insert({
      indicacao,
      distribuicao,
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
  if (indicacao) {
    // Condições iniciais (valores por omissão da base de dados) e um código.
    await createAdminClient().from("parceiros_condicoes").insert({ parceiro_id: data.id, criado_por: user.id });
    await criarCodigoParceiro(data.id).catch(() => undefined);
  }
  redirect(`/backoffice/parceiros/${data.id}?ok=${encodeURIComponent("Parceiro criado (em negociação). Active-o quando o acordo estiver assinado.")}`);
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

// ===========================================================================
// Parceiro de Indicação
// ===========================================================================

/** Aprovar ou rejeitar uma candidatura; na aprovação, e-mail com o código e a ligação. */
export async function decidirCandidaturaParceiro(candidaturaId: string, aprovar: boolean, form: FormData) {
  const { user } = await requireAdmin();
  const caminho = "/backoffice/parceiros/candidaturas";
  const motivo = texto(form, "motivo", 1000);
  if (!aprovar && !motivo) voltar(caminho, "erro", "Indique o motivo da rejeição.");
  let r: Awaited<ReturnType<typeof decidirCandidatura>>;
  try {
    r = await decidirCandidatura(candidaturaId, aprovar, motivo, user.id);
  } catch {
    voltar(caminho, "erro", "Não foi possível registar a decisão.");
  }
  if (r.resultado === "ja_decidida") voltar(caminho, "erro", "Esta candidatura já tinha sido decidida.");
  if (r.resultado === "aprovada" && r.parceiro_id) {
    const { data: c } = await createAdminClient()
      .from("parceiros_candidaturas")
      .select("email, idioma, tipo_pretendido")
      .eq("id", candidaturaId)
      .maybeSingle();
    if (c) {
      const idioma = c.idioma === "en-GB" ? "en-GB" : "pt-PT";
      const email = montarEmailCandidaturaAprovada({
        idioma,
        codigo: r.codigo ?? null,
        url: r.codigo ? urlParceiro(r.codigo) : null,
        distribuicao: c.tipo_pretendido !== "indicacao",
      });
      after(() => enviarEmailBrevo(c.email, email.assunto, email.html, email.texto).catch(() => undefined));
    }
    revalidatePath("/backoffice/parceiros");
    redirect(`/backoffice/parceiros/${r.parceiro_id}?ok=${encodeURIComponent("Candidatura aprovada. O e-mail com o código está a ser enviado ao candidato.")}`);
  }
  revalidatePath(caminho);
  voltar(caminho, "ok", "Candidatura rejeitada.");
}

export async function novoCodigoParceiro(parceiroId: string) {
  await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  try {
    await criarCodigoParceiro(parceiroId);
  } catch {
    voltar(caminho, "erro", "Não foi possível criar o código.");
  }
  revalidatePath(caminho);
  voltar(caminho, "ok", "Código criado.");
}

export async function alternarCodigoParceiro(parceiroId: string, codigo: string, ativo: boolean) {
  await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  const { error } = await createAdminClient()
    .from("parceiros_codigos")
    .update({ ativo })
    .eq("codigo", codigo)
    .eq("parceiro_id", parceiroId);
  if (error) voltar(caminho, "erro", "Não foi possível alterar o código.");
  revalidatePath(caminho);
  voltar(caminho, "ok", ativo ? "Código reactivado." : "Código desactivado (novas visitas e códigos escritos deixam de contar).");
}

/** Activa a parceria de indicação num parceiro existente (ex.: só distribuição até agora). */
export async function ativarIndicacao(parceiroId: string) {
  const { user } = await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  const admin = createAdminClient();
  const { error } = await admin.from("parceiros").update({ indicacao: true, alterado_por: user.id }).eq("id", parceiroId);
  if (error) voltar(caminho, "erro", "Não foi possível activar a indicação.");
  const { count } = await admin.from("parceiros_condicoes").select("id", { count: "exact", head: true }).eq("parceiro_id", parceiroId);
  if (!count) await admin.from("parceiros_condicoes").insert({ parceiro_id: parceiroId, criado_por: user.id });
  await criarCodigoParceiro(parceiroId).catch(() => undefined);
  revalidatePath(caminho);
  voltar(caminho, "ok", "Parceria de indicação activada, com as condições iniciais e um código.");
}

const euros = (form: FormData, nome: string) => {
  const n = Number(String(form.get(nome) ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

export async function novasCondicoes(parceiroId: string, form: FormData) {
  const { user } = await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  const protecao = euros(form, "protecao");
  const casoProtecao = euros(form, "caso_protecao");
  const minimo = euros(form, "minimo");
  const mensalidades = Number(form.get("mensalidades"));
  const b2b = Number(String(form.get("b2b") ?? "").replace(",", "."));
  const desde = String(form.get("valido_desde") ?? "");
  if (protecao === null || casoProtecao === null || minimo === null) voltar(caminho, "erro", "Valores inválidos.");
  if (!Number.isInteger(mensalidades) || mensalidades < 1 || mensalidades > 24) voltar(caminho, "erro", "Mensalidades entre 1 e 24.");
  if (!Number.isFinite(b2b) || b2b < 0 || b2b > 20) voltar(caminho, "erro", "Percentagem B2B entre 0 e 20.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) voltar(caminho, "erro", "Indique a data a partir da qual valem.");
  const { error } = await createAdminClient().from("parceiros_condicoes").insert({
    parceiro_id: parceiroId,
    valido_desde: `${desde}T00:00:00+00:00`,
    comissao_protecao_cents: protecao,
    comissao_caso_protecao_cents: casoProtecao,
    mensalidades_necessarias: mensalidades,
    b2b_percentagem: b2b,
    minimo_pagamento_cents: minimo,
    nota: texto(form, "nota", 1000),
    criado_por: user.id,
  });
  if (error) voltar(caminho, "erro", error.code === "23505" ? "Já há condições com essa data." : "Não foi possível gravar as condições.");
  revalidatePath(caminho);
  voltar(caminho, "ok", "Novas condições gravadas (valem para as contas atribuídas a partir dessa data).");
}

export async function validarComissao(parceiroId: string, comissaoId: string, aprovar: boolean, form: FormData) {
  const { user } = await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  const motivo = texto(form, "motivo", 500);
  if (!motivo) voltar(caminho, "erro", "Indique o motivo da decisão.");
  const { error } = await createAdminClient().rpc("parceiro_validar_comissao", {
    p_id: comissaoId,
    p_aprovar: aprovar,
    p_motivo: motivo,
    p_admin: user.id,
  });
  if (error) voltar(caminho, "erro", "Não foi possível registar a validação.");
  revalidatePath(caminho);
  voltar(caminho, "ok", aprovar ? "Comissão validada." : "Comissão cancelada.");
}

export async function aprovarComissoes(parceiroId: string, form: FormData) {
  const { user } = await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  const ids = form.getAll("comissao").map(String).filter((v) => /^[0-9a-f-]{36}$/.test(v));
  if (ids.length === 0) voltar(caminho, "erro", "Escolha pelo menos uma comissão elegível.");
  const { data, error } = await createAdminClient().rpc("parceiro_aprovar_comissoes", { p_ids: ids, p_admin: user.id });
  if (error) voltar(caminho, "erro", "Não foi possível aprovar.");
  revalidatePath(caminho);
  voltar(caminho, "ok", `${data ?? 0} comissão(ões) aprovada(s).`);
}

export async function cancelarComissao(parceiroId: string, comissaoId: string, form: FormData) {
  const { user } = await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  const motivo = texto(form, "motivo", 500);
  if (!motivo) voltar(caminho, "erro", "Indique o motivo do cancelamento.");
  const { error } = await createAdminClient().rpc("parceiro_cancelar_comissao", { p_id: comissaoId, p_motivo: motivo, p_admin: user.id });
  if (error) voltar(caminho, "erro", "Não foi possível cancelar.");
  revalidatePath(caminho);
  voltar(caminho, "ok", "Comissão cancelada.");
}

/** Pagamento manual das comissões aprovadas (+ e-mail ao parceiro com os valores). */
export async function registarPagamento(parceiroId: string, form: FormData) {
  const { user } = await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  const ids = form.getAll("comissao").map(String).filter((v) => /^[0-9a-f-]{36}$/.test(v));
  const referencia = texto(form, "referencia", 120);
  const data = String(form.get("pago_em") ?? "");
  const iva = lerIva(form.get("iva"));
  if (ids.length === 0) voltar(caminho, "erro", "Escolha as comissões aprovadas a pagar.");
  if (!referencia || referencia.length < 2) voltar(caminho, "erro", "Indique a referência da transferência.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) voltar(caminho, "erro", "Indique a data do pagamento.");
  if (!iva.ok) voltar(caminho, "erro", "IVA inválido.");
  const { data: r, error } = await createAdminClient().rpc("parceiro_registar_pagamento", {
    p_parceiro: parceiroId,
    p_comissoes: ids,
    p_pago_em: data,
    p_referencia: referencia,
    p_nota: texto(form, "nota", 1000),
    p_admin: user.id,
    p_iva_cents: iva.cents,
    p_documento_parceiro: texto(form, "documento", 120),
  });
  if (error) voltar(caminho, "erro", "Não foi possível registar o pagamento.");
  const res = (r ?? {}) as { resultado?: string; total_cents?: number; iva_cents?: number | null };
  const mensagens: Record<string, string> = {
    ja_registado: "Já havia um pagamento com esta referência (nada foi alterado).",
    comissoes_invalidas: "Só comissões aprovadas deste parceiro, ainda por pagar.",
    iva_invalido: `IVA acima de 23 % das comissões.`,
    sem_valor: "Valor nulo.",
  };
  if (res.resultado !== "registado") voltar(caminho, "erro", mensagens[res.resultado ?? ""] ?? "Não foi possível registar o pagamento.");

  const admin = createAdminClient();
  const { data: p } = await admin
    .from("parceiros")
    .select("contacto_email, parceiros_candidaturas!parceiros_candidatura_id_fkey(idioma)")
    .eq("id", parceiroId)
    .maybeSingle();
  const destino = p?.contacto_email as string | null | undefined;
  if (destino) {
    const cand = (p as { parceiros_candidaturas?: { idioma?: string } | null })?.parceiros_candidaturas;
    const email = montarEmailPagamentoComissoes({
      idioma: cand?.idioma === "en-GB" ? "en-GB" : "pt-PT",
      comissoes: ids.length,
      totalCents: res.total_cents ?? 0,
      ivaCents: res.iva_cents ?? null,
      referencia,
      data,
    });
    after(() => enviarEmailBrevo(destino, email.assunto, email.html, email.texto).catch(() => undefined));
  }
  revalidatePath(caminho);
  voltar(caminho, "ok", destino ? "Pagamento registado e e-mail enviado ao parceiro." : "Pagamento registado (o parceiro não tem e-mail de contacto).");
}

// ---------------------------------------------------------------------------
// Oportunidades B2B

const ESTADOS_OPORTUNIDADE = ["nova", "em_contacto", "reuniao_realizada", "proposta_enviada", "ganha", "perdida"] as const;

export async function criarOportunidade(parceiroId: string, form: FormData) {
  const { user } = await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  const entidade = texto(form, "entidade", 160);
  const apresentada = String(form.get("apresentada_em") ?? "");
  if (!entidade || entidade.length < 2) voltar(caminho, "erro", "Indique a empresa ou entidade.");
  const { error } = await createAdminClient().from("parceiros_oportunidades").insert({
    parceiro_id: parceiroId,
    entidade,
    contacto: texto(form, "contacto", 300),
    ...(/^\d{4}-\d{2}-\d{2}$/.test(apresentada) ? { apresentada_em: apresentada } : {}),
    notas: texto(form, "notas", 4000),
    alterado_por: user.id,
  });
  if (error) voltar(caminho, "erro", "Não foi possível registar a oportunidade.");
  revalidatePath(caminho);
  voltar(caminho, "ok", "Oportunidade registada (válida 90 dias).");
}

export async function atualizarOportunidade(parceiroId: string, oportunidadeId: string, form: FormData) {
  const { user } = await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  const estado = String(form.get("estado") ?? "");
  if (!(ESTADOS_OPORTUNIDADE as readonly string[]).includes(estado) || estado === "ganha") {
    voltar(caminho, "erro", "Estado inválido (para \"Ganha\" use o formulário próprio).");
  }
  const novaValidade = String(form.get("valida_ate") ?? "");
  const motivo = texto(form, "prorrogacao_motivo", 500);
  const { error } = await createAdminClient()
    .from("parceiros_oportunidades")
    .update({
      estado,
      ...(/^\d{4}-\d{2}-\d{2}$/.test(novaValidade) ? { valida_ate: novaValidade } : {}),
      ...(motivo ? { prorrogacao_motivo: motivo } : {}),
      alterado_por: user.id,
    })
    .eq("id", oportunidadeId)
    .eq("parceiro_id", parceiroId);
  if (error) {
    voltar(caminho, "erro", error.code === "22023" ? "Prorrogar a validade exige um motivo novo." : "Não foi possível actualizar (ganha e perdida são finais).");
  }
  revalidatePath(caminho);
  voltar(caminho, "ok", "Oportunidade actualizada.");
}

// Primeiro contacto a uma pessoa indicada pelo parceiro: envia o aviso do
// art. 14.º (com a mensagem opcional) e só grava a prova se a Brevo aceitar.
// Um aviso por oportunidade.
export async function avisarPrimeiroContacto(parceiroId: string, oportunidadeId: string, form: FormData) {
  const { user } = await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  const email = texto(form, "email", 254)?.toLowerCase() ?? null;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) voltar(caminho, "erro", "Indique um e-mail válido para o contacto.");
  const admin = createAdminClient();
  const { data: op } = await admin
    .from("parceiros_oportunidades")
    .select("entidade, contacto, parceiro_id, parceiros(nome)")
    .eq("id", oportunidadeId)
    .maybeSingle();
  if (!op || op.parceiro_id !== parceiroId) voltar(caminho, "erro", "Oportunidade inexistente.");
  if (!op.contacto) voltar(caminho, "erro", "A oportunidade não tem contacto registado.");
  const { count } = await admin
    .from("parceiros_oportunidades_avisos")
    .select("id", { count: "exact", head: true })
    .eq("oportunidade_id", oportunidadeId);
  if (count) voltar(caminho, "erro", "O primeiro contacto desta oportunidade já foi avisado.");
  const parceiro = (op.parceiros as unknown as { nome: string } | null)?.nome ?? "";
  const montado = montarEmailPrimeiroContacto({ parceiro, entidade: op.entidade, mensagem: texto(form, "mensagem", 2000) });
  try {
    await enviarEmailBrevo(email, montado.assunto, montado.html, montado.texto);
  } catch {
    voltar(caminho, "erro", "A Brevo não aceitou o envio. Nada foi registado; tente de novo.");
  }
  const { error } = await admin.from("parceiros_oportunidades_avisos").insert({
    oportunidade_id: oportunidadeId,
    destinatario_email: email,
    aviso_versao: AVISO_PRIMEIRO_CONTACTO_VERSAO,
    assunto: montado.assunto,
    texto: montado.texto,
    enviado_por: user.id,
  });
  revalidatePath(caminho);
  if (error) voltar(caminho, "erro", "E-mail enviado, mas não foi possível registar a prova. Registe-a à mão nas notas.");
  voltar(caminho, "ok", "Aviso de primeiro contacto enviado e registado.");
}

export async function marcarOportunidadeGanha(parceiroId: string, oportunidadeId: string, form: FormData) {
  const { user } = await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  const modo = form.get("modo") === "venda_ativa" ? "venda_ativa" : "indicada";
  const percentagem = Number(String(form.get("percentagem") ?? "").replace(",", "."));
  const inicio = String(form.get("contrato_inicio") ?? "");
  const valor = euros(form, "valor_contratual");
  if (!Number.isFinite(percentagem) || percentagem < 0 || percentagem > 20) voltar(caminho, "erro", "Percentagem entre 0 e 20.");
  if (percentagem > 10 && (modo !== "venda_ativa" || form.get("autorizo") !== "sim")) {
    voltar(caminho, "erro", "Acima de 10 % só em venda activa pelo parceiro e com a sua autorização marcada.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio)) voltar(caminho, "erro", "Indique o início do contrato.");
  const { error } = await createAdminClient()
    .from("parceiros_oportunidades")
    .update({
      estado: "ganha",
      ganha_em: new Date().toISOString(),
      modo,
      percentagem,
      percentagem_autorizada_por: percentagem > 10 ? user.id : null,
      contrato_inicio: inicio,
      contrato_referencia: texto(form, "contrato_referencia", 120),
      valor_contratual_cents: valor,
      alterado_por: user.id,
    })
    .eq("id", oportunidadeId)
    .eq("parceiro_id", parceiroId);
  if (error) {
    voltar(caminho, "erro", error.code === "22023" ? "A atribuição já expirou: prorrogue a validade (com motivo) antes." : "Não foi possível marcar como ganha.");
  }
  revalidatePath(caminho);
  voltar(caminho, "ok", "Oportunidade ganha. Registe as receitas recebidas para calcular a comissão.");
}

export async function registarReceitaOportunidade(parceiroId: string, oportunidadeId: string, form: FormData) {
  const { user } = await requireAdmin();
  const caminho = `/backoffice/parceiros/${parceiroId}`;
  const tipo = form.get("tipo") === "reembolso" ? "reembolso" : "recebimento";
  const valor = euros(form, "valor");
  const data = String(form.get("recebido_em") ?? "");
  if (!valor) voltar(caminho, "erro", "Indique o valor sem IVA.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) voltar(caminho, "erro", "Indique a data.");
  const admin = createAdminClient();
  const { data: op } = await admin.from("parceiros_oportunidades").select("parceiro_id").eq("id", oportunidadeId).maybeSingle();
  if (op?.parceiro_id !== parceiroId) voltar(caminho, "erro", "Oportunidade inexistente.");
  const { error } = await admin.from("parceiros_oportunidades_receitas").insert({
    oportunidade_id: oportunidadeId,
    tipo,
    recebido_em: data,
    valor_sem_iva_cents: valor,
    referencia: texto(form, "referencia", 120),
    registado_por: user.id,
  });
  if (error) voltar(caminho, "erro", "Não foi possível registar a receita.");
  const { data: r } = await admin.rpc("parceiro_b2b_recalcular", { p_oportunidade: oportunidadeId, p_admin: user.id });
  const res = (r ?? {}) as { resultado?: string; valor_cents?: number; diferenca_cents?: number };
  revalidatePath(caminho);
  if (res.resultado === "ajuste_negativo") {
    voltar(caminho, "erro", "A receita desceu abaixo do que já foi aprovado ou pago ao parceiro. Decida o acerto manualmente.");
  }
  voltar(caminho, "ok", "Receita registada e comissão recalculada.");
}
