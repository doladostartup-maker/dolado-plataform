import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import type { RegraJuridica } from "@/lib/rascunhoIA/regras";
import { atualizarRegra } from "../actions";
import { RegraForm } from "../_components/RegraForm";

export default async function RegraJuridicaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("regras_juridicas").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const regra = data as RegraJuridica;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/backoffice/regras-juridicas" prefetch={false} className="text-sm text-[var(--color-ink-muted)] underline">
          ← Base jurídica
        </Link>
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">{regra.codigo}</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">
          As sugestões já geradas guardam a versão da regra que receberam; esta alteração só vale para as próximas.
        </p>
      </div>
      {query.erro && <p className="text-sm text-[var(--color-status-danger)]">{query.erro}</p>}
      <RegraForm action={atualizarRegra.bind(null, regra.id)} valores={regra} submitLabel="Guardar alterações" />
    </div>
  );
}
