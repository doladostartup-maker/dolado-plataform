import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { MeusCasosTable } from "../_components/MeusCasosTable";

export default async function MeusCasosPage() {
  const { supabase, user } = await requireUser();

  const [{ data: casos }, { data: pedidos }] = await Promise.all([
    supabase
      .from("casos")
      .select("id, empresa_parceira, empresa, sector, tipo_problema, problema_tipo, status, data_fim_fidelidade")
      .eq("utilizador_id", user.id)
      .order("created_at", { ascending: false }),
    // Pedidos ainda não pagos: não são casos (não estão a ser tratados), mas
    // o cliente pode retomar o pagamento.
    supabase
      .from("pedidos_caso")
      .select("id, empresa, sector, problema_tipo, estado, created_at")
      .eq("user_id", user.id)
      .in("estado", ["rascunho", "aguarda_pagamento"])
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
          Os meus casos
        </h1>
        <Link
          href="/portal/casos/novo"
          className="rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          + Abrir novo caso
        </Link>
      </div>
      {(pedidos ?? []).length > 0 && (
        <div className="rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-brand-wash)] px-5 py-4 text-[13.5px] text-[var(--color-ink)]">
          <p className="mb-1 font-semibold">Pedidos por concluir</p>
          <p className="mb-3 leading-relaxed text-[var(--color-ink-muted)]">
            Estes pedidos estão guardados, mas ainda não são casos: só começamos a tratá-los depois de escolher a
            modalidade e de o pagamento ser confirmado.
          </p>
          <ul className="flex flex-col gap-2">
            {(pedidos ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {p.empresa} · {p.sector} — {p.problema_tipo}
                </span>
                <Link
                  href={`/tratar-caso/modalidade?pedido=${p.id}`}
                  className="font-semibold text-[var(--color-brand)] underline"
                >
                  Concluir pedido
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <MeusCasosTable casos={casos ?? []} />
    </div>
  );
}
