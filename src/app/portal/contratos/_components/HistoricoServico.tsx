import { formatarEurosCents } from "@/lib/monitor/contratos";
import type { Severidade } from "@/lib/monitor/acompanhamento";
import { IconeAlerta, IconeCirculoVisto, IconeInfo } from "@/components/portal/Icones";

// Acompanhamento mês a mês (mais recente primeiro). Cada período mostra o
// total, as conclusões da comparação (sem alteração, informação, situação
// revista e comunicada pela DoLado) e uma explicação curta.
// As situações ainda por rever aparecem só como "Em verificação".

export type ItemHistorico = { severidade: Severidade; texto: string };

export type PeriodoHistorico = {
  id: string;
  titulo: string;
  totalCents: number | null;
  itens: ItemHistorico[];
  explicacao: string | null;
  emVerificacao: boolean;
  /** Acontecimento sem fatura (ex.: contrato adicionado). */
  nota?: boolean;
};

export const SIMBOLO: Record<Severidade, { Icone: typeof IconeInfo; cor: string; rotulo: string }> = {
  ok: { Icone: IconeCirculoVisto, cor: "text-[var(--v2-green)]", rotulo: "Sem alteração" },
  info: { Icone: IconeInfo, cor: "text-[var(--v2-blue)]", rotulo: "Informação" },
  atencao: { Icone: IconeAlerta, cor: "text-[var(--v2-aviso)]", rotulo: "Merece atenção" },
};

function Item({ severidade, texto }: ItemHistorico) {
  const s = SIMBOLO[severidade];
  return (
    <li className="flex gap-2 text-[14.5px] leading-relaxed text-[var(--v2-navy)]">
      <s.Icone tamanho={18} className={`mt-0.5 shrink-0 ${s.cor}`} />
      <span>
        <span className="sr-only">{s.rotulo}: </span>
        {texto}
      </span>
    </li>
  );
}

export function HistoricoServico({ periodos, vazio }: { periodos: PeriodoHistorico[]; vazio: React.ReactNode }) {
  if (periodos.length === 0) return <>{vazio}</>;
  return (
    <ol className="flex flex-col">
      {periodos.map((p) => (
        <li key={p.id} className="flex flex-col gap-2 border-b border-[var(--color-hairline)] py-4 first:pt-0 last:border-b-0 last:pb-0">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[15px] font-bold text-[var(--v2-navy)]">{p.titulo}</p>
            {p.totalCents != null && <p className="text-[15px] font-semibold tabular-nums text-[var(--color-ink)]">{formatarEurosCents(p.totalCents)}</p>}
          </div>
          {p.itens.length > 0 && (
            <ul className="flex flex-col gap-1">
              {p.itens.map((i, n) => (
                <Item key={n} {...i} />
              ))}
            </ul>
          )}
          {p.emVerificacao && (
            <p className="flex gap-2 text-[14.5px] leading-relaxed text-[var(--v2-muted)]">
              <IconeInfo tamanho={18} className="mt-0.5 shrink-0 text-[var(--v2-blue)]" />
              Estamos a verificar uma alteração nesta fatura. Se merecer a sua atenção, avisamo-lo por e-mail.
            </p>
          )}
          {p.explicacao && <p className="text-[13px] text-[var(--color-ink-muted)]">{p.explicacao}</p>}
        </li>
      ))}
    </ol>
  );
}
