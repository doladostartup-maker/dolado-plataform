import Image from "next/image";
import Link from "next/link";

export default function Home() {
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

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <Image
          src="/brand/dolado-logo-horizontal.svg"
          alt="DoLado"
          width={160}
          height={40}
          priority
        />
        <div className="flex flex-col gap-1">
          <p className="text-[var(--color-ink-muted)]">
            Plataforma de acompanhamento de reclamações de consumo.
          </p>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Acesso por email e palavra-passe.
          </p>
        </div>
        <div className="flex gap-4">
          <Link
            href="/registo"
            className="rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
          >
            Criar conta
          </Link>
          <Link
            href="/login"
            className="rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]"
          >
            Entrar
          </Link>
        </div>
        <p className="text-xs text-[var(--color-ink-faint)]">
          Acompanhamos casos reais de reclamação em Portugal.
        </p>
      </main>

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
