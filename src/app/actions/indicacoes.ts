"use server";

import { utilizadorParticularAtual } from "@/lib/auth";
import { podeUsarCodigoParceiro } from "@/lib/parceiros/servidor";
import { FLUXOS_COMPRA, type FluxoCompra } from "@/lib/consentimentoCompra";
import { produtoComDescontoIndicacao, type TipoDescontoIndicacao } from "@/lib/indicacoes/regras";
import { ofertaIndicacaoParaConta, visitaDeIndicacaoNoBrowser } from "@/lib/indicacoes/servidor";
import { ehPlanoId, type PlanoId } from "@/lib/planos";

// Programa de indicação — só leitura para o modal de confirmação da compra.
// Não abre Checkout nem dá descontos: quem decide e aplica é confirmarCompra
// (app/actions/stripe.ts), de novo, no servidor.

export type OfertaIndicacaoCompra = {
  desconto: TipoDescontoIndicacao | null;
  novoClienteIndicado: boolean;
  /** Chegou por um link de indicação mas compra sem conta: avisar que precisa de conta para os 20%. */
  semContaComIndicacao?: boolean;
  /** Mostrar o campo "Código de parceiro" (com sessão, programa ligado e conta sem atribuição). */
  codigoParceiro?: boolean;
};

/**
 * Só para mostrar no modal de confirmação: há desconto de indicação nesta
 * compra? Lê a sessão e o cookie da visita (nunca dados do browser sobre
 * quem indicou); ao abrir o Checkout, o servidor volta a decidir tudo.
 */
export async function ofertaIndicacaoNaCompra(
  plano: PlanoId,
  fluxo: FluxoCompra,
  conversao: boolean,
): Promise<OfertaIndicacaoCompra> {
  const nada = { desconto: null, novoClienteIndicado: false };
  if (!ehPlanoId(plano) || !FLUXOS_COMPRA.includes(fluxo)) return nada;
  try {
    const { user } = await utilizadorParticularAtual("indicacoes:acao");
    if (!user) {
      // Sem conta não há desconto de indicação; só se avisa como o ativar.
      const aviso = fluxo === "publico" && produtoComDescontoIndicacao(plano) && (await visitaDeIndicacaoNoBrowser());
      return { ...nada, semContaComIndicacao: aviso };
    }
    // Com sessão, a compra "pública" segue os fluxos da conta (confirmarCompra).
    const fluxoDaConta: FluxoCompra = fluxo === "publico" ? (plano === "avulso" ? "avulso_conta" : "adesao") : fluxo;
    const oferta = await ofertaIndicacaoParaConta(user.id, { plano, fluxo: fluxoDaConta, conversao: !!conversao });
    // Depois da atribuição pelo browser (feita acima): só sem nenhuma atribuição.
    const codigoParceiro = fluxo !== "caso_extra" && !conversao && (await podeUsarCodigoParceiro(user.id).catch(() => false));
    return { ...oferta, codigoParceiro };
  } catch {
    return nada; // sem desconto mostrado; o Checkout decide de novo
  }
}
