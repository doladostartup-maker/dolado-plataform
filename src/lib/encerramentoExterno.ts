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
    "Existem entidades oficiais de Resolução Alternativa de Litígios de Consumo, como os centros de arbitragem de conflitos de consumo, que prestam informação e podem tratar conflitos entre consumidores e empresas através de mediação, conciliação ou arbitragem, nos termos da competência e das regras de cada entidade.",
  rotuloLista: "Centros a consultar",
  rotuloSetoriais: "Entidades setoriais a consultar",
  notaLista:
    "Lista meramente informativa, baseada na informação pública da Direção-Geral do Consumidor. Não constitui indicação da entidade competente para o seu caso. A competência pode depender, entre outros aspetos, do setor, do valor, do local do contrato, da adesão das partes e das regras da entidade.",
  limites:
    "A DoLado não representa o consumidor em processos de mediação, conciliação ou arbitragem, não apresenta pedidos em seu nome, não determina nem indica qual é a entidade competente para este caso e não presta aconselhamento jurídico. Confirme diretamente junto da entidade se pode apreciar o conflito.",
  ligacaoOficial: "Ver a lista oficial completa das entidades RAL (Direção-Geral do Consumidor)",
} as const;

/** Secção final do dossiê em PDF. */
export const OPCOES_CONFLITO = {
  titulo: "Opções para continuar a tratar o conflito",
  paragrafos: [
    "Este dossiê reúne informação e documentos registados durante o acompanhamento do caso pela DoLado.",
    "Se pretender prosseguir por sua iniciativa, poderá consultar as entidades oficiais de Resolução Alternativa de Litígios de Consumo e as respetivas regras.",
    "A lista incluída é meramente informativa e não identifica a entidade competente para este caso. O âmbito e a admissibilidade dependem das regras de cada entidade; confirme diretamente com a entidade escolhida, incluindo se é necessário contactar previamente a empresa reclamada.",
    "A DoLado não representa o consumidor em processos de mediação, conciliação ou arbitragem, não apresenta pedidos em seu nome, não determina nem indica qual é a entidade competente para este caso e não presta aconselhamento jurídico.",
  ],
} as const;

/** "Centros a consultar": só os centros de arbitragem de competência genérica. */
export const CENTROS_RAL_GERAIS: readonly EntidadeRal[] = ENTIDADES_RAL.filter((e) => e.tipo === "geral");
/** Entidades setoriais ("Centros de Arbitragem para Conflitos Específicos" na lista da DGC), em secção separada. */
export const ENTIDADES_RAL_SETORIAIS: readonly EntidadeRal[] = ENTIDADES_RAL.filter((e) => e.tipo === "setorial");
export { LISTA_OFICIAL_RAL_URL };

/** Estado final descrito no dossiê. */
export const ESTADO_FINAL_DOSSIE =
  "Na data de geração deste dossiê, o acompanhamento do caso consta como encerrado na DoLado. Este estado refere-se apenas ao serviço prestado pela DoLado; não constitui uma decisão sobre o conflito nem confirma que o problema esteja resolvido.";
