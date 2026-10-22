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
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";
import { track } from "@/lib/analytics";
import { PRAZO_LIVRE_RESOLUCAO_DIAS, ROTAS_LEGAIS } from "@/lib/legal";
import { DIAS_CASOS_GUARDADOS } from "@/lib/acesso";
import { CASO_EXTRA, LIMITE_CASOS_ACUMULADOS, PLANOS, type PlanoId } from "@/lib/planos";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";
import { LigacaoAnalisar } from "@/components/marketing-v2/LigacaoAnalisar";
import { destinoPlano } from "@/lib/precario";
import { urlExperimentarProtecao } from "@/lib/site";
import { tProtecaoGratuita } from "@/i18n/mensagens/protecaoGratuita";

// Preçário no Design System V2 (/precario): organizado pela necessidade do
// cliente (secção 35 de docs/design/design-system-v2.md), não por plano.
// Nomes e preços vêm de src/lib/planos.ts; o que cada plano inclui e o
// destino dos botões, de src/lib/precario.ts (os mesmos do preçário da
// homepage). Nenhuma regra de compra muda aqui.
// Reposicionamento de 22/10/2026: o produto recorrente principal (Protecção)
// primeiro, depois o Caso + Protecção e o Avulso; e, com a análise gratuita
// ligada, um bloco que separa o que é gratuito do que é pago.

// Textos: src/i18n/mensagens/*/paginas.ts ("precario") e */planos.ts.
// Destaque na Protecção, o produto recorrente principal (decisão de Thiago, 22/10/2026).
const NECESSIDADES: { plano: PlanoId; destaque?: boolean }[] = [
  { plano: "protecao", destaque: true },
  { plano: "caso_protecao" },
  { plano: "avulso" },
];

// Linhas da tabela de comparação (textos em paginas.ts, "comparacao").
const LINHAS_COMPARACAO = ["indicado", "pagamento", "acompanhamento", "casos", "casoEmCurso"] as const;

// Perguntas já publicadas em /perguntas-frequentes (mesmas respostas).
const IDS_PERGUNTAS = [
  "diferenca-planos",
  "sem-subscricao",
  "avulso-depois-subscricao",
  "cancelar-protecao",
  "livre-resolucao",
];

/**
 * `protecaoGratuita`: oferta dos 30 dias ligada (PROTECAO_GRATUITA_ATIVA, lido no build).
 * `analise`: análise gratuita ligada (DIAGNOSTICO_GRATUITO_ATIVO, lido no build).
 */
