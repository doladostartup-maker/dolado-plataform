"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Atualiza a página (dados do servidor) a cada `segundos` enquanto estiver
// montado — usado enquanto a sugestão da IA está a ser gerada.
export function AtualizarEnquanto({ segundos = 5 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), segundos * 1000);
    return () => clearInterval(id);
  }, [router, segundos]);
  return null;
}
