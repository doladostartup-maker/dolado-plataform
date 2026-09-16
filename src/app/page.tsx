import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-4 text-center">
      <Image
        src="/brand/dolado-logo-horizontal.svg"
        alt="DoLado"
        width={160}
        height={40}
        priority
      />
      <p className="text-[var(--color-ink-muted)]">
        Plataforma de acompanhamento de reclamações de consumo.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          Entrar
        </Link>
        <Link
          href="/registo"
          className="rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]"
        >
          Criar conta
        </Link>
      </div>
    </main>
  );
}
