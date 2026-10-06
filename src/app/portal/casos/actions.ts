"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MSG_ERRO_GUARDAR } from "@/lib/mensagensErro";
import { agendarRascunhoIA } from "@/lib/rascunhoIA/servidor";
import { requireUser } from "@/lib/auth";
import { avisarEquipa } from "@/lib/comunicacoes/servidor";
import { FORMATOS, tipoDeclarado, verificarConteudo } from "@/lib/comunicacoes/anexos";
import { normalizarNomeFicheiro } from "@/lib/comunicacoes/sanitizar";
import { randomUUID } from "node:crypto";

export async function criarCasoCliente(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const autorizacao = formData.get("autorizacao") === "on";
  if (!autorizacao) {
    redirect(
      `/portal/casos/novo?erro=${encodeURIComponent("Confirme o pedido para avançar.")}`,
    );
  }

  const dados = {
    utilizador_id: user.id,
    nome: formData.get("nome") as string,
    email: formData.get("email") as string,
    telefone: (formData.get("telefone") as string) || null,
    empresa_parceira: (formData.get("empresa_parceira") as string) || null,
    sector: (formData.get("sector") as string) || null,
    tipo_problema: (formData.get("tipo_problema") as string) || null,
    descricao: (formData.get("descricao") as string) || null,
    autorizacao,
  };

  // Abrir um caso gasta sempre 1 caso disponível (pago): de forma atómica
  // (dois pedidos em paralelo não gastam o mesmo) e só depois cria o caso.
  // Gasta primeiro um caso da subscrição; só depois uma compra única (Avulso
  // ou Caso Extra, a mais antiga). Devolve o que
  // gastou, para o devolver exatamente se a criação falhar.
  // O RLS não deixa o cliente criar casos diretamente, por isso o insert é
  // feito aqui com service_role — os dados vêm deste formulário e o dono é
  // o utilizador da sessão. Sem casos disponíveis, nada é criado.
  const admin = createAdminClient();
  const { data: consumido, error: erroCredito } = await admin.rpc("consumir_credito_caso", {
    p_user_id: user.id,
  });
  if (erroCredito || typeof consumido !== "string" || !consumido) {
    redirect("/portal/casos/novo");
  }

  // Origem comercial do caso (backoffice): caso incluído na subscrição ou a
  // compra única gasta (Avulso ou Caso Extra).
  let origemCredito = "subscricao";
  if (consumido.startsWith("checkout:")) {
    const { data: compra } = await admin.from("case_credit_grants").select("produto").eq("origem", consumido).maybeSingle();
    origemCredito = (compra?.produto as string | undefined) ?? "avulso";
  }

  const { data, error } = await admin
    .from("casos")
    .insert({ ...dados, status: "Novo", origem_credito: origemCredito })
    .select("id")
    .single();

  if (error || !data) {
    // O caso não foi criado: o crédito volta para a conta.
    await admin.rpc("devolver_credito_caso", { p_user_id: user.id, p_consumo: consumido });
    redirect(`/portal/casos/novo?erro=${encodeURIComponent("Não foi possível criar o caso. Tente novamente.")}`);
  }

  // Auditoria: o caso aberto com uma compra única fica ligado a essa compra.
  if (consumido.startsWith("checkout:")) {
    await admin.from("case_credit_grants").update({ caso_id: data.id }).eq("origem", consumido);
  }

  // Sugestão do texto pela IA: depois da resposta, nunca bloqueia o caso.
  agendarRascunhoIA(data.id);
  redirect(`/portal/casos/${data.id}`);
}

/**
 * Resposta do cliente à solução apresentada pela empresa: "O problema ficou
 * resolvido" (→ Resolvido) ou "não ficou resolvido" (→ de volta à análise).
 * A base de dados confirma que o caso é do utilizador da sessão e que está à
 * espera desta confirmação; nunca fecha por causa do texto da empresa.
 */
export async function confirmarResolucaoCliente(
  id: string,
  resolvido: boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- exigido pela assinatura de Server Action ligada a um form
  _formData: FormData,
) {
  const { user } = await requireUser();
  const { data, error } = await createAdminClient().rpc("caso_confirmar_resolucao", {
    p_caso_id: id,
    p_utilizador: user.id,
    p_resolvido: resolvido,
    p_admin: null,
  });
  const r = (data as { resultado?: string } | null)?.resultado;
  if (r === "invalido") redirect("/portal/casos");
  if (error || r !== "ok") {
    redirect(`/portal/casos/${id}?erro=${encodeURIComponent(r === "estado_invalido" ? "Este caso já não está à espera da sua confirmação." : MSG_ERRO_GUARDAR)}`);
  }
  if (!resolvido) await avisarEquipa(id, "O cliente indicou que o problema não ficou resolvido");
  revalidatePath(`/portal/casos/${id}`);
  redirect(`/portal/casos/${id}?confirmado=${resolvido ? "resolvido" : "nao_resolvido"}`);
}

