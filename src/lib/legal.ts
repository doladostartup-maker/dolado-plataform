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
// Termos e Política 2026-10-08: decisões jurídicas aprovadas pela advogada,
// conforme confirmação de Thiago a 08/10/2026
// (docs/legal/decisoes-juridicas-e-ropa-2026-10-08.md). Nenhuma regra de código
// decide reembolsos ou a perda do direito de livre resolução com base nestes
// consentimentos — isso é sempre decidido caso a caso.

// Extensão .ts explícita: o módulo é importado diretamente por `node --test`.
import type { PlanoId } from "./planos.ts";
import { CONTACTO_EMAIL, ENTIDADE_LEGAL, MARKETING_SITE_URL, MORADA_SEDE, NIPC, PRIVACIDADE_EMAIL } from "./site.ts";

// Identificador de versão = data AAAA-MM-DD; uma segunda versão publicada no
// mesmo dia leva um sufixo de letra ("2026-10-01b").

/** Versão dos Termos e Condições em vigor. Cada versão fica acessível em /termos/<versão>. */
// 2026-10-20 (Termos e Política): Programa de Parceiros — Protecção oferecida
// por um parceiro e Parceiros de Indicação. Regras e texto validados pela
// advogada (confirmado por Thiago a 20/10/2026).
// 2026-10-22 (Termos): secção 24 — área de parceiro (só números totais).
// Validado pela advogada (confirmado por Thiago a 21/10/2026).
export const TERMOS_VERSAO = "2026-10-22";

// 2026-10-22b (Política): área de parceiro — validada pela advogada
// (confirmado por Thiago a 21/10/2026).
// 2026-10-22c (Política): diagnóstico gratuito sem registo — aprovada pela
// advogada (confirmado por Thiago a 22/10/2026).
// 2026-10-22d (Política): chat em directo (Crisp) — aprovada pela advogada
// (confirmado por Thiago a 22/10/2026); DPA do Crisp obtido e cookies
// declarados no Cookiebot.
/** Versão da Política de Privacidade em vigor. Cada versão fica acessível em /privacidade/<versão>. */
export const PRIVACIDADE_VERSAO = "2026-10-22d";

/** Versão do texto de pedido expresso de início imediato. */
export const CONSENTIMENTO_INICIO_IMEDIATO_VERSAO = "2026-10-01";

/**
 * Autorização opcional para e-mails da DoLado com novidades e ofertas
 * (caixa do formulário "Tratar o meu caso"). O texto exato e a versão ficam
 * gravados com a autorização (consentimentos_comunicacoes). Mudar o texto =
 * nova versão. Cada e-mail enviado com base nela tem de permitir retirá-la.
 */
// 2026-10-19: só ortografia ("Protecção"); a 2026-10-02 dizia "Proteção".
export const CONSENTIMENTO_COMUNICACOES_VERSAO = "2026-10-19";
export const TEXTO_CONSENTIMENTO_COMUNICACOES =
  "Opcional: aceito receber e-mails da DoLado com novidades e ofertas, como a Protecção (alertas de fim de fidelização e de promoção). Pode cancelar a qualquer momento.";

/**
 * Autorização opcional para comunicações comerciais pedida na página do guia
 * gratuito (/guia-facturas), sem conta. Desmarcada por omissão e nunca
 * condição do download. O texto exacto e a versão ficam gravados em
 * consentimentos_comunicacoes_sem_conta. Mudar o texto = nova versão. Antes
 * do primeiro envio comercial: confirmação do endereço e forma de deixar de
 * receber em cada e-mail.
 */
export const CONSENTIMENTO_COMUNICACOES_GUIA_VERSAO = "2026-10-22";
export const TEXTO_CONSENTIMENTO_COMUNICACOES_GUIA = "Quero receber dicas, novidades e comunicações da DoLado por e-mail.";

/**
 * Aviso do artigo 14.º do RGPD enviado no primeiro contacto a uma pessoa
 * indicada por um parceiro (oportunidades B2B; Política 2026-10-20, secções
 * 3 e 8). Só em português (contacto comercial em Portugal). O texto exacto e
 * a versão ficam gravados em parceiros_oportunidades_avisos. Mudar o texto =
 * nova versão. Texto por validar pela advogada (pendencias-juridicas.md).
 */
