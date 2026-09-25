import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { rewerFaturaManualmente } from "../actions";

const INPUT_CLASS =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-hairline-strong)] focus:outline-none";

export default async function ReverFaturaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: fatura } = await supabase
    .from("comparacoes_fatura_portal")
    .select("id, nome, email, operadora, ficheiro_caminho, ficheiro_nome, status, extracao_bruta")
    .eq("id", id)
    .single();

  if (!fatura) {
    notFound();
  }

  let urlFicheiro: string | null = null;
  if (fatura.ficheiro_caminho) {
    const { data } = await supabase.storage
      .from("faturas-comparador")
      .createSignedUrl(fatura.ficheiro_caminho, 60 * 10);
    urlFicheiro = data?.signedUrl ?? null;
  }

  const rever = rewerFaturaManualmente.bind(null, id);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
          Rever fatura de {fatura.nome}
        </h1>
        <Link href="/backoffice/faturas" className="text-sm text-[var(--color-ink-muted)] underline">
          Voltar
        </Link>
      </div>

      <dl className="flex flex-col gap-1.5 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-4 text-sm shadow-[var(--shadow-subtle)]">
        <div>
          <dt className="text-[var(--color-ink-muted)]">E-mail</dt>
          <dd className="text-[var(--color-ink)]">{fatura.email}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-ink-muted)]">Estado</dt>
          <dd className="text-[var(--color-ink)]">{fatura.status}</dd>
        </div>
        {urlFicheiro && (
          <div>
            <dt className="text-[var(--color-ink-muted)]">Ficheiro</dt>
            <dd>
              <a
                href={urlFicheiro}
                target="_blank"
                rel="noopener"
                className="text-[var(--color-brand)] underline"
              >
                {fatura.ficheiro_nome ?? "Ver fatura"}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {query.erro && <p className="text-sm text-[var(--color-status-danger)]">{query.erro}</p>}

      <form action={rever} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
          Operadora / prestador
          <input name="operadora" defaultValue={fatura.operadora ?? ""} className={INPUT_CLASS} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
          Valor total da fatura (€)
          <input
            name="valor_mes_atual"
            type="text"
            inputMode="decimal"
            placeholder="45.50"
            required
            className={INPUT_CLASS}
          />
        </label>
        <button
          type="submit"
          className="self-start rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          Confirmar e enviar ao cliente
        </button>
      </form>
    </div>
  );
}
