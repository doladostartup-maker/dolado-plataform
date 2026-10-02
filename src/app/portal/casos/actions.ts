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
  // Gasta primeiro um caso da subscrição; só depois um Avulso. Devolve o que
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

  const { data, error } = await admin
    .from("casos")
    .insert({ ...dados, status: "Novo" })
    .select("id")
    .single();

  if (error || !data) {
    // O caso não foi criado: o crédito volta para a conta.
    await admin.rpc("devolver_credito_caso", { p_user_id: user.id, p_consumo: consumido });
    redirect(`/portal/casos/novo?erro=${encodeURIComponent("Não foi possível criar o caso. Tente novamente.")}`);
  }

  // Auditoria: o caso aberto com um Avulso fica ligado a essa compra.
  if (consumido.startsWith("checkout:")) {
    await admin.from("case_credit_grants").update({ caso_id: data.id }).eq("origem", consumido);
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

  if (caso.status !== "Aguardando decisão cliente") {
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
