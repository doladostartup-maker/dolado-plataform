import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { actualizarCaso, decidirCaso } from "../actions";
import { carregarAnexo, apagarAnexo } from "../anexos-actions";
import { CasoForm } from "../_components/CasoForm";
import { EnviarBoasVindas } from "../_components/EnviarBoasVindas";
import { AnexosCaso } from "../_components/AnexosCaso";

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

  const { data: anexosData } = await supabase
    .from("anexos")
    .select("id, nome_ficheiro, tamanho_bytes, created_at")
    .eq("caso_id", id)
    .order("created_at", { ascending: false });

  const anexos = (anexosData ?? []).map((anexo) => ({
    ...anexo,
    apagarAction: apagarAnexo.bind(null, anexo.id, id),
  }));

  const actualizarComId = actualizarCaso.bind(null, id);
  const aceitar = decidirCaso.bind(null, id, "aceitou");
  const recusar = decidirCaso.bind(null, id, "recusou");
  const carregarComId = carregarAnexo.bind(null, id);

  const criadoEm = new Date(caso.created_at).toLocaleString("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
          {caso.nome}
        </h1>
        <p className="text-[var(--text-caption)] text-[var(--color-ink-faint)]">
          Criado em {criadoEm}
        </p>
      </div>

      {query.guardado && (
        <p className="text-sm text-[var(--color-status-success)]">Alterações guardadas.</p>
      )}
      {query.erro && <p className="text-sm text-[var(--color-status-danger)]">{query.erro}</p>}

      <div className="flex gap-3">
        <form action={aceitar}>
          <button
            type="submit"
            className="rounded-[var(--radius-button)] border border-[var(--color-status-success)] bg-[var(--color-surface)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-status-success)] hover:bg-[var(--color-status-success-wash)]"
          >
            Cliente aceitou oferta
          </button>
        </form>
        <form action={recusar}>
          <button
            type="submit"
            className="rounded-[var(--radius-button)] border border-[var(--color-status-danger)] bg-[var(--color-surface)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-wash)]"
          >
            Cliente recusou oferta
          </button>
        </form>
      </div>

      <EnviarBoasVindas
        casoId={id}
        enviadoEmInicial={caso.email_boas_vindas_enviado_em ?? null}
      />

      <AnexosCaso anexos={anexos} carregarAction={carregarComId} />

      <CasoForm action={actualizarComId} valores={caso} submitLabel="Guardar alterações" />
    </div>
  );
}
