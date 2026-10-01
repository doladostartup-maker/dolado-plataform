"use client";

import { useState } from "react";
import type { FluxoCompra, OrigemCompra } from "@/lib/consentimentoCompra";
import type { PlanoId } from "@/lib/planos";
import { ConfirmarCompra, type OfertaConversao } from "./ConfirmarCompra";

/** Botão de compra para páginas de servidor: abre sempre a confirmação antes do Stripe. */
export function BotaoComprar({
  plano,
  fluxo,
  origem,
  conversao = null,
  className,
  children,
}: {
  plano: PlanoId;
  fluxo: FluxoCompra;
  origem: OrigemCompra;
  conversao?: OfertaConversao;
  className?: string;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={className}>
        {children}
      </button>
      {aberto && (
        <ConfirmarCompra
          plano={plano}
          fluxo={fluxo}
          origem={origem}
          conversao={conversao}
          onFechar={() => setAberto(false)}
        />
      )}
    </>
  );
}
