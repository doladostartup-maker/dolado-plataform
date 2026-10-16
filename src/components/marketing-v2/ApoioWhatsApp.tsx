"use client";

import type { ReactNode } from "react";
import { IconeBase, type PropsIcone } from "./Icones";
import { useTextos } from "@/i18n/cliente";
import { tWhatsApp } from "@/i18n/mensagens/whatsapp";
import { track } from "@/lib/analytics";
import { NUMERO_WHATSAPP, linkWhatsApp, parametrosEventoWhatsApp, type LocalWhatsApp } from "@/lib/whatsapp";

// WhatsApp como apoio SECUNDÁRIO (regras em src/lib/whatsapp.ts): uma linha
// discreta abaixo da ação principal, nunca um botão primário. Só nas páginas
// públicas — nunca no portal, no checkout, no fluxo "Tratar o meu caso", na
// revisão/autorização do texto nem no envio de documentos. Sem número
// configurado, não mostra nada.
//
// Medição (gtag, só com consentimento — ver track()): whatsapp_click com
// page, placement e context — só valores fixos, nunca o que a pessoa escreveu.

/** Balão de mensagem (traço linear do DS V2; sem auscultador: só mensagens). */
export const IconeWhatsApp = (p: PropsIcone) => (
  <IconeBase {...p}>
    <path d="M12 3.5a8.5 8.5 0 0 0-7.4 12.7L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5z" />
    <path d="M8.5 10.5h7M8.5 13.5h4.5" />
  </IconeBase>
);

export type PropsLigacaoWhatsApp = {
  /** Mensagem pré-preenchida (fixa, do dicionário whatsapp). */
  mensagem: string;
  /** Caminho lógico da página (sem /en), para a medição. */
  pagina: string;
  local: LocalWhatsApp;
  /** Contexto fixo para a medição (ex.: categoria, tipo de resultado). */
  contexto?: string;
  className?: string;
  children: ReactNode;
};

/** Ligação wa.me numa nova janela, com o evento whatsapp_click. */
export function LigacaoWhatsApp({ mensagem, pagina, local, contexto = "geral", className, children }: PropsLigacaoWhatsApp) {
  const t = useTextos(tWhatsApp);
  if (!NUMERO_WHATSAPP) return null;
  return (
    <a
      href={linkWhatsApp(NUMERO_WHATSAPP, mensagem)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("whatsapp_click", parametrosEventoWhatsApp(pagina, local, contexto))}
      className={className}
    >
      {children}
      <span className="sr-only"> {t.abreNovaJanela}</span>
    </a>
  );
}

const LIGACAO =
  "inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-green)]";

/** "Pergunta? → Falar connosco no WhatsApp" numa linha discreta. */
export function ApoioWhatsApp({
  pergunta,
  acao,
  mensagem,
  pagina,
  local,
  contexto,
  avisoSoMensagem = true,
  className = "",
}: Omit<PropsLigacaoWhatsApp, "children" | "className"> & {
  pergunta: string;
  /** Texto da ligação (por omissão "Falar connosco no WhatsApp"). */
  acao?: string;
  /** Mostra "Atendimento exclusivamente por mensagem." */
  avisoSoMensagem?: boolean;
  className?: string;
}) {
  const t = useTextos(tWhatsApp);
  if (!NUMERO_WHATSAPP) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[14.5px] text-[var(--v2-muted)] ${className}`}>
      <span>{pergunta}</span>
      <LigacaoWhatsApp mensagem={mensagem} pagina={pagina} local={local} contexto={contexto} className={LIGACAO}>
        <IconeWhatsApp tamanho={18} />
        {acao ?? t.falarConnosco}
      </LigacaoWhatsApp>
      {avisoSoMensagem && <span className="w-full text-[13px]">{t.soMensagem}</span>}
    </div>
  );
}
