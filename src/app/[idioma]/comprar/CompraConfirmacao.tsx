"use client";

import { ConfirmarCompra, type OfertaConversao } from "@/components/compra/ConfirmarCompra";
import type { FluxoCompra } from "@/lib/consentimentoCompra";
import type { PlanoId } from "@/lib/planos";

/** Confirmação da compra aberta em /comprar; fechar volta ao preçário. */
export function CompraConfirmacao({
  plano,
  fluxo,
  conversao,
  voltarPara,
}: {
  plano: PlanoId;
  fluxo: FluxoCompra;
  conversao: OfertaConversao;
  voltarPara: string;
}) {
  return (
    <ConfirmarCompra
      plano={plano}
      fluxo={fluxo}
      origem="landing"
      conversao={conversao}
      onFechar={() => window.location.assign(voltarPara)}
    />
  );
}
