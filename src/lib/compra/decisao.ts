// Decisão de compra em portal.dolado.pt/comprar — sem efeitos, testável com
// `node --test`. Quem lê a sessão, user_access e o Stripe é a página
// /comprar e a Server Action confirmarCompra (src/app/actions/stripe.ts),
// que volta a decidir no servidor antes de abrir qualquer Checkout.
//
// O preçário de dolado.pt não vê a sessão (cookies host-only de
// portal.dolado.pt): por isso os botões levam sempre aqui, e é aqui que se
// sabe se quem compra já tem conta. Regras (as que já existiam no portal —
// nenhuma regra comercial nova):
// - Avulso começa sempre por "Tratar o meu caso" (caso primeiro, pagamento
//   no fim).
// - Sem sessão: compra pública; a conta é criada (ou a compra associada a
//   uma conta existente, depois de login) a seguir ao pagamento.
// - Com sessão e uma subscrição ativa (em user_access ou no Stripe, no
//   Customer da conta): não se abre um segundo Checkout.
// - Com sessão e sem subscrição ativa: adesão com o Customer da conta (e a
//   conversão de um Avulso por usar, se houver — decidida em `adesao`).

import type { PlanoId } from "../planos.ts";

export type PlanoSubscricaoAtiva = "protecao" | "caso_protecao" | null;

export type DecisaoCompra =
  | { acao: "tratar_caso" }
  | { acao: "publico" }
  | { acao: "adesao" }
  | { acao: "ja_tem_subscricao"; mesmoPlano: boolean };

export function decidirCompra(dados: {
  plano: PlanoId;
  autenticado: boolean;
  /** Acesso da conta (user_access); null sem sessão. */
  acesso: { plano: string; temProtecao: boolean } | null;
  /** Subscrições ativas no Stripe para o Customer da conta (plano pelo price; null se desconhecido). */
  subscricoesAtivasStripe: PlanoSubscricaoAtiva[];
}): DecisaoCompra {
  if (dados.plano === "avulso") return { acao: "tratar_caso" };
  if (!dados.autenticado) return { acao: "publico" };

  const planosAtivos: PlanoSubscricaoAtiva[] = [...dados.subscricoesAtivasStripe];
  if (dados.acesso?.temProtecao) {
    planosAtivos.push(dados.acesso.plano === "protecao" || dados.acesso.plano === "caso_protecao" ? dados.acesso.plano : null);
  }
  if (planosAtivos.length > 0) {
    return { acao: "ja_tem_subscricao", mesmoPlano: planosAtivos.includes(dados.plano) };
  }
  return { acao: "adesao" };
}

export const MENSAGEM_MESMA_SUBSCRICAO = "Já tem esta subscrição ativa.";
export const MENSAGEM_OUTRA_SUBSCRICAO =
  "Já tem uma subscrição ativa. Pode consultá-la em Gestão de Subscrição, na sua área de cliente.";
