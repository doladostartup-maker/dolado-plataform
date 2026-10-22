"use client";

import Link from "@/i18n/Link";
import type { MouseEvent, ReactNode } from "react";
import { track } from "@/lib/analytics";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO } from "./estilos";
import { IconeSeta } from "./Icones";
import { ROTAS_V2 } from "./rotas";

// "Analisar documento" (reposicionamento de 22/10/2026): leva sempre ao
// cartão de análise da homepage (CartaoAnalise, id="analisar"), nunca a um
// carregamento paralelo — o aviso de privacidade fica junto do botão que
// abre o selector de ficheiros, antes de o documento ser escolhido.
// Na homepage, desloca até ao cartão e põe o foco no botão; nas outras
// páginas, abre "/#analisar" (o CartaoAnalise põe o foco no botão).

export const ID_ANALISAR = "analisar";

/** Desloca até ao cartão de análise desta página e põe o foco no botão. */
function irParaAnalise() {
  const cartao = document.getElementById(ID_ANALISAR);
  if (!cartao) return;
  cartao.scrollIntoView({ behavior: "smooth", block: "start" });
  cartao.querySelector<HTMLButtonElement>("button[data-analisar]")?.focus({ preventScroll: true });
  history.replaceState(null, "", `#${ID_ANALISAR}`);
}

export function LigacaoAnalisar({
  className,
  evento,
  parametros,
  aoClicar,
  children,
}: {
  className: string;
  evento: string;
  parametros?: Record<string, string>;
  /** Ex.: fechar o menu do telemóvel. */
  aoClicar?: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      prefetch={false}
      href={ROTAS_V2.analisar}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        track(evento, parametros);
        aoClicar?.();
        if (!document.getElementById(ID_ANALISAR)) return;
        e.preventDefault();
        // Depois de o menu do telemóvel fechar (a página muda de altura).
        requestAnimationFrame(() => requestAnimationFrame(irParaAnalise));
      }}
      className={className}
    >
      {children}
    </Link>
  );
}

/** CTA final das páginas com as duas entradas: analisar um documento (principal) ou tratar de um problema. */
export function AcoesAnalisarOuTratar({
  analisar,
  tratar,
  aoTratar,
  evento,
}: {
  analisar: string;
  tratar: string;
  aoTratar: () => void;
  evento: string;
}) {
  return (
    <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
      <LigacaoAnalisar evento={evento} className={`${BOTAO_PRIMARIO} w-full md:w-auto`}>
        {analisar} <IconeSeta tamanho={17} />
      </LigacaoAnalisar>
      <button type="button" onClick={aoTratar} className={`${BOTAO_CONTORNO} w-full md:w-auto`}>
        {tratar}
      </button>
    </div>
  );
}
