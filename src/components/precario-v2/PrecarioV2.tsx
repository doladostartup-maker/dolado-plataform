"use client";

import Link from "@/i18n/Link";
import type { ReactNode } from "react";
import { categoriasPerguntas } from "@/components/landing/conteudoPerguntasFrequentes";
import { useCaminho, useIdioma } from "@/i18n/cliente";
import { rico } from "@/i18n/Rico";
import { tPaginas } from "@/i18n/mensagens/paginas";
import { tWhatsApp } from "@/i18n/mensagens/whatsapp";
import { precoNoIdioma, tPlanos } from "@/i18n/mensagens/planos";
import { ApoioWhatsApp } from "@/components/marketing-v2/ApoioWhatsApp";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { FAQAccordionV2 } from "@/components/marketing-v2/FAQAccordionV2";
import { IconeCalendario, IconeDocumentoVisto, IconeEscudo, IconeSeta } from "@/components/marketing-v2/Icones";
import { GRELHA_PLANOS, PricingCard } from "@/components/marketing-v2/PricingCard";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, TEXTO } from "@/components/marketing-v2/estilos";
import { track } from "@/lib/analytics";
import { PRAZO_LIVRE_RESOLUCAO_DIAS, ROTAS_LEGAIS } from "@/lib/legal";
import { DIAS_CASOS_GUARDADOS } from "@/lib/acesso";
import { CASO_EXTRA, LIMITE_CASOS_ACUMULADOS, PLANOS, type PlanoId } from "@/lib/planos";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";
import { destinoPlano } from "@/lib/precario";

// Preçário no Design System V2 (/precario): organizado pela necessidade do
// cliente (secção 35 de docs/design/design-system-v2.md), não por plano.
// Nomes e preços vêm de src/lib/planos.ts; o que cada plano inclui e o
// destino dos botões, de src/lib/precario.ts (os mesmos do preçário da
// homepage). Nenhuma regra de compra muda aqui.

// Textos: src/i18n/mensagens/*/paginas.ts ("precario") e */planos.ts.
const NECESSIDADES: { plano: PlanoId; destaque?: boolean }[] = [
  { plano: "avulso" },
  { plano: "caso_protecao", destaque: true },
  { plano: "protecao" },
];

// Perguntas já publicadas em /perguntas-frequentes (mesmas respostas).
const IDS_PERGUNTAS = [
  "diferenca-planos",
  "sem-subscricao",
  "avulso-depois-subscricao",
  "cancelar-protecao",
  "livre-resolucao",
];

