"use client";

import { useCallback, useState } from "react";
import { detectarOrigem, track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";
import { SiteHeader } from "./SiteHeader";

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";

type Secao = {
  titulo: string;
  paragrafos: string[];
};

const SECOES: Secao[] = [
  {
    titulo: "Estamos do seu lado",
    paragrafos: [
      "O nosso nome diz exatamente aquilo em que acreditamos.",
      "DoLado é estar do lado do consumidor.",
      "Quando surge um problema com um operador de telecomunicações ou com um fornecedor de energia ou água, nem sempre é fácil perceber quem contactar, como apresentar a situação, quais são os direitos aplicáveis ou quais os prazos de resposta.",
      "Na DoLado, o consumidor não tem de descobrir tudo sozinho.",
      "Ajudamos a compreender a situação, a preparar a reclamação e a acompanhar todo o processo, desde o primeiro passo até à sua resolução. Mantemos cada pessoa informada sobre o estado do processo, os passos seguintes e os prazos a ter em conta.",
      "Porque apresentar uma reclamação não deve significar passar horas à procura de legislação, contactos ou procedimentos.",
    ],
  },
  {
    titulo: "Mais do que resolver problemas, queremos ajudar a evitá-los",
    paragrafos: [
      "Muitos dos problemas enfrentados pelos consumidores poderiam ser evitados se a informação certa chegasse no momento certo.",
      "Por isso, a DoLado não existe apenas para ajudar quando algo corre mal.",
      "Com a Proteção, a DoLado ajuda a identificar situações que podem tornar-se num problema e avisa com antecedência — como o fim de períodos promocionais, o termo de períodos de fidelização ou alterações significativas no valor das faturas — para que possa agir a tempo.",
      "Queremos que cada consumidor tenha mais controlo e menos surpresas.",
    ],
  },
  {
    titulo: "Simples para quem utiliza. Rigoroso em cada etapa.",
    paragrafos: [
      "Não esperamos que os nossos clientes conheçam legislação, procedimentos ou entidades reguladoras.",
      "Queremos que os nossos clientes não tenham de se preocupar com isso.",
      "O nosso objetivo é transformar processos que podem parecer complexos numa experiência simples e clara, sem abdicar daquilo que consideramos essencial: transparência, rapidez e um preço acessível.",
      "Cada pessoa deve saber em que ponto se encontra o seu processo, o que está a ser feito e quais são os próximos passos.",
      "Sem linguagem desnecessariamente complicada. Sem ter de procurar sozinho todas as respostas.",
    ],
  },
];

const PROXIMIDADE_LINHAS = [
  "Alguém que acompanha.",
  "Que explica.",
  "Que está atento aos prazos.",
  "E que permanece ao seu lado ao longo de todo o processo.",
];

export function SobreNos() {
  const [origem] = useState(detectarOrigem);

  const openForm = useCallback(() => {
    track("click_nav_sobre_nos");
    window.location.assign(urlTratarCaso(origem));
  }, [origem]);

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      {/* ===== Secção 1: Nav ===== */}
      <SiteHeader ctaLabel="Tratar o meu caso" onCtaClick={openForm} />

      {/* ===== Secção 2: Hero (brand-wash) ===== */}
      <section className="flex flex-col items-center gap-4 bg-[var(--color-brand-wash)] px-4 py-16 text-center sm:px-10">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface)] text-2xl shadow-[var(--shadow-subtle)]">
          🤝
        </span>
        <h1 className="max-w-[640px] text-[clamp(26px,4.6vw,38px)] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--color-ink)]">
          Sobre Nós
        </h1>
        <div className="flex max-w-[600px] flex-col gap-3 text-base leading-relaxed text-[var(--color-ink-muted)]">
          <p>
            A DoLado nasceu de uma ideia simples: nenhum consumidor deve ser prejudicado por
            desconhecer os seus direitos, os prazos aplicáveis ou os passos necessários para
            resolver um problema.
          </p>
          <p>
            Todos os dias, há pessoas que pagam mais do que deviam, mantêm contratos que poderiam
            terminar, deixam passar prazos importantes ou acabam por desistir de reclamar porque não
            sabem por onde começar.
          </p>
          <p className="font-semibold text-[var(--color-ink)]">
            Foi para ajudar a mudar esta realidade que criámos a DoLado.
          </p>
        </div>
      </section>

      {/* ===== Secções 3–5: Texto institucional ===== */}
      {SECOES.map((s, i) => (
        <section key={s.titulo} className={`px-4 sm:px-10 ${i === 0 ? "pt-16 pb-6" : "py-6"}`}>
          <div className="mx-auto max-w-[680px]">
            <h2 className="mb-4 text-xl font-semibold text-[var(--color-ink)]">{s.titulo}</h2>
            <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
              {s.paragrafos.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* ===== Secção 6: Proximidade e confiança ===== */}
      <section className="px-4 pt-6 pb-14 sm:px-10">
        <div className="mx-auto max-w-[680px]">
          <h2 className="mb-4 text-xl font-semibold text-[var(--color-ink)]">Proximidade e confiança</h2>
          <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
            <p>
              Queremos que utilizar a DoLado seja como ter ao seu lado alguém que conhece o caminho e
              sabe quais os passos a dar.
            </p>
            <p className="border-l-[3px] border-[var(--color-brand)] pl-4 text-[var(--color-ink)]">
              {PROXIMIDADE_LINHAS.map((linha, i) => (
                <span key={linha}>
                  {linha}
                  {i < PROXIMIDADE_LINHAS.length - 1 && <br />}
                </span>
              ))}
            </p>
            <p>
              Porque, independentemente do valor em causa, acreditamos que nenhum consumidor deve
              ficar prejudicado simplesmente por não ter tido acesso à informação certa.
            </p>
            <p>É por isso que estamos aqui.</p>
          </div>
        </div>
      </section>

      {/* ===== Secção 7: Assinatura + CTA ===== */}
      <section className="px-4 pb-[72px] sm:px-10">
        <div className="mx-auto flex max-w-[680px] flex-col items-center gap-5 rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-7 text-center shadow-[var(--shadow-subtle)] sm:p-8">
          <p className="text-lg font-semibold text-[var(--color-ink)]">
            DoLado. <span className="text-[var(--color-brand)]">Do lado do consumidor.</span>
          </p>
          <button type="button" onClick={openForm} className={BOTAO_PRIMARIO}>
            Tratar o meu caso
          </button>
        </div>
      </section>
    </div>
  );
}
