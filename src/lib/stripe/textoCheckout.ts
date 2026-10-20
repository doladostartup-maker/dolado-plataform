// Texto do Stripe Checkout para quem compra em inglês — só apresentação.
// Sem I/O; testado com `node --test` (textoCheckout.test.mjs).
//
// Os produtos e preços do Stripe têm um só nome (português: "Avulso",
// "Caso + Proteção", "Proteção", "Caso Extra") e o Stripe não tem nomes de
// produto por idioma. Para não duplicar produtos nem Price IDs, a sessão em
// inglês leva `custom_text.submit` (por cima do botão de pagar, só nesta
// sessão) com o nome inglês e uma frase sobre o que inclui. Não muda preços,
// Price IDs, metadata, webhooks nem regras. Em português não se acrescenta nada.

import type { Idioma } from "../../i18n/config.ts";
import { PLANOS, type PlanoId } from "../planos.ts";
import { tPlanos } from "../../i18n/mensagens/planos.ts";

export type ProdutoCheckout = PlanoId | "caso_extra";

/** Mensagem (Markdown do Stripe, máx. 1200 caracteres) ou null em português. */
export function mensagemCheckout(produto: ProdutoCheckout | null, idioma: Idioma): string | null {
  if (idioma === "pt-PT" || !produto) return null;
  const t = tPlanos[idioma];
  const [nome, nomePt, descricao] =
    produto === "caso_extra"
      ? [t.casoExtra.nome, "Caso Extra", t.casoExtra.descricaoCurta]
      : [t.nome[produto], PLANOS[produto].nome, t.descricaoCurta[produto]];
  return `You are buying **${nome}** (shown above under its Portuguese name, “${nomePt}”). ${descricao}`.slice(0, 1200);
}
