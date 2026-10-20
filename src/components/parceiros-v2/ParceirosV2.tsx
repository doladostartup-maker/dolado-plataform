import type { ReactNode } from "react";
import { tParceiros } from "@/i18n/mensagens/parceiros";
import { textos } from "@/i18n/servidor";
import { IconeEscudo, IconePessoas, IconeSeta } from "@/components/marketing-v2/Icones";
import { ListaVistos } from "@/components/marketing-v2/ListaVistos";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_PRIMARIO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";
import { FormularioCandidatura } from "./FormularioCandidatura";

// Programa de Parceiros (/parceiros): apresentação dos dois modelos
// (Indicação e Distribuição) e candidatura. Sem preços, comissões em valor
// nem promessas de rendimento — as condições constam do acordo de parceria.
// Textos: src/i18n/mensagens/*/parceiros.ts.

function Modelo({ icone, titulo, texto, itens }: { icone: ReactNode; titulo: string; texto: string; itens: string[] }) {
  return (
    <div className={`${CARTAO} flex flex-col gap-4`}>
      <span aria-hidden className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--v2-mint)] text-[var(--v2-green)]">
        {icone}
      </span>
      <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">{titulo}</h3>
      <p className={TEXTO}>{texto}</p>
      <ListaVistos itens={itens} />
    </div>
  );
}

export async function ParceirosV2() {
  const t = (await textos(tParceiros)).pagina;
  return (
    <>
      <SectionV2 size="compact" className="lg:py-20">
        <div className="max-w-[760px]">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(32px,3.6vw,48px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--v2-navy)]">
            {t.titulo}
          </h1>
          <p className={`${TEXTO} mt-5 max-w-[640px]`}>{t.texto}</p>
          <a href="#candidatura" className={`${BOTAO_PRIMARIO} mt-7`}>
            {t.cta} <IconeSeta tamanho={17} />
          </a>
        </div>
      </SectionV2>

      <SectionV2 tone="soft-blue" className="flex flex-col gap-10">
        <SectionHeader titulo={t.modelosTitulo} />
        <div className="grid gap-6 lg:grid-cols-2">
          <Modelo icone={<IconePessoas tamanho={24} strokeWidth={1.7} />} {...t.indicacao} />
          <Modelo icone={<IconeEscudo tamanho={24} strokeWidth={1.7} />} {...t.distribuicao} />
        </div>
      </SectionV2>

      <SectionV2 className="flex flex-col gap-10">
        <SectionHeader titulo={t.passosTitulo} />
        <ol className="grid gap-6 md:grid-cols-3">
          {t.passos.map((p, i) => (
            <li key={p.titulo} className={`${CARTAO} flex flex-col gap-2`}>
              <span className="text-[13px] font-bold text-[var(--v2-green)]">{i + 1}</span>
              <p className="text-[17px] font-bold text-[var(--v2-navy)]">{p.titulo}</p>
              <p className={TEXTO}>{p.texto}</p>
            </li>
          ))}
        </ol>
        <p className={`${TEXTO} max-w-[760px] text-[14.5px]`}>{t.nota}</p>
      </SectionV2>

      <SectionV2 tone="soft-blue" id="candidatura" className="flex justify-center">
        <FormularioCandidatura />
      </SectionV2>
    </>
  );
}
