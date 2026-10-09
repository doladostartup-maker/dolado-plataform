// Planos na interface: nomes, o que incluem e textos de preço. O português
// vem SEMPRE de src/lib/planos.ts e src/lib/precario.ts (fonte única, também
// usada pelos Termos e pelo Stripe) — aqui só se reexpõe para o seletor de
// idioma. Preços em cêntimos continuam em src/lib/planos.ts.

import { CASO_EXTRA, IVA_INCLUIDO, LIMITE_CASOS_ACUMULADOS, PLANOS, TEXTO_BENEFICIO_SUBSCRITOR } from "../../../lib/planos.ts";
import { CONTEUDO_PLANOS, NOTA_CONVERSAO_AVULSO } from "../../../lib/precario.ts";

export const planos = {
  nome: {
    protecao: PLANOS.protecao.nome,
    caso_protecao: PLANOS.caso_protecao.nome,
    avulso: PLANOS.avulso.nome,
  },
  descricaoCurta: {
    protecao: PLANOS.protecao.descricaoCurta,
    caso_protecao: PLANOS.caso_protecao.descricaoCurta,
    avulso: PLANOS.avulso.descricaoCurta,
  },
  conteudo: CONTEUDO_PLANOS,
  notaConversaoAvulso: NOTA_CONVERSAO_AVULSO,
  casoExtra: {
    nome: CASO_EXTRA.nome,
    descricaoCurta: CASO_EXTRA.descricaoCurta,
    beneficio: TEXTO_BENEFICIO_SUBSCRITOR,
  },
  ivaIncluido: IVA_INCLUIDO,
  unidadeMes: "/mês",
  unidadeCaso: "/ caso",
  /** "4,99 €/mês" ou "14,99 € / caso" (sem espaço antes de "/mês", como em planos.ts). */
  comUnidade: (preco: string, subscricao: boolean) => (subscricao ? `${preco}/mês` : `${preco} / caso`),
  subscricaoMensal: "Subscrição mensal",
  pagamentoUnico: "Pagamento único",
  casosDisponiveis: (n: number) => (n <= 0 ? "Sem casos disponíveis" : n === 1 ? "1 caso disponível" : `${n} casos disponíveis`),
  conversaoAvulso: (mensalidade: string, plano: string, reembolso: string) =>
    `Se já comprou um caso Avulso elegível, utilizamos ${mensalidade} desse pagamento para cobrir o primeiro mês do plano ${plano} e reembolsamos os restantes ${reembolso} para o método de pagamento original.`,
  limiteAcumulados: LIMITE_CASOS_ACUMULADOS,
};
