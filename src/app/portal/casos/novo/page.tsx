import { createClient } from "@/lib/supabase/server";
import { criarCasoCliente } from "../actions";
import { ClienteCasoForm } from "../_components/ClienteCasoForm";

export default async function NovoCasoClientePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = user
    ? await supabase
        .from("utilizadores")
        .select("nome, email")
        .eq("id", user.id)
        .single()
    : { data: null };

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Abrir novo caso</h1>
      {params.erro && <p className="text-sm text-red-600">{params.erro}</p>}
      <ClienteCasoForm
        action={criarCasoCliente}
        valoresIniciais={{
          nome: perfil?.nome ?? "",
          email: perfil?.email ?? user?.email ?? "",
        }}
      />
    </div>
  );
}
