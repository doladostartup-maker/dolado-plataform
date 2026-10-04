"use client";

import { useCallback, useState } from "react";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { IconeSeta } from "@/components/marketing-v2/Icones";
import { OrigemFundador } from "@/components/marketing-v2/OrigemFundador";
import { Eyebrow, SectionV2, type TomSecao } from "@/components/marketing-v2/SectionV2";
import { BOTAO_PRIMARIO, TEXTO, TITULO_H2 } from "@/components/marketing-v2/estilos";
import { detectarOrigem, track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";

// Sobre Nós no Design System V2 (secção 38 de docs/design/design-system-v2.md):
// página editorial com a história do fundador como eixo. Todo o texto
// institucional é o já publicado nesta página; só muda a apresentação.

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

// Fundo de cada secção institucional: a do meio (prevenção) em verde.
const TONS: TomSecao[] = ["white", "soft-green", "white"];

export function SobreNosV2() {
  const [origem] = useState(detectarOrigem);

  const tratarCaso = useCallback(() => {
    track("click_cta_sobre_nos");
    window.location.assign(urlTratarCaso(origem));
  }, [origem]);

  return (
    <>
      {/* ===== Hero ===== */}
      <SectionV2 size="compact" className="lg:py-20">
        <div className="max-w-[760px]">
          <Eyebrow>Sobre nós</Eyebrow>
          <h1 className="mt-5 text-[clamp(34px,4vw,52px)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[var(--v2-navy)]">
            Do lado do consumidor.
          </h1>
          <div className={`${TEXTO} mt-6 space-y-4 text-[17.5px]`}>
            <p>
              A DoLado nasceu de uma ideia simples: nenhum consumidor deve ser prejudicado por desconhecer os seus
              direitos, os prazos aplicáveis ou os passos necessários para resolver um problema.
            </p>
            <p>
              Todos os dias, há pessoas que pagam mais do que deviam, mantêm contratos que poderiam terminar, deixam
              passar prazos importantes ou acabam por desistir de reclamar porque não sabem por onde começar.
            </p>
            <p className="font-semibold text-[var(--v2-navy)]">
              Foi para ajudar a mudar esta realidade que criámos a DoLado.
            </p>
          </div>
        </div>
      </SectionV2>

      {/* ===== A nossa origem ===== */}
      <OrigemFundador />

      {/* ===== Texto institucional ===== */}
      {SECOES.map((s, i) => (
        <SectionV2 key={s.titulo} tone={TONS[i]} className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <h2 className={`${TITULO_H2} lg:sticky lg:top-28 lg:self-start`}>{s.titulo}</h2>
          <div className="max-w-[640px] space-y-4 text-[16.5px] leading-[1.7] text-[var(--v2-muted)]">
            {s.paragrafos.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </SectionV2>
      ))}

      {/* ===== Proximidade e confiança ===== */}
      <SectionV2 tone="soft-blue" className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <h2 className={`${TITULO_H2} lg:sticky lg:top-28 lg:self-start`}>Proximidade e confiança</h2>
        <div className="max-w-[640px] space-y-4 text-[16.5px] leading-[1.7] text-[var(--v2-muted)]">
          <p>
            Queremos que utilizar a DoLado seja como ter ao seu lado alguém que conhece o caminho e sabe quais os
            passos a dar.
          </p>
          <p className="my-8 border-l-[3px] border-[var(--v2-green)] pl-5 text-[21px] font-bold leading-[1.45] tracking-[-0.01em] text-[var(--v2-navy)]">
            {PROXIMIDADE_LINHAS.map((linha, i) => (
              <span key={linha}>
                {linha}
                {i < PROXIMIDADE_LINHAS.length - 1 && <br />}
              </span>
            ))}
          </p>
          <p>
            Porque, independentemente do valor em causa, acreditamos que nenhum consumidor deve ficar prejudicado
            simplesmente por não ter tido acesso à informação certa.
          </p>
          <p>É por isso que estamos aqui.</p>
        </div>
      </SectionV2>

      {/* ===== CTA final ===== */}
      <CTASection
        titulo="Tem um problema com uma empresa?"
        texto="Conte-nos o que aconteceu. A DoLado trata dele consigo."
        acao={
          <button type="button" onClick={tratarCaso} className={`${BOTAO_PRIMARIO} w-full md:w-auto`}>
            Tratar do meu caso <IconeSeta tamanho={17} />
          </button>
        }
      />
    </>
  );
}
