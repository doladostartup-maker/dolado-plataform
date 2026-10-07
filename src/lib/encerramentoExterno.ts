// Encerramento do caso com encaminhamento externo: textos mostrados ao
// cliente (portal, dossiê, e-mail). Sem efeitos nem imports de runtime além
// de constantes — usado no browser, no servidor e nos testes (`node --test`).
// As regras (estado, bloqueio de novas ações, versões do dossiê) estão na
// base de dados: supabase/migrations/20261007100000_encerramento_encaminhamento_externo.sql.
//
// Limites do serviço (nunca contrariar nestes textos): a DoLado não representa
// o cliente perante centros de arbitragem, não apresenta pedidos em nome dele,
// não emite parecer jurídico e não determina a entidade competente. Pode
// organizar o histórico, entregar documentos e apresentar informação pública
// sobre as entidades oficiais. Nunca escrever "o centro competente é…".

import { ENTIDADES_RAL, LISTA_OFICIAL_RAL_URL, type EntidadeRal } from "./legal.ts";

/** Valor de casos.status (igual à base de dados). */
export const ESTADO_ENCERRADO_EXTERNO = "Encerrado com encaminhamento externo";

export const ROTULO_ENCERRADO_EXTERNO = "Encerrado na DoLado";

/** Ponto de situação no portal. */
export const MENSAGEM_ENCERRADO_EXTERNO = [
  "A DoLado terminou o acompanhamento deste caso. Isto não significa necessariamente que o problema esteja resolvido.",
  "Preparámos o seu dossiê com o histórico e os documentos do caso. Se pretender continuar, poderá consultar uma entidade oficial de Resolução Alternativa de Litígios de Consumo.",
] as const;

export const BOTAO_DESCARREGAR_DOSSIE = "Descarregar dossiê";
export const BOTAO_CONSULTAR_ENTIDADES = "Consultar entidades de resolução de conflitos";

/** Secção do portal sobre as entidades RAL. */
export const SECCAO_ENTIDADES = {
  titulo: "Continuar através de uma entidade de resolução de conflitos",
  introducao:
    "Existem entidades oficiais de Resolução Alternativa de Litígios de Consumo, como os centros de arbitragem de conflitos de consumo, que podem ajudar a resolver um conflito entre um consumidor e uma empresa através de informação, mediação, conciliação ou arbitragem.",
  rotuloLista: "Centros a consultar",
  notaLista:
    "Centros de arbitragem de conflitos de consumo de competência genérica, segundo a informação pública da Direção-Geral do Consumidor. A área indicada é a que cada centro divulga; existem também entidades especializadas em alguns setores.",
  limites:
    "A DoLado não representa o consumidor em processos de mediação, conciliação ou arbitragem, nem apresenta pedidos em seu nome. A competência para apreciar o conflito deve ser confirmada diretamente junto da entidade escolhida.",
  ligacaoOficial: "Ver a lista oficial completa das entidades RAL (Direção-Geral do Consumidor)",
} as const;

/** Secção final do dossiê em PDF. */
export const OPCOES_CONFLITO = {
  titulo: "Opções para continuar a tratar o conflito",
  paragrafos: [
    "Este dossiê reúne a informação e documentação tratadas pela DoLado durante o acompanhamento do seu caso.",
    "A DoLado terminou o acompanhamento deste processo. Caso pretenda continuar a tentar resolver o conflito, poderá contactar uma entidade oficial de Resolução Alternativa de Litígios de Consumo.",
    "A DoLado não representa o consumidor em processos de mediação, conciliação ou arbitragem. A competência para apreciar o conflito deve ser confirmada diretamente junto da entidade escolhida.",
  ],
} as const;

export const ENTIDADES_A_CONSULTAR: readonly EntidadeRal[] = ENTIDADES_RAL;
export { LISTA_OFICIAL_RAL_URL };

/** Estado final descrito no dossiê. */
export const ESTADO_FINAL_DOSSIE =
  "Encerrado na DoLado. A DoLado terminou o acompanhamento deste caso depois de realizar as ações previstas no seu serviço. O encerramento não significa que o problema esteja resolvido.";
