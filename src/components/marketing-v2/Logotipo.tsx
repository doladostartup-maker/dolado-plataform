"use client";

import Image from "next/image";
import { localizarHref } from "@/i18n/config";
import { useIdioma, useTextos } from "@/i18n/cliente";
import { tComum } from "@/i18n/mensagens/comum";
import { MARKETING_SITE_URL } from "@/lib/site";

export function Logotipo() {
  const idioma = useIdioma();
  const t = useTextos(tComum);
  return (
    // Sempre a página inicial em dolado.pt: em portal.dolado.pt, "/" leva ao
    // login. <a> simples, porque pode atravessar domínios.
    <a href={localizarHref(idioma, MARKETING_SITE_URL)} className="flex items-center gap-2" aria-label={t.acessibilidade.paginaInicial}>
      <Image src="/brand/dolado-logo-icon.svg" alt="" width={30} height={30} />
      <span className="text-[19px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">
        DoLado.
        {/* ".pt" com as cores da bandeira de Portugal: verde e vermelho */}
        <span className="text-[#046A38]">p</span>
        <span className="text-[#DA291C]">t</span>
      </span>
    </a>
  );
}
