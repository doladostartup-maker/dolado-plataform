"use client";

import Link from "@/i18n/Link";
import { useCaminho, useIdioma } from "@/i18n/cliente";
import { rico } from "@/i18n/Rico";
import { tPaginas } from "@/i18n/mensagens/paginas";
import { useCallback, useId, useMemo, useState, type ReactNode } from "react";
import { categoriasPerguntas } from "@/components/landing/conteudoPerguntasFrequentes";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { FAQAccordionV2 } from "@/components/marketing-v2/FAQAccordionV2";
import { IconeDocumentoVisto, IconeEscudo, IconeMensagem, IconeSeta } from "@/components/marketing-v2/Icones";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_PRIMARIO, CAMPO, CARTAO, ROTULO_CAMPO, TEXTO } from "@/components/marketing-v2/estilos";
import { detectarOrigem, track } from "@/lib/analytics";
import { ROTAS_LEGAIS } from "@/lib/legal";
import { urlTratarCaso } from "@/lib/site";
import { correspondeAPesquisa } from "./pesquisa";

// Ajuda (/perguntas-frequentes) no Design System V2 (secção 37 de
// docs/design/design-system-v2.md): utilitária — pesquisa, categorias e
// respostas. Perguntas e respostas vêm só de conteudoPerguntasFrequentes.tsx
// (as mesmas da homepage e das outras páginas V2).

const LINK = "font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline";



export function AjudaV2() {
  const [origem] = useState(detectarOrigem);
  const [pesquisa, setPesquisa] = useState("");
    const idPesquisa = useId();
  const idioma = useIdioma();
  const caminho = useCaminho();
  const t = tPaginas[idioma].ajuda;
  const todas = useMemo(() => categoriasPerguntas(idioma), [idioma]);
  const APOIO: { icone: ReactNode; titulo: string; texto: string; href: string; cta: string }[] = [
    { icone: <IconeMensagem tamanho={28} strokeWidth={1.6} />, ...t.apoio.contacto, href: ROTAS_V2.contacto },
    { icone: <IconeEscudo tamanho={28} strokeWidth={1.6} />, ...t.apoio.privacidade, href: ROTAS_LEGAIS.privacidade },
    { icone: <IconeDocumentoVisto tamanho={28} strokeWidth={1.6} />, ...t.apoio.reclamacoes, href: ROTAS_LEGAIS.resolucaoLitigios },
  ];

  const tratarCaso = useCallback(() => {
    track("click_cta_perguntas_frequentes");
    window.location.assign(caminho(urlTratarCaso(origem)));
  }, [origem, caminho]);

  const categorias = useMemo(
    () =>
      todas.map((c) => ({
        ...c,
        perguntas: c.perguntas.filter((p) => correspondeAPesquisa(p, pesquisa)),
      })).filter((c) => c.perguntas.length > 0),
    [pesquisa, todas],
  );
  const total = categorias.reduce((n, c) => n + c.perguntas.length, 0);
  const aPesquisar = pesquisa.trim().length > 0;

  return (
    <>
      {/* ===== Hero + pesquisa ===== */}
      <SectionV2 size="compact" className="lg:py-20">
        <div className="max-w-[720px]">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(34px,4vw,52px)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[var(--v2-navy)]">
            {t.titulo}
          </h1>
          <p className={`${TEXTO} mt-5 text-[17.5px]`}>{t.texto}</p>
          <div role="search" className="mt-8">
            <label htmlFor={idPesquisa} className={ROTULO_CAMPO}>
              {t.pesquisar}
            </label>
            <input
              id={idPesquisa}
              type="search"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder={t.exemplo}
              autoComplete="off"
              className={CAMPO}
            />
            <p aria-live="polite" className="mt-2 min-h-5 text-[14px] text-[var(--v2-muted)]">
              {aPesquisar && t.encontradas(total)}
            </p>
          </div>
        </div>
      </SectionV2>

      {/* ===== Categorias e respostas ===== */}
      <SectionV2 tone="soft-blue" className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-16">
        <nav aria-label={t.categorias} className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]">
            {t.categorias}
          </p>
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {todas.map((c) => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  className="inline-flex min-h-10 items-center rounded-full border border-[var(--v2-line)] bg-white px-4 text-[14px] font-medium text-[var(--v2-navy)] hover:border-[var(--v2-green)] hover:text-[var(--v2-green)] lg:w-full lg:rounded-[10px] lg:border-transparent lg:bg-transparent lg:px-3"
                >
                  {c.titulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-12">
          {categorias.map((c) => (
            <section key={c.id} id={c.id} aria-labelledby={`${c.id}-titulo`} className="scroll-mt-28">
              <h2
                id={`${c.id}-titulo`}
                className="mb-4 text-[24px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]"
              >
                {c.titulo}
              </h2>
              {/* key: ao mudar a pesquisa, as respostas abertas fecham */}
              <FAQAccordionV2 key={aPesquisar ? `p-${pesquisa}` : "todas"} perguntas={c.perguntas} />
            </section>
          ))}
          {total === 0 && (
            <div className={`${CARTAO} p-7`}>
              <p className="text-[17px] font-bold text-[var(--v2-navy)]">{t.semResultados}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--v2-muted)]">
                {rico(t.experimente, {
                  contacto: (conteudo) => (
                    <Link prefetch={false} href={ROTAS_V2.contacto} className={LINK}>
                      {conteudo}
                    </Link>
                  ),
                })}
              </p>
            </div>
          )}
        </div>
      </SectionV2>

      {/* ===== Apoio ===== */}
      <SectionV2>
        <SectionHeader eyebrow={t.apoio.eyebrow} titulo={t.apoio.titulo} />
        <ul className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          {APOIO.map((a) => (
            <li key={a.titulo}>
              <span className="text-[var(--v2-green)]">{a.icone}</span>
              <h3 className="mt-4 text-[19px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{a.titulo}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--v2-muted)]">{a.texto}</p>
              <Link prefetch={false} href={a.href} className={`${LINK} mt-4 inline-flex items-center gap-1.5 text-[15px]`}>
                {a.cta} <IconeSeta tamanho={15} />
              </Link>
            </li>
          ))}
        </ul>
      </SectionV2>

      {/* ===== CTA final ===== */}
      <CTASection
        titulo={t.ctaFinal.titulo}
        texto={t.ctaFinal.texto}
        acao={
          <button type="button" onClick={tratarCaso} className={`${BOTAO_PRIMARIO} w-full md:w-auto`}>
            {t.ctaFinal.acao} <IconeSeta tamanho={17} />
          </button>
        }
      />
    </>
  );
}
