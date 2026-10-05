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
import { CONTACTO_EMAIL, ENTIDADE_LEGAL, MORADA_SEDE } from "./site.ts";

// Identificador de versão = data AAAA-MM-DD; uma segunda versão publicada no
// mesmo dia leva um sufixo de letra ("2026-10-01b").

/** Versão dos Termos e Condições em vigor. Cada versão fica acessível em /termos/<versão>. */
export const TERMOS_VERSAO = "2026-10-02";

/** Versão da Política de Privacidade em vigor. Cada versão fica acessível em /privacidade/<versão>. */
export const PRIVACIDADE_VERSAO = "2026-10-02e";

/** Versão do texto de pedido expresso de início imediato. */
export const CONSENTIMENTO_INICIO_IMEDIATO_VERSAO = "2026-10-01";

/**
 * Autorização opcional para e-mails da DoLado com novidades e ofertas
 * (caixa do formulário "Tratar o meu caso"). O texto exato e a versão ficam
 * gravados com a autorização (consentimentos_comunicacoes). Mudar o texto =
 * nova versão. Cada e-mail enviado com base nela tem de permitir retirá-la.
 */
export const CONSENTIMENTO_COMUNICACOES_VERSAO = "2026-10-02";
export const TEXTO_CONSENTIMENTO_COMUNICACOES =
  "Opcional: aceito receber e-mails da DoLado com novidades e ofertas, como a Proteção (alertas de fim de fidelização e de promoção). Pode cancelar a qualquer momento.";

