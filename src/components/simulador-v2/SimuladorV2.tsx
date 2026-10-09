"use client";

import { useRef, useState } from "react";
import { IconeSeta } from "@/components/marketing-v2/Icones";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";
import { track } from "@/lib/analytics";
import {
  OPCOES_MOMENTO,
  OPCOES_SETOR,
  OPCOES_TITULAR,
  MOTIVOS,
  avaliarSimulador,
  opcoesProblema,
  parametrosPrePreenchimento,
  type RespostasSimulador,
} from "@/lib/elegibilidade/regras";
import { urlTratarCaso } from "@/lib/site";
import { useCaminho, useIdioma } from "@/i18n/cliente";
import { rotulo } from "@/i18n/mensagens/rotulos";
import { tSimulador } from "@/i18n/mensagens/simulador";

// Simulador público no Design System V2: 4 perguntas de escolha → resultado
// indicativo. Tudo acontece no browser — nada é gravado, enviado ou associado
// a uma conta. Regras em src/lib/elegibilidade/regras.ts; perguntas, textos
// dos resultados, CTA e medição iguais aos da versão anterior.

const ORIGEM = "/simulador-elegibilidade";

type Pergunta = { campo: keyof RespostasSimulador; opcoes: string[] };

// Valores (sempre em português, iguais aos do formulário do caso); textos em
// src/i18n/mensagens/*/simulador.ts e rótulos das opções em */rotulos.ts.
const PERGUNTAS: Pergunta[] = [
  { campo: "setor", opcoes: OPCOES_SETOR },
  { campo: "titular", opcoes: OPCOES_TITULAR },
  // Opções do setor escolhido (opcoesProblema), preenchidas ao mostrar a pergunta.
  { campo: "problema", opcoes: [] },
  { campo: "momento", opcoes: OPCOES_MOMENTO },
];

const GRUPO_ROTULO = { setor: "setores", titular: "titular", problema: "problemas", momento: "momentos" } as const;

const RESPOSTAS_VAZIAS: RespostasSimulador = { setor: "", titular: "", problema: "", momento: "" };

function hrefTratarCaso(respostas: RespostasSimulador) {
  const params = new URLSearchParams(parametrosPrePreenchimento(respostas)).toString();
  const base = urlTratarCaso(ORIGEM);
  return params ? `${base}&${params}` : base;
}

const ROTULO_PASSO = "text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]";

function Resultado({ respostas, onRecomecar }: { respostas: RespostasSimulador; onRecomecar: () => void }) {
  const t = tSimulador[useIdioma()];
  const c = useCaminho();
  const { resultado, motivo } = avaliarSimulador(respostas);
  const texto = t.resultados[resultado];
  const chaveMotivo = (Object.keys(MOTIVOS) as (keyof typeof MOTIVOS)[]).find((k) => MOTIVOS[k] === motivo);
  const motivoTexto = chaveMotivo ? t.motivos[chaveMotivo] : motivo;

  return (
    <div aria-live="polite" className="flex flex-col gap-4">
      <p className={ROTULO_PASSO}>{t.resultado}</p>
      <h2 className="text-[22px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">{texto.titulo}</h2>
      {motivoTexto && <p className="text-[15.5px] leading-relaxed text-[var(--v2-muted)]">{motivoTexto}</p>}
      {texto.texto && <p className="text-[15.5px] leading-relaxed text-[var(--v2-muted)]">{texto.texto}</p>}

      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        {texto.cta && (
          <a
            href={c(hrefTratarCaso(respostas))}
            onClick={() => track("simulador_clique_tratar_caso", { resultado })}
            className={BOTAO_PRIMARIO}
          >
            {texto.cta} <IconeSeta tamanho={17} />
          </a>
        )}
        <button type="button" onClick={onRecomecar} className={BOTAO_CONTORNO}>
          {t.responderDeNovo}
        </button>
      </div>

      <p className="mt-2 border-t border-[var(--v2-line)] pt-4 text-[13.5px] text-[var(--v2-muted)]">
        {t.indicativo}
      </p>
    </div>
  );
}

function Simulador() {
  const idioma = useIdioma();
  const t = tSimulador[idioma];
  const [passo, setPasso] = useState(0);
  const [respostas, setRespostas] = useState<RespostasSimulador>(RESPOSTAS_VAZIAS);
  const iniciado = useRef(false);

  function responder(campo: keyof RespostasSimulador, valor: string) {
    if (!iniciado.current) {
      iniciado.current = true;
      track("simulador_iniciado");
    }
    const novas = { ...respostas, [campo]: valor };
    // Ao mudar de setor, um problema que não exista no novo setor é apagado.
    if (campo === "setor" && novas.problema && !opcoesProblema(valor).includes(novas.problema)) novas.problema = "";
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
        aria-label={t.progresso}
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
        {t.perguntaDe(passo + 1, PERGUNTAS.length)}
      </p>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-[22px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">
          {t.perguntas[pergunta.campo].titulo}
        </legend>
        {pergunta.campo === "titular" && <p className="-mt-1 mb-1 text-[15px] text-[var(--v2-muted)]">{t.perguntas.titular.ajuda}</p>}
        {(pergunta.campo === "problema" ? opcoesProblema(respostas.setor) : pergunta.opcoes).map((opcao) => {
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
              {rotulo(idioma, GRUPO_ROTULO[pergunta.campo], opcao)}
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
          {t.voltar}
        </button>
      )}
    </div>
  );
}

export function SimuladorV2() {
  const t = tSimulador[useIdioma()];
  return (
    <>
      {/* ===== Hero + simulador ===== */}
      <SectionV2 size="compact" className="grid items-start gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:py-20">
        <div className="lg:pt-6">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(32px,3.8vw,48px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--v2-navy)]">
            {t.titulo}
          </h1>
          <p className={`${TEXTO} mt-5 text-[17.5px]`}>{t.texto}</p>
        </div>
        <div className={`${CARTAO} p-6 sm:p-8`}>
          <Simulador />
        </div>
      </SectionV2>

      {/* ===== Como funciona ===== */}
      <SectionV2 tone="soft-blue">
        <SectionHeader eyebrow={t.comoFunciona.eyebrow} titulo={t.comoFunciona.titulo} />
        <ul className="mt-10 grid gap-8 md:grid-cols-2 md:gap-x-12">
          {t.comoFunciona.itens.map((c) => (
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
