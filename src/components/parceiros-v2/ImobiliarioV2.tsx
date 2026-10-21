import Link from "@/i18n/Link";
import { tParceiros } from "@/i18n/mensagens/parceiros";
import { textos } from "@/i18n/servidor";
import { areaParceiroAtiva } from "@/lib/parceiros/area";
import { IconeCasa, IconeEscudo, IconeFatura, IconeSeta, IconeVisto } from "@/components/marketing-v2/Icones";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { FAQAccordionV2 } from "@/components/marketing-v2/FAQAccordionV2";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";

// /parceiros/imobiliario: Parceiro de Indicação para consultores e agências
// imobiliárias. Mesmas regras do programa (/parceiros): sem valores de
// comissão (constam do acordo), sem testemunhos nem resultados, sem promessas
// de rendimento. A candidatura é a de /parceiros. Letra ≥ 16 px e botões de
// 56 px (público 55+), por isso sem ListaVistos/StepsTimeline (15 px). O
// passo da área de parceiro só aparece com AREA_PARCEIRO_ATIVA (lido no build).

const CANDIDATURA = `${ROTAS_V2.parceiros}#candidatura`;

export async function ImobiliarioV2() {
  const { imobiliario: t } = await textos(tParceiros);
  const passosVisiveis = areaParceiroAtiva() ? t.passos : t.passos.slice(0, -1);
  const icones = [IconeFatura, IconeEscudo, IconeCasa];

  return (
    <>
      <SectionV2 size="compact" className="grid items-center gap-12 lg:grid-cols-[1.35fr_1fr] lg:py-20">
        <div>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(32px,3.6vw,48px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--v2-navy)]">
            {t.titulo}
          </h1>
          <p className={`${TEXTO} mt-6 max-w-[580px] text-[18px]`}>{t.texto}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link prefetch={false} href={CANDIDATURA} className={`${BOTAO_PRIMARIO} min-h-14 text-[17px]!`}>
              {t.cta} <IconeSeta tamanho={17} />
            </Link>
            <a href="#como-funciona" className={`${BOTAO_CONTORNO} min-h-14 text-[17px]!`}>
              {t.verComoFunciona}
            </a>
          </div>
        </div>
        <aside className={`${CARTAO} p-7 sm:p-8`}>
          <h2 className="text-[20px] font-bold text-[var(--v2-navy)]">{t.quemSomos.titulo}</h2>
          <p className={`${TEXTO} mt-3`}>{t.quemSomos.texto}</p>
        </aside>
      </SectionV2>

      <SectionV2 tone="soft-blue">
        <SectionHeader eyebrow={t.situacoesEyebrow} titulo={t.situacoesTitulo} texto={t.situacoesTexto} />
        <ul className="mt-10 grid gap-5 md:grid-cols-2">
          {t.situacoes.map((s) => (
            <li key={s.titulo} className={`${CARTAO} p-6 sm:p-7`}>
              <h3 className="text-[19px] font-bold text-[var(--v2-navy)]">{s.titulo}</h3>
              <p className={`${TEXTO} mt-2`}>{s.texto}</p>
            </li>
          ))}
        </ul>
      </SectionV2>

      <SectionV2>
        <SectionHeader eyebrow={t.servicosEyebrow} titulo={t.servicosTitulo} texto={t.servicosTexto} />
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {t.servicos.map((s, i) => {
            const Icone = icones[i] ?? IconeEscudo;
            return (
              <li key={s.titulo} className={`${CARTAO} flex flex-col p-6 sm:p-7`}>
                <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--v2-mint)] text-[var(--v2-green)]">
                  <Icone tamanho={24} strokeWidth={1.6} />
                </span>
                <h3 className="mt-4 text-[19px] font-bold text-[var(--v2-navy)]">{s.titulo}</h3>
                <p className={`${TEXTO} mt-2`}>{s.texto}</p>
              </li>
            );
          })}
        </ul>
        <Link prefetch={false} href={ROTAS_V2.precario} className="mt-8 inline-flex min-h-12 items-center gap-2 text-[17px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline">
          {t.verPrecario} <IconeSeta tamanho={16} />
        </Link>
      </SectionV2>

      <SectionV2 id="como-funciona" tone="soft-blue">
        <SectionHeader eyebrow={t.passosEyebrow} titulo={t.passosTitulo} />
        <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {passosVisiveis.map((p, i) => (
            <li key={p.titulo} className={`${CARTAO} flex flex-col p-6`}>
              <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--v2-green)] text-[17px] font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-[19px] font-bold text-[var(--v2-navy)]">{p.titulo}</h3>
              <p className={`${TEXTO} mt-2`}>{p.texto}</p>
            </li>
          ))}
        </ol>
      </SectionV2>

      <SectionV2>
        <SectionHeader eyebrow={t.comissoesEyebrow} titulo={t.comissoesTitulo} />
        <ul className="mt-8 flex max-w-[820px] flex-col gap-4">
          {t.comissoes.map((item) => (
            <li key={item} className="flex items-start gap-3 text-[17px] leading-relaxed text-[var(--v2-navy)]">
              <span aria-hidden className="mt-[3px] flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-[var(--v2-green)] text-white">
                <IconeVisto tamanho={13} strokeWidth={2.8} />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-[820px] rounded-[14px] bg-[var(--v2-blue-soft)] px-5 py-4 text-[16px] leading-relaxed text-[var(--v2-navy)]">
          {t.comissoesNota}
        </p>
      </SectionV2>

      <SectionV2 tone="soft-blue">
        <SectionHeader eyebrow={t.perguntasEyebrow} titulo={t.perguntasTitulo} />
        <div className="mt-8 max-w-[860px]">
          <FAQAccordionV2 perguntas={t.perguntas} />
        </div>
      </SectionV2>

      <CTASection
        titulo={t.ctaFinalTitulo}
        texto={t.ctaFinalTexto}
        acao={
          <Link prefetch={false} href={CANDIDATURA} className={`${BOTAO_PRIMARIO} min-h-14 text-[17px]! w-full md:w-auto`}>
            {t.cta} <IconeSeta tamanho={17} />
          </Link>
        }
      />
    </>
  );
}
