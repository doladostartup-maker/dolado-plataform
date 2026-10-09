"use client";

import type { ReactNode } from "react";
import { useTextos } from "@/i18n/cliente";
import { tMarketing } from "@/i18n/mensagens/marketing";
import {
  IconeAntena,
  IconeCalendario,
  IconeCirculoVisto,
  IconeDocumentoVisto,
  IconeEtiqueta,
  IconeFatura,
  IconeLista,
  IconeVisto,
} from "./Icones";
import { CARTAO } from "./estilos";

// Composições de interface ilustrativas do Design System V2. Todos os dados são
// fictícios (sem empresas reais nem logótipos) e cada painel diz "Exemplo".

function Exemplo() {
  const t = useTextos(tMarketing).mockups;
  return (
    <span className="rounded-full bg-[var(--v2-blue-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--v2-muted)]">
      {t.exemplo}
    </span>
  );
}

function Linhas({ larguras }: { larguras: string[] }) {
  return (
    <div className="space-y-2">
      {larguras.map((w, i) => (
        <span key={i} className="block h-[7px] rounded-full bg-[var(--v2-line)]" style={{ width: w }} />
      ))}
    </div>
  );
}

/** Hero: o caso no portal, com o texto à espera da aprovação do cliente. */
export function VisualHero() {
  const t = useTextos(tMarketing).mockups.hero;
  return (
    <div
      role="img"
      aria-label={t.rotulo}
      className="relative mx-auto w-full max-w-[560px] pb-10 pt-6 lg:max-w-none"
    >
      <div className="absolute inset-0 rounded-[32px] bg-[linear-gradient(140deg,var(--v2-mint)_0%,var(--v2-blue-soft)_70%)]" />
      <div aria-hidden="true" className="relative px-5 pt-5 sm:px-10 sm:pt-10">
        <div className={`${CARTAO} p-5 sm:p-6`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-[var(--v2-muted)]">{t.oSeuCaso}</p>
            <Exemplo />
          </div>
          <p className="mb-1 text-[17px] font-bold text-[var(--v2-navy)]">{t.titulo}</p>
          <p className="mb-5 text-[13px] text-[var(--v2-muted)]">{t.subtitulo}</p>
          <div className="mb-5 rounded-[12px] border border-[var(--v2-line)] bg-[var(--v2-surface)] p-4">
            <div className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold text-[var(--v2-navy)]">
              <IconeDocumentoVisto tamanho={16} className="text-[var(--v2-green)]" />
              {t.textoReclamacao}
            </div>
            <Linhas larguras={["100%", "94%", "97%", "62%"]} />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex h-9 items-center rounded-[9px] bg-[var(--v2-green)] px-4 text-[13px] font-semibold text-white">
              {t.autorizar}
            </span>
            <span className="inline-flex h-9 items-center rounded-[9px] border border-[var(--v2-line-strong)] bg-white px-4 text-[13px] font-semibold text-[var(--v2-navy)]">
              {t.pedirAlteracoes}
            </span>
          </div>
        </div>

        <div className={`${CARTAO} relative -mt-4 ml-auto mr-[-8px] flex w-[78%] max-w-[300px] items-center gap-3 p-4 sm:mr-[-28px]`}>
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--v2-mint)] text-[var(--v2-green)]">
            <IconeVisto tamanho={18} />
          </span>
          <div>
            <p className="text-[13.5px] font-bold text-[var(--v2-navy)]">{t.enviada}</p>
            <p className="text-[12.5px] text-[var(--v2-muted)]">{t.comprovativo}</p>
          </div>
        </div>
      </div>

      <p
        aria-hidden="true"
        className="absolute right-4 top-[-6px] rotate-[-6deg] font-[family-name:var(--font-source-serif)] text-[17px] italic leading-tight text-[var(--v2-navy)] sm:right-8"
      >
        {t.lema1}
        <br />
        {t.lema2}
      </p>
    </div>
  );
}

