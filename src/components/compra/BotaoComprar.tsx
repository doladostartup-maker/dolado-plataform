"use client";

import { useState } from "react";
import type { FluxoCompra, OrigemCompra } from "@/lib/consentimentoCompra";
import { track } from "@/lib/analytics";
import type { PlanoId } from "@/lib/planos";
import { ConfirmarCompra, type OfertaConversao } from "./ConfirmarCompra";

/** Botão de compra para páginas de servidor: abre sempre a confirmação antes do Stripe. */
export function BotaoComprar({
  plano,
  fluxo,
  origem,
  conversao = null,
  pedidoId,
  className,
  children,
}: {
  plano: PlanoId;
  fluxo: FluxoCompra;
  origem: OrigemCompra;
  conversao?: OfertaConversao;
  pedidoId?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (pedidoId) track("modalidade_escolhida", { plano });
          setAberto(true);
        }}
        className={className}
      >
        {children}
      </button>
      {aberto && (
        <ConfirmarCompra
          plano={plano}
          fluxo={fluxo}
          origem={origem}
          conversao={conversao}
          pedidoId={pedidoId}
          onFechar={() => setAberto(false)}
        />
      )}
    </>
  );
}
