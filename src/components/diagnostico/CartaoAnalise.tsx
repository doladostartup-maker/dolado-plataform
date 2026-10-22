"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/i18n/Link";
import { useTextos } from "@/i18n/cliente";
import { tDiagnostico } from "@/i18n/mensagens/diagnostico";
import { IconePdf, IconeVisto } from "@/components/marketing-v2/Icones";
import { BOTAO_PRIMARIO, CARTAO } from "@/components/marketing-v2/estilos";
import { ID_ANALISAR } from "@/components/marketing-v2/LigacaoAnalisar";
import { useCarregamento } from "./CarregarDocumento";

// Cartão de análise da homepage (hero, 22/10/2026): a mesma lógica do botão
// "Analisar gratuitamente" (useCarregamento), apresentada como uma área de
// carregamento própria da DoLado. Só PDF. O que é gratuito, "Apenas ficheiros
// PDF" e a privacidade ficam junto do botão; o detalhe do tratamento abre-se
// antes de escolher o ficheiro. Arrastar o ficheiro é um atalho no computador
// — o botão abre sempre o selector do dispositivo.
// "Analisar documento" (navbar e outras páginas) chega aqui por "/#analisar":
// o foco vai para o botão, sem abrir o selector — o aviso de privacidade fica
// à vista antes de escolher o ficheiro.

export function CartaoAnalise({ local, texto }: { local: string; texto: string }) {
  const t = useTextos(tDiagnostico).carregar;
  const c = t.cartao;
  const { abrir, escolhido, aEnviar, erro, seletor } = useCarregamento(local);
  const [porCima, setPorCima] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (window.location.hash === `#${ID_ANALISAR}`) botao.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div id={ID_ANALISAR} className={`${CARTAO} relative flex scroll-mt-24 flex-col gap-4 border-[var(--v2-green)]/30 p-5 sm:gap-5 sm:p-8`}>
      {seletor}
      <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--v2-green)] px-3.5 py-1 text-[15px] font-bold text-white">
          {c.comeceAqui}
        </span>
        <h2 className="mt-3 text-[21px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)] sm:text-[24px]">{c.titulo}</h2>
        <p className="mt-1.5 text-[16px] leading-relaxed text-[var(--v2-muted)]">
          {texto} {c.setores}
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setPorCima(true);
        }}
        onDragLeave={() => setPorCima(false)}
        onDrop={(e) => {
          e.preventDefault();
          setPorCima(false);
          void escolhido(e.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-center gap-4 rounded-[14px] border-2 border-dashed px-4 py-5 text-center transition-colors sm:py-8 ${
          porCima ? "border-[var(--v2-green)] bg-[var(--v2-mint)]" : "border-[var(--v2-line-strong)] bg-[var(--v2-mint-bg)]"
        }`}
      >
        <span className="hidden h-16 w-16 items-center sm:flex justify-center rounded-[16px] bg-white text-[var(--v2-green)] shadow-[0_1px_2px_rgba(11,37,69,0.08)]">
          <IconePdf tamanho={36} strokeWidth={1.5} />
        </span>
        <span className="flex items-center gap-2 text-[16px] font-semibold text-[var(--v2-navy)] sm:hidden">
          <IconePdf tamanho={24} strokeWidth={1.5} className="text-[var(--v2-green)]" />
          {c.apenasPdf}
        </span>
        <button
          ref={botao}
          data-analisar
          type="button"
          onClick={abrir}
          disabled={aEnviar}
          aria-busy={aEnviar}
          className={`${BOTAO_PRIMARIO} min-h-14 w-full text-[17px] sm:w-auto sm:px-8`}
        >
          {aEnviar ? t.aEnviar : c.botao}
        </button>
        <p className="hidden text-[16px] text-[var(--v2-muted)] md:block">{c.arrastar}</p>
      </div>

      {erro && (
        <p role="alert" className="text-[16px] font-medium leading-relaxed text-[var(--v2-erro)]">
          {t.erros[erro]}
        </p>
      )}

      <ul className="grid gap-2 text-[16px] font-semibold text-[var(--v2-navy)] sm:grid-cols-3 sm:gap-3">
        {/* No telemóvel, "Apenas ficheiros PDF" já está por cima do botão. */}
        {[c.gratuita, c.semRegisto, c.apenasPdf].map((item, i) => (
          <li key={item} className={`${i === 2 ? "hidden sm:flex" : "flex"} items-center gap-2`}>
            <IconeVisto tamanho={18} className="flex-none text-[var(--v2-green)]" />
            {item}
          </li>
        ))}
      </ul>

      <div className="border-t border-[var(--v2-line)] pt-4 text-[16px] leading-relaxed text-[var(--v2-muted)]">
        <p>
          <strong className="font-semibold text-[var(--v2-navy)]">{c.privacidadeTitulo}</strong> {c.privacidade}{" "}
          <Link prefetch={false} href="/privacidade" className="underline underline-offset-4">
            {t.privacidadeLigacao}
          </Link>
          .
        </p>
        <details className="group mt-2">
          <summary className="cursor-pointer list-none font-semibold text-[var(--v2-green-dark)] underline underline-offset-4 [&::-webkit-details-marker]:hidden">
            {c.detalhesTitulo}
          </summary>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {c.detalhes.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
