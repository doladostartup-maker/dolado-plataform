"use client";

import Link from "@/i18n/Link";
import type { ReactNode } from "react";
import { useIdioma } from "@/i18n/cliente";
import { tInicio } from "@/i18n/mensagens/inicio";
import { track } from "@/lib/analytics";
import { CarregarDocumento } from "@/components/diagnostico/CarregarDocumento";
import { IconeCalendario, IconeCirculoVisto, IconeEscudo, IconeFatura, IconeMensagem, IconePdf, IconeSeta, IconeVisto } from "@/components/marketing-v2/Icones";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";
import { SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_PRIMARIO, CARTAO } from "@/components/marketing-v2/estilos";

// "Como funciona" da HomepageDiagnostico (22/10/2026): o percurso como
// demonstração — carregar → ver o resultado gratuito → continuar com a
// Protecção. Composição assimétrica: passos 1 e 2 lado a lado (o 2, o
// diagnóstico, é o maior e o único escuro), o 3 a toda a largura por baixo,
// como continuação no tempo. No telemóvel, os três em sequência vertical.
//
// As miniaturas reproduzem a interface real com dados fictícios (etiqueta
// "Exemplo demonstrativo") e só mostram o que o produto faz:
//   - passo 2 = o que o diagnóstico mostra (diagnostico/regras.ts): total,
//     mensalidade, diferença, linhas "todos os meses"/"só esta vez", soma das
//     linhas e datas calculadas. Nunca pontos de atenção nem irregularidades;
//   - passo 3 = Monitor: avisos de datas (60/30 dias e no dia), comparação
//     com as facturas anteriores e o contrato (revista por uma pessoa antes
//     do aviso) e o resumo mensal.
// Sem datas absolutas, para os exemplos não envelhecerem.

function CabecalhoPasso({ numero, rotulo, extra, escuro = false }: { numero: number; rotulo: string; extra?: string; escuro?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        aria-hidden="true"
        className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-[16px] font-bold ${
          escuro ? "bg-white text-[var(--v2-navy)]" : "bg-[var(--v2-green)] text-white"
        }`}
      >
        {numero}
      </span>
      <span className={`text-[14px] font-bold uppercase tracking-[0.08em] ${escuro ? "text-[#9FD9BC]" : "text-[var(--v2-green-dark)]"}`}>
        {rotulo} {numero}
      </span>
      {extra && (
        <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${escuro ? "bg-white/15 text-white" : "bg-[var(--v2-mint)] text-[var(--v2-green-dark)]"}`}>
          {extra}
        </span>
      )}
    </div>
  );
}

/** Miniatura com dados fictícios: descrita uma vez para leitores de ecrã, o interior fica escondido. */
function Miniatura({ rotulo, etiqueta, escuro = false, className = "", children }: { rotulo: string; etiqueta: string; escuro?: boolean; className?: string; children: ReactNode }) {
  return (
    <figure role="img" aria-label={rotulo} className={className}>
      <div aria-hidden="true">
        <p className={`mb-2 text-right text-[13px] font-semibold ${escuro ? "text-white/70" : "text-[var(--v2-muted)]"}`}>{etiqueta}</p>
        {children}
      </div>
    </figure>
  );
}

// Pela ordem dos avisos no dicionário: datas, comparação, resumo mensal.
const ICONES_AVISO = [IconeCalendario, IconeFatura, IconeMensagem];

