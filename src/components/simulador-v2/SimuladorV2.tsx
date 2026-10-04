"use client";

import { useRef, useState } from "react";
import { IconeSeta } from "@/components/marketing-v2/Icones";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";
import { track } from "@/lib/analytics";
import {
  OPCOES_MOMENTO,
  OPCOES_PROBLEMA,
  OPCOES_SETOR,
  OPCOES_TITULAR,
  avaliarSimulador,
  parametrosPrePreenchimento,
  type ResultadoSimulador,
  type RespostasSimulador,
} from "@/lib/elegibilidade/regras";
import { urlTratarCaso } from "@/lib/site";

// Simulador público no Design System V2: 4 perguntas de escolha → resultado
// indicativo. Tudo acontece no browser — nada é gravado, enviado ou associado
// a uma conta. Regras em src/lib/elegibilidade/regras.ts; perguntas, textos
// dos resultados, CTA e medição iguais aos da versão anterior.

const ORIGEM = "/simulador-elegibilidade";

type Pergunta = { campo: keyof RespostasSimulador; titulo: string; ajuda?: string; opcoes: string[] };

const PERGUNTAS: Pergunta[] = [
  { campo: "setor", titulo: "Com que tipo de empresa é o problema?", opcoes: OPCOES_SETOR },
  {
    campo: "titular",
    titulo: "O contrato é pessoal?",
    ajuda: "Por exemplo, o telemóvel, a internet ou a eletricidade da sua casa.",
    opcoes: OPCOES_TITULAR,
  },
  { campo: "problema", titulo: "O que aconteceu?", opcoes: OPCOES_PROBLEMA },
  { campo: "momento", titulo: "Já reclamou junto da empresa?", opcoes: OPCOES_MOMENTO },
];

const RESPOSTAS_VAZIAS: RespostasSimulador = { setor: "", titular: "", problema: "", momento: "" };

const TEXTO_RESULTADO: Record<ResultadoSimulador, { titulo: string; texto?: string; cta?: string }> = {
  positivo: {
    titulo: "Pelas suas respostas, o seu caso parece enquadrar-se no tipo de situações que a DoLado trata.",
    texto: "Conte-nos o que aconteceu. A DoLado organiza o caso, prepara a reclamação e acompanha o processo consigo.",
    cta: "Tratar o meu caso",
  },
  incerto: {
    titulo: "Pelas suas respostas, não conseguimos determinar com segurança se este caso se enquadra no serviço da DoLado.",
    texto: "Se quiser avançar, conte-nos o que aconteceu no formulário do caso. No fim, escolhe a modalidade antes de pagar.",
    cta: "Tratar o meu caso",
  },
  negativo: {
    titulo: "Pelas suas respostas, este caso pode não se enquadrar no serviço atual da DoLado.",
  },
};

function hrefTratarCaso(respostas: RespostasSimulador) {
  const params = new URLSearchParams(parametrosPrePreenchimento(respostas)).toString();
  const base = urlTratarCaso(ORIGEM);
  return params ? `${base}&${params}` : base;
}

const ROTULO_PASSO = "text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]";

function Resultado({ respostas, onRecomecar }: { respostas: RespostasSimulador; onRecomecar: () => void }) {
  const { resultado, motivo } = avaliarSimulador(respostas);
  const texto = TEXTO_RESULTADO[resultado];

  return (
    <div aria-live="polite" className="flex flex-col gap-4">
      <p className={ROTULO_PASSO}>Resultado</p>
      <h2 className="text-[22px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">{texto.titulo}</h2>
      {motivo && <p className="text-[15.5px] leading-relaxed text-[var(--v2-muted)]">{motivo}</p>}
      {texto.texto && <p className="text-[15.5px] leading-relaxed text-[var(--v2-muted)]">{texto.texto}</p>}

      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        {texto.cta && (
          <a
            href={hrefTratarCaso(respostas)}
            onClick={() => track("simulador_clique_tratar_caso", { resultado })}
            className={BOTAO_PRIMARIO}
          >
            {texto.cta} <IconeSeta tamanho={17} />
          </a>
        )}
        <button type="button" onClick={onRecomecar} className={BOTAO_CONTORNO}>
          Responder de novo
        </button>
      </div>

      <p className="mt-2 border-t border-[var(--v2-line)] pt-4 text-[13.5px] text-[var(--v2-muted)]">
        Este resultado é apenas indicativo e baseia-se nas respostas fornecidas.
      </p>
    </div>
  );
}

