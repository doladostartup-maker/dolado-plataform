"use client";

import Link from "next/link";
import { useCallback, useId, useMemo, useState, type ReactNode } from "react";
import { CATEGORIAS_PERGUNTAS } from "@/components/landing/conteudoPerguntasFrequentes";
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

const APOIO: { icone: ReactNode; titulo: string; texto: string; href: string; cta: string }[] = [
  {
    icone: <IconeMensagem tamanho={28} strokeWidth={1.6} />,
    titulo: "Não encontrou a resposta?",
    texto: "Fale connosco sobre o seu caso, a sua conta ou outros assuntos.",
    href: ROTAS_V2.contacto,
    cta: "Contacto",
  },
  {
    icone: <IconeEscudo tamanho={28} strokeWidth={1.6} />,
    titulo: "Privacidade e dados pessoais",
    texto: "Como tratamos os seus dados e como exercer os seus direitos.",
    href: ROTAS_LEGAIS.privacidade,
    cta: "Política de Privacidade",
  },
  {
    icone: <IconeDocumentoVisto tamanho={28} strokeWidth={1.6} />,
    titulo: "Reclamações sobre a DoLado",
    texto: "Livro de Reclamações e entidades de resolução alternativa de litígios.",
    href: ROTAS_LEGAIS.resolucaoLitigios,
    cta: "Resolução de litígios",
  },
];

export function AjudaV2() {
  const [origem] = useState(detectarOrigem);
  const [pesquisa, setPesquisa] = useState("");
  const idPesquisa = useId();

  const tratarCaso = useCallback(() => {
    track("click_cta_perguntas_frequentes");
    window.location.assign(urlTratarCaso(origem));
  }, [origem]);

  const categorias = useMemo(
    () =>
      CATEGORIAS_PERGUNTAS.map((c) => ({
        ...c,
        perguntas: c.perguntas.filter((p) => correspondeAPesquisa(p, pesquisa)),
      })).filter((c) => c.perguntas.length > 0),
    [pesquisa],
  );
  const total = categorias.reduce((n, c) => n + c.perguntas.length, 0);
  const aPesquisar = pesquisa.trim().length > 0;

  return (
    <>
      {/* ===== Hero + pesquisa ===== */}
      <SectionV2 size="compact" className="lg:py-20">
        <div className="max-w-[720px]">
          <Eyebrow>Perguntas frequentes</Eyebrow>
          <h1 className="mt-5 text-[clamp(34px,4vw,52px)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[var(--v2-navy)]">
            Como podemos ajudar?
          </h1>
          <p className={`${TEXTO} mt-5 text-[17.5px]`}>
            Encontre respostas sobre como funciona a DoLado, a Proteção, os nossos planos, o envio da reclamação e o
            que acontece depois.
          </p>
          <div role="search" className="mt-8">
            <label htmlFor={idPesquisa} className={ROTULO_CAMPO}>
              Pesquisar nas perguntas
            </label>
            <input
              id={idPesquisa}
              type="search"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Ex.: cancelar, fatura, autorização"
              autoComplete="off"
              className={CAMPO}
            />
            <p aria-live="polite" className="mt-2 min-h-5 text-[14px] text-[var(--v2-muted)]">
              {aPesquisar && (total === 1 ? "1 pergunta encontrada." : `${total} perguntas encontradas.`)}
            </p>
          </div>
        </div>
      </SectionV2>

      {/* ===== Categorias e respostas ===== */}
      <SectionV2 tone="soft-blue" className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-16">
        <nav aria-label="Categorias" className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]">
            Categorias
          </p>
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {CATEGORIAS_PERGUNTAS.map((c) => (
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
              <p className="text-[17px] font-bold text-[var(--v2-navy)]">Não encontrámos perguntas com estes termos.</p>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--v2-muted)]">
                Experimente outras palavras ou{" "}
                <Link href={ROTAS_V2.contacto} className={LINK}>
                  fale connosco
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </SectionV2>

      {/* ===== Apoio ===== */}
      <SectionV2>
        <SectionHeader eyebrow="Outros caminhos" titulo="Precisa de outra ajuda?" />
        <ul className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          {APOIO.map((a) => (
            <li key={a.titulo}>
              <span className="text-[var(--v2-green)]">{a.icone}</span>
              <h3 className="mt-4 text-[19px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{a.titulo}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--v2-muted)]">{a.texto}</p>
              <Link href={a.href} className={`${LINK} mt-4 inline-flex items-center gap-1.5 text-[15px]`}>
                {a.cta} <IconeSeta tamanho={15} />
              </Link>
            </li>
          ))}
        </ul>
      </SectionV2>

      {/* ===== CTA final ===== */}
      <CTASection
        titulo="Pronto para começar?"
        texto="Conte-nos o que aconteceu. Recebe o texto da reclamação antes de qualquer envio."
        acao={
          <button type="button" onClick={tratarCaso} className={`${BOTAO_PRIMARIO} w-full md:w-auto`}>
            Tratar do meu caso <IconeSeta tamanho={17} />
          </button>
        }
      />
    </>
  );
}
