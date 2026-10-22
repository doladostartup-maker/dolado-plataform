"use client";

import { useEffect } from "react";
import { useCaminho, useIdioma } from "@/i18n/cliente";
import { precoNoIdioma } from "@/i18n/mensagens/planos";
import { tProtecaoGratuita } from "@/i18n/mensagens/protecaoGratuita";
import { track } from "@/lib/analytics";
import { PLANOS } from "@/lib/planos";
import { urlExperimentarProtecao } from "@/lib/site";
import { IconeEscudo, IconeSeta } from "./Icones";

// Oferta permanente "30 dias de Proteção grátis" (sem contagens nem
// urgência). Discreta: uma linha compacta por baixo da ação principal da
// página — nunca substitui o "Tratar do meu caso". O botão leva à ativação em
// portal.dolado.pt (ligação absoluta simples, sem prefetch: daria 308 + CORS).
// Medição só com consentimento (track): vista e clique, com a página de
// origem — sem dados pessoais.

export function OfertaProtecaoGratuita({
  origem,
  comTexto = false,
  grande = false,
  className = "",
}: {
  origem: "homepage" | "precario" | "protecao";
  /** Mostra também a frase sobre o que a Proteção faz (fora do hero). */
  comTexto?: boolean;
  /** Letra ≥ 16 px (homepage com a análise gratuita, público mais velho). */
  grande?: boolean;
  className?: string;
}) {
  const idioma = useIdioma();
  const c = useCaminho();
  const t = tProtecaoGratuita[idioma].oferta;
  const preco = precoNoIdioma(idioma, PLANOS.protecao.precoCentimos);

  useEffect(() => {
    track("protecao_gratuita_vista", { local: origem });
  }, [origem]);

  return (
    <div
      className={`flex max-w-[560px] flex-col gap-3 rounded-[16px] border border-[var(--v2-line)] bg-white/80 p-4 sm:flex-row sm:items-center sm:gap-4 ${className}`}
    >
      <span aria-hidden className="hidden h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--v2-mint)] text-[var(--v2-green)] sm:inline-flex">
        <IconeEscudo tamanho={20} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-bold leading-snug text-[var(--v2-navy)]">{t.destaque}</p>
        {comTexto && <p className={`mt-1 leading-relaxed text-[var(--v2-muted)] ${grande ? "text-[16px]" : "text-[14.5px]"}`}>{t.texto}</p>}
        <p className={`mt-0.5 leading-relaxed text-[var(--v2-muted)] ${grande ? "text-[16px]" : "text-[14px]"}`}>
          {t.micro} {t.depois(preco)}
        </p>
      </div>
      <a
        href={c(urlExperimentarProtecao(origem))}
        onClick={() => track("protecao_gratuita_clique", { local: origem })}
        className={`inline-flex min-h-11 flex-none items-center gap-1.5 font-semibold ${grande ? "text-[16px]" : "text-[15px]"} text-[var(--v2-green-dark)] underline-offset-4 hover:underline`}
      >
        {t.cta} <IconeSeta tamanho={15} />
      </a>
    </div>
  );
}
