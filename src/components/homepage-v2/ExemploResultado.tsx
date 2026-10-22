"use client";

import Link from "@/i18n/Link";
import { useIdioma } from "@/i18n/cliente";
import { tInicio } from "@/i18n/mensagens/inicio";
import { IconeCalendario, IconeEscudo, IconeFatura, IconeSeta, IconeVisto } from "@/components/marketing-v2/Icones";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";
import { CARTAO } from "@/components/marketing-v2/estilos";
import { track } from "@/lib/analytics";

// Exemplo demonstrativo do resultado, ao lado do cartão de análise: mostra o
// produto em vez de uma fotografia. Dados fictícios, sem empresas reais e
// sempre com a etiqueta "Exemplo demonstrativo".
//
// Só mostra o que o produto faz de facto (auditoria de 22/10/2026):
//   - análise gratuita = o que o diagnóstico real mostra (diagnostico/regras.ts):
//     total, mensalidade, a diferença entre os dois, linhas cobradas com
//     "todos os meses"/"só esta vez" e a soma das linhas face ao total. Nunca "pontos de atenção" (decisão de
//     22/10/2026: isso exige revisão humana);
//   - Protecção = o que o Monitor faz (monitor/acompanhamento.ts): compara
//     cada factura carregada com as anteriores e com o contrato; cobrança
//     recorrente nova, aumento ou possível duplicado são revistos por uma
//     pessoa antes do aviso; avisos de datas 60 e 30 dias antes.
// Sem datas absolutas, para o exemplo não ficar incoerente com o tempo.

export function ExemploResultado() {
  const t = tInicio[useIdioma()].diagnostico.hero.exemplo;
  return (
    <div className="relative flex h-full flex-col gap-3 rounded-[22px] bg-[var(--v2-navy)] p-4 sm:p-6">
      <figure role="img" aria-label={t.rotulo} className="flex flex-col gap-3">
        <div aria-hidden="true" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
            <span className="flex items-center gap-2 text-[15px] font-semibold text-white">
              <IconeFatura tamanho={18} />
              {t.documento}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-0.5 text-[13px] font-semibold text-white">{t.etiqueta}</span>
          </div>

          <div className={`${CARTAO} p-4 sm:p-5`}>
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]">{t.gratuito}</p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {t.resumo.map((r, i) => (
                <div key={r.rotulo} className={`rounded-[12px] px-3 py-2.5 ${i === 0 ? "bg-[var(--v2-blue-soft)]" : "border border-[var(--v2-line)]"}`}>
                  <p className="text-[14px] text-[var(--v2-muted)]">{r.rotulo}</p>
                  <p className={`font-bold tabular-nums text-[var(--v2-navy)] ${i === 0 ? "text-[22px]" : "text-[18px]"}`}>{r.valor}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-[12px] border-l-4 border-[var(--v2-blue)] bg-[var(--v2-blue-soft)] px-3 py-2.5">
              <p className="text-[16px] font-bold leading-snug text-[var(--v2-navy)]">{t.diferenca}</p>
              <p className="mt-0.5 text-[14px] text-[var(--v2-muted)]">{t.diferencaNota}</p>
            </div>

            <p className="mt-4 text-[15px] font-semibold text-[var(--v2-navy)]">{t.linhasTitulo}</p>
            <ul className="mt-1 divide-y divide-[var(--v2-line)]">
              {t.linhas.map((l) => (
                <li key={l.descricao} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="text-[15px] leading-snug text-[var(--v2-navy)]">
                    {l.descricao}
                    <span className={`ml-2 inline-block rounded-full px-2 py-px text-[13px] font-semibold ${l.pontual ? "bg-[#FFF1DC] text-[#8A5300]" : "bg-[var(--v2-blue-soft)] text-[var(--v2-navy)]"}`}>
                      {l.pontual ? t.pontual : t.habitual}
                    </span>
                  </span>
                  <span className="flex-none text-[16px] font-bold tabular-nums text-[var(--v2-navy)]">{l.valor}</span>
                </li>
              ))}
            </ul>

            <p className="mt-2 flex items-center gap-2 text-[14px] text-[var(--v2-muted)]">
              <IconeVisto tamanho={16} className="flex-none text-[var(--v2-green-dark)]" />
              {t.soma}
            </p>
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
            <p className="mt-2 text-[17px] font-bold leading-snug text-white">{t.protecaoTitulo}</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-white/80">{t.protecaoTexto}</p>
            <ul className="mt-3 space-y-2">
              {t.protecaoPontos.map((p) => (
                <li key={p} className="flex gap-2 text-[15px] leading-snug text-white/90">
                  <IconeVisto tamanho={16} className="mt-0.5 flex-none text-[#9FD9BC]" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </figure>

      <Link
        prefetch={false}
        href={ROTAS_V2.protecao}
        onClick={() => track("click_home_protecao", { local: "exemplo" })}
        className="mt-auto inline-flex items-center gap-1.5 px-1 pt-1 text-[16px] font-semibold text-white underline-offset-4 hover:underline"
      >
        {t.cta}
        <IconeSeta tamanho={16} />
      </Link>
    </div>
  );
}
