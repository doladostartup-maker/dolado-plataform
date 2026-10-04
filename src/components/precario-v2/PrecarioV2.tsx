"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CATEGORIAS_PERGUNTAS } from "@/components/landing/conteudoPerguntasFrequentes";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { FAQAccordionV2 } from "@/components/marketing-v2/FAQAccordionV2";
import { IconeCalendario, IconeDocumentoVisto, IconeEscudo, IconeSeta } from "@/components/marketing-v2/Icones";
import { GRELHA_PLANOS, PricingCard } from "@/components/marketing-v2/PricingCard";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, TEXTO } from "@/components/marketing-v2/estilos";
import { track } from "@/lib/analytics";
import { PRAZO_LIVRE_RESOLUCAO_DIAS, ROTAS_LEGAIS } from "@/lib/legal";
import { IVA_INCLUIDO, PLANOS, formatarPreco, type PlanoId } from "@/lib/planos";
import { CONTEUDO_PLANOS, NOTA_CONVERSAO_AVULSO, destinoPlano } from "@/lib/precario";

// Preçário no Design System V2 (/precario): organizado pela necessidade do
// cliente (secção 35 de docs/design/design-system-v2.md), não por plano.
// Nomes e preços vêm de src/lib/planos.ts; o que cada plano inclui e o
// destino dos botões, de src/lib/precario.ts (os mesmos do preçário da
// homepage). Nenhuma regra de compra muda aqui.

const NECESSIDADES: { plano: PlanoId; necessidade: string; cta: string; destaque?: boolean }[] = [
  { plano: "avulso", necessidade: "Tenho um problema agora.", cta: "Tratar do meu caso" },
  {
    plano: "caso_protecao",
    necessidade: "Tenho um problema e quero continuar protegido.",
    cta: "Escolher Caso + Proteção",
    destaque: true,
  },
  { plano: "protecao", necessidade: "Não tenho um problema agora, mas quero acompanhamento.", cta: "Aderir à Proteção" },
];

const ANTES_DE_DECIDIR: { icone: ReactNode; titulo: string; texto: ReactNode }[] = [
  {
    icone: <IconeDocumentoVisto tamanho={28} strokeWidth={1.6} />,
    titulo: "Revê antes do envio",
    texto: "Nada é enviado em seu nome sem que reveja o texto preparado e autorize o envio.",
  },
  {
    icone: <IconeCalendario tamanho={28} strokeWidth={1.6} />,
    titulo: "Cancela quando quiser",
    texto:
      "Pode cancelar a subscrição a qualquer momento na sua área de cliente. O serviço mantém-se até ao fim do período já pago.",
  },
  {
    icone: <IconeEscudo tamanho={28} strokeWidth={1.6} />,
    titulo: "Livre resolução",
    texto: (
      <>
        Nos casos legalmente aplicáveis, dispõe de {PRAZO_LIVRE_RESOLUCAO_DIAS} dias para exercer o direito de
        livre resolução.{" "}
        <Link
          href={ROTAS_LEGAIS.livreResolucao}
          className="font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline"
        >
          Saber mais
        </Link>
      </>
    ),
  },
];

// Perguntas já publicadas em /perguntas-frequentes (mesmas respostas).
const IDS_PERGUNTAS = [
  "diferenca-planos",
  "sem-subscricao",
  "avulso-depois-subscricao",
  "cancelar-protecao",
  "livre-resolucao",
];
const PERGUNTAS = (CATEGORIAS_PERGUNTAS.find((c) => c.id === "planos")?.perguntas ?? []).filter((p) =>
  IDS_PERGUNTAS.includes(p.id),
);

export function PrecarioV2() {
  const escolher = (plano: PlanoId) => {
    track(`click_precario_${plano}`, { pagina: "precario_v2" });
    window.location.assign(destinoPlano(plano, "/precario"));
  };

  return (
    <>
      {/* ===== Necessidades e planos ===== */}
      <SectionV2 size="compact" className="lg:py-20">
        <div className="max-w-[720px]">
          <Eyebrow>Preçário</Eyebrow>
          <h1 className="mt-5 text-[clamp(34px,4vw,52px)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[var(--v2-navy)]">
            De que tipo de ajuda precisa?
          </h1>
          <p className={`${TEXTO} mt-5 text-[17.5px]`}>
            Escolha conforme a sua situação: tratar um problema agora, tratar e continuar protegido, ou só
            acompanhamento. Todos os preços têm {IVA_INCLUIDO}.
          </p>
        </div>

        <div className={`mt-12 ${GRELHA_PLANOS}`}>
          {NECESSIDADES.map(({ plano: id, necessidade, cta, destaque }) => {
            const plano = PLANOS[id];
            const conteudo = CONTEUDO_PLANOS[id];
            return (
              <PricingCard
                key={id}
                necessidade={necessidade}
                nome={plano.nome}
                preco={formatarPreco(plano.precoCentimos)}
                unidade={plano.subscricao ? "/mês" : "/ caso"}
                condicoes={plano.subscricao ? `Subscrição mensal · ${IVA_INCLUIDO}` : `Pagamento único · ${IVA_INCLUIDO}`}
                resumo={conteudo.resumo}
                inclui={conteudo.inclui}
                naoInclui={conteudo.naoInclui}
                destaque={destaque}
                acao={
                  <button
                    type="button"
                    onClick={() => escolher(id)}
                    className={`${destaque ? BOTAO_PRIMARIO : BOTAO_CONTORNO} w-full`}
                  >
                    {cta} <IconeSeta tamanho={16} />
                  </button>
                }
              />
            );
          })}
        </div>

        <div className="mt-8 max-w-[760px] space-y-2 text-[14px] leading-relaxed text-[var(--v2-muted)]">
          <p>{NOTA_CONVERSAO_AVULSO}</p>
          <p>Preços de lançamento — sujeitos a alteração.</p>
        </div>
      </SectionV2>

      {/* ===== Antes de decidir ===== */}
      <SectionV2 tone="soft-blue">
        <SectionHeader eyebrow="Antes de decidir" titulo="O que precisa de saber." />
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
          <SectionHeader eyebrow="Perguntas frequentes" titulo="Planos e pagamentos." />
          <Link
            href="/perguntas-frequentes"
            className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline"
          >
            Ver todas as perguntas <IconeSeta tamanho={15} />
          </Link>
        </div>
        <FAQAccordionV2 perguntas={PERGUNTAS} />
      </SectionV2>

      {/* ===== CTA final ===== */}
      <CTASection
        eyebrow="Ainda não sabe qual escolher?"
        titulo="Veja primeiro se a DoLado pode ajudar."
        texto="É gratuito, sem conta e sem e-mail."
        acao={
          <Link
            href="/simulador-elegibilidade"
            onClick={() => track("click_precario_v2_simulador")}
            className={`${BOTAO_PRIMARIO} w-full md:w-auto`}
          >
            Ver se a DoLado pode ajudar <IconeSeta tamanho={17} />
          </Link>
        }
      />
    </>
  );
}
