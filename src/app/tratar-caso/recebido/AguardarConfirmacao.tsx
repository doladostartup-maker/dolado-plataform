"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const INTERVALO_MS = 3000;
const TENTATIVAS = 20; // ~1 minuto

/**
 * Enquanto o webhook do Stripe ainda não confirmou o pagamento, volta a pedir
 * a página ao servidor (que só lê o estado gravado pelo webhook). O regresso
 * do Stripe, por si, nunca confirma nada.
 */
export function AguardarConfirmacao() {
  const router = useRouter();
  const [tentativas, setTentativas] = useState(0);

  useEffect(() => {
    if (tentativas >= TENTATIVAS) return;
    const t = setTimeout(() => {
      router.refresh();
      setTentativas((n) => n + 1);
    }, INTERVALO_MS);
    return () => clearTimeout(t);
  }, [tentativas, router]);

  if (tentativas < TENTATIVAS) {
    return (
      <p className="flex items-center gap-2 text-[13.5px] text-[var(--color-ink-muted)]" role="status">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-brand)] border-t-transparent" />
        A confirmar o pagamento…
      </p>
    );
  }
  return (
    <p className="text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
      A confirmação está a demorar mais do que o habitual. Não precisa de voltar a pagar: assim que o pagamento for
      confirmado, enviamos-lhe um e-mail e o caso fica disponível no portal.
    </p>
  );
}
