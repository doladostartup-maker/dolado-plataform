import Link from "next/link";
import { apagarAlertaPromocaoPortal } from "../actions";

type Alerta = {
  id: string;
  operadora: string;
  descricao_promocao: string;
  data_fim_promocao: string;
  origem_data: string;
  alerta_30d_enviado_em: string | null;
  alerta_7d_enviado_em: string | null;
  alerta_1d_enviado_em: string | null;
};

const ORIGEM_LABEL: Record<string, string> = {
  manual: "Manual",
  api_extraida: "IA",
  api_extraida_editada: "IA (editada)",
};

function AvisosEnviados({ alerta }: { alerta: Alerta }) {
  const enviados = [
    alerta.alerta_30d_enviado_em && "30 dias",
    alerta.alerta_7d_enviado_em && "7 dias",
    alerta.alerta_1d_enviado_em && "1 dia",
  ].filter(Boolean) as string[];

  if (enviados.length === 0) {
    return <span className="text-[var(--color-ink-faint)]">—</span>;
  }
  return (
    <span className="flex flex-wrap gap-1.5">
      {enviados.map((e) => (
        <span
          key={e}
          className="rounded-[var(--radius-pill)] bg-[var(--color-brand-wash)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-brand)]"
        >
          {e}
        </span>
      ))}
    </span>
  );
}

export function AlertasPromocaoPortalTable({ alertas }: { alertas: Alerta[] }) {
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
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Operadora</th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Promoção</th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Data</th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Origem</th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Avisos enviados</th>
            <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Ações</th>
          </tr>
        </thead>
        <tbody>
          {alertas.map((alerta) => {
            const apagar = apagarAlertaPromocaoPortal.bind(null, alerta.id);
            return (
              <tr
                key={alerta.id}
                className="border-t border-[var(--color-hairline)] hover:bg-[var(--color-surface-sunken)]"
              >
                <td className="px-3 py-2 font-medium text-[var(--color-ink)]">{alerta.operadora}</td>
                <td className="px-3 py-2 text-[var(--color-ink)]">{alerta.descricao_promocao}</td>
                <td className="px-3 py-2 text-[var(--color-ink)]">{alerta.data_fim_promocao}</td>
                <td className="px-3 py-2 text-[var(--color-ink-muted)]">
                  {ORIGEM_LABEL[alerta.origem_data] ?? alerta.origem_data}
                </td>
                <td className="px-3 py-2">
                  <AvisosEnviados alerta={alerta} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Link href={`/portal/promocoes/${alerta.id}`} className="text-[var(--color-brand)] underline">
                      Editar
                    </Link>
                    <form action={apagar}>
                      <button type="submit" className="text-[var(--color-status-danger)] underline">
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
