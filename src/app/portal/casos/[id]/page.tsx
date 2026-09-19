import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { decidirClienteCaso } from "../actions";
import { StatusBadge } from "@/components/StatusBadge";

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
      <div className="flex items-center justify-between">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
          {caso.empresa_parceira ?? "O seu caso"}
        </h1>
        <StatusBadge status={caso.status} />
      </div>

      {query.guardado && (
        <p className="text-sm text-[var(--color-status-success)]">
          A sua decisão foi registada.
        </p>
      )}
      {query.erro && <p className="text-sm text-[var(--color-status-danger)]">{query.erro}</p>}

      <dl className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 text-sm shadow-[var(--shadow-subtle)]">
        <div>
          <dt className="text-[var(--color-ink-muted)]">Sector</dt>
          <dd className="text-[var(--color-ink)]">{caso.sector ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-ink-muted)]">Tipo de problema</dt>
          <dd className="text-[var(--color-ink)]">{caso.tipo_problema ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-ink-muted)]">Descrição</dt>
          <dd className="text-[var(--color-ink)]">{caso.descricao ?? "—"}</dd>
        </div>
        {caso.data_fim_fidelidade && (
          <div>
            <dt className="text-[var(--color-ink-muted)]">Fim de fidelidade</dt>
            <dd className="text-[var(--color-ink)]">{caso.data_fim_fidelidade}</dd>
          </div>
        )}
        {caso.dossie_url && (
          <div>
            <dt className="text-[var(--color-ink-muted)]">Dossiê</dt>
            <dd>
              <a
                href={caso.dossie_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-brand)] underline"
              >
                Ver dossiê
              </a>
            </dd>
          </div>
        )}
      </dl>

      {caso.status === "Aguardando decisão cliente" && (
        <div
          className="flex flex-col gap-3 rounded-[var(--radius-card)] p-5"
          style={{ backgroundColor: "var(--color-status-urgent-wash)" }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: "var(--color-status-urgent)" }}
          >
            Foi encontrada uma proposta para o seu caso
            {caso.valor_indicado != null
              ? ` no valor de ${caso.valor_indicado} €`
              : ""}
            . O que decide?
          </p>
          <div className="flex gap-3">
            <form action={aceitar}>
              <button
                type="submit"
                className="rounded-[var(--radius-button)] border border-[var(--color-status-success)] bg-[var(--color-surface)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-status-success)] hover:bg-[var(--color-status-success-wash)]"
              >
                Aceito
              </button>
            </form>
            <form action={recusar}>
              <button
                type="submit"
                className="rounded-[var(--radius-button)] border border-[var(--color-status-danger)] bg-[var(--color-surface)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-wash)]"
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
