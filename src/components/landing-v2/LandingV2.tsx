"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import { detectarOrigem, track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";
import {
  IconeCalendario,
  IconeCirculoVisto,
  IconeDocumentoVisto,
  IconeEscudo,
  IconeFormulario,
  IconeLupaDocumento,
  IconeMensagem,
  IconePergunta,
  IconePessoas,
  IconeSeta,
  IconeVisto,
} from "./Icones";
import { PainelCaso, PainelProtecao, VisualFidelizacao, VisualHero, VisualSimulador } from "./Mockups";
import { NavegacaoV2, RodapeV2 } from "./NavegacaoV2";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, CARTAO, CONTENTOR, EYEBROW, TEXTO, TITULO_H2 } from "./estilos";

// Página de teste /landing-v2 — linguagem visual própria, próxima do mockup
// de 04/10/2026. Tudo o que é visual vive em src/components/landing-v2/; a
// homepage "/" e os componentes partilhados não são usados nem alterados.
//
// Regras de conteúdo: gratuito só a Calculadora de Cancelamento (fidelização)
// e o Simulador de Elegibilidade; a comparação de faturas só na Proteção; sem
// logótipos de terceiros; sem testemunhos inventados.

const CORES = {
  "--v2-navy": "#0B2545",
  "--v2-muted": "#55657A",
  "--v2-line": "#E4EAF1",
  "--v2-line-strong": "#CBD5E1",
  "--v2-green": "#0A7A4F",
  "--v2-green-hover": "#08643F",
  "--v2-green-dark": "#08583A",
  "--v2-mint": "#E6F4EC",
  "--v2-mint-bg": "#F1F9F4",
  "--v2-blue": "#2563A8",
  "--v2-blue-soft": "#EEF4FB",
  "--v2-blue-bg": "#F4F8FC",
  "--v2-surface": "#F7F9FC",
} as CSSProperties;

const GARANTIAS: { icone: ReactNode; texto: string }[] = [
  { icone: <IconeEscudo tamanho={20} />, texto: "Simples e seguro" },
  { icone: <IconeDocumentoVisto tamanho={20} />, texto: "Com a sua aprovação" },
  { icone: <IconePessoas tamanho={20} />, texto: "Acompanhamos o processo" },
];

const PASSOS: { icone: ReactNode; titulo: string; texto: string }[] = [
  {
    icone: <IconeFormulario tamanho={34} strokeWidth={1.5} />,
    titulo: "Conte-nos o que aconteceu",
    texto: "Explique o problema e envie os documentos relevantes.",
  },
  {
    icone: <IconeLupaDocumento tamanho={34} strokeWidth={1.5} />,
    titulo: "Nós analisamos e preparamos",
    texto: "Organizamos a informação e preparamos o texto adequado ao seu caso.",
  },
  {
    icone: <IconeCirculoVisto tamanho={34} strokeWidth={1.5} />,
    titulo: "Confirma antes do envio",
    texto: "Revê exatamente o que será enviado e autoriza quando estiver satisfeito.",
  },
  {
    icone: <IconeMensagem tamanho={34} strokeWidth={1.5} />,
    titulo: "Acompanhamos o processo",
    texto: "Pode consultar no portal o histórico, o texto enviado e os comprovativos associados ao caso.",
  },
];

const TRATAMENTO = [
  "Reclamações a empresas de vários setores",
  "Texto claro e fundamentado",
  "Envio ao canal adequado",
  "Acompanhamento do processo",
];

const PROTECAO = [
  "Alterações relevantes nas suas faturas, comparadas mês a mês",
  "Aproximação do fim de uma promoção",
  "Datas importantes de fidelização",
  "Situações que possam justificar uma análise mais atenta",
];

function ListaVistos({ itens }: { itens: string[] }) {
  return (
    <ul className="space-y-3.5">
      {itens.map((t) => (
        <li key={t} className="flex items-start gap-3 text-[15.5px] text-[var(--v2-navy)]">
          <span className="mt-[1px] flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-[var(--v2-green)] text-white">
            <IconeVisto tamanho={13} strokeWidth={2.8} />
          </span>
          {t}
        </li>
      ))}
    </ul>
  );
}