/** Ferramenta 1: Calculadora de Cancelamento (estimativa do encargo máximo). */
export function VisualFidelizacao() {
  const t = useTextos(tMarketing).mockups.fidelizacao;
  return (
    <div aria-hidden="true" className="relative h-[170px]">
      <div className="absolute left-2 top-4 h-[140px] w-[150px] rotate-[-5deg] rounded-[8px] border border-[var(--v2-line)] bg-white p-3 shadow-[0_6px_16px_-10px_rgba(11,37,69,0.25)]">
        <span className="mb-3 block h-[6px] w-[60%] rounded-full bg-[var(--v2-line-strong)]" />
        <Linhas larguras={["100%", "86%", "92%", "70%", "88%", "50%"]} />
      </div>
      <div className="absolute left-10 top-8 h-[140px] w-[150px] rotate-[3deg] rounded-[8px] border border-[var(--v2-line)] bg-white p-3 shadow-[0_6px_16px_-10px_rgba(11,37,69,0.25)]">
        <span className="mb-3 block h-[6px] w-[50%] rounded-full bg-[var(--v2-line-strong)]" />
        <Linhas larguras={["96%", "100%", "80%", "90%", "64%"]} />
      </div>
      <div className={`${CARTAO} absolute bottom-3 right-0 flex items-center gap-3 px-4 py-3 sm:right-4`}>
        <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--v2-blue-soft)] text-[var(--v2-blue)]">
          <IconeCalendario tamanho={22} />
        </span>
        <div>
          <p className="text-[12px] text-[var(--v2-muted)]">{t.calculada}</p>
          <p className="text-[15px] font-bold text-[var(--v2-navy)]">{t.encargo}</p>
        </div>
      </div>
    </div>
  );
}

/** Ferramenta 2: os três resultados possíveis do simulador. */
export function VisualSimulador() {
  const t = useTextos(tMarketing).mockups.simulador;
  const resultados: { texto: string; ativo: boolean }[] = t.map((texto, i) => ({ texto, ativo: i === 0 }));
  return (
    <div aria-hidden="true" className="mx-auto flex h-[170px] max-w-[320px] flex-col justify-center gap-2.5">
      {resultados.map((r) => (
        <div
          key={r.texto}
          className={`flex items-center gap-3 rounded-[12px] border px-4 py-3 text-[13.5px] ${
            r.ativo
              ? "border-[var(--v2-line)] bg-white font-semibold text-[var(--v2-navy)] shadow-[0_6px_16px_-10px_rgba(11,37,69,0.25)]"
              : "border-transparent bg-[var(--v2-surface)] text-[var(--v2-muted)]"
          }`}
        >
          <span
            className={`flex h-5 w-5 flex-none items-center justify-center rounded-full ${
              r.ativo ? "bg-[var(--v2-green)] text-white" : "bg-[var(--v2-line-strong)] text-white"
            }`}
          >
            <IconeVisto tamanho={12} strokeWidth={2.6} />
          </span>
          {r.texto}
        </div>
      ))}
    </div>
  );
}

/** Ferramenta 3: os quatro momentos do Guia de Mudança de Casa. */
export function VisualMudanca() {
  const momentos = useTextos(tMarketing).mockups.mudanca;
  return (
    <div aria-hidden="true" className="mx-auto flex h-[170px] max-w-[320px] flex-col justify-center gap-2">
      {momentos.map((m, i) => (
        <div
          key={m}
          className="flex items-center gap-3 rounded-[12px] border border-[var(--v2-line)] bg-white px-4 py-2.5 text-[13.5px] font-semibold text-[var(--v2-navy)]"
        >
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--v2-mint)] text-[12px] font-bold text-[var(--v2-green-dark)]">
            {i + 1}
          </span>
          {m}
        </div>
      ))}
    </div>
  );
}

const ESTADOS_CASO: ("feito" | "atual" | "seguinte")[] = ["feito", "feito", "feito", "feito", "atual", "seguinte"];

