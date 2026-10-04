import type { Metadata } from "next";
import Link from "next/link";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { LIVRO_RECLAMACOES_URL, ROTAS_LEGAIS } from "@/lib/legal";
import { MARKETING_SITE_URL } from "@/lib/site";
import { Logotipo } from "@/components/marketing-v2/Logotipo";
import { fonteV2 } from "@/components/marketing-v2/fonte";

export const metadata: Metadata = {
  title: "Tratar o meu caso - DoLado",
  description: "Descreva o seu caso, crie a sua conta e escolha como quer que a DoLado o trate.",
};

export default function TratarCasoLayout({ children }: { children: React.ReactNode }) {
  return (
    // Design System V2 (mesmo tema do portal: .tema-portal).
    <div className={`tema-portal ${fonteV2.className} flex min-h-screen flex-col bg-[#F7F9FC] text-[var(--v2-navy)] antialiased`}>
      <AnalyticsScripts />
      <header className="border-b border-[var(--v2-line)] bg-white">
        <div className="mx-auto flex h-16 max-w-[640px] items-center px-4">
          <Logotipo />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[640px] flex-1 px-4 py-8 sm:py-12">{children}</main>
      <footer className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-4 py-6 text-[13px] text-[var(--v2-muted)]">
        <Link prefetch={false} href={`${MARKETING_SITE_URL}${ROTAS_LEGAIS.termos}`} className="hover:text-[var(--v2-navy)]">
          Termos e Condições
        </Link>
        <span aria-hidden>·</span>
        <Link prefetch={false} href={`${MARKETING_SITE_URL}${ROTAS_LEGAIS.privacidade}`} className="hover:text-[var(--v2-navy)]">
          Política de Privacidade
        </Link>
        <span aria-hidden>·</span>
        <Link prefetch={false} href={`${MARKETING_SITE_URL}${ROTAS_LEGAIS.livreResolucao}`} className="hover:text-[var(--v2-navy)]">
          Livre resolução
        </Link>
        <span aria-hidden>·</span>
        <a href={LIVRO_RECLAMACOES_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--v2-navy)]">
          Livro de Reclamações
        </a>
      </footer>
    </div>
  );
}