export function PrecarioV2() {
  const idioma = useIdioma();
  const c = useCaminho();
  const t = tPaginas[idioma].precario;
  const tp = tPlanos[idioma];
  const PERGUNTAS = (categoriasPerguntas(idioma).find((cat) => cat.id === "planos")?.perguntas ?? []).filter((p) =>
    IDS_PERGUNTAS.includes(p.id),
  );
  const ANTES_DE_DECIDIR: { icone: ReactNode; titulo: string; texto: ReactNode }[] = [
    { icone: <IconeDocumentoVisto tamanho={28} strokeWidth={1.6} />, ...t.antesDeDecidir.reve },
    { icone: <IconeCalendario tamanho={28} strokeWidth={1.6} />, ...t.antesDeDecidir.cancela },
    {
      icone: <IconeEscudo tamanho={28} strokeWidth={1.6} />,
      titulo: t.antesDeDecidir.livre.titulo,
      texto: rico(t.antesDeDecidir.livre.texto(PRAZO_LIVRE_RESOLUCAO_DIAS), {
        saber: (conteudo) => (
          <Link prefetch={false}
            href={ROTAS_LEGAIS.livreResolucao}
            className="font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline"
          >
            {conteudo}
          </Link>
        ),
      }),
    },
  ];
  const preco = (centimos: number) => precoNoIdioma(idioma, centimos);
  const ci = t.condicoes.itens;
  // Condições reais de compra (Termos, secções 8–10 e 14; src/lib/planos.ts).
  const CONDICOES: { titulo: string; texto: string }[] = [
    {
      titulo: ci.casoOuSubscricao.titulo,
      texto: ci.casoOuSubscricao.texto(preco(PLANOS.avulso.precoCentimos), tp.comUnidade(preco(PLANOS.caso_protecao.precoCentimos), true)),
    },
    ci.renovacao,
    { titulo: ci.casoPorMes.titulo, texto: ci.casoPorMes.texto(LIMITE_CASOS_ACUMULADOS) },
    { titulo: ci.fimSubscricao.titulo, texto: ci.fimSubscricao.texto(DIAS_CASOS_GUARDADOS) },
    {
      titulo: ci.casoExtra.titulo,
      texto: ci.casoExtra.texto(preco(CASO_EXTRA.precoCentimos), preco(CASO_EXTRA.precoReferenciaCentimos), CASO_EXTRA.descontoPercentagem),
    },
    {
      titulo: ci.conversao.titulo,
      texto: ci.conversao.texto(
        preco(PLANOS.avulso.precoCentimos - PLANOS.protecao.precoCentimos),
        preco(PLANOS.avulso.precoCentimos - PLANOS.caso_protecao.precoCentimos),
      ),
    },
  ];
  const escolher = (plano: PlanoId) => {
    track(`click_precario_${plano}`, { pagina: "precario_v2" });
    window.location.assign(c(destinoPlano(plano, "/precario")));
  };

  return (
    <>
      {/* ===== Necessidades e planos ===== */}
      <SectionV2 size="compact" className="lg:py-20">
        <div className="max-w-[720px]">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(34px,4vw,52px)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[var(--v2-navy)]">
            {t.titulo}
          </h1>
          <p className={`${TEXTO} mt-5 text-[17.5px]`}>{t.texto(tp.ivaIncluido)}</p>
        </div>

        <div className={`mt-12 ${GRELHA_PLANOS}`}>
          {NECESSIDADES.map(({ plano: id, destaque }) => {
            const plano = PLANOS[id];
            const conteudo = tp.conteudo[id];
            const { necessidade, cta } = t.necessidades[id];
            return (
              <PricingCard
                key={id}
                necessidade={necessidade}
                nome={tp.nome[id]}
                preco={precoNoIdioma(idioma, plano.precoCentimos)}
                unidade={plano.subscricao ? tp.unidadeMes : tp.unidadeCaso}
                condicoes={`${plano.subscricao ? tp.condicoesSubscricao : tp.condicoesPagamentoUnico} · ${tp.ivaIncluido}`}
                resumo={conteudo.resumo}
                inclui={conteudo.inclui}
                naoInclui={conteudo.naoInclui}
                nota={id === "caso_protecao" ? tp.notaCasoExtra(precoNoIdioma(idioma, CASO_EXTRA.precoCentimos)) : undefined}
                destaque={destaque}
                acao={
                  <>
                    <button
                      type="button"
                      onClick={() => escolher(id)}
                      className={`${destaque ? BOTAO_PRIMARIO : BOTAO_CONTORNO} w-full`}
                    >
                      {cta} <IconeSeta tamanho={16} />
                    </button>
                    {id === "protecao" && (
                      <Link prefetch={false}
                        href={ROTAS_V2.protecao}
                        onClick={() => track("click_precario_saber_protecao")}
                        className="mt-4 flex min-h-11 items-center justify-center gap-1.5 text-[14.5px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline"
                      >
                        {t.saberProtecao} <IconeSeta tamanho={15} />
                      </Link>
                    )}
                  </>
                }
              />
            );
          })}
        </div>

        <div className="mt-8 max-w-[760px] space-y-2 text-[14px] leading-relaxed text-[var(--v2-muted)]">
          <p>{t.precosLancamento}</p>
        </div>
        <ApoioWhatsApp
          className="mt-6"
          pergunta={tWhatsApp[idioma].contextos.precario.pergunta}
          mensagem={tWhatsApp[idioma].contextos.precario.mensagem}
          pagina="/precario"
          local="pricing"
          contexto="planos"
        />
      </SectionV2>

      {/* ===== Pagamentos e condições ===== */}
      <SectionV2>
        <SectionHeader eyebrow={t.condicoes.eyebrow} titulo={t.condicoes.titulo} />
        <dl className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
          {CONDICOES.map((item) => (
            <div key={item.titulo} className="border-t border-[var(--v2-line)] pt-5">
              <dt className="text-[18px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{item.titulo}</dt>
              <dd className="mt-2 text-[15.5px] leading-relaxed text-[var(--v2-muted)]">{item.texto}</dd>
            </div>
          ))}
        </dl>
      </SectionV2>

      {/* ===== Antes de decidir ===== */}
      <SectionV2 tone="soft-blue">
        <SectionHeader eyebrow={t.antesDeDecidir.eyebrow} titulo={t.antesDeDecidir.titulo} />
        <ul className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          {ANTES_DE_DECIDIR.map((item) => (
            <li key={item.titulo}>
              <span className="text-[var(--v2-green)]">{item.icone}</span>
              <h3 className="mt-4 text-[19px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{item.titulo}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--v2-muted)]">{item.texto}</p>
            </li>
          ))}
        </ul>
      </SectionV2>

      {/* ===== Perguntas ===== */}
      <SectionV2 className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div>
          <SectionHeader eyebrow={t.perguntas.eyebrow} titulo={t.perguntas.titulo} />
          <Link prefetch={false}
            href="/perguntas-frequentes"
            className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline"
          >
            {t.perguntas.verTodas} <IconeSeta tamanho={15} />
          </Link>
        </div>
        <FAQAccordionV2 perguntas={PERGUNTAS} />
      </SectionV2>

      {/* ===== CTA final ===== */}
      <CTASection
        eyebrow={t.ctaFinal.eyebrow}
        titulo={t.ctaFinal.titulo}
        texto={t.ctaFinal.texto}
        acao={
          <Link prefetch={false}
            href="/simulador-elegibilidade"
            onClick={() => track("click_precario_v2_simulador")}
            className={`${BOTAO_PRIMARIO} w-full md:w-auto`}
          >
            {t.ctaFinal.acao} <IconeSeta tamanho={17} />
          </Link>
        }
      />
    </>
  );
}
