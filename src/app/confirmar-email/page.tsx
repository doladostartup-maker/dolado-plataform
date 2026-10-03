import Link from "next/link";
import { destinoSeguro } from "@/lib/destinoAuth";

export const metadata = { title: "Confirme o seu e-mail — DoLado", robots: { index: false } };

// Depois de criar a conta por e-mail (registo, criação de conta a seguir ao
// pagamento): a ligação do e-mail abre /auth/callback, que continua no
// destino guardado neste browser. Esta página não recebe dados pessoais.
export default async function ConfirmarEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = destinoSeguro((await searchParams).next);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 px-4">
      <div>
        <p className="mb-1 text-sm font-semibold text-[var(--color-brand)]">Conta criada</p>
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">Confirme o seu e-mail</h1>
      </div>
      <p className="text-sm leading-relaxed text-[var(--color-ink)]">
        Enviámos-lhe uma mensagem. Para continuar, abra o e-mail e carregue em{" "}
        <strong>Confirmar o meu e-mail</strong>, de preferência neste mesmo dispositivo e navegador: continua
        exatamente onde estava.
      </p>
      <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
        Não encontra a mensagem? Verifique a pasta de spam ou de promoções.
      </p>
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-[10px] text-center text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]"
      >
        Já confirmei — iniciar sessão
      </Link>
    </main>
  );
}
