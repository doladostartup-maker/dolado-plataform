import Link from "@/i18n/Link";
import { rico } from "@/i18n/Rico";
import { tInstitucional } from "@/i18n/mensagens/institucional";
import { textos } from "@/i18n/servidor";
import type { ReactNode } from "react";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { FAQAccordionV2 } from "@/components/marketing-v2/FAQAccordionV2";
import {
  IconeCirculoVisto,
  IconeDocumentoVisto,
  IconeEtiqueta,
  IconeFatura,
  IconeMensagem,
  IconePessoas,
  IconeSeta,
  IconeVisto,
} from "@/components/marketing-v2/Icones";
import { VisualHero } from "@/components/marketing-v2/Mockups";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";
import { StepsTimeline, type Passo } from "@/components/marketing-v2/StepsTimeline";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";
import type { Pergunta } from "@/components/landing/AccordionPerguntas";
import { CONTACTO_EMAIL } from "@/lib/site";

// DoLado para empresas (/empresas): página estática de apresentação a
// empresas que queiram disponibilizar a DoLado a colaboradores, oferecê-la a
// clientes ou explorar os dois públicos. Sem formulário próprio nem backend:
// o contacto usa o formulário já existente em /contacto ("Imprensa, parcerias
// e outros assuntos") e o e-mail institucional. Sem preços, condições,
// clientes nem resultados — formatos e condições ficam para a conversa.

const CONTACTO_EMPRESAS = `${ROTAS_V2.contacto}#formulario`;
const LINK = "font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline";

function AcoesContacto({ secundaria, falar }: { secundaria?: ReactNode; falar: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link prefetch={false} href={CONTACTO_EMPRESAS} className={BOTAO_PRIMARIO}>
        {falar} <IconeSeta tamanho={17} />
      </Link>
      {secundaria}
    </div>
  );
}

// Textos: src/i18n/mensagens/*/institucional.ts ("empresas").
const ICONES_PUBLICOS: ReactNode[] = [
  <IconePessoas key="p" tamanho={28} strokeWidth={1.6} />,
  <IconeCirculoVisto key="c" tamanho={28} strokeWidth={1.6} />,
];
const DO_CLIENTE = [true, false, true, false];
const ICONES_EXEMPLOS: ReactNode[] = [
  <IconeFatura key="f" tamanho={26} strokeWidth={1.6} />,
  <IconeDocumentoVisto key="d" tamanho={26} strokeWidth={1.6} />,
  <IconeEtiqueta key="e" tamanho={26} strokeWidth={1.6} />,
  <IconeMensagem key="m" tamanho={26} strokeWidth={1.6} />,
];
const IDS_PERGUNTAS = ["empresas-publico", "empresas-apoio", "empresas-casos", "empresas-condicoes", "empresas-resultado"];

