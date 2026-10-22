"use client";

import { useIdioma } from "@/i18n/cliente";
import { tInicio } from "@/i18n/mensagens/inicio";
import { IconeCalendario, IconeEscudo, IconeFatura, IconeMensagem } from "@/components/marketing-v2/Icones";
import { CARTAO } from "@/components/marketing-v2/estilos";

// Exemplo demonstrativo do resultado, ao lado do cartão de análise: mostra o
// produto em vez de uma fotografia. Dados fictícios, sem empresas reais e
// sempre com a etiqueta "Exemplo demonstrativo". Separa o que a análise
// gratuita mostra (o que está no documento + contas simples) do que é da
// Protecção (avisos de datas; alterações revistas por uma pessoa).

export function ExemploResultado() {
  const t = tInicio[useIdioma()].diagnostico.hero.exemplo;
  return (
    <figure role="img" aria-label={t.rotulo} className="relative flex h-full flex-col rounded-[22px] bg-[var(--v2-navy)] p-4 sm:p-6">
      <div aria-hidden="true" className="flex h-full flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
          <span className="flex items-center gap-2 text-[15px] font-semibold text-white">
            <IconeFatura tamanho={18} />
            {t.documento}
          </span>
          <span className="rounded-full bg-white/15 px-3 py-0.5 text-[13px] font-semibold text-white">{t.etiqueta}</span>
        </div>

        <div className={`${CARTAO} p-4 sm:p-5`}>
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]">{t.gratuito}</p>
          <dl className="mt-3 divide-y divide-[var(--v2-line)]">
            {t.lido.map((l) => (
              <div key={l.rotulo} className="flex items-baseline justify-between gap-4 py-2">
                <dt className="text-[15px] text-[var(--v2-muted)]">{l.rotulo}</dt>
                <dd className="text-[16px] font-bold tabular-nums text-[var(--v2-navy)]">{l.valor}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 flex items-center gap-2 rounded-[10px] bg-[var(--v2-blue-soft)] px-3 py-2 text-[15px] font-semibold text-[var(--v2-navy)]">
            <IconeCalendario tamanho={17} className="flex-none text-[var(--v2-blue)]" />
            {t.calculo}
          </p>
        </div>

        <div className="rounded-[18px] border border-white/15 bg-white/[0.06] p-4 sm:p-5">
          <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-[#9FD9BC]">
            <IconeEscudo tamanho={16} />
            {t.protecao}
          </p>
          <p className="mt-2 text-[16px] font-semibold leading-snug text-white">{t.protecaoTexto}</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-white/75">{t.protecaoNota}</p>
        </div>

        <p className="mt-auto flex items-center gap-2 px-1 pt-1 text-[15px] text-white/85">
          <IconeMensagem tamanho={17} className="flex-none" />
          {t.proximo}
        </p>
      </div>
    </figure>
  );
}
