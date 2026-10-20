"use client";

import { OfertaProtecaoGratuita } from "@/components/marketing-v2/OfertaProtecaoGratuita";
import Link from "@/i18n/Link";
import { categoriasPerguntas } from "@/components/landing/conteudoPerguntasFrequentes";
import { useCaminho, useIdioma } from "@/i18n/cliente";
import { rico } from "@/i18n/Rico";
import { tPaginas } from "@/i18n/mensagens/paginas";
import { precoNoIdioma, tPlanos } from "@/i18n/mensagens/planos";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { ExemploAlteracaoFatura, ExemploAvisoPromocao } from "@/components/marketing-v2/Exemplos";
import { FAQAccordionV2 } from "@/components/marketing-v2/FAQAccordionV2";
import { IconeCalendario, IconeFatura, IconeFormulario, IconeSeta } from "@/components/marketing-v2/Icones";
import { ListaVistos } from "@/components/marketing-v2/ListaVistos";
import { PainelProtecao } from "@/components/marketing-v2/Mockups";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";
import { track } from "@/lib/analytics";
import { LIMITE_CASOS_ACUMULADOS, PLANOS } from "@/lib/planos";
import { destinoPlano } from "@/lib/precario";

// /protecao — a Proteção como serviço autónomo (revisão da comunicação de
// 17/10/2026): quem procura acompanhamento de faturas e contratos não tem de
// passar pelo percurso de abertura de um caso. Só descreve funcionalidades
// existentes (Monitor de Proteção, avisos de datas, aviso setorial). Preço e
// destino da adesão vêm de src/lib/planos.ts e src/lib/precario.ts — a
// compra continua a passar por /comprar e pelo modal ConfirmarCompra.

const ICONES = [
  <IconeFatura key="f" tamanho={28} strokeWidth={1.6} />,
  <IconeCalendario key="c" tamanho={28} strokeWidth={1.6} />,
  <IconeFormulario key="d" tamanho={28} strokeWidth={1.6} />,
];

const IDS_PERGUNTAS = ["o-que-inclui-protecao", "comecar-protecao", "diferenca-planos", "cancelar-protecao"];

