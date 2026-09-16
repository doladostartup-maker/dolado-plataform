import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { actualizarCaso, decidirCaso } from "../actions";
import { CasoForm } from "../_components/CasoForm";

export default async function CasoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; guardado?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const { data: caso } = await supabase
    .from("casos")
    .select("*")
    .eq("id", id)
    .single();

  if (!caso) {
    notFound();
  }

  const actualizarComId = actualizarCaso.bind(null, id);
  const aceitar = decidirCaso.bind(null, id, "aceitou");
  const recusar = decidirCaso.bind(null, id, "recusou");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold">{caso.nome}</h1>

      {query.guardado && (
        <p className="text-sm text-green-600">Alterações guardadas.</p>
      )}
      {query.erro && <p className="text-sm text-red-600">{query.erro}</p>}

      <div className="flex gap-3">
        <form action={aceitar}>
          <button
            type="submit"
            className="rounded bg-green-600 px-4 py-2 text-sm text-white"
          >
            Cliente aceitou oferta
          </button>
        </form>
        <form action={recusar}>
          <button
            type="submit"
            className="rounded bg-red-600 px-4 py-2 text-sm text-white"
          >
            Cliente recusou oferta
          </button>
        </form>
      </div>

      <CasoForm action={actualizarComId} valores={caso} submitLabel="Guardar alterações" />
    </div>
  );
}
