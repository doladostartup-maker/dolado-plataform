import Link from "next/link";
import { apagarAlertaFidelizacaoPortal } from "../actions";

type Alerta = {
  id: string;
  operadora: string;
  data_fim_fidelizacao: string;
  alerta_60d_enviado_em: string | null;
  alerta_30d_enviado_em: string | null;
};

function diasRestantes(dataFim: string): number {
  const hoje = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const fim = new Date(`${dataFim}T00:00:00Z`);
  return Math.round((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function AvisosEnviados({ alerta }: { alerta: Alerta }) {
  if (!alerta.alerta_60d_enviado_em && !alerta.alerta_30d_enviado_em) {
    return <span className="text-[var(--color-ink-faint)]">—</span>;
  }
  return (
    <span className="flex flex-wrap gap-1.5">
      {alerta.alerta_60d_enviado_em && (
        <span className="rounded-[var(--radius-pill)] bg-[var(--color-brand-wash)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-brand)]">
          60 dias
        </span>
      )}
      {alerta.alerta_30d_enviado_em && (
        <span className="rounded-[var(--radius-pill)] bg-[var(--color-brand-wash)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-brand)]">
          30 dias
        </span>
      )}
    </span>
  );
}

export function AlertasFidelizacaoPortalTable({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) {
    return (
      <p className="text-sm text-[var(--color-ink-muted)]">
        Nenhum alerta criado ainda. Crie o primeiro para começar a receber notificações.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-subtle)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--color-surface-sunken)]">
          <tr>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
              Operadora
            </th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
              Data fim
            </th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
              Avisos enviados
            </th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
              Dias restantes
            </th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {alertas.map((alerta) => {
            const dias = diasRestantes(alerta.data_fim_fidelizacao);
            const apagar = apagarAlertaFidelizacaoPortal.bind(null, alerta.id);
            return (
              <tr
                key={alerta.id}
                className="border-t border-[var(--color-hairline)] hover:bg-[var(--color-surface-sunken)]"
              >
                <td className="px-3 py-2 font-medium text-[var(--color-ink)]">{alerta.operadora}</td>
                <td className="px-3 py-2 text-[var(--color-ink)]">{alerta.data_fim_fidelizacao}</td>
                <td className="px-3 py-2">
                  <AvisosEnviados alerta={alerta} />
                </td>
                <td className="px-3 py-2 text-[var(--color-ink)]">
                  {dias >= 0 ? `${dias} dias` : "Terminada"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/portal/alertas/${alerta.id}`}
                      className="text-[var(--color-brand)] underline"
                    >
                      Editar
                    </Link>
                    <form action={apagar}>
                      <button
                        type="submit"
                        className="text-[var(--color-status-danger)] underline"
                      >
                        Apagar
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
