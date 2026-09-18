import Image from "next/image";
import Link from "next/link";

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

      <footer className="flex justify-center gap-4 px-4 py-6 text-xs text-[var(--color-ink-faint)]">
        <Link href="/termos" className="hover:text-[var(--color-ink-muted)]">
          Termos de Serviço
        </Link>
        <span aria-hidden>·</span>
        <Link href="/privacidade" className="hover:text-[var(--color-ink-muted)]">
          Política de Privacidade
        </Link>
      </footer>
    </div>
  );
}
