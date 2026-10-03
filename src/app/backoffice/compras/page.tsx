import { requireAdmin } from "@/lib/auth";
import { resolverSubscricaoDuplicada } from "./actions";

// Estado operacional das compras: pagas sem conta associada (lembretes a 1
// e 3 dias) e subscrições duplicadas por rever. Nada aqui cancela ou
// reembolsa — isso é decidido e feito no Stripe Dashboard; aqui só se
// regista a resolução.

const TH = "px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]";
const TD = "px-3 py-2 align-top text-[var(--color-ink)]";
const CAIXA =
  "overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-subtle)]";

function data(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" }) : "—";
}

type Duplicada = {
  nova_subscription_id: string;
  user_id: string | null;
  subscricao_existente_id: string;
  stripe_session_id: string | null;
  origem: string;
  detetado_em: string;
};

type SemConta = {
  stripe_session_id: string;
  email: string;
  plano: string;
  confirmado_em: string;
  lembrete_1d_em: string | null;
  lembrete_3d_em: string | null;
};

export default async function ComprasBackofficePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; resolvida?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const [{ data: duplicadas }, { data: semConta }] = await Promise.all([
    supabase
      .from("subscricoes_duplicadas")
      .select("nova_subscription_id, user_id, subscricao_existente_id, stripe_session_id, origem, detetado_em")
      .eq("estado", "por_rever")
      .order("detetado_em", { ascending: true }),
    supabase
      .from("compras_sem_conta")
      .select("stripe_session_id, email, plano, confirmado_em, lembrete_1d_em, lembrete_3d_em")
      .is("resolvido_em", null)
      .order("confirmado_em", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">Compras por rever</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Cancelamentos e reembolsos são sempre decididos e feitos à mão no Stripe Dashboard.
        </p>
      </div>
      {params.erro && <p className="text-sm text-[var(--color-status-danger)]">{params.erro}</p>}
      {params.resolvida && <p className="text-sm text-[var(--color-ink)]">Resolução registada.</p>}

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Subscrições duplicadas</h2>
        {(duplicadas ?? []).length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Nenhuma por rever.</p>
        ) : (
          <div className={CAIXA}>
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-surface-sunken)]">
                <tr>
                  <th className={TH}>Conta</th>
                  <th className={TH}>Subscrição existente</th>
                  <th className={TH}>Nova subscrição</th>
                  <th className={TH}>Detetada</th>
                  <th className={TH}>Resolução</th>
                </tr>
              </thead>
              <tbody>
                {(duplicadas as Duplicada[]).map((d) => (
                  <tr key={d.nova_subscription_id} className="border-t border-[var(--color-hairline)]">
                    <td className={TD}>{d.user_id ?? "—"}</td>
                    <td className={TD}>{d.subscricao_existente_id}</td>
                    <td className={TD}>
                      {d.nova_subscription_id}
                      {d.stripe_session_id && (
                        <span className="block text-[12px] text-[var(--color-ink-faint)]">{d.stripe_session_id}</span>
                      )}
                    </td>
                    <td className={TD}>
                      {data(d.detetado_em)}
                      <span className="block text-[12px] text-[var(--color-ink-faint)]">{d.origem}</span>
                    </td>
                    <td className={TD}>
                      <form action={resolverSubscricaoDuplicada.bind(null, d.nova_subscription_id)} className="flex flex-col gap-2">
                        <textarea
                          name="nota"
                          required
                          rows={2}
                          placeholder="O que foi feito no Stripe"
                          className="min-w-[220px] rounded-[var(--radius-input)] border border-[var(--color-hairline)] px-2 py-1 text-[13px]"
                        />
                        <button type="submit" className="self-start text-[13px] text-[var(--color-brand)] underline">
                          Marcar como resolvida
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Compras pagas sem conta</h2>
        {(semConta ?? []).length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Nenhuma.</p>
        ) : (
          <div className={CAIXA}>
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-surface-sunken)]">
                <tr>
                  <th className={TH}>E-mail</th>
                  <th className={TH}>Plano</th>
                  <th className={TH}>Confirmada</th>
                  <th className={TH}>Lembrete 1 dia</th>
                  <th className={TH}>Lembrete 3 dias</th>
                </tr>
              </thead>
              <tbody>
                {(semConta as SemConta[]).map((c) => (
                  <tr key={c.stripe_session_id} className="border-t border-[var(--color-hairline)]">
                    <td className={TD}>
                      {c.email}
                      <span className="block text-[12px] text-[var(--color-ink-faint)]">{c.stripe_session_id}</span>
                    </td>
                    <td className={TD}>{c.plano}</td>
                    <td className={TD}>{data(c.confirmado_em)}</td>
                    <td className={TD}>{data(c.lembrete_1d_em)}</td>
                    <td className={TD}>{data(c.lembrete_3d_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