export const AVISO_PRIMEIRO_CONTACTO_VERSAO = "2026-10-20";

export function textoAvisoPrimeiroContacto(d: { parceiro: string; entidade: string }) {
  return {
    assunto: "O seu contacto foi indicado à DoLado por um parceiro",
    paragrafos: [
      `Escrevemos-lhe porque um parceiro da DoLado, ${d.parceiro}, nos indicou o seu contacto profissional como pessoa a contactar na ${d.entidade} sobre os serviços da DoLado para empresas.`,
      `Quem trata os seus dados: ${ENTIDADE_LEGAL} (DoLado), NIPC ${NIPC}, ${MORADA_SEDE}.`,
      "Que dados temos: o contacto profissional que nos foi indicado (por exemplo, nome, e-mail ou telefone) e a empresa onde trabalha.",
      "Para quê e com que fundamento: apenas para dar seguimento a esta oportunidade comercial entre empresas, com base no interesse legítimo da DoLado (artigo 6.º, n.º 1, alínea f), do Regulamento Geral sobre a Protecção de Dados).",
      "Por quanto tempo: enquanto a oportunidade estiver em curso e, depois, apenas enquanto for necessário para calcular e pagar a comissão do parceiro e para declarar, exercer ou defender direitos.",
      `Se não quiser ser contactado, basta responder a este e-mail ou escrever para ${PRIVACIDADE_EMAIL}: deixamos de usar o seu contacto.`,
      `Pode também pedir o acesso, a rectificação, o apagamento ou a limitação dos seus dados, pelo mesmo endereço, e apresentar reclamação à Comissão Nacional de Protecção de Dados (www.cnpd.pt). Mais informação na Política de Privacidade: ${MARKETING_SITE_URL}/privacidade.`,
    ],
  };
}

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

/**
 * Ativação da Proteção gratuita (30 dias): a mesma aceitação dos Termos e o
 * que o cliente declara compreender. O texto completo fica registado em
 * protecao_gratuita.texto_aceite, com a versão dos Termos. Mudar o texto não
 * altera os registos já gravados.
 */
export const ACEITACAO_PROTECAO_GRATUITA_COMPLEMENTO =
  " Compreendo que a Protecção gratuita termina ao fim de 30 dias sem qualquer cobrança.";
export const TEXTO_ACEITACAO_PROTECAO_GRATUITA = `${TEXTO_ACEITACAO_TERMOS}${ACEITACAO_PROTECAO_GRATUITA_COMPLEMENTO}`;

/**
 * Activação de uma Protecção oferecida por um Parceiro de Distribuição
 * (acesso patrocinado): a mesma aceitação dos Termos e o que o beneficiário
 * declara compreender. Fica registado em acessos_patrocinados.texto_aceite,
 * com a versão dos Termos. Descrito na secção 23 dos Termos 2026-10-20
 * (validados pela advogada a 20/10/2026); ligado por
 * ACESSOS_PATROCINADOS_ATIVO.
 */
export const ACEITACAO_ACESSO_PATROCINADO_COMPLEMENTO =
  " Compreendo que a Protecção oferecida termina automaticamente no fim do período indicado, sem qualquer cobrança, e que não inclui o tratamento de casos.";
export const TEXTO_ACEITACAO_ACESSO_PATROCINADO = `${TEXTO_ACEITACAO_TERMOS}${ACEITACAO_ACESSO_PATROCINADO_COMPLEMENTO}`;

/**
 * Candidatura ao Programa de Parceiros (/parceiros): o candidato aceita o
 * tratamento dos dados da candidatura. Texto e versão gravados em
 * parceiros_candidaturas (prova). Mudar o texto = nova versão. Descritas na
 * Política de Privacidade 2026-10-20 (secções 2, 3 e 6; validada pela
 * advogada a 20/10/2026); o programa é ligado por PARCEIROS_ATIVO.
 */
