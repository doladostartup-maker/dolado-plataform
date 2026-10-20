import type { ReactNode } from "react";
import { tParceiros } from "@/i18n/mensagens/parceiros";
import { textos } from "@/i18n/servidor";
import { IconeEscudo, IconePessoas, IconeSeta } from "@/components/marketing-v2/Icones";
import { ListaVistos } from "@/components/marketing-v2/ListaVistos";
import { StepsTimeline, type Passo } from "@/components/marketing-v2/StepsTimeline";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";
import { FormularioCandidatura } from "./FormularioCandidatura";

// Programa de Parceiros (/parceiros): apresentação dos dois modelos
// (Indicação e Distribuição) e candidatura. Sem preços, comissões em valor
// nem promessas de rendimento — as condições constam do acordo de parceria.
// Textos: src/i18n/mensagens/*/parceiros.ts. Layout como /empresas
// (EmpresasV2): hero em duas colunas, cartões alinhados por subgrid.

function Modelo({ icone, titulo, texto, itens }: { icone: ReactNode; titulo: string; texto: string; itens: string[] }) {
  return (
    <article className={`${CARTAO} flex flex-col p-7 sm:p-9 md:row-span-4 md:grid md:grid-rows-subgrid`}>
      <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--v2-mint)] text-[var(--v2-green)]">
        {icone}
      </span>
      <h3 className="mt-5 text-[22px] font-bold tracking-[-0.015em] text-[var(--v2-navy)]">{titulo}</h3>
      <p className="mt-3 text-[15.5px] leading-relaxed text-[var(--v2-muted)]">{texto}</p>
      <div className="mt-6">
        <ListaVistos itens={itens} />
      </div>
    </article>
  );
}

export async function ParceirosV2() {
  const { pagina: t, candidatura: c } = await textos(tParceiros);
  const passos: Passo[] = t.passos.map((p, i) => ({ ...p, final: i === t.passos.length - 1 }));
  return (
    <>
      <SectionV2 size="compact" className="grid items-center gap-12 lg:grid-cols-[1.35fr_1fr] lg:py-20">
        <div>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(32px,3.6vw,48px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--v2-navy)]">
            {t.titulo}
          </h1>
          <p className={`${TEXTO} mt-6 max-w-[560px] text-[17.5px]`}>{t.texto}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#candidatura" className={BOTAO_PRIMARIO}>
              {t.cta} <IconeSeta tamanho={17} />
            </a>
            <a href="#modelos" className={BOTAO_CONTORNO}>
              {t.verModelos}
            </a>
          </div>
        </div>
        <aside className={`${CARTAO} p-7 sm:p-8`}>
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]">{t.garantias.titulo}</p>
          <div className="mt-5">
            <ListaVistos itens={t.garantias.itens} />
          </div>
        </aside>
      </SectionV2>

      <SectionV2 id="modelos" tone="soft-blue">
        <SectionHeader eyebrow={t.modelosEyebrow} titulo={t.modelosTitulo} />
        <div className="mt-10 grid gap-6 md:grid-cols-2 md:gap-y-0">
          <Modelo icone={<IconePessoas tamanho={26} strokeWidth={1.6} />} {...t.indicacao} />
          <Modelo icone={<IconeEscudo tamanho={26} strokeWidth={1.6} />} {...t.distribuicao} />
        </div>
      </SectionV2>

      <SectionV2>
        <SectionHeader eyebrow={t.passosEyebrow} titulo={t.passosTitulo} />
        <div className="mt-12">
          <StepsTimeline passos={passos} />
        </div>
        <p className="mt-12 max-w-[760px] rounded-[14px] bg-[var(--v2-blue-soft)] px-5 py-4 text-[14.5px] leading-relaxed text-[var(--v2-muted)]">
          {t.nota}
        </p>
      </SectionV2>

      <SectionV2 tone="soft-blue" id="candidatura" className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <SectionHeader eyebrow={c.eyebrow} titulo={c.titulo} texto={c.texto} />
        <FormularioCandidatura />
      </SectionV2>
    </>
  );
}
