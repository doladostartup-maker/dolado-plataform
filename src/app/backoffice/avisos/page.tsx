import { requireAdmin } from "@/lib/auth";
import { enviarAvisoSectorial } from "./actions";
import { AvisoSetorialForm } from "./_components/AvisoSetorialForm";

const SETORES = ["Telecomunicações", "Energia", "Água"];

export default async function AvisosSetoriaisPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; enviado?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();

  const contagens: Record<string, number> = {};
  for (const setor of SETORES) {
    const { count } = await supabase
      .from("preferencias_setor")
      .select("*", { count: "exact", head: true })
      .eq("setor", setor);
    contagens[setor] = count ?? 0;
  }

  const { data: avisos } = await supabase
    .from("avisos_setoriais")
    .select("id, setor, titulo, destinatarios_count, enviado_em")
    .order("enviado_em", { ascending: false })
    .limit(20);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        Avisos Sectoriais
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)]">
        Envia um aviso por e-mail a todos os clientes que subscreveram o setor escolhido.
      </p>

      {params.enviado && (
        <p className="text-sm text-[var(--color-status-success)]">
          ✓ Aviso enviado a {params.enviado} cliente{params.enviado === "1" ? "" : "s"}.
        </p>
      )}
      {params.erro && <p className="text-sm text-[var(--color-status-danger)]">{params.erro}</p>}

      <AvisoSetorialForm action={enviarAvisoSectorial} contagens={contagens} />

      <div className="flex flex-col gap-3">
        <h2 className="text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">
          Avisos recentes
        </h2>
        {avisos && avisos.length > 0 ? (
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-subtle)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-surface-sunken)]">
                <tr>
                  <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
                    Setor
                  </th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
                    Título
                  </th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
                    Destinatários
                  </th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
                    Enviado em
                  </th>
                </tr>
              </thead>
              <tbody>
                {avisos.map((aviso) => (
                  <tr key={aviso.id} className="border-t border-[var(--color-hairline)]">
                    <td className="px-3 py-2 text-[var(--color-ink)]">{aviso.setor}</td>
                    <td className="px-3 py-2 text-[var(--color-ink)]">{aviso.titulo}</td>
                    <td className="px-3 py-2 text-[var(--color-ink)]">{aviso.destinatarios_count}</td>
                    <td className="px-3 py-2 text-[var(--color-ink-muted)]">
                      {new Date(aviso.enviado_em).toLocaleString("pt-PT")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-ink-muted)]">Ainda não foi enviado nenhum aviso.</p>
        )}
      </div>
    </div>
  );
}