export function ComoFunciona() {
  const t = tInicio[useIdioma()].diagnostico.comoFunciona;
  const p1 = t.carregar;
  const p2 = t.descobrir;
  const p3 = t.acompanhar;

  return (
    <SectionV2 id="como-funciona" tone="soft-blue">
      <SectionHeader titulo={t.titulo} texto={t.texto} />

      <ol className="mt-8 grid gap-5 sm:mt-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-6">
        {/* ===== Passo 1: carregar ===== */}
        <li className={`${CARTAO} flex flex-col gap-4 p-5 sm:p-7`}>
          <CabecalhoPasso numero={1} rotulo={t.passo} extra={t.gratuito} />
          <div>
            <h3 className="text-[21px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)] sm:text-[23px]">{p1.titulo}</h3>
            <p className="mt-2 text-[16.5px] leading-relaxed text-[var(--v2-muted)]">{p1.texto}</p>
          </div>
          <Miniatura rotulo={p1.rotulo} etiqueta={t.exemplo} className="mt-auto">
            {/* Mesma linguagem do cartão de análise (CartaoAnalise): área menta, PDF, visto verde. */}
            <div className="rounded-[14px] border-2 border-dashed border-[var(--v2-green)]/40 bg-[var(--v2-mint-bg)] p-3 sm:p-4">
              {/* Só no computador, onde o cartão tem a altura do passo 2: a página da factura. */}
              <div className="mx-auto mb-4 hidden w-[62%] rotate-[-2deg] rounded-[8px] border border-[var(--v2-line)] bg-white p-4 shadow-[0_6px_18px_-8px_rgba(11,37,69,0.25)] lg:block">
                <div className="flex items-center justify-between">
                  <span className="h-2.5 w-16 rounded-full bg-[var(--v2-navy)]/80" />
                  <span className="h-2.5 w-10 rounded-full bg-[var(--v2-line-strong)]" />
                </div>
                <div className="mt-4 space-y-2">
                  {["w-full", "w-5/6", "w-full", "w-2/3"].map((w, i) => (
                    <span key={i} className={`block h-2 rounded-full bg-[var(--v2-line)] ${w}`} />
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[var(--v2-line)] pt-3">
                  <span className="h-2 w-12 rounded-full bg-[var(--v2-line-strong)]" />
                  <span className="h-3 w-14 rounded-full bg-[var(--v2-green)]/70" />
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-[12px] bg-white p-3 shadow-[0_1px_2px_rgba(11,37,69,0.08)]">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] bg-[var(--v2-mint)] text-[var(--v2-green)]">
                  <IconePdf tamanho={26} strokeWidth={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold text-[var(--v2-navy)]">{p1.ficheiro}</span>
                  <span className="block text-[14px] text-[var(--v2-muted)]">{p1.detalhe}</span>
                </span>
                <IconeCirculoVisto tamanho={26} className="flex-none text-[var(--v2-green)]" />
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--v2-mint)]">
                <div className="h-full w-full rounded-full bg-[var(--v2-green)]" />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green-dark)]">
                <IconeVisto tamanho={16} className="flex-none" />
                {p1.estado}
              </p>
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[15px] text-[var(--v2-muted)]">
              {p1.sem.map((s) => (
                <li key={s} className="flex items-center gap-1.5">
                  <IconeVisto tamanho={15} className="flex-none text-[var(--v2-green)]" />
                  {s}
                </li>
              ))}
            </ul>
          </Miniatura>
        </li>

        {/* ===== Passo 2: o diagnóstico (o elemento principal da secção) ===== */}
        <li className="flex flex-col gap-4 rounded-[22px] bg-[var(--v2-navy)] p-5 shadow-[0_18px_40px_-20px_rgba(11,37,69,0.55)] sm:p-7">
          <CabecalhoPasso numero={2} rotulo={t.passo} extra={t.gratuito} escuro />
          <div>
            <h3 className="text-[22px] font-bold leading-snug tracking-[-0.015em] text-white sm:text-[26px]">{p2.titulo}</h3>
            <p className="mt-2 text-[16.5px] leading-relaxed text-white/80">{p2.texto}</p>
          </div>
          <Miniatura rotulo={p2.rotulo} etiqueta={t.exemplo} escuro>
            <div className={`${CARTAO} p-4 sm:p-5`}>
              <p className="flex items-center gap-2 text-[15px] font-semibold text-[var(--v2-navy)]">
                <IconeFatura tamanho={18} className="flex-none text-[var(--v2-green)]" />
                {p2.documento}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {p2.resumo.map((r, i) => (
                  <div key={r.rotulo} className={`rounded-[12px] px-3 py-2.5 ${i === 0 ? "bg-[var(--v2-blue-soft)]" : "border border-[var(--v2-line)]"}`}>
                    <p className="text-[14px] text-[var(--v2-muted)]">{r.rotulo}</p>
                    <p className={`font-bold tabular-nums text-[var(--v2-navy)] ${i === 0 ? "text-[22px]" : "text-[18px]"}`}>{r.valor}</p>
                  </div>
                ))}
              </div>

              <p className="mt-3 rounded-[12px] border-l-4 border-[var(--v2-blue)] bg-[var(--v2-blue-soft)] px-3 py-2.5 text-[16px] font-bold leading-snug text-[var(--v2-navy)]">
                {p2.diferenca}
              </p>

              <ul className="mt-2 divide-y divide-[var(--v2-line)]">
                {p2.linhas.map((l) => (
                  <li key={l.descricao} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="text-[15px] leading-snug text-[var(--v2-navy)]">
                      {l.descricao}
                      <span className={`ml-2 inline-block rounded-full px-2 py-px text-[13px] font-semibold ${l.pontual ? "bg-[#FFF1DC] text-[#8A5300]" : "bg-[var(--v2-blue-soft)] text-[var(--v2-navy)]"}`}>
                        {l.pontual ? p2.pontual : p2.habitual}
                      </span>
                    </span>
                    <span className="flex-none text-[16px] font-bold tabular-nums text-[var(--v2-navy)]">{l.valor}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-2 grid gap-2 sm:grid-cols-2 sm:items-center">
                {/* No telemóvel fica só a data, para o cartão não crescer demasiado. */}
                <p className="hidden items-center gap-2 text-[14px] text-[var(--v2-muted)] sm:flex">
                  <IconeVisto tamanho={16} className="flex-none text-[var(--v2-green-dark)]" />
                  {p2.soma}
                </p>
                <p className="flex items-center gap-2 rounded-[10px] bg-[var(--v2-blue-soft)] px-3 py-2 text-[15px] font-semibold text-[var(--v2-navy)]">
                  <IconeCalendario tamanho={17} className="flex-none text-[var(--v2-blue)]" />
                  {p2.data}
                </p>
              </div>
            </div>
          </Miniatura>
          <p className="text-[16px] leading-relaxed text-white/75">{p2.nota}</p>
        </li>

        {/* ===== Passo 3: a Protecção, a toda a largura (continuação no tempo) ===== */}
        <li className={`${CARTAO} grid gap-5 p-5 sm:p-7 lg:col-span-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10`}>
          <div className="flex flex-col gap-4">
            <CabecalhoPasso numero={3} rotulo={t.passo} extra={p3.etiqueta} />
            <div>
              <h3 className="text-[21px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)] sm:text-[23px]">{p3.titulo}</h3>
              <p className="mt-2 text-[16.5px] leading-relaxed text-[var(--v2-muted)]">{p3.texto}</p>
              {/* No telemóvel, a revisão humana já está dita no próprio aviso. */}
              <p className="mt-3 hidden gap-2 text-[16px] leading-relaxed text-[var(--v2-navy)] sm:flex">
                <IconeEscudo tamanho={18} className="mt-0.5 flex-none text-[var(--v2-green)]" />
                {p3.nota}
              </p>
            </div>
            <Link
              prefetch={false}
              href={ROTAS_V2.protecao}
              onClick={() => track("click_home_protecao", { local: "como_funciona" })}
              className="inline-flex items-center gap-1.5 text-[16px] font-semibold text-[var(--v2-green-dark)] underline-offset-4 hover:underline"
            >
              {p3.cta} <IconeSeta tamanho={15} />
            </Link>
          </div>

          <Miniatura rotulo={p3.rotulo} etiqueta={t.exemplo}>
            <ul className="space-y-2.5 rounded-[16px] bg-[var(--v2-surface)] p-3 sm:p-4">
              {p3.avisos.map((a, i) => {
                const Icone = ICONES_AVISO[i] ?? IconeCalendario;
                return (
                  <li key={a.titulo} className="flex gap-3 rounded-[12px] border border-[var(--v2-line)] bg-white p-3 sm:p-3.5">
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-[var(--v2-mint)] text-[var(--v2-green)]">
                      <Icone tamanho={20} strokeWidth={1.6} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[16px] font-semibold leading-snug text-[var(--v2-navy)]">{a.titulo}</span>
                      <span className="mt-0.5 block text-[14px] leading-snug text-[var(--v2-muted)]">{a.meta}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Miniatura>
        </li>
      </ol>

      {/* Responde a "como começo?": a mesma acção do cartão de análise. */}
      <div className="mt-8 max-w-[560px] sm:mt-10">
        <CarregarDocumento local="homepage_como_funciona" classeBotao={`${BOTAO_PRIMARIO} min-h-14 w-full text-[17px] sm:w-auto sm:px-8`} />
      </div>
    </SectionV2>
  );
}