/** `protecaoGratuita`: oferta dos 30 dias ligada (PROTECAO_GRATUITA_ATIVA, lido no build). */
export function ProtecaoV2({ protecaoGratuita = false }: { protecaoGratuita?: boolean }) {
  const idioma = useIdioma();
  const c = useCaminho();
  const t = tPaginas[idioma].protecao;
  const tp = tPlanos[idioma];
  const precoProtecao = tp.comUnidade(precoNoIdioma(idioma, PLANOS.protecao.precoCentimos), true);
  const precoCasoProtecao = tp.comUnidade(precoNoIdioma(idioma, PLANOS.caso_protecao.precoCentimos), true);
  const TODAS = categoriasPerguntas(idioma, { protecaoGratuita }).flatMap((cat) => cat.perguntas);
  const ids = protecaoGratuita ? [...IDS_PERGUNTAS.slice(0, 2), "experimentar-protecao", "fim-protecao-gratuita", ...IDS_PERGUNTAS.slice(2)] : IDS_PERGUNTAS;
  const PERGUNTAS = ids.flatMap((id) => TODAS.filter((p) => p.id === id).slice(0, 1));
  const negrito = (texto: string) => rico(texto, { b: (conteudo) => <strong className="text-[var(--v2-navy)]">{conteudo}</strong> });

  const aderir = (evento: string) => {
    track(evento, { pagina: "protecao" });
    window.location.assign(c(destinoPlano("protecao", "/protecao")));
  };

  return (
    <>
      {/* ===== Abertura ===== */}
      <SectionV2 size="compact" className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16 lg:py-20">
        <div>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(32px,3.6vw,48px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--v2-navy)]">
            {t.titulo}
          </h1>
          <p className={`${TEXTO} mt-6 max-w-[560px] text-[17.5px]`}>{t.texto}</p>
          <p className="mt-6">
            <span className="text-[30px] font-extrabold tracking-[-0.03em] text-[var(--v2-navy)]">
              {precoNoIdioma(idioma, PLANOS.protecao.precoCentimos)}
            </span>
            <span className="text-[15px] font-medium text-[var(--v2-muted)]"> {tp.unidadeMes}</span>
          </p>
          <p className="mt-1 text-[13.5px] text-[var(--v2-muted)]">
            {tp.condicoesSubscricao} · {tp.ivaIncluido}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => aderir("click_protecao_aderir")} className={BOTAO_PRIMARIO}>
              {t.aderir} <IconeSeta tamanho={17} />
            </button>
            <Link prefetch={false} href={ROTAS_V2.precario} onClick={() => track("click_protecao_precario")} className={BOTAO_CONTORNO}>
              {t.verPrecario}
            </Link>
          </div>
          {protecaoGratuita && <OfertaProtecaoGratuita origem="protecao" className="mt-7" />}
        </div>
        <PainelProtecao />
      </SectionV2>

      {/* ===== Três perguntas ===== */}
      <SectionV2 tone="soft-blue">
        <SectionHeader eyebrow={t.tresPerguntas.eyebrow} titulo={t.tresPerguntas.titulo} />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {t.tresPerguntas.blocos.map((b, i) => (
            <article key={b.titulo} className={`${CARTAO} p-6 sm:p-7`}>
              <span className="text-[var(--v2-green)]">{ICONES[i]}</span>
              <h2 className="mt-4 text-[20px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">{b.titulo}</h2>
              <div className="mt-5">
                <ListaVistos compacta itens={b.itens} />
              </div>
            </article>
          ))}
        </div>
      </SectionV2>

      {/* ===== Exemplos fictícios ===== */}
      <SectionV2>
        <SectionHeader eyebrow={t.exemplos.eyebrow} titulo={t.exemplos.titulo} texto={t.exemplos.texto} />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <ExemploAvisoPromocao />
          <ExemploAlteracaoFatura />
        </div>
      </SectionV2>

      {/* ===== Limites e comparação ===== */}
      <SectionV2 tone="soft-green" className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
        <div>
          <SectionHeader sobreVerde eyebrow={t.limites.eyebrow} titulo={t.limites.titulo} />
          <ul className="mt-7 list-disc space-y-3 pl-5 text-[15.5px] leading-relaxed text-[var(--v2-navy)] marker:text-[var(--v2-green)]">
            {t.limites.itens.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <aside className={`${CARTAO} self-start p-6 sm:p-7`}>
          <h2 className="text-[20px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">{t.comparar.titulo}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--v2-muted)]">{negrito(t.comparar.protecao(precoProtecao))}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--v2-muted)]">
            {negrito(t.comparar.casoProtecao(precoCasoProtecao, LIMITE_CASOS_ACUMULADOS))}
          </p>
          <Link prefetch={false}
            href={ROTAS_V2.precario}
            className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline"
          >
            {t.verPrecario} <IconeSeta tamanho={15} />
          </Link>
        </aside>
      </SectionV2>

      {/* ===== Perguntas ===== */}
      <SectionV2 className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div>
          <SectionHeader eyebrow={t.perguntas.eyebrow} titulo={t.perguntas.titulo} />
          <Link prefetch={false}
            href={ROTAS_V2.ajuda}
            className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline"
          >
            {t.perguntas.verTodas} <IconeSeta tamanho={15} />
          </Link>
        </div>
        <FAQAccordionV2 perguntas={PERGUNTAS} />
      </SectionV2>

      {/* ===== CTA final ===== */}
      <CTASection
        titulo={t.ctaFinal.titulo}
        texto={t.ctaFinal.texto}
        acao={
          <button type="button" onClick={() => aderir("click_protecao_cta_final")} className={`${BOTAO_PRIMARIO} w-full md:w-auto`}>
            {t.ctaFinal.acao} <IconeSeta tamanho={17} />
          </button>
        }
      />
    </>
  );
}
