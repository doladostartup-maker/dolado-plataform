import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { criarVerificacaoElegibilidade } from "./actions";
import { VerificarElegibilidadeForm } from "./_components/VerificarElegibilidadeForm";
import { VerificacoesElegibilidadeTable } from "./_components/VerificacoesElegibilidadeTable";

export default async function ElegibilidadePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; guardado?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Nunca seleccionar sugestao_ia_* / resposta_bruta_ia aqui — são dados
  // internos, só para o admin ver na revisão.
  const { data: verificacoes } = await supabase
    .from("casos_elegibilidade_portal")
    .select("id, setor, estado_elegibilidade, estado_final, created_at")
    .eq("utilizador_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        Simulador de Elegibilidade
      </h1>
      <p className="max-w-[60ch] text-sm text-[var(--color-ink-muted)]">
        Responda a 4 perguntas rápidas para saber se o seu caso parece ter fundamento para
        reclamação. Alguns casos têm resposta imediata; outros passam por uma revisão nossa,
        com resposta no prazo máximo de 24 horas úteis.
      </p>

      {params.guardado && (
        <p className="text-sm text-[var(--color-status-success)]">
          ✓ Recebemos os seus dados — o resultado segue por e-mail.
        </p>
      )}
      {params.erro && <p className="text-sm text-[var(--color-status-danger)]">{params.erro}</p>}

      <div className="max-w-xl rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-subtle)]">
        <VerificarElegibilidadeForm action={criarVerificacaoElegibilidade} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">
          Histórico
        </h2>
        <VerificacoesElegibilidadeTable verificacoes={verificacoes ?? []} />
      </div>
    </div>
  );
}
