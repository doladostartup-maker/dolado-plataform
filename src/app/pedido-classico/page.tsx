import Image from "next/image";
import Link from "next/link";
import { IntakeForm } from "@/components/landing/IntakeForm";

export default function PedidoClassicoPage() {
  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      <header className="border-b border-[var(--color-hairline)] bg-white px-4 py-4">
        <Link href="/" className="inline-flex items-center">
          <Image src="/brand/dolado-logo-horizontal.svg" alt="DoLado" width={120} height={28} priority />
        </Link>
      </header>

      <main className="mx-auto max-w-[560px] px-4 py-10 sm:py-14">
        <h1 className="mb-2 text-[var(--text-heading)] font-bold text-[var(--color-ink)]">
          Conte-nos o que aconteceu
        </h1>
        <p className="mb-6 text-[var(--text-body)] text-[var(--color-ink-muted)]">
          Preencha o essencial e anexe o que tiver. Lemos o caso, voltamos a falar consigo e
          explicamos o que é exigível à empresa.
        </p>

        <div className="rounded-[var(--radius-panel)] border border-[var(--color-hairline)] bg-white p-6 shadow-[var(--shadow-subtle)] sm:p-8">
          <IntakeForm />
        </div>
      </main>
    </div>
  );
}