export const CANDIDATURA_PARCEIROS_VERSAO = "2026-10-21";
export const TEXTO_ACEITACAO_CANDIDATURA_PARCEIROS =
  "Li a informação sobre privacidade e aceito que a DoLado use estes dados para analisar a minha candidatura e entrar em contacto comigo sobre ela.";

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
  "Pela presente comunico que resolvo o meu contrato de prestação do seguinte serviço: [plano Protecção / Caso + Protecção / Avulso]",
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

/** Lista oficial e atualizada das entidades RAL (Direção-Geral do Consumidor). */
export const LISTA_OFICIAL_RAL_URL =
  "https://www.consumidor.gov.pt/ral-mapa-e-lista-de-entidades";

export type EntidadeRal = { nome: string; site: string; tipo: "geral" | "setorial" };

/**
 * Entidades RAL da lista oficial da DGC (LISTA_OFICIAL_RAL_URL), confrontada a
 * 08/10/2026: nomes como na lista; "geral" = centros de arbitragem de
 * conflitos de consumo de competência genérica; "setorial" = "Centros de
 * Arbitragem para Conflitos Específicos" (seguros, agências de viagens).
 * Sites verificados a 08/10/2026: os endereços da lista da DGC redirecionam
 * para estes (centrodearbitragemdecoimbra.com → cacrc.pt, arbitragem.autonoma.pt
 * → arbitragem.grupoautonoma.pt, provedorapavt.com → provedor.apavtnet.pt).
 * Lista informativa, sem descrições de âmbito ou indicação da entidade
 * competente para um caso. Consultar a lista oficial da DGC e cada entidade.
 */
export const ENTIDADES_RAL: readonly EntidadeRal[] = [
  {
    nome: "Centro Nacional de Informação e Arbitragem de Conflitos de Consumo (CNIACC)",
    site: "https://www.cniacc.pt",
    tipo: "geral",
  },
  {
    nome: "Centro de Arbitragem de Conflitos de Consumo da Região de Coimbra (CACRC)",
    site: "https://www.cacrc.pt",
    tipo: "geral",
  },
  {
    nome: "Centro de Arbitragem de Conflitos de Consumo de Lisboa (CACCL)",
    site: "https://www.centroarbitragemlisboa.pt",
    tipo: "geral",
  },
  {
    nome: "Centro de Arbitragem da Universidade Autónoma de Lisboa (CAUAL)",
    site: "https://arbitragem.grupoautonoma.pt",
    tipo: "geral",
  },
  {
    nome: "Centro de Arbitragem de Conflitos de Consumo da Região Autónoma da Madeira (CACC RAM)",
    site: "https://www.madeira.gov.pt/cacc",
    tipo: "geral",
  },
  {
    nome: "Centro de Informação, Mediação e Arbitragem de Consumo da Região Açores (CIMARA)",
    site: "https://ocimara.pt",
    tipo: "geral",
  },
  {
    nome: "Centro de Informação de Consumo e Arbitragem do Porto (CICAP)",
    site: "https://www.cicap.pt",
    tipo: "geral",
  },
  {
    nome: "Centro de Arbitragem de Conflitos de Consumo do Ave, Tâmega e Sousa (TRIAVE)",
    site: "https://www.triave.pt",
    tipo: "geral",
  },
  {
    nome: "Centro de Informação, Mediação e Arbitragem de Consumo (Tribunal Arbitral de Consumo) (CIAB)",
    site: "https://www.ciab.pt",
    tipo: "geral",
  },
  {
    nome: "Centro de Informação, Mediação e Arbitragem do Algarve (CIMAAL)",
    site: "https://www.consumidoronline.pt",
    tipo: "geral",
  },
  {
    nome: "Centro de Informação, Mediação e Arbitragem de Seguros (CIMPAS)",
    site: "https://www.cimpas.pt",
    tipo: "setorial",
  },
  {
    nome: "Provedor do Cliente das Agências de Viagens e Turismo (Provedor da APAVT)",
    site: "https://provedor.apavtnet.pt",
    tipo: "setorial",
  },
];
