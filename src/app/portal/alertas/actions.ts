"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function validarDatas(dataInicio: string | null, dataFim: string) {
  const hoje = new Date().toISOString().slice(0, 10);

  if (!dataFim) {
    return "Indique a data de fim de fidelização.";
  }
  if (dataFim <= hoje) {
    return "A data de fim de fidelização tem de ser no futuro.";
  }
  if (dataInicio && dataInicio >= dataFim) {
    return "A data de início tem de ser anterior à data de fim.";
  }
  return null;
}

export async function criarAlertaFidelizacaoPortal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("utilizadores")
    .select("nome")
    .eq("id", user.id)
    .single();

  const operadora = ((formData.get("operadora") as string) || "").trim();
  const dataInicio = ((formData.get("data_inicio_contrato") as string) || "").trim() || null;
  const dataFim = ((formData.get("data_fim_fidelizacao") as string) || "").trim();
  const consentimento = formData.get("consentimento") === "on";

  if (!operadora) {
    redirect(
      `/portal/alertas?erro=${encodeURIComponent("Indique a operadora ou prestador.")}`,
    );
  }
  if (!consentimento) {
    redirect(
      `/portal/alertas?erro=${encodeURIComponent("Tem de autorizar o tratamento dos dados para continuar.")}`,
    );
  }

  const erroData = validarDatas(dataInicio, dataFim);
  if (erroData) {
    redirect(`/portal/alertas?erro=${encodeURIComponent(erroData)}`);
  }

  const { error } = await supabase.from("alertas_fidelizacao_portal").insert({
    utilizador_id: user.id,
    nome: perfil?.nome || user.email,
    email: user.email,
    operadora,
    data_inicio_contrato: dataInicio,
    data_fim_fidelizacao: dataFim,
  });

  if (error) {
    redirect(`/portal/alertas?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/portal/alertas");
  redirect("/portal/alertas?guardado=1");
}

export async function actualizarAlertaFidelizacaoPortal(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const operadora = ((formData.get("operadora") as string) || "").trim();
  const dataInicio = ((formData.get("data_inicio_contrato") as string) || "").trim() || null;
  const dataFim = ((formData.get("data_fim_fidelizacao") as string) || "").trim();

  if (!operadora) {
    redirect(
      `/portal/alertas/${id}?erro=${encodeURIComponent("Indique a operadora ou prestador.")}`,
    );
  }

  const erroData = validarDatas(dataInicio, dataFim);
  if (erroData) {
    redirect(`/portal/alertas/${id}?erro=${encodeURIComponent(erroData)}`);
  }

  // A RLS restringe este update à própria linha (utilizador_id = auth.uid());
  // se o alerta pertencer a outra pessoa, o update simplesmente não afecta
  // nenhuma linha.
  const { error } = await supabase
    .from("alertas_fidelizacao_portal")
    .update({
      operadora,
      data_inicio_contrato: dataInicio,
      data_fim_fidelizacao: dataFim,
      // Se a data de fim mudou para mais tarde, os avisos já enviados deixam
      // de fazer sentido — voltam a poder ser enviados na nova data.
      alerta_60d_enviado_em: null,
      alerta_30d_enviado_em: null,
    })
    .eq("id", id);

  if (error) {
    redirect(`/portal/alertas/${id}?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/portal/alertas");
  redirect("/portal/alertas?guardado=1");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- exigido pela assinatura de Server Action ligada a um form
export async function apagarAlertaFidelizacaoPortal(id: string, _formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("alertas_fidelizacao_portal").delete().eq("id", id);

  if (error) {
    redirect(`/portal/alertas?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/portal/alertas");
  redirect("/portal/alertas?apagado=1");
}
