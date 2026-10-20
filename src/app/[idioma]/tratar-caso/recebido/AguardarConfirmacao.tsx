"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTextos } from "@/i18n/cliente";
import { tTratarCaso } from "@/i18n/mensagens/tratarCaso";

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
  const t = useTextos(tTratarCaso).recebido;

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
      <p className="flex items-center gap-2 text-[14.5px] text-[var(--v2-muted)]" role="status">
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--v2-green)] border-t-transparent" />
        {t.aConfirmar}
      </p>
    );
  }
  return (
    <p className="text-[14.5px] leading-relaxed text-[var(--v2-muted)]">
      {t.demora}
    </p>
  );
}
