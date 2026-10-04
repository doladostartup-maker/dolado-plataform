import { LIMITE_CASOS_ACUMULADOS, type PlanoId } from "@/lib/planos";
import { urlComprar, urlTratarCaso } from "@/lib/site";

// O que cada plano inclui, como é apresentado no preçário. Partilhado entre
// o preçário da homepage (Precario.tsx) e a página V2 /precario, para os
// textos não divergirem. Nomes e preços vêm sempre de src/lib/planos.ts.
// Só se listam funcionalidades de proteção já disponíveis na plataforma,
// descritas pelo benefício e nunca pelos nomes internos.

const FUNCIONALIDADES_PROTECAO = [
  "Comparação de faturas mês a mês, para identificar alterações",
  "Avisos antes do fim de promoções",
  "Avisos antes do fim de períodos de fidelização",
  "Alertas sobre alterações relevantes no seu setor",
];

export type ConteudoPlano = {
  resumo: string;
  inclui: string[];
  naoInclui?: string;
};

export const CONTEUDO_PLANOS: Record<PlanoId, ConteudoPlano> = {
  protecao: {
    resumo:
      "Para quem quer identificar alterações importantes e antecipar problemas, antes de perder dinheiro ou a oportunidade de agir.",
    inclui: FUNCIONALIDADES_PROTECAO,
    naoInclui: "Não inclui o tratamento de casos.",
  },
  caso_protecao: {
    resumo: "Tratamos dos problemas quando surgem e ajudamos a identificar outros antes que lhe causem prejuízo.",
    inclui: [
      "Tudo o que está incluído na Proteção",
      "1 novo caso por mês",
      `Casos não utilizados acumulam até ao limite de ${LIMITE_CASOS_ACUMULADOS}`,
      "Sem período de carência",
    ],
  },
  avulso: {
    resumo: "Para tratar um único problema, com pagamento único e sem aderir a uma subscrição.",
    inclui: [
      "Tratamento de 1 caso",
      "Acompanhamento desse caso ao longo do processo",
      "Acesso ao histórico do caso na área de cliente",
    ],
    naoInclui: "Não inclui as funcionalidades da Proteção.",
  },
};

export const NOTA_CONVERSAO_AVULSO =
  "Comprou um caso Avulso e ainda não o usou? Se aderir depois a uma subscrição, parte do valor já pago cobre o primeiro mês e o restante é reembolsado para o método de pagamento original.";

// Destino do botão de cada plano. Nas subscrições, portal.dolado.pt/comprar:
// dolado.pt não vê a sessão (cookies host-only do portal), e é lá que se
// decide se quem compra já tem conta (mesmo Customer, nunca uma segunda
// subscrição desligada da conta) antes da confirmação da compra (Termos,
// início imediato, livre resolução). O Avulso é o tratamento de um caso:
// começa pela descrição do caso e só no fim se escolhe e paga a modalidade
// ("Tratar o meu caso").
export function destinoPlano(plano: PlanoId, origem: string) {
  return plano === "avulso" ? urlTratarCaso(origem) : urlComprar(plano);
}