export async function EmpresasV2() {
  const t = (await textos(tInstitucional)).empresas;
  const PUBLICOS = t.publicos.map((p, i) => ({ ...p, icone: ICONES_PUBLICOS[i] }));
  const PASSOS: Passo[] = t.passos.map((p, i) => ({
    titulo: p.titulo,
    texto: p.texto,
    rotulo: { texto: p.rotulo, doCliente: DO_CLIENTE[i] },
    final: i === t.passos.length - 1,
  }));
  const EXEMPLOS = t.exemplos.map((e, i) => ({ ...e, icone: ICONES_EXEMPLOS[i] }));
  const FORMATOS = t.formatos;
  const CLAREZA = t.clareza;
  const PERGUNTAS: Pergunta[] = t.perguntas.map((p, i) => ({ id: IDS_PERGUNTAS[i], ...p }));
  return (
    <>
      {/* ===== Hero ===== */}
      <SectionV2 size="compact" recortar className="grid items-center gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-12 lg:py-20">
        <div>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(32px,3.6vw,48px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--v2-navy)]">
            {t.titulo1}
            <br />
            <span className="font-semibold">{t.titulo2}</span>
          </h1>
          <p className={`${TEXTO} mt-6 max-w-[560px] text-[17.5px]`}>{t.texto}</p>
          <div className="mt-8">
            <AcoesContacto
              falar={t.falar}
              secundaria={
                <a href="#como-funciona" className={BOTAO_CONTORNO}>
                  {t.verComoFunciona}
                </a>
              }
            />
          </div>
          <p className="mt-6 text-[14px] text-[var(--v2-muted)]">{t.formatosNota}</p>
        </div>
        <VisualHero />
      </SectionV2>

      {/* ===== Proposta de valor ===== */}
      <SectionV2 id="solucao" tone="soft-blue">
        <SectionHeader
          eyebrow={t.solucao.eyebrow}
          titulo={t.solucao.titulo}
          texto={t.solucao.texto}
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {PUBLICOS.map((p) => (
            <article key={p.titulo} className={`${CARTAO} flex flex-col p-7 sm:p-9`}>
              <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--v2-mint)] text-[var(--v2-green)]">
                {p.icone}
              </span>
              <h3 className="mt-5 text-[22px] font-bold tracking-[-0.015em] text-[var(--v2-navy)]">{p.titulo}</h3>
              <p className="mt-3 text-[15.5px] leading-relaxed text-[var(--v2-muted)]">{p.texto}</p>
              <ul className="mt-6 space-y-3">
                {p.pontos.map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[15px] text-[var(--v2-navy)]">
                    <span className="mt-[1px] flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-[var(--v2-green)] text-white">
                      <IconeVisto tamanho={13} strokeWidth={2.8} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </SectionV2>

      {/* ===== Como funciona ===== */}
      <SectionV2 id="como-funciona">
        <SectionHeader
          eyebrow={t.comoFunciona.eyebrow}
          titulo={t.comoFunciona.titulo}
          texto={t.comoFunciona.texto}
        />
        <div className="mt-12">
          <StepsTimeline passos={PASSOS} />
        </div>
      </SectionV2>

      {/* ===== Exemplos de utilização ===== */}
      <SectionV2 tone="soft-green">
        <SectionHeader
          eyebrow={t.exemplosCabecalho.eyebrow}
          titulo={t.exemplosCabecalho.titulo}
          texto={t.exemplosCabecalho.texto}
          sobreVerde
        />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {EXEMPLOS.map((e) => (
            <li key={e.titulo} className={`${CARTAO} flex flex-col p-6`}>
              <span className="text-[var(--v2-green)]">{e.icone}</span>
              <h3 className="mt-4 text-[18px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{e.titulo}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--v2-muted)]">{e.texto}</p>
              <p className="mt-auto pt-5 text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--v2-green-dark)]">
                {e.contexto}
              </p>
            </li>
          ))}
        </ul>
      </SectionV2>

      {/* ===== Formatos ===== */}
      <SectionV2 id="formatos" className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <SectionHeader
          eyebrow={t.formatosCabecalho.eyebrow}
          titulo={t.formatosCabecalho.titulo}
          texto={t.formatosCabecalho.texto}
        />
        <ol className="border-t border-[var(--v2-line)]">
          {FORMATOS.map((f, i) => (
            <li key={f.titulo} className="flex gap-5 border-b border-[var(--v2-line)] py-6">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-[var(--v2-mint)] text-[14px] font-bold text-[var(--v2-green-dark)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-[18px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{f.titulo}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-[var(--v2-muted)]">{f.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </SectionV2>

      {/* ===== Confiança e clareza ===== */}
      <SectionV2 tone="soft-blue" className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <SectionHeader
          eyebrow={t.clarezaCabecalho.eyebrow}
          titulo={t.clarezaCabecalho.titulo}
          texto={t.clarezaCabecalho.texto}
        />
        <ul className="space-y-6">
          {CLAREZA.map((c) => (
            <li key={c.titulo} className="flex items-start gap-4">
              <span className="mt-[2px] flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-[var(--v2-green)] text-white">
                <IconeVisto tamanho={14} strokeWidth={2.8} />
              </span>
              <div>
                <h3 className="text-[17px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{c.titulo}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-[var(--v2-muted)]">{c.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </SectionV2>

      {/* ===== Perguntas frequentes ===== */}
      <SectionV2 id="perguntas" className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
        <SectionHeader
          eyebrow={t.perguntasCabecalho.eyebrow}
          titulo={t.perguntasCabecalho.titulo}
          texto={t.perguntasCabecalho.texto}
        />
        <FAQAccordionV2 perguntas={PERGUNTAS} />
      </SectionV2>

      {/* ===== CTA final ===== */}
      <CTASection
        eyebrow={t.ctaFinal.eyebrow}
        titulo={t.ctaFinal.titulo}
        texto={rico(t.ctaFinal.texto, {
          email: () => (
            <a href={`mailto:${CONTACTO_EMAIL}`} className={LINK}>
              {CONTACTO_EMAIL}
            </a>
          ),
        })}
        acao={
          <Link prefetch={false} href={CONTACTO_EMPRESAS} className={`${BOTAO_PRIMARIO} w-full md:w-auto`}>
            {t.falar} <IconeSeta tamanho={17} />
          </Link>
        }
      />
    </>
  );
}
