"use client";

import Image from "next/image";
import Link from "@/i18n/Link";
import type { ReactNode } from "react";
import { useIdioma } from "@/i18n/cliente";
import { tInicio } from "@/i18n/mensagens/inicio";
import { tMarketing } from "@/i18n/mensagens/marketing";
import { track } from "@/lib/analytics";
import { caminhoProblema } from "@/lib/problemas/catalogo";
import { IconeSeta } from "@/components/marketing-v2/Icones";
import { InstagramFundador } from "@/components/marketing-v2/RedesSociais";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";
import { SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { CARTAO, TEXTO } from "@/components/marketing-v2/estilos";

// Secções partilhadas pelas duas homepages: HomepageV2 (entrada "Tratar do
// meu caso") e HomepageDiagnostico (entrada pela análise gratuita, com
// DIAGNOSTICO_GRATUITO_ATIVO).

export const LIGACAO =
  "inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green-dark)] underline-offset-4 hover:underline";

// Situações reais: cada uma leva à página já existente mais próxima
// (catálogo em src/lib/problemas/catalogo.ts), nunca a um destino genérico.
type IdSituacao = "faturaAlta" | "promocao" | "fidelizacao" | "reembolso" | "naoReconhece" | "semResposta";
const SITUACOES: { id: IdSituacao; href: string }[] = [
  { id: "faturaAlta", href: caminhoProblema("energia", "fatura-muito-alta") },
  { id: "promocao", href: caminhoProblema("telecomunicacoes", "aumento-preco") },
  { id: "fidelizacao", href: caminhoProblema("telecomunicacoes", "cancelar-fidelizacao") },
  { id: "reembolso", href: caminhoProblema("compras-reembolsos", "loja-nao-devolve-dinheiro") },
  { id: "naoReconhece", href: caminhoProblema("telecomunicacoes", "cobranca-indevida") },
  { id: "semResposta", href: ROTAS_V2.simulador },
];

/** "Já lhe aconteceu alguma destas situações?" — `acao` substitui o fecho (homepage do diagnóstico). */
export function SecaoSituacoes({ titulo, acao }: { titulo?: ReactNode; acao?: ReactNode } = {}) {
  const t = tInicio[useIdioma()];
  return (
    <SectionV2 id="situacoes" tone="soft-blue">
      <SectionHeader titulo={titulo ?? t.problemas.titulo} />
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SITUACOES.map((s) => (
          <li key={s.id}>
            <Link
              prefetch={false}
              href={s.href}
              onClick={() => track("click_home_situacao", { situacao: s.id })}
              className={`${CARTAO} group flex h-full items-center justify-between gap-4 p-6 transition-colors hover:border-[var(--v2-green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-green)]`}
            >
              <span className="text-[17px] font-semibold leading-snug text-[var(--v2-navy)]">{t.problemas.itens[s.id]}</span>
              <span aria-hidden="true" className="flex-none text-[var(--v2-green)] transition-transform group-hover:translate-x-0.5">
                <IconeSeta tamanho={18} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
        {acao ?? <p className="text-[18px] font-bold text-[var(--v2-navy)]">{t.problemas.fecho}</p>}
        <Link prefetch={false} href={ROTAS_V2.problemas} onClick={() => track("click_home_problemas")} className={LIGACAO}>
          {t.problemas.verTodos} <IconeSeta tamanho={15} />
        </Link>
      </div>
    </SectionV2>
  );
}

/** Fundador (história completa em /sobre-nos). */
export function SecaoFundador() {
  const idioma = useIdioma();
  const t = tInicio[idioma];
  // Fotografia real (já publicada; 600 px, imagens não otimizadas no
  // servidor — images.unoptimized, next.config.ts).
  return (
    <SectionV2 tone="soft-blue" className="grid items-center gap-8 sm:grid-cols-[180px_1fr] sm:gap-10 lg:grid-cols-[220px_1fr]">
      <Image
        src="/landing/founder-thiago-600.webp"
        alt={tMarketing[idioma].origem.fotografia}
        width={220}
        height={260}
        className="aspect-[4/5] w-full max-w-[180px] rounded-[18px] object-cover lg:max-w-[220px]"
      />
      <div className="max-w-[620px]">
        <h2 className="text-[clamp(26px,3vw,34px)] font-extrabold leading-[1.15] tracking-[-0.025em] text-[var(--v2-navy)]">{t.fundador.titulo}</h2>
        <p className={`${TEXTO} mt-4`}>{t.fundador.texto}</p>
        <p className="mt-5 text-[15.5px] font-bold text-[var(--v2-navy)]">{t.fundador.nome}</p>
        <p className="text-[14.5px] text-[var(--v2-muted)]">{t.fundador.cargo}</p>
        <Link prefetch={false} href={ROTAS_V2.sobreNos} className={`${LIGACAO} mt-5`}>
          {t.fundador.cta} <IconeSeta tamanho={15} />
        </Link>
        <InstagramFundador local="homepage_fundador" className="mt-8" />
      </div>
    </SectionV2>
  );
}