/** Ficheiros que o cliente pode enviar com a informação pedida (iguais ao bucket anexos-casos). */
const TIPOS_RESPOSTA = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_FICHEIROS_RESPOSTA = 5;
const MAX_TOTAL_RESPOSTA = 20 * 1024 * 1024;

/**
 * Resposta do cliente a um pedido de informação: texto e/ou ficheiros. Os
 * ficheiros vão para o bucket privado do caso com um caminho decidido aqui
 * (<conta>/<uuid>.<ext>); só a equipa os lê. A base de dados confirma a
 * posse, que o pedido está aberto, e passa o caso de volta à DoLado.
 */
export async function responderPedidoCliente(casoId: string, pedidoId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const voltar = (erro: string): never => redirect(`/portal/casos/${casoId}?erro=${encodeURIComponent(erro)}#pedido`);

  // RLS: só devolve o pedido se o caso for do utilizador.
  const { data: pedido } = await supabase.from("casos_pedidos_cliente").select("id, caso_id, estado").eq("id", pedidoId).maybeSingle();
  if (!pedido || pedido.caso_id !== casoId) redirect("/portal/casos");
  if (pedido.estado !== "aberto") voltar("Este pedido já foi respondido.");

  const texto = ((formData.get("resposta") as string | null) ?? "").replace(/\r\n/g, "\n").trim();
  if (texto.length > 5000) voltar("O texto é demasiado longo (máximo de 5000 caracteres).");
  const ficheiros = (formData.getAll("ficheiros") as File[]).filter((f) => f && f.size > 0);
  if (!texto && ficheiros.length === 0) voltar("Escreva a informação pedida ou junte um ficheiro.");
  if (ficheiros.length > MAX_FICHEIROS_RESPOSTA) voltar(`Pode juntar no máximo ${MAX_FICHEIROS_RESPOSTA} ficheiros.`);
  if (ficheiros.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_RESPOSTA) voltar("Os ficheiros têm mais de 20 MB no total.");

  const admin = createAdminClient();
  const guardados: { path: string; nome: string; mime: string; tamanho: number }[] = [];
  for (const f of ficheiros) {
    const formato = FORMATOS.find((x) => x.mime === tipoDeclarado(f.type));
    const bytes = new Uint8Array(await f.arrayBuffer());
    if (!formato || !TIPOS_RESPOSTA.includes(formato.mime) || !verificarConteudo(formato, bytes).ok) {
      await admin.storage.from("anexos-casos").remove(guardados.map((g) => g.path));
      voltar(`“${f.name.slice(0, 60)}” não é um ficheiro aceite (PDF ou imagem).`);
    }
    const path = `${user.id}/${randomUUID()}.${formato!.extensao}`;
    const { error } = await admin.storage.from("anexos-casos").upload(path, bytes, { contentType: formato!.mime, upsert: false });
    if (error) {
      await admin.storage.from("anexos-casos").remove(guardados.map((g) => g.path));
      voltar("Não foi possível carregar os ficheiros. Tente novamente.");
    }
    guardados.push({ path, nome: normalizarNomeFicheiro(f.name, formato!.extensao), mime: formato!.mime, tamanho: f.size });
  }

  const { data, error } = await admin.rpc("pedido_cliente_responder", {
    p_pedido_id: pedidoId,
    p_utilizador: user.id,
    p_texto: texto,
    p_anexos: guardados.map((g) => ({ nome: g.nome, tamanho_bytes: g.tamanho })),
  });
  const r = (data as { resultado?: string } | null)?.resultado;
  if (error || r !== "ok") {
    await admin.storage.from("anexos-casos").remove(guardados.map((g) => g.path));
    voltar(r === "ja_respondido" ? "Este pedido já foi respondido." : MSG_ERRO_GUARDAR);
  }
  if (guardados.length) {
    await admin.from("anexos").insert(
      guardados.map((g) => ({ caso_id: casoId, nome_ficheiro: g.nome, caminho_storage: g.path, tipo_mime: g.mime, tamanho_bytes: g.tamanho, pedido_cliente_id: pedidoId })),
    );
  }
  await avisarEquipa(casoId, "O cliente enviou a informação pedida");
  revalidatePath(`/portal/casos/${casoId}`);
  redirect(`/portal/casos/${casoId}?informacao=enviada`);
}
