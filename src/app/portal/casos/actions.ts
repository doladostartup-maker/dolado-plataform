"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
      `/portal/casos/novo?erro=${encodeURIComponent("Tens de autorizar o tratamento dos dados para avançar.")}`,
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

  const { data, error } = await supabase
    .from("casos")
    .insert(dados)
    .select("id")
    .single();

  if (error) {
    redirect(`/portal/casos/novo?erro=${encodeURIComponent(error.message)}`);
  }

  redirect(`/portal/casos/${data.id}`);
}

export async function decidirClienteCaso(
  id: string,
  decisao: "aceitou" | "recusou",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- exigido pela assinatura de Server Action ligada a um form
  _formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // A RLS só devolve o caso se pertencer ao utilizador autenticado —
  // garante a posse antes de usar a service role para escrever.
  const { data: caso } = await supabase
    .from("casos")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!caso) {
    redirect("/portal/casos");
  }

  if (caso.status !== "Aguardando Decisão") {
    redirect(
      `/portal/casos/${id}?erro=${encodeURIComponent("Este caso já não está à espera de decisão.")}`,
    );
  }

  const admin = createAdminClient();
  const dados =
    decisao === "aceitou"
      ? { status: "Resolvido", tipo_abc: "A" }
      : { status: "Bloqueado", tipo_abc: "B" };

  const { error } = await admin.from("casos").update(dados).eq("id", id);

  if (error) {
    redirect(`/portal/casos/${id}?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/portal/casos/${id}`);
  redirect(`/portal/casos/${id}?guardado=1`);
}
