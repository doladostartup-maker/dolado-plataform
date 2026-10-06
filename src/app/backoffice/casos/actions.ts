"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function parseCasoFormData(formData: FormData) {
  const valorIndicado = formData.get("valor_indicado") as string;
  const minutos = formData.get("minutos") as string;
  const dataFim = formData.get("data_fim_fidelidade") as string;
  const dataEnvioReclamacao = formData.get("data_envio_reclamacao") as string;
  const primeiraRespostaEm = formData.get("primeira_resposta_em") as string;

  return {
    nome: formData.get("nome") as string,
    email: formData.get("email") as string,
    telefone: (formData.get("telefone") as string) || null,
    empresa_parceira: (formData.get("empresa_parceira") as string) || null,
    sector: (formData.get("sector") as string) || null,
    empresa: (formData.get("empresa") as string) || null,
    tipo_problema: (formData.get("tipo_problema") as string) || null,
    problema_tipo: (formData.get("problema_tipo") as string) || null,
    momento_cliente: (formData.get("momento_cliente") as string) || null,
    descricao: (formData.get("descricao") as string) || null,
    status: formData.get("status") as string,
    tipo_abc: (formData.get("tipo_abc") as string) || null,
    data_fim_fidelidade: dataFim || null,
    data_envio_reclamacao: dataEnvioReclamacao || null,
    primeira_resposta_em: primeiraRespostaEm || null,
    minutos: minutos ? Number(minutos) : null,
    disposicao_pagar: formData.get("disposicao_pagar") === "on",
    valor_indicado: valorIndicado ? Number(valorIndicado) : null,
    notas: (formData.get("notas") as string) || null,
    dossie_url: (formData.get("dossie_url") as string) || null,
  };
}

export async function criarCaso(formData: FormData) {
  const supabase = await createClient();
  const dados = parseCasoFormData(formData);

  const { data, error } = await supabase
    .from("casos")
    .insert(dados)
    .select("id")
    .single();

  if (error) {
    redirect(`/backoffice/casos/novo?erro=${encodeURIComponent(error.message)}`);
  }

  redirect(`/backoffice/casos/${data.id}`);
}

export async function actualizarCaso(id: string, formData: FormData) {
  const supabase = await createClient();
  // O estado não se edita aqui: muda pelas ações do fluxo (envio, análise,
  // confirmação do cliente) ou pela correção manual com motivo, validadas na
  // base de dados (transições explícitas).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { status, ...dados } = parseCasoFormData(formData);

  const { error } = await supabase.from("casos").update(dados).eq("id", id);

  if (error) {
    redirect(`/backoffice/casos/${id}?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/backoffice/casos/${id}`);
  redirect(`/backoffice/casos/${id}?guardado=1`);
}
