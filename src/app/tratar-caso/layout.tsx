import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { LIVRO_RECLAMACOES_URL, ROTAS_LEGAIS } from "@/lib/legal";
import { MARKETING_SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Tratar o meu caso - DoLado",
  description: "Descreva o seu caso, crie a sua conta e escolha como quer que a DoLado o trate.",
};

export default function TratarCasoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-canvas)]">
      <AnalyticsScripts />
      <header className="border-b border-[var(--color-hairline)] bg-white px-4 py-4">
        <div className="mx-auto max-w-[640px]">
          <Link href={MARKETING_SITE_URL} aria-label="Página inicial DoLado" className="inline-flex">
            <Image src="/brand/dolado-logo-horizontal.svg" alt="DoLado" width={120} height={28} priority />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[640px] flex-1 px-4 py-8 sm:py-12">{children}</main>
      <footer className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-4 py-6 text-xs text-[var(--color-ink-faint)]">
        <Link href={`${MARKETING_SITE_URL}${ROTAS_LEGAIS.termos}`} className="hover:text-[var(--color-ink-muted)]">
          Termos e Condições
        </Link>
        <span aria-hidden>·</span>
        <Link href={`${MARKETING_SITE_URL}${ROTAS_LEGAIS.privacidade}`} className="hover:text-[var(--color-ink-muted)]">
          Política de Privacidade
        </Link>
        <span aria-hidden>·</span>
        <Link href={`${MARKETING_SITE_URL}${ROTAS_LEGAIS.livreResolucao}`} className="hover:text-[var(--color-ink-muted)]">
          Livre resolução
        </Link>
        <span aria-hidden>·</span>
        <a href={LIVRO_RECLAMACOES_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-ink-muted)]">
          Livro de Reclamações
        </a>
      </footer>
    </div>
  );
}
