// Fonte única dos três planos B2C da DoLado (nome, preço, o que incluem e
// Price ID Stripe). Sem imports nem efeitos: pode ser usada no browser, no
// servidor e nos testes (`node --test`).
//
// O browser só envia o identificador interno (PlanoId) — nunca um Price ID
// nem um preço. Quem escolhe o Price ID é o servidor (src/lib/stripe/planos.ts
// e app/actions/stripe.ts), e quem dá acesso é o webhook Stripe.
//
// Os Price IDs não são segredos (aparecem no Checkout); os preços em
// cêntimos servem só para apresentar — nunca para identificar o plano.

export type PlanoId = "protecao" | "caso_protecao" | "avulso";

export type Plano = {
  id: PlanoId;
  nome: string;
  precoCentimos: number;
  /** Subscrição mensal (true) ou pagamento único (false). */
  subscricao: boolean;
  /** Acesso às funcionalidades de proteção/prevenção. */
  protecao: boolean;
  /** Casos novos por mês (subscrição) — 0 no Proteção. */
  casosPorMes: number;
  /** Casos incluídos na compra (pagamento único). */
  casosPorCompra: number;
  /** Resumo do que inclui (confirmação de compra). */
  descricaoCurta: string;
  stripePriceId: string;
};

/** Máximo de casos acumulados no Caso + Proteção. */
export const LIMITE_CASOS_ACUMULADOS = 4;

export const PLANOS: Record<PlanoId, Plano> = {
  protecao: {
    id: "protecao",
    nome: "Proteção",
    precoCentimos: 499,
    subscricao: true,
    protecao: true,
    casosPorMes: 0,
    casosPorCompra: 0,
    descricaoCurta:
      "Ajuda a identificar situações que possam tornar-se num problema: comparação das suas faturas para identificar alterações, avisos antes do fim de promoções e de períodos de fidelização, e avisos de alterações relevantes no seu setor. Não inclui o tratamento de casos.",
    stripePriceId: "price_1ULUUeBtJL9VeDPfWuDk5XCo",
  },
  caso_protecao: {
    id: "caso_protecao",
    nome: "Caso + Proteção",
    precoCentimos: 799,
    subscricao: true,
    protecao: true,
    casosPorMes: 1,
    casosPorCompra: 0,
    descricaoCurta: `Tudo o que a Proteção inclui, mais 1 caso por mês. Os casos não utilizados acumulam até ao limite de ${LIMITE_CASOS_ACUMULADOS}.`,
    stripePriceId: "price_1UJYnPBtJL9VeDPfnQTlVwsq",
  },
  avulso: {
    id: "avulso",
    nome: "Avulso",
    precoCentimos: 1499,
    subscricao: false,
    protecao: false,
    casosPorMes: 0,
    casosPorCompra: 1,
    descricaoCurta: "Tratamento de 1 caso, sem subscrição. Não inclui as funcionalidades de proteção.",
    stripePriceId: "price_1UJYwzBtJL9VeDPfrAiguI1Z",
  },
};

/**
 * Caso Extra — benefício de subscritor do Caso + Proteção que já usou o caso
 * incluído no ciclo. Não é um plano nem aparece no preçário: é uma compra
 * única que só acrescenta 1 caso disponível (não muda o plano, a subscrição
 * nem o Customer Stripe). Quem decide se a conta tem direito é sempre o
 * servidor (src/lib/casoExtra.ts + app/actions/stripe.ts); o preço cobrado é
 * o do Price ID, escolhido no servidor (src/lib/stripe/planos.ts).
 * O Avulso continua a ser o produto para quem não tem subscrição.
 */
export const CASO_EXTRA = {
  nome: "Caso Extra",
  precoCentimos: 1199,
  /** Preço normal (Avulso) — só para mostrar o desconto. */
  precoReferenciaCentimos: PLANOS.avulso.precoCentimos,
  descontoPercentagem: 20,
  descricaoCurta:
    "Tratamento de mais 1 caso, com pagamento único. A sua subscrição continua ativa e não é alterada.",
  /** Price ID oficial (11,99 €, pagamento único; produto "Caso Extra", criado no Stripe a 05/10/2026). */
  stripePriceId: "price_1UNGPnBtJL9VeDPfJUIG2ZvK",
} as const;

export const TEXTO_BENEFICIO_SUBSCRITOR = `Benefício de subscritor — ${CASO_EXTRA.descontoPercentagem}% de desconto`;

/** Ordem de apresentação no preçário. */
export const ORDEM_PLANOS: readonly PlanoId[] = ["protecao", "caso_protecao", "avulso"];

export function ehPlanoId(valor: unknown): valor is PlanoId {
  return valor === "protecao" || valor === "caso_protecao" || valor === "avulso";
}

/** 499 → "4,99 €" */
export function formatarPreco(centimos: number) {
  return `${(centimos / 100).toFixed(2).replace(".", ",")} €`;
}

/** Preço com a unidade: "4,99 €/mês" ou "14,99 € / caso". */
export function precoComUnidade(id: PlanoId) {
  const plano = PLANOS[id];
  return plano.subscricao ? `${formatarPreco(plano.precoCentimos)}/mês` : `${formatarPreco(plano.precoCentimos)} / caso`;
}

export const IVA_INCLUIDO = "IVA incluído";

/** "Sem casos disponíveis", "1 caso disponível", "2 casos disponíveis"… */
export function textoCasosDisponiveis(n: number) {
  if (n <= 0) return "Sem casos disponíveis";
  return n === 1 ? "1 caso disponível" : `${n} casos disponíveis`;
}

/** Explicação da conversão de um Avulso pago na 1.ª mensalidade (antes de aderir). */
export function textoConversaoAvulso(destino: Exclude<PlanoId, "avulso">) {
  const mensalidade = PLANOS[destino].precoCentimos;
  const reembolso = PLANOS.avulso.precoCentimos - mensalidade;
  return `Se já comprou um caso Avulso elegível, utilizamos ${formatarPreco(mensalidade)} desse pagamento para cobrir o primeiro mês do plano ${PLANOS[destino].nome} e reembolsamos os restantes ${formatarPreco(reembolso)} para o método de pagamento original.`;
}