function Simulador() {
  const [passo, setPasso] = useState(0);
  const [respostas, setRespostas] = useState<RespostasSimulador>(RESPOSTAS_VAZIAS);
  const iniciado = useRef(false);

  function responder(campo: keyof RespostasSimulador, valor: string) {
    if (!iniciado.current) {
      iniciado.current = true;
      track("simulador_iniciado");
    }
    const novas = { ...respostas, [campo]: valor };
    setRespostas(novas);
    const proximo = passo + 1;
    if (proximo === PERGUNTAS.length) {
      // Só o resultado (categoria) vai para a medição — nunca as respostas.
      const { resultado } = avaliarSimulador(novas);
      track("simulador_concluido", { resultado });
      track(`simulador_resultado_${resultado}`);
    }
    setPasso(proximo);
  }

  function recomecar() {
    setRespostas(RESPOSTAS_VAZIAS);
    setPasso(0);
  }

  if (passo >= PERGUNTAS.length) return <Resultado respostas={respostas} onRecomecar={recomecar} />;

  const pergunta = PERGUNTAS[passo];
  return (
    <div className="flex flex-col gap-5">
      <div
        role="progressbar"
        aria-label="Progresso do simulador"
        aria-valuemin={0}
        aria-valuemax={PERGUNTAS.length}
        aria-valuenow={passo}
        className="h-1.5 overflow-hidden rounded-full bg-[var(--v2-line)]"
      >
        <div
          className="h-full rounded-full bg-[var(--v2-green)] transition-all duration-300"
          style={{ width: `${(passo / PERGUNTAS.length) * 100}%` }}
        />
      </div>
      <p className={ROTULO_PASSO}>
        Pergunta {passo + 1} de {PERGUNTAS.length}
      </p>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-[22px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">
          {pergunta.titulo}
        </legend>
        {pergunta.ajuda && <p className="-mt-1 mb-1 text-[15px] text-[var(--v2-muted)]">{pergunta.ajuda}</p>}
        {pergunta.opcoes.map((opcao) => {
          const selecionada = respostas[pergunta.campo] === opcao;
          return (
            <button
              key={opcao}
              type="button"
              aria-pressed={selecionada}
              onClick={() => responder(pergunta.campo, opcao)}
              className={`min-h-12 w-full rounded-[12px] border px-4 py-3 text-left text-[15.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-green)] ${
                selecionada
                  ? "border-[var(--v2-green)] bg-[var(--v2-mint)] text-[var(--v2-green-dark)]"
                  : "border-[var(--v2-line-strong)] bg-white text-[var(--v2-navy)] hover:border-[var(--v2-green)]"
              }`}
            >
              {opcao}
            </button>
          );
        })}
      </fieldset>
      {passo > 0 && (
        <button
          type="button"
          onClick={() => setPasso(passo - 1)}
          className="self-start text-[15px] font-semibold text-[var(--v2-muted)] underline-offset-4 hover:text-[var(--v2-navy)] hover:underline"
        >
          ← Voltar
        </button>
      )}
    </div>
  );
}

const COMO_FUNCIONA: { titulo: string; texto: string }[] = [
  {
    titulo: "Para que serve.",
    texto:
      "Ajuda a perceber se a sua situação é do tipo que a DoLado trata: problemas de consumidores particulares com empresas de telecomunicações, energia e água, como aumentos de mensalidade, cobranças indevidas, fidelizações, falhas de serviço ou cancelamentos recusados.",
  },
  {
    titulo: "O que não é.",
    texto: "Não é uma avaliação jurídica do seu caso nem uma previsão do resultado da reclamação.",
  },
  {
    titulo: "As suas respostas.",
    texto: "Ficam apenas no seu navegador: não as guardamos nem as associamos a si.",
  },
  {
    titulo: "Se decidir avançar.",
    texto: "Em “Tratar o meu caso” descreve o que aconteceu, cria a sua conta e escolhe a modalidade. Só paga no fim.",
  },
];

export function SimuladorV2() {
  return (
    <>
      {/* ===== Hero + simulador ===== */}
      <SectionV2 size="compact" className="grid items-start gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:py-20">
        <div className="lg:pt-6">
          <Eyebrow>Grátis · sem conta · 4 perguntas</Eyebrow>
          <h1 className="mt-5 text-[clamp(32px,3.8vw,48px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--v2-navy)]">
            Veja se a DoLado pode ajudar com o seu caso
          </h1>
          <p className={`${TEXTO} mt-5 text-[17.5px]`}>
            Responda a 4 perguntas rápidas sobre a sua situação com uma empresa de telecomunicações, energia ou água.
            O resultado aparece logo, sem pedir e-mail nem criar conta.
          </p>
        </div>
        <div className={`${CARTAO} p-6 sm:p-8`}>
          <Simulador />
        </div>
      </SectionV2>

      {/* ===== Como funciona ===== */}
      <SectionV2 tone="soft-blue">
        <SectionHeader eyebrow="Como funciona" titulo="O que precisa de saber sobre o simulador." />
        <ul className="mt-10 grid gap-8 md:grid-cols-2 md:gap-x-12">
          {COMO_FUNCIONA.map((c) => (
            <li key={c.titulo}>
              <h3 className="text-[18px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{c.titulo}</h3>
              <p className="mt-2 text-[15.5px] leading-relaxed text-[var(--v2-muted)]">{c.texto}</p>
            </li>
          ))}
        </ul>
      </SectionV2>
    </>
  );
}
