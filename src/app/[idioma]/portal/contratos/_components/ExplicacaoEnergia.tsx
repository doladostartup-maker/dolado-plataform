import type { Idioma } from "@/i18n/config";
import { tMonitorEnergia } from "@/i18n/mensagens/monitorEnergia";
import { euros, eurosComSinal, type ExplicacaoEnergia as Explicacao } from "@/lib/monitor/frasesEnergia";
import { IconeInfo } from "@/components/portal/Icones";
import { CARTAO, TITULO_SECCAO } from "@/components/portal/ui";

// Electricidade e gás: resumo de leitura imediata da última factura face à
// anterior comparável — quanto pagou, o que mudou, quanto veio do consumo e
// quanto dos preços e de outros valores, e o próximo passo. Os valores vêm da
// comparação guardada (comparacaoEnergia.ts); nada é calculado aqui.
//
// Enquanto a factura tem uma situação à espera da revisão da DoLado
// (emVerificacao), mostram-se só os totais: a decomposição revelaria antes da
// revisão humana o facto que está a ser verificado (ex.: subida do preço).

export function ExplicacaoEnergia({
  explicacoes,
  proximoPasso,
  emVerificacao,
  idioma,
}: {
  explicacoes: Explicacao[];
  proximoPasso: string;
  emVerificacao: boolean;
  idioma: Idioma;
}) {
  const t = tMonitorEnergia[idioma].explicacao;
  if (explicacoes.length === 0) return null;
  return (
    <section aria-labelledby="porque-mudou" className={`${CARTAO} flex flex-col gap-5`}>
      <h2 id="porque-mudou" className={TITULO_SECCAO}>
        {t.titulo}
      </h2>
      {explicacoes.map((e) => (
        <div key={e.tipo} className="flex flex-col gap-3">
          <p className="text-[16px] font-semibold leading-snug text-[var(--v2-navy)]">{e.frase}</p>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Valor rotulo={t.pagou} valor={euros(e.pagouCents, idioma)} />
            <Valor rotulo={t.anterior} valor={euros(e.anteriorCents, idioma)} />
            <Valor rotulo={t.diferenca} valor={eurosComSinal(e.diferencaCents, idioma)} />
          </dl>
          {!emVerificacao && e.doConsumoCents !== null && e.dosPrecosCents !== null && (
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Valor rotulo={t.doConsumo} valor={eurosComSinal(e.doConsumoCents, idioma)} />
              <Valor rotulo={t.dosPrecos} valor={eurosComSinal(e.dosPrecosCents, idioma)} />
            </dl>
          )}
          {!emVerificacao && e.linhas.length > 0 && (
            <dl className="flex flex-col">
              {e.linhas.map((l) => (
                <div
                  key={l.rotulo}
                  className="flex items-baseline justify-between gap-4 border-b border-[var(--v2-line)] py-2 text-[15px] last:border-b-0"
                >
                  <dt className="text-[var(--v2-navy)]">{l.rotulo}</dt>
                  <dd className="shrink-0 font-semibold tabular-nums text-[var(--v2-navy)]">{l.valor}</dd>
                </div>
              ))}
            </dl>
          )}
          {!emVerificacao && (
            <ul className="flex flex-col gap-1.5">
              {[...e.notas, e.certezaTexto].map((n) => (
                <li key={n} className="flex items-start gap-2 text-[14.5px] leading-relaxed text-[var(--v2-muted)]">
                  <IconeInfo tamanho={17} className="mt-0.5 shrink-0 text-[var(--v2-blue)]" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <div className="border-t border-[var(--v2-line)] pt-4">
        <p className="text-[14px] font-semibold uppercase tracking-wide text-[var(--v2-muted)]">{t.proximoPasso}</p>
        <p className="mt-1 text-[15px] leading-relaxed text-[var(--v2-navy)]">{proximoPasso}</p>
      </div>
    </section>
  );
}

function Valor({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col rounded-xl bg-[var(--v2-surface)] px-4 py-3">
      <dt className="text-[13.5px] text-[var(--v2-muted)]">{rotulo}</dt>
      <dd className="text-[18px] font-bold tabular-nums text-[var(--v2-navy)]">{valor}</dd>
    </div>
  );
}