export function LandingV2({ classeFonte }: { classeFonte: string }) {
  const [origem] = useState(detectarOrigem);

  const tratarCaso = useCallback(
    (evento: string) => {
      track(evento);
      window.location.assign(urlTratarCaso(origem));
    },
    [origem],
  );

  return (
    <div style={CORES} className={`${classeFonte} min-h-screen bg-white text-[var(--v2-navy)] antialiased`}>
      <NavegacaoV2 onTratarCaso={() => tratarCaso("click_landing_v2_nav")} />

      {/* ===== Hero ===== */}
      <section className="overflow-hidden">
        <div className={`${CONTENTOR} grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.35fr_1fr] lg:gap-12 lg:py-20`}>
          <div>
            <span className={EYEBROW}>Do seu lado com as empresas</span>
            <h1 className="mt-5 text-[clamp(34px,3.7vw,50px)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[var(--v2-navy)]">
              Tem um problema <br className="hidden sm:inline" />
              com uma empresa?
              <br />
              <span className="font-semibold">A DoLado trata dele por si.</span>
            </h1>
            <p className={`${TEXTO} mt-6 max-w-[540px] text-[17.5px]`}>
              Explique-nos o que aconteceu. Analisamos a sua situação, preparamos a reclamação,
              mostramos-lhe o texto antes de enviar e acompanhamos o processo consigo.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => tratarCaso("click_landing_v2_hero")} className={BOTAO_PRIMARIO}>
                Tratar do meu caso <IconeSeta tamanho={17} />
              </button>
              <Link
                href="/simulador-elegibilidade"
                onClick={() => track("click_landing_v2_hero_simulador")}
                className={BOTAO_CONTORNO}
              >
                Ver se a DoLado pode ajudar
              </Link>
            </div>
            <ul className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-7">
              {GARANTIAS.map((g) => (
                <li key={g.texto} className="flex items-center gap-2.5 text-[14px] font-medium text-[var(--v2-muted)]">
                  <span className="text-[var(--v2-navy)]">{g.icone}</span>
                  {g.texto}
                </li>
              ))}
            </ul>
          </div>
          <VisualHero />
        </div>
      </section>

      {/* ===== Ferramentas gratuitas ===== */}
      <section id="ferramentas" className="scroll-mt-20 bg-[var(--v2-blue-bg)]">
        <div className={`${CONTENTOR} py-16 sm:py-20`}>
          <span className={EYEBROW}>Ferramentas gratuitas</span>
          <h2 className={`${TITULO_H2} mt-4`}>Ainda não sabe se existe um problema?</h2>
          <p className={`${TEXTO} mt-4 max-w-[620px]`}>
            Antes de contratar qualquer serviço, pode usar gratuitamente estas ferramentas da DoLado para
            perceber melhor a sua situação.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              {
                icone: <IconeCalendario tamanho={30} strokeWidth={1.6} />,
                titulo: "Não sei quando termina a fidelização",
                texto:
                  "Consulte as informações necessárias para perceber quando termina a sua fidelização e quais as condições relevantes.",
                visual: <VisualFidelizacao />,
                cta: "Verificar a fidelização grátis",
                href: "/calculadora-cancelamento",
                evento: "click_landing_v2_fidelizacao",
              },
              {
                icone: <IconePergunta tamanho={30} strokeWidth={1.6} />,
                titulo: "Não sei se a DoLado pode tratar do meu caso",
                texto: "Conte-nos o que aconteceu e veja gratuitamente se a situação pode ser tratada pela DoLado.",
                visual: <VisualSimulador />,
                cta: "Verificar o meu caso grátis",
                href: "/simulador-elegibilidade",
                evento: "click_landing_v2_simulador",
              },
            ].map((f) => (
              <article key={f.titulo} className={`${CARTAO} flex flex-col p-7 sm:p-9`}>
                <span className="text-[var(--v2-green)]">{f.icone}</span>
                <h3 className="mt-5 text-[21px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">{f.titulo}</h3>
                <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed text-[var(--v2-muted)]">{f.texto}</p>
                <div className="my-7">{f.visual}</div>
                <Link
                  href={f.href}
                  onClick={() => track(f.evento)}
                  className={`${BOTAO_CONTORNO} mt-auto self-start`}
                >
                  {f.cta} <IconeSeta tamanho={16} />
                </Link>
              </article>
            ))}
          </div>
          <p className="mt-6 text-[13.5px] text-[var(--v2-muted)]">Sem conta e sem e-mail. O resultado aparece logo no ecrã.</p>
        </div>
      </section>

      {/* ===== Como funciona ===== */}
      <section id="como-funciona" className="scroll-mt-20">
        <div className={`${CONTENTOR} py-16 sm:py-20`}>
          <span className={EYEBROW}>Como funciona</span>
          <h2 className={`${TITULO_H2} mt-4`}>Simples, do princípio ao fim.</h2>
          <ol className="mt-12 grid gap-0 lg:grid-cols-4 lg:gap-8">
            {PASSOS.map((p, i) => {
              const ultimo = i === PASSOS.length - 1;
              return (
                <li key={p.titulo} className="relative flex gap-5 pb-10 last:pb-0 lg:block lg:pb-0">
                  {/* Ligação vertical (telemóvel) e seta horizontal (desktop) */}
                  {!ultimo && (
                    <>
                      <span aria-hidden="true" className="absolute left-[15px] top-10 h-[calc(100%-44px)] w-[2px] bg-[var(--v2-mint)] lg:hidden" />
                      <span aria-hidden="true" className="absolute right-[-26px] top-[22px] hidden text-[var(--v2-line-strong)] lg:block">
                        <IconeSeta tamanho={20} />
                      </span>
                    </>
                  )}
                  <div className="flex flex-none items-center gap-4 self-start lg:mb-6">
                    <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[var(--v2-green)] text-[14px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="hidden text-[var(--v2-navy)] lg:block">{p.icone}</span>
                  </div>
                  <div>
                    <h3 className="mb-2 text-[17px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{p.titulo}</h3>
                    <p className="text-[15px] leading-relaxed text-[var(--v2-muted)] lg:pr-4">{p.texto}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ===== A nossa origem ===== */}
      <section className="bg-[var(--v2-surface)]">
        <div className={`${CONTENTOR} grid gap-10 py-16 sm:py-20 md:grid-cols-[260px_1fr] md:items-center xl:grid-cols-[300px_1fr_300px] lg:gap-12`}>
          {/* Fotografia real, já publicada numa versão anterior da homepage. */}
          <Image
            src="/landing/founder-thiago.webp"
            alt="Thiago Pereira, fundador da DoLado"
            width={300}
            height={340}
            className="aspect-[4/5] w-full max-w-[260px] rounded-[18px] object-cover md:max-w-none"
          />
          <div className="max-w-[560px]">
            <span className={EYEBROW}>A nossa origem</span>
            <h2 className={`${TITULO_H2} mt-4`}>“Eu próprio já passei por isto.”</h2>
            <div className="mt-6 space-y-4 text-[16px] leading-[1.7] text-[var(--v2-muted)]">
              <p>
                Tive uma penalização de fidelização de uma operadora depois de aumentos e só mais tarde
                descobri que poderia ter tido outras opções.
              </p>
              <p>
                Percebi que muitas pessoas passam pelo mesmo, não porque não tenham direitos, mas porque nem
                sempre sabem quais são ou o que devem fazer.
              </p>
              <p>
                Foi por isso que criei a DoLado: para que ninguém seja prejudicado simplesmente por
                desconhecer as leis, os caminhos ou as responsabilidades.
              </p>
            </div>
            <p className="mt-6 text-[15px] font-semibold text-[var(--v2-navy)]">— Thiago Pereira, fundador da DoLado</p>
          </div>
          <aside className="rounded-[18px] bg-[var(--v2-mint)] p-7 md:col-span-2 xl:col-span-1">
            <span className="text-[var(--v2-green)]">
              <IconePessoas tamanho={32} strokeWidth={1.6} />
            </span>
            <h3 className="mt-4 text-[20px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">
              Do lado de quem consome.
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--v2-muted)]">
              A DoLado existe para ajudar os consumidores a resolver problemas com empresas e a evitar que
              voltem a acontecer.
            </p>
            <Link href="/sobre-nos" className="mt-5 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline">
              Saber mais sobre nós <IconeSeta tamanho={15} />
            </Link>
          </aside>
        </div>
      </section>

      {/* ===== Tratamento do caso ===== */}
      <section>
        <div className={`${CONTENTOR} grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16`}>
          <div>
            <span className={EYEBROW}>Tratamento do seu caso</span>
            <h2 className={`${TITULO_H2} mt-4`}>
              Encontrou um problema?
              <br />
              A DoLado trata dele consigo.
            </h2>
            <p className={`${TEXTO} mt-5 max-w-[520px]`}>
              Preparamos a reclamação, mostramos-lhe o texto antes do envio e acompanhamos o processo consigo.
            </p>
            <div className="mt-7">
              <ListaVistos itens={TRATAMENTO} />
            </div>
            <Link href="/#precario" onClick={() => track("click_landing_v2_precos")} className={`${BOTAO_PRIMARIO} mt-9`}>
              Ver preços e tratar do meu caso <IconeSeta tamanho={17} />
            </Link>
          </div>
          <PainelCaso />
        </div>
      </section>

      {/* ===== Proteção ===== */}
      <section className="bg-[var(--v2-mint-bg)]">
        <div className={`${CONTENTOR} grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16`}>
          <div>
            <span className={`${EYEBROW} bg-white`}>Depois de resolver o problema</span>
            <h2 className={`${TITULO_H2} mt-4`}>Podemos continuar atentos por si.</h2>
            <p className={`${TEXTO} mt-5 max-w-[540px]`}>
              Com a Proteção DoLado, acompanhamos as informações relevantes que nos disponibiliza e avisamos
              quando identificamos algo que merece a sua atenção.
            </p>
            <div className="mt-7">
              <ListaVistos itens={PROTECAO} />
            </div>
            <Link href="/#precario" onClick={() => track("click_landing_v2_protecao")} className={`${BOTAO_PRIMARIO} mt-9`}>
              Conhecer a Proteção <IconeSeta tamanho={17} />
            </Link>
          </div>
          <PainelProtecao />
        </div>
      </section>

      {/*
        Prova social: sem testemunhos reais aprovados no projeto, a secção não
        é mostrada. Quando existirem, entram aqui (três cartões com texto curto
        e nome; sem fotografias, estrelas nem resultados inventados).

        Setores: omitida. O tratamento de casos aceita hoje só Telecomunicações,
        Energia e Água (SETORES em src/lib/pedidoCaso.ts) e o mockup usava
        logótipos de empresas, que não podem ser usados.
      */}

      {/* ===== CTA final ===== */}
      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-8 rounded-[24px] bg-[linear-gradient(120deg,var(--v2-mint)_0%,var(--v2-blue-soft)_100%)] px-7 py-10 sm:px-12 sm:py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <span className={`${EYEBROW} bg-white`}>Não sabe por onde começar?</span>
            <h2 className={`${TITULO_H2} mt-4`}>Conte-nos o que aconteceu.</h2>
            <p className={`${TEXTO} mt-3`}>Se houver alguma coisa que possamos tratar, mostramos-lhe o próximo passo.</p>
          </div>
          <Link
            href="/simulador-elegibilidade"
            onClick={() => track("click_landing_v2_cta_final")}
            className={`${BOTAO_PRIMARIO} w-full flex-none md:w-auto`}
          >
            Ver se a DoLado pode ajudar <IconeSeta tamanho={17} />
          </Link>
        </div>
      </section>

      <RodapeV2 />
    </div>
  );
}
