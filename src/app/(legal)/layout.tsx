import Image from "next/image";
import Link from "next/link";
import { LIVRO_RECLAMACOES_URL, ROTAS_LEGAIS } from "@/lib/legal";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-4 py-6">
        <Link href="/" aria-label="Página inicial DoLado" className="inline-flex">
          <Image
            src="/brand/dolado-logo-horizontal.svg"
            alt="DoLado"
            width={110}
            height={26}
            priority
          />
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16">{children}</main>

      <footer className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-4 py-6 text-xs text-[var(--color-ink-faint)]">
        <Link href={ROTAS_LEGAIS.termos} className="hover:text-[var(--color-ink-muted)]">
          Termos e Condições
        </Link>
        <span aria-hidden>·</span>
        <Link href={ROTAS_LEGAIS.livreResolucao} className="hover:text-[var(--color-ink-muted)]">
          Livre resolução
        </Link>
        <span aria-hidden>·</span>
        <Link href={ROTAS_LEGAIS.privacidade} className="hover:text-[var(--color-ink-muted)]">
          Política de Privacidade
        </Link>
        <span aria-hidden>·</span>
        <Link href={ROTAS_LEGAIS.resolucaoLitigios} className="hover:text-[var(--color-ink-muted)]">
          Resolução de litígios
        </Link>
        <span aria-hidden>·</span>
        <a
          href={LIVRO_RECLAMACOES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold hover:text-[var(--color-ink-muted)]"
        >
          Livro de Reclamações
        </a>
      </footer>
    </div>
  );
}
