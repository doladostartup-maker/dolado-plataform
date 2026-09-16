import { criarCaso } from "../actions";
import { CasoForm } from "../_components/CasoForm";

export default async function NovoCasoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Novo caso</h1>
      {params.erro && <p className="text-sm text-red-600">{params.erro}</p>}
      <CasoForm action={criarCaso} submitLabel="Criar caso" />
    </div>
  );
}