export const ROTAS_LEGAIS = {
  termos: "/termos",
  privacidade: "/privacidade",
  livreResolucao: "/livre-resolucao",
  resolucaoLitigios: "/resolucao-de-litigios",
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
export const COMO_EXERCER_LIVRE_RESOLUCAO = `Para exercer o direito de livre resolução, use o formulário "Resolver o contrato aqui" em dolado.pt/livre-resolucao ou envie um e-mail para ${CONTACTO_LIVRE_RESOLUCAO} com o seu nome, o e-mail usado na compra e o plano em causa. O pedido é tratado à parte do cancelamento da subscrição.`;

/** Prazo legal de livre resolução nos contratos à distância de prestação de serviços (DL 24/2014, art. 10.º). */
export const PRAZO_LIVRE_RESOLUCAO_DIAS = 14;

/**
 * Modelo de formulário de livre resolução (DL 24/2014, anexo, parte B),
 * preenchido com a identificação da DoLado. O cliente pode usá-lo, mas não
 * é obrigatório — qualquer declaração inequívoca serve.
 */
export const MODELO_FORMULARIO_LIVRE_RESOLUCAO = [
  `Para: ${ENTIDADE_LEGAL} (marca DoLado), ${MORADA_SEDE}, ${CONTACTO_LIVRE_RESOLUCAO}`,
  "Pela presente comunico que resolvo o meu contrato de prestação do seguinte serviço: [plano Proteção / Caso + Proteção / Avulso]",
  "Celebrado em: [data da compra]",
  "Nome do consumidor: [nome]",
  "Endereço de e-mail usado na compra: [e-mail]",
  "Data: [data]",
] as const;

// ---------------------------------------------------------------------------
// Livro de Reclamações e resolução alternativa de litígios (RAL) — relativos
// à própria DoLado enquanto prestadora de serviços, não às reclamações que a
// DoLado trata para os clientes.
// ---------------------------------------------------------------------------

/** Livro de Reclamações Eletrónico (DL 156/2005, na redação do DL 74/2017). */
export const LIVRO_RECLAMACOES_URL = "https://www.livroreclamacoes.pt/Inicio/";

/**
 * Lista oficial das entidades RAL publicada pela Direção-Geral do Consumidor
 * (Lei 144/2015, art. 17.º, n.º 2). A página antiga
 * (…/ral-mapa-e-lista-de-entidades.aspx) passou a redirecionar para a
 * homepage da DGC; esta página é a que liga ao mapa e à lista.
 */
export const LISTA_OFICIAL_RAL_URL =
  "https://www.consumidor.gov.pt/parceiros/sistema-de-defesa-do-consumidor/entidades-de-resolucao-alternativa-de-litigios-de-consumo";

export type EntidadeRal = { nome: string; site: string; ambito: string };

/**
 * Entidades RAL de competência genérica (Lei 144/2015, art. 18.º; DL 102/2017).
 * A DoLado presta o serviço online a consumidores em todo o território
 * nacional e, nos litígios de reduzido valor, fica sujeita à arbitragem
 * necessária se o consumidor a escolher (Lei 24/96, art. 14.º, n.º 2) — por
 * isso indica todos os centros de competência genérica, regionais e nacionais.
 * Ficam de fora os de competência especializada (CIMPAS — seguros; Provedor
 * da APAVT — viagens), que não abrangem o serviço da DoLado.
 *
 * Validado a 04/10/2026 contra a lista e o mapa oficiais da DGC
 * (LISTA_OFICIAL_RAL_URL; mapa "atualizado em ago/2025"): a competente é,
 * em regra, a do local de celebração do contrato; sem centro regional, o
 * CNIACC (competência residual). O CAUAL tem competência genérica nacional,
 * não exclusiva de consumo. Rever sempre que a DGC atualizar a lista.
 */
export const ENTIDADES_RAL: readonly EntidadeRal[] = [
  {
    nome: "CIAB — Centro de Informação, Mediação e Arbitragem de Consumo (Tribunal Arbitral de Consumo)",
    site: "https://www.ciab.pt",
    ambito: "Contratos celebrados nos municípios das regiões de Braga e Viana do Castelo indicados pelo centro",
  },
  {
    nome: "TRIAVE — Centro de Arbitragem de Conflitos de Consumo do Ave, Tâmega e Sousa",
    site: "https://www.triave.pt",
    ambito: "Contratos celebrados nos municípios do Ave, Tâmega e Sousa indicados pelo centro",
  },
  {
    nome: "CICAP — Centro de Informação de Consumo e Arbitragem do Porto",
    site: "https://www.cicap.pt",
    ambito: "Contratos celebrados na Área Metropolitana do Porto",
  },
  {
    nome: "CACRC — Centro de Arbitragem de Conflitos de Consumo da Região de Coimbra",
    site: "https://www.cacrc.pt",
    ambito: "Contratos celebrados nos municípios da Região de Coimbra indicados pelo centro",
  },
  {
    nome: "CACCL — Centro de Arbitragem de Conflitos de Consumo de Lisboa",
    site: "https://www.centroarbitragemlisboa.pt",
    ambito: "Contratos celebrados na Área Metropolitana de Lisboa",
  },
  {
    nome: "CIMAAL — Centro de Informação, Mediação e Arbitragem de Conflitos de Consumo do Algarve",
    site: "https://www.consumidoronline.pt",
    ambito: "Contratos celebrados no distrito de Faro",
  },
  {
    nome: "CACC RAM — Centro de Arbitragem de Conflitos de Consumo da Região Autónoma da Madeira",
    site: "https://www.madeira.gov.pt/cacc",
    ambito: "Contratos celebrados na Região Autónoma da Madeira",
  },
  {
    nome: "CIMARA — Centro de Informação, Mediação e Arbitragem de Consumo da Região Açores",
    site: "https://ocimara.pt",
    ambito: "Contratos celebrados na Região Autónoma dos Açores",
  },
  {
    nome: "CNIACC — Centro Nacional de Informação e Arbitragem de Conflitos de Consumo",
    site: "https://www.cniacc.pt",
    ambito:
      "Todo o território nacional, nas zonas não abrangidas por um centro de arbitragem de competência regional (competência residual)",
  },
  {
    nome: "CAUAL — Centro de Arbitragem da Universidade Autónoma de Lisboa",
    site: "https://arbitragem.grupoautonoma.pt",
    ambito: "Todo o território nacional; competência genérica, não exclusiva de conflitos de consumo",
  },
];

/** Textos que ainda têm de ser validados pela advogada antes de serem considerados definitivos. */
export const REVISAO_JURIDICA_PENDENTE = [
  "Texto do pedido expresso de início imediato (INICIO_IMEDIATO_POR_PLANO)",
  "Tratamento jurídico definitivo do Avulso (execução integral dentro dos 14 dias)",
  "Tratamento jurídico definitivo do Caso + Proteção (serviço continuado + caso)",
  "Resumo e forma de exercício da livre resolução (RESUMO_LIVRE_RESOLUCAO, COMO_EXERCER_LIVRE_RESOLUCAO, /livre-resolucao)",
  "Termos e Condições versão 2026-10-01b — em especial: cancelamento, início da prestação e livre resolução; limitações de responsabilidade; RAL e lei aplicável",
  "Política de Privacidade versão 2026-10-01c — prazos de conservação (secção 6), bases jurídicas e descrição do Simulador de Elegibilidade público",
  "Função online de livre resolução (/livre-resolucao) e modelo de formulário",
] as const;
