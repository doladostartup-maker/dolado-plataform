// Fonte única dos textos e versões legais usados na compra (checkout,
// registo de prova, e-mail de confirmação, Termos). Sem efeitos nem imports
// de runtime além de constantes: pode ser usada no browser, no servidor e
// nos testes (`node --test`).
//
// Alterar um texto legal = alterar AQUI e subir a versão correspondente. O
// registo de cada compra (tabela consentimentos_compra) guarda as versões e
// o texto exato apresentado, por isso uma versão antiga continua provável
// mesmo depois de o texto mudar.
//
// IMPORTANTE: os textos abaixo aguardam validação jurídica (ver
// REVISAO_JURIDICA_PENDENTE). Nenhuma regra de código decide reembolsos ou a
// perda do direito de livre resolução com base nestes consentimentos — isso
// é sempre decidido caso a caso.

// Extensão .ts explícita: o módulo é importado diretamente por `node --test`.
import type { PlanoId } from "./planos.ts";
import { CONTACTO_EMAIL } from "./site.ts";

/** Versão dos Termos e Condições em vigor (data AAAA-MM-DD). Cada versão fica acessível em /termos/<versão>. */
export const TERMOS_VERSAO = "2026-10-01";

/** Versão da Política de Privacidade em vigor (data AAAA-MM-DD). Cada versão fica acessível em /privacidade/<versão>. */
export const PRIVACIDADE_VERSAO = "2026-10-01";

/** Versão do texto de pedido expresso de início imediato. */
export const CONSENTIMENTO_INICIO_IMEDIATO_VERSAO = "2026-10-01";

export const ROTAS_LEGAIS = {
  termos: "/termos",
  privacidade: "/privacidade",
  livreResolucao: "/livre-resolucao",
  gestaoSubscricao: "/portal/subscricao",
} as const;

/** URL estável de uma versão dos Termos. */
export function rotaTermosVersao(versao: string) {
  return `${ROTAS_LEGAIS.termos}/${versao}`;
}

/** Contacto para exercer o direito de livre resolução (por agora, só por e-mail). */
export const CONTACTO_LIVRE_RESOLUCAO = CONTACTO_EMAIL;

/**
 * Checkbox de aceitação dos Termos. Dividido para "Termos e Condições" ser
 * uma ligação; o texto completo (`TEXTO_ACEITACAO_TERMOS`) é o que fica
 * registado.
 */
export const ACEITACAO_TERMOS = {
  antes: "Li e aceito os ",
  ligacao: "Termos e Condições",
  depois: " da DoLado.",
} as const;
export const TEXTO_ACEITACAO_TERMOS = `${ACEITACAO_TERMOS.antes}${ACEITACAO_TERMOS.ligacao}${ACEITACAO_TERMOS.depois}`;

const TEXTO_INICIO_IMEDIATO_BASE =
  "Peço expressamente que a DoLado inicie a prestação do serviço imediatamente, antes do fim do prazo legal de 14 dias de livre resolução. Compreendo que, se exercer esse direito depois de a prestação ter começado, poderá ser devido o valor proporcional ao serviço já prestado e que, se o contrato for integralmente executado durante esse período, poderei perder o direito de livre resolução nos termos legalmente aplicáveis.";

export type ConsentimentoInicioImediato = { versao: string; texto: string };

/**
 * Texto do pedido de início imediato por produto. Hoje os três usam o mesmo
 * texto-base; a estrutura existe para o Avulso (serviço que pode ficar
 * integralmente executado), a Proteção (serviço continuado) e o Caso +
 * Proteção (as duas coisas) poderem ter versões próprias depois da revisão
 * jurídica. Nada no código deduz efeitos jurídicos deste texto.
 */
export const INICIO_IMEDIATO_POR_PLANO: Record<PlanoId, ConsentimentoInicioImediato> = {
  avulso: { versao: CONSENTIMENTO_INICIO_IMEDIATO_VERSAO, texto: TEXTO_INICIO_IMEDIATO_BASE },
  protecao: { versao: CONSENTIMENTO_INICIO_IMEDIATO_VERSAO, texto: TEXTO_INICIO_IMEDIATO_BASE },
  caso_protecao: { versao: CONSENTIMENTO_INICIO_IMEDIATO_VERSAO, texto: TEXTO_INICIO_IMEDIATO_BASE },
};

export function consentimentoInicioImediato(plano: PlanoId): ConsentimentoInicioImediato {
  return INICIO_IMEDIATO_POR_PLANO[plano];
}

/** Explicação curta mostrada antes do pagamento. */
export const RESUMO_LIVRE_RESOLUCAO =
  "Nos casos legalmente aplicáveis, dispõe de 14 dias para exercer o direito de livre resolução. Ao pedir o início imediato do serviço durante esse prazo, poderão aplicar-se as condições previstas nos Termos e na lei.";

/** Como exercer o direito (checkout, Termos, e-mail e página de livre resolução). */
export const COMO_EXERCER_LIVRE_RESOLUCAO = `Para exercer o direito de livre resolução, envie um e-mail para ${CONTACTO_LIVRE_RESOLUCAO} com o seu nome, o e-mail da conta e o plano em causa. O pedido é tratado à parte do cancelamento da subscrição.`;

/** Textos que ainda têm de ser validados pela advogada antes de serem considerados definitivos. */
export const REVISAO_JURIDICA_PENDENTE = [
  "Texto do pedido expresso de início imediato (INICIO_IMEDIATO_POR_PLANO)",
  "Tratamento jurídico definitivo do Avulso (execução integral dentro dos 14 dias)",
  "Tratamento jurídico definitivo do Caso + Proteção (serviço continuado + caso)",
  "Resumo e forma de exercício da livre resolução (RESUMO_LIVRE_RESOLUCAO, COMO_EXERCER_LIVRE_RESOLUCAO, /livre-resolucao)",
  "Termos e Condições versão 2026-10-01 — secções de pagamento, subscrição, livre resolução e reembolsos",
] as const;
