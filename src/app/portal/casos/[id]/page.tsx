import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { decidirClienteCaso } from "../actions";

export default async function CasoClienteDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; guardado?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const { data: caso } = await supabase.from("casos").select("*").eq("id", id).single();

  if (!caso) {
    notFound();
  }

  const aceitar = decidirClienteCaso.bind(null, id, "aceitou");
  const recusar = decidirClienteCaso.bind(null, id, "recusou");

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-xl font-semibold">{caso.empresa_parceira ?? "O teu caso"}</h1>

      {query.guardado && (
        <p className="text-sm text-green-600">A tua decisão foi registada.</p>
      )}
      {query.erro && <p className="text-sm text-red-600">{query.erro}</p>}

      <dl className="flex flex-col gap-2 text-sm">
        <div>
          <dt className="text-neutral-500">Sector</dt>
          <dd>{caso.sector ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Tipo de problema</dt>
          <dd>{caso.tipo_problema ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Descrição</dt>
          <dd>{caso.descricao ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Estado</dt>
          <dd>{caso.status}</dd>
        </div>
        {caso.data_fim_fidelidade && (
          <div>
            <dt className="text-neutral-500">Fim de fidelidade</dt>
            <dd>{caso.data_fim_fidelidade}</dd>
          </div>
        )}
        {caso.dossie_url && (
          <div>
            <dt className="text-neutral-500">Dossiê</dt>
            <dd>
              <a
                href={caso.dossie_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Ver dossiê
              </a>
            </dd>
          </div>
        )}
      </dl>

      {caso.status === "Aguardando Decisão" && (
        <div className="flex flex-col gap-3 rounded border p-4">
          <p className="text-sm font-medium">
            Foi encontrada uma proposta para o teu caso
            {caso.valor_indicado != null
              ? ` no valor de ${caso.valor_indicado} €`
              : ""}
            . O que decides?
          </p>
          <div className="flex gap-3">
            <form action={aceitar}>
              <button
                type="submit"
                className="rounded bg-green-600 px-4 py-2 text-sm text-white"
              >
                Aceito
              </button>
            </form>
            <form action={recusar}>
              <button
                type="submit"
                className="rounded bg-red-600 px-4 py-2 text-sm text-white"
              >
                Não aceito, quero avançar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
