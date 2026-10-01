"use client";

import Link from "next/link";
import { useRef, useState } from "react";
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
import { LIVRO_RECLAMACOES_URL, ROTAS_LEGAIS } from "@/lib/legal";
import { urlTratarCaso } from "@/lib/site";
import { SiteHeader } from "./SiteHeader";

// Simulador público: 4 perguntas de escolha → resultado indicativo. Tudo
// acontece no browser — nada é gravado, enviado ou associado a uma conta.
// Regras em src/lib/elegibilidade/regras.ts.

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

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";
const BOTAO_SECUNDARIO =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]";

const TEXTO_RESULTADO: Record<ResultadoSimulador, { titulo: string; texto?: string; cta?: string }> = {
  positivo: {
    titulo: "Pelas suas respostas, o seu caso parece enquadrar-se no tipo de situações que a DoLado trata.",
    texto: "Conte-nos o que aconteceu. A DoLado organiza o caso, prepara a reclamação e acompanha o processo consigo.",
    cta: "Tratar o meu caso",
  },
  incerto: {
    titulo: "Pelas suas respostas, não conseguimos determinar com segurança se este caso se enquadra no serviço da DoLado.",
    texto: "Se quiser avançar, pode explicar a situação no formulário do caso. Só escolhe a modalidade e paga no fim.",
    cta: "Explicar o meu caso",
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

function Resultado({ respostas, onRecomecar }: { respostas: RespostasSimulador; onRecomecar: () => void }) {
  const { resultado, motivo } = avaliarSimulador(respostas);
  const texto = TEXTO_RESULTADO[resultado];

  return (
    <div aria-live="polite" className="flex flex-col gap-4">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">Resultado</p>
      <h2 className="text-[19px] font-semibold leading-snug text-[var(--color-ink)]">{texto.titulo}</h2>
      {motivo && <p className="text-[14.5px] leading-relaxed text-[var(--color-ink-muted)]">{motivo}</p>}
      {texto.texto && <p className="text-[14.5px] leading-relaxed text-[var(--color-ink-muted)]">{texto.texto}</p>}

      <div className="mt-1 flex flex-col gap-3 sm:flex-row">
        {texto.cta && (
          <a
            href={hrefTratarCaso(respostas)}
            onClick={() => track("simulador_clique_tratar_caso", { resultado })}
            className={BOTAO_PRIMARIO}
          >
            {texto.cta}
          </a>
        )}
        <button type="button" onClick={onRecomecar} className={BOTAO_SECUNDARIO}>
          Responder de novo
        </button>
      </div>

      <p className="border-t border-[var(--color-hairline)] pt-3 text-[12.5px] text-[var(--color-ink-faint)]">
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
    <div className="flex flex-col gap-4">
      <div className="h-1.5 overflow-hidden rounded-[999px] bg-[var(--color-hairline)]">
        <div
          className="h-full bg-[var(--color-brand)] transition-all duration-300"
          style={{ width: `${(passo / PERGUNTAS.length) * 100}%` }}
        />
      </div>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
        Pergunta {passo + 1} de {PERGUNTAS.length}
      </p>
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-1 text-[19px] font-semibold leading-snug text-[var(--color-ink)]">{pergunta.titulo}</legend>
        {pergunta.ajuda && <p className="-mt-1 mb-1 text-[14px] text-[var(--color-ink-muted)]">{pergunta.ajuda}</p>}
        {pergunta.opcoes.map((opcao) => {
          const selecionada = respostas[pergunta.campo] === opcao;
          return (
            <button
              key={opcao}
              type="button"
              aria-pressed={selecionada}
              onClick={() => responder(pergunta.campo, opcao)}
              className={`min-h-11 w-full rounded-[8px] border px-4 py-3 text-left text-[15px] font-medium transition ${
                selecionada
                  ? "border-[var(--color-brand)] bg-[var(--color-brand-wash)] text-[var(--color-brand)]"
                  : "border-[var(--color-hairline-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-brand)]"
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
          className="self-start text-sm text-[var(--color-ink-muted)] underline"
        >
          ← Voltar
        </button>
      )}
    </div>
  );
}

export function SimuladorElegibilidadePublico() {
  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <SiteHeader
        ctaLabel="Tratar o meu caso"
        onCtaClick={() => {
          track("click_nav_reclamacao");
          window.location.assign(urlTratarCaso(ORIGEM));
        }}
      />

      <section className="mx-auto max-w-[600px] px-4 pt-12 pb-2 text-center sm:px-10 sm:pt-14">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.06em] text-[var(--color-brand)]">
          Grátis · sem conta · 4 perguntas
        </p>
        <h1 className="text-[clamp(26px,5vw,30px)] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--color-ink)]">
          Veja se a DoLado pode ajudar com o seu caso
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
          Responda a 4 perguntas rápidas sobre a sua situação com uma empresa de telecomunicações,
          energia ou água. O resultado aparece logo, sem pedir e-mail nem criar conta.
        </p>
      </section>

      <section className="mx-auto max-w-[560px] px-4 pt-7 pb-12 sm:px-10">
        <div className="rounded-[14px] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-subtle)] sm:p-8">
          <Simulador />
        </div>
      </section>

      <section className="mx-auto max-w-[560px] px-4 pb-16 sm:px-10">
        <h2 className="mb-3 text-[17px] font-semibold text-[var(--color-ink)]">Como funciona</h2>
        <ul className="flex flex-col gap-2 text-[14.5px] leading-relaxed text-[var(--color-ink-muted)]">
          <li>
            <strong className="text-[var(--color-ink)]">Para que serve.</strong> Ajuda a perceber se a sua situação
            é do tipo que a DoLado trata: problemas de consumidores particulares com empresas de
            telecomunicações, energia e água, como aumentos de mensalidade, cobranças indevidas, fidelizações,
            falhas de serviço ou cancelamentos recusados.
          </li>
          <li>
            <strong className="text-[var(--color-ink)]">O que não é.</strong> Não é uma avaliação jurídica do seu
            caso nem uma previsão do resultado da reclamação.
          </li>
          <li>
            <strong className="text-[var(--color-ink)]">As suas respostas.</strong> Ficam apenas no seu
            navegador: não as guardamos nem as associamos a si.
          </li>
          <li>
            <strong className="text-[var(--color-ink)]">Se decidir avançar.</strong> Em &quot;Tratar o meu
            caso&quot; descreve o que aconteceu, cria a sua conta e escolhe a modalidade. Só paga no fim.
          </li>
        </ul>
      </section>

      <footer className="flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-[var(--color-hairline)] px-4 py-6 text-xs text-[var(--color-ink-faint)]">
        <Link href={ROTAS_LEGAIS.termos} className="hover:text-[var(--color-ink-muted)]">
          Termos e Condições
        </Link>
        <Link href={ROTAS_LEGAIS.privacidade} className="hover:text-[var(--color-ink-muted)]">
          Política de Privacidade
        </Link>
        <Link href={ROTAS_LEGAIS.livreResolucao} className="hover:text-[var(--color-ink-muted)]">
          Livre resolução
        </Link>
        <Link href={ROTAS_LEGAIS.resolucaoLitigios} className="hover:text-[var(--color-ink-muted)]">
          Resolução de litígios
        </Link>
        <a href={LIVRO_RECLAMACOES_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-ink-muted)]">
          Livro de Reclamações
        </a>
      </footer>
    </div>
  );
}