export function PrecarioV2({ protecaoGratuita = false, analise = false }: { protecaoGratuita?: boolean; analise?: boolean }) {
  const idioma = useIdioma();
  const c = useCaminho();
  const t = tPaginas[idioma].precario;
  const tp = tPlanos[idioma];
  const tg = tProtecaoGratuita[idioma].precario;
  const idsPerguntas = protecaoGratuita ? ["fim-protecao-gratuita", ...IDS_PERGUNTAS] : IDS_PERGUNTAS;
  const PERGUNTAS = (categoriasPerguntas(idioma, { protecaoGratuita }).find((cat) => cat.id === "planos")?.perguntas ?? []).filter((p) =>
    idsPerguntas.includes(p.id),
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
    ...(protecaoGratuita
      ? [{ titulo: tg.condicao.titulo, texto: tg.condicao.texto(preco(PLANOS.protecao.precoCentimos)) }]
      : []),
    {
      titulo: ci.conversao.titulo,
      texto: ci.conversao.texto(
        preco(PLANOS.avulso.precoCentimos - PLANOS.protecao.precoCentimos),
        preco(PLANOS.avulso.precoCentimos - PLANOS.caso_protecao.precoCentimos),
      ),
    },
  ];
  const VALORES = t.comparacao.valores(LIMITE_CASOS_ACUMULADOS);
  const gp = t.gratuitoPago;
  const GRATUITO_PAGO = [
    ...(analise ? [gp.analise] : []),
    ...(protecaoGratuita ? [gp.protecaoGratuita] : []),
    gp.subscricao,
    gp.pontual,
  ];
  const ctaFinal = analise ? t.ctaFinalAnalise : t.ctaFinal;
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
            // Proteção com a oferta dos 30 dias: 0 € no destaque, o preço normal
            // logo a seguir e sem cartão / sem cobrança automática.
            const gratis = protecaoGratuita && id === "protecao";
            const precoNormal = precoNoIdioma(idioma, plano.precoCentimos);
            return (
              <PricingCard
                key={id}
                necessidade={necessidade}
                nome={tp.nome[id]}
                preco={gratis ? tg.preco : precoNormal}
                unidade={gratis ? tg.unidade : plano.subscricao ? tp.unidadeMes : tp.unidadeCaso}
                condicoes={
                  gratis
                    ? `${tg.depois(precoNormal)} · ${tp.ivaIncluido}`
                    : `${plano.subscricao ? tp.condicoesSubscricao : tp.condicoesPagamentoUnico} · ${tp.ivaIncluido}`
                }
                selo={gratis ? tg.selo : undefined}
                resumo={conteudo.resumo}
                inclui={conteudo.inclui}
                naoInclui={conteudo.naoInclui}
                nota={
                  id === "caso_protecao"
                    ? tp.notaCasoExtra(precoNoIdioma(idioma, CASO_EXTRA.precoCentimos))
                    : gratis
                      ? tg.garantias.join(" · ")
                      : undefined
                }
                cancelamento={{ rotulo: t.seCancelarRotulo, texto: t.seCancelar[id] }}
                destaque={destaque}
                acao={
                  <>
                    {gratis ? (
                      <>
                        <a
                          href={c(urlExperimentarProtecao("precario"))}
                          onClick={() => track("protecao_gratuita_clique", { local: "precario" })}
                          className={`${destaque ? BOTAO_PRIMARIO : BOTAO_CONTORNO} w-full`}
                        >
                          {tProtecaoGratuita[idioma].oferta.cta} <IconeSeta tamanho={16} />
                        </a>
                        <button
                          type="button"
                          onClick={() => escolher(id)}
                          className="mt-3 flex min-h-11 w-full items-center justify-center text-[14.5px] font-semibold text-[var(--v2-navy)] underline-offset-4 hover:underline"
                        >
                          {tg.subscreverJa(precoNormal)}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => escolher(id)}
                        className={`${destaque ? BOTAO_PRIMARIO : BOTAO_CONTORNO} w-full`}
                      >
                        {cta} <IconeSeta tamanho={16} />
                      </button>
                    )}
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

      {/* ===== O que é gratuito e o que é pago (só com a análise gratuita) ===== */}
      {analise && (
        <SectionV2 id="gratuito-e-pago" size="compact">
          <SectionHeader eyebrow={gp.eyebrow} titulo={gp.titulo} />
          <dl className={`mt-8 grid gap-5 ${GRATUITO_PAGO.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
            {GRATUITO_PAGO.map((item) => (
              <div key={item.titulo} className={`${CARTAO} p-6`}>
                <dt className="text-[18px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{item.titulo}</dt>
                <dd className="mt-2 text-[16px] leading-relaxed text-[var(--v2-muted)]">{item.texto}</dd>
              </div>
            ))}
          </dl>
          <LigacaoAnalisar
            evento="click_precario_analisar"
            className={`${BOTAO_CONTORNO} mt-8 min-h-14 w-full text-[17px] sm:w-auto`}
          >
            {gp.analisar} <IconeSeta tamanho={17} />
          </LigacaoAnalisar>
        </SectionV2>
      )}

      {/* ===== Comparação lado a lado ===== */}
      {/* Mesmos factos dos cartões e das condições (Termos, secções 8–10 e
          14), em linhas comparáveis. No telemóvel, um cartão por opção. */}
      <SectionV2 id="comparar" tone="soft-blue">
        <SectionHeader eyebrow={t.comparacao.eyebrow} titulo={t.comparacao.titulo} />
        <ul className="mt-10 space-y-4 md:hidden">
          {NECESSIDADES.map(({ plano }) => (
            <li key={plano} className={`${CARTAO} p-5`}>
              <p className="text-[17px] font-bold text-[var(--v2-navy)]">{tp.nome[plano]}</p>
              <p className="text-[13.5px] text-[var(--v2-muted)]">
                {tp.comUnidade(preco(PLANOS[plano].precoCentimos), PLANOS[plano].subscricao)}
              </p>
              <dl className="mt-3 divide-y divide-[var(--v2-line)] text-[14.5px]">
                {LINHAS_COMPARACAO.map((linha) => (
                  <div key={linha} className="py-2.5">
                    <dt className="font-semibold text-[var(--v2-navy)]">{t.comparacao.linhas[linha]}</dt>
                    <dd className="mt-0.5 leading-relaxed text-[var(--v2-muted)]">{VALORES[plano][linha]}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
        <div className="mt-10 hidden overflow-x-auto rounded-[16px] border border-[var(--v2-line)] bg-white md:block">
          <table className="w-full border-collapse text-left text-[14.5px]">
            <thead>
              <tr className="border-b border-[var(--v2-line)]">
                <th scope="col" className="w-[24%] px-5 py-4 text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--v2-muted)]">
                  {t.comparacao.criterio}
                </th>
                {NECESSIDADES.map(({ plano }) => (
                  <th key={plano} scope="col" className="px-5 py-4 text-[16px] font-bold text-[var(--v2-navy)]">
                    {tp.nome[plano]}
                    <span className="block text-[13.5px] font-medium text-[var(--v2-muted)]">
                      {tp.comUnidade(preco(PLANOS[plano].precoCentimos), PLANOS[plano].subscricao)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LINHAS_COMPARACAO.map((linha) => (
                <tr key={linha} className="border-b border-[var(--v2-line)] last:border-b-0">
                  <th scope="row" className="px-5 py-4 align-top font-semibold text-[var(--v2-navy)]">
                    {t.comparacao.linhas[linha]}
                  </th>
                  {NECESSIDADES.map(({ plano }) => (
                    <td key={plano} className="px-5 py-4 align-top leading-relaxed text-[var(--v2-muted)]">
                      {VALORES[plano][linha]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-5 max-w-[760px] text-[14px] leading-relaxed text-[var(--v2-muted)]">{t.comparacao.nota}</p>
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
        eyebrow={ctaFinal.eyebrow}
        titulo={ctaFinal.titulo}
        texto={ctaFinal.texto}
        acao={
          analise ? (
            <LigacaoAnalisar evento="click_precario_v2_analisar" className={`${BOTAO_PRIMARIO} w-full md:w-auto`}>
              {ctaFinal.acao} <IconeSeta tamanho={17} />
            </LigacaoAnalisar>
          ) : (
            <Link prefetch={false}
              href="/simulador-elegibilidade"
              onClick={() => track("click_precario_v2_simulador")}
              className={`${BOTAO_PRIMARIO} w-full md:w-auto`}
            >
              {ctaFinal.acao} <IconeSeta tamanho={17} />
            </Link>
          )
        }
      />
    </>
  );
}
