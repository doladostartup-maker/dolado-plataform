import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { reverElegibilidadeManualmente } from "../actions";
import { DURACAO_LABEL, type DuracaoContrato } from "@/lib/elegibilidade/regras";

const INPUT_CLASS =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-hairline-strong)] focus:outline-none";

const LABEL_SUGESTAO: Record<string, string> = {
  elegivel: "Elegível",
  nao_elegivel: "Não elegível",
  pouco_claro: "Pouco claro",
};

export default async function ReverElegibilidadePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: caso } = await supabase
    .from("casos_elegibilidade_portal")
    .select(
      "id, nome, email, origem, setor, duracao_contrato, empresa_respondeu_bem, descricao_problema, pontuacao_elegibilidade, sugestao_ia_estado, sugestao_ia_razao, confianca_ia",
    )
    .eq("id", id)
    .single();

  if (!caso) {
    notFound();
  }

  const rever = reverElegibilidadeManualmente.bind(null, id);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
          Rever elegibilidade de {caso.nome ?? caso.email}
        </h1>
        <Link href="/backoffice/elegibilidade" className="text-sm text-[var(--color-ink-muted)] underline">
          Voltar
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-4 text-sm shadow-[var(--shadow-subtle)]">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
            Caso do cliente
          </p>
          <dl className="flex flex-col gap-1.5">
            <div>
              <dt className="text-[var(--color-ink-muted)]">E-mail</dt>
              <dd className="text-[var(--color-ink)]">{caso.email}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-muted)]">Origem</dt>
              <dd className="text-[var(--color-ink)]">{caso.origem === "publico" ? "Público (sem conta)" : "Dashboard"}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-muted)]">Setor</dt>
              <dd className="text-[var(--color-ink)]">{caso.setor}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-muted)]">Duração do contrato</dt>
              <dd className="text-[var(--color-ink)]">
                {DURACAO_LABEL[caso.duracao_contrato as DuracaoContrato] ?? caso.duracao_contrato}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-muted)]">Empresa respondeu bem?</dt>
              <dd className="text-[var(--color-ink)]">{caso.empresa_respondeu_bem ? "Sim" : "Não"}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-muted)]">Descrição</dt>
              <dd className="whitespace-pre-line text-[var(--color-ink)]">{caso.descricao_problema}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-brand-wash)] p-4 text-sm">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
            Sugestão da IA — nunca é a decisão
          </p>
          {caso.sugestao_ia_estado ? (
            <>
              <p className="font-semibold text-[var(--color-ink)]">
                {LABEL_SUGESTAO[caso.sugestao_ia_estado]}{" "}
                <span className="font-normal text-[var(--color-ink-muted)]">
                  (confiança: {caso.confianca_ia})
                </span>
              </p>
              <p className="text-[var(--color-ink-muted)]">{caso.sugestao_ia_razao}</p>
            </>
          ) : (
            <p className="text-[var(--color-ink-muted)]">
              Sem sugestão da IA — reveja o caso como fazia antes de haver IA.
            </p>
          )}
        </div>
      </div>

      {query.erro && <p className="text-sm text-[var(--color-status-danger)]">{query.erro}</p>}

      <form action={rever} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
          Decisão final
          <select name="estado_final" required defaultValue="" className={INPUT_CLASS}>
            <option value="" disabled>
              Escolher…
            </option>
            <option value="elegivel">Elegível</option>
            <option value="nao_elegivel">Não elegível</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
          Razão que o cliente vai ler
          <textarea
            name="razao_cliente"
            rows={3}
            required
            placeholder="Linguagem simples, factual — isto vai directo para o e-mail do cliente."
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
          Notas internas <span className="font-normal normal-case text-[var(--color-ink-faint)]">(opcional, não vai ao cliente)</span>
          <textarea name="notas_admin" rows={2} className={INPUT_CLASS} />
        </label>
        <button
          type="submit"
          className="self-start rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          Confirmar e notificar
        </button>
      </form>
    </div>
  );
}