/** Tratamento do caso: linha temporal de um caso no portal. */
export function PainelCaso() {
  const t = useTextos(tMarketing).mockups.caso;
  const ETAPAS_CASO = t.etapas.map((e, i) => ({ ...e, estado: ESTADOS_CASO[i] }));
  return (
    <figure className={`${CARTAO} p-6 sm:p-7`} aria-label={t.rotulo}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <figcaption className="text-[15px] font-bold text-[var(--v2-navy)]">{t.titulo}</figcaption>
        <Exemplo />
      </div>
      <ol>
        {ETAPAS_CASO.map((e, i) => {
          const ultima = i === ETAPAS_CASO.length - 1;
          return (
            <li key={e.titulo} className="relative flex gap-4 pb-5 last:pb-0">
              {!ultima && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[13px] top-7 h-[calc(100%-28px)] w-[2px] ${
                    e.estado === "feito" ? "bg-[var(--v2-green)]" : "bg-[var(--v2-line)]"
                  }`}
                />
              )}
              <span
                className={`relative flex h-7 w-7 flex-none items-center justify-center rounded-full ${
                  e.estado === "feito"
                    ? "bg-[var(--v2-green)] text-white"
                    : e.estado === "atual"
                      ? "border-2 border-[var(--v2-green)] bg-white text-[var(--v2-green)]"
                      : "border-2 border-[var(--v2-line-strong)] bg-white"
                }`}
              >
                {e.estado === "feito" && <IconeVisto tamanho={15} strokeWidth={2.6} />}
                {e.estado === "atual" && <span className="h-2 w-2 rounded-full bg-[var(--v2-green)]" />}
              </span>
              <div className="pt-0.5">
                <p className={`text-[14.5px] font-bold ${e.estado === "seguinte" ? "text-[var(--v2-muted)]" : "text-[var(--v2-navy)]"}`}>
                  {e.titulo}
                </p>
                <p className="text-[13px] text-[var(--v2-muted)]">{e.texto}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

function LinhaProtecao({ icone, titulo, valor }: { icone: ReactNode; titulo: string; valor?: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-[var(--v2-blue-soft)] text-[var(--v2-blue)]">
        {icone}
      </span>
      <div>
        <p className="text-[13.5px] font-semibold text-[var(--v2-navy)]">{titulo}</p>
        {valor && <p className="text-[13px] text-[var(--v2-muted)]">{valor}</p>}
      </div>
    </div>
  );
}

/** Proteção: estado do acompanhamento de um serviço. */
export function PainelProtecao() {
  const t = useTextos(tMarketing).mockups.protecao;
  return (
    <figure className={`${CARTAO} p-6 sm:p-7`} aria-label={t.rotulo}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <figcaption className="text-[15px] font-bold text-[var(--v2-navy)]">{t.titulo}</figcaption>
        <Exemplo />
      </div>
      <div className="mb-1 flex items-center gap-3 rounded-[12px] bg-[var(--v2-surface)] px-3 py-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--v2-navy)] shadow-[0_1px_2px_rgba(11,37,69,0.1)]">
          <IconeAntena tamanho={17} />
        </span>
        <p className="text-[14px] font-bold text-[var(--v2-navy)]">{t.operadora}</p>
      </div>
      <div className="divide-y divide-[var(--v2-line)]">
        <LinhaProtecao icone={<IconeCalendario tamanho={17} />} titulo={t.fidelizacao} />
        <LinhaProtecao icone={<IconeFatura tamanho={17} />} titulo={t.faturaAtual} valor={t.valorFatura} />
        <LinhaProtecao icone={<IconeEtiqueta tamanho={17} />} titulo={t.promocao} />
        <LinhaProtecao icone={<IconeLista tamanho={17} />} titulo={t.condicoes} />
      </div>
      <div className="mt-3 flex items-start gap-3 rounded-[12px] bg-[var(--v2-mint)] px-4 py-3.5">
        <IconeCirculoVisto tamanho={22} className="flex-none text-[var(--v2-green)]" />
        <p className="text-[13.5px] leading-relaxed text-[var(--v2-navy)]">
          {t.semSituacoes}
        </p>
      </div>
    </figure>
  );
}
