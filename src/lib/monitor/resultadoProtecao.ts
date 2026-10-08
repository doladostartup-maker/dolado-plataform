// DoLado — resultado da Proteção apresentado ao cliente (sem I/O; `npm test`).
//
// "Primeiro verificamos a sua situação atual. Depois continuamos atentos por
// si." A partir dos dados que o Monitor já guarda (condições confirmadas,
// faturas, eventos da comparação, situações comunicadas, documentos e avisos
// enviados), responde às perguntas do cliente:
//   1. Há alguma coisa que precise da minha atenção?  → estado, situações
//   2. O que é que a DoLado já fez por mim?            → verificações, histórico
//   3. O que é que a DoLado está a acompanhar?         → atentos, próxima data
//
// Regras:
//   * Nunca inventar: cada linha corresponde a um dado guardado ou a uma
//     verificação que o código fez de facto (acompanhamento.ts). Sem dado,
//     a linha não aparece.
//   * Uma alteração ainda por rever aparece só como "em verificação" (os
//     eventos "atencao" só são visíveis depois de comunicados — RLS) e,
//     enquanto existir, nunca se afirma "não encontrámos".
//   * Sem contrato nunca "contratado". Nunca uma conclusão sobre a lei: as
//     situações mostradas foram revistas por uma pessoa da DoLado.
//   * "Está tudo certo" é um resultado válido do trabalho da DoLado.

import { componentesFatura, dataReferencia, fraseEvento, mesAnoTexto, ordenarFaturas, type FaturaComparavel, type TipoEvento } from "./acompanhamento.ts";
import { diasAte, formatarEurosCents, proximaData, type ProximaData } from "./contratos.ts";
import { emCurso } from "./processamento.ts";

/** Uma situação comunicada continua em destaque durante este tempo (ou enquanto for da última fatura). */
export const ACHADO_ATIVO_DIAS = 60;

// ---------------------------------------------------------------------------
// Entrada (lida com a sessão do cliente — RLS)
// ---------------------------------------------------------------------------

export type FaturaServico = FaturaComparavel & { emVerificacao: boolean; registadaEm: string };

export type EventoVisivel = {
  faturaId: string | null;
  tipo: string;
  base: string;
  severidade: "ok" | "info" | "atencao";
  montanteCents: number | null;
  dados: Record<string, unknown>;
  achadoId: string | null;
  criadoEm: string;
};

export type AchadoComunicado = { id: string; faturaId: string | null; tipo: string; texto: string; comunicadoEm: string };

export type DocumentoServico = { id: string; tipo: string; estado: string; etapa: string | null; etapaEm: string | null; criadoEm: string };

export type AlertaEnviado = { regra: string; dataAlvo: string; enviadoEm: string };

export type CondicaoAtual = { valor: unknown; origem: string };

export type EntradaServico = {
  id: string;
  /** Nome comercial do fornecedor (ou descrição do serviço). */
  nome: string;
  setor: string;
  terminado: boolean;
  /** Valores atuais (contratos_campos, estado "atual"), por campo. */
  campos: Partial<Record<string, CondicaoAtual>>;
  /** Versão do contrato em vigor (contratos_versoes). */
  mensalidadeContratadaCents: number | null;
  descontoContratadoCents: number | null;
  /** Campos lidos à espera da confirmação do cliente. */
  porConfirmar: { campos: string[]; doContrato: boolean };
  faturas: FaturaServico[];
  /** Eventos visíveis ao cliente (não substituídos). */
  eventos: EventoVisivel[];
  /** Situações já revistas e comunicadas pela DoLado. */
  achados: AchadoComunicado[];
  documentos: DocumentoServico[];
  alertas: AlertaEnviado[];
};

// ---------------------------------------------------------------------------
// Saída
// ---------------------------------------------------------------------------

export type EstadoResultado =
  | "encontramos" // situação revista e comunicada: elemento principal
  | "por_confirmar" // contrato lido: condições à espera da confirmação
  | "em_verificacao" // alteração detetada, a ser revista pela DoLado
  | "verificado" // tudo certo (ou informação útil, sem problemas)
  | "a_rever" // documento que a DoLado vai verificar à mão
  | "em_analise" // primeiro documento a ser lido
  | "sem_dados";

/** Prioridade para o resultado geral (menor = mais importante). */
export const PRIORIDADE_ESTADO: Record<EstadoResultado, number> = {
  encontramos: 0,
  por_confirmar: 1,
  em_verificacao: 2,
  verificado: 3,
  a_rever: 4,
  em_analise: 5,
  sem_dados: 6,
};

export type Verificacao = { rotulo: string; valor: string; detalhe?: string };
export type Atento = { texto: string; data?: string };
export type ValorComparado = { rotulo: string; valor: string };

export type Situacao = {
  id: string;
  servicoId: string;
  servicoNome: string;
  /** Frase factual gerada dos dados da comparação (sem conclusões). */
  resumo: string | null;
  /** Forma curta para o histórico ("um aumento de 6,40 € na mensalidade"). */
  curto: string;
  /** Texto revisto e escrito pela DoLado. */
  texto: string;
  valores: { antes: ValorComparado; agora: ValorComparado; diferenca?: ValorComparado } | null;
  /** O que costuma explicar este tipo de alteração (informação geral). */
  causas: string | null;
  comunicadoEm: string;
  /** Pré-preenchimento de "Tratar o meu caso" (lista de src/lib/pedidoCaso.ts). */
  problema: string | null;
};

export type ItemHistorico = {
  data: string;
  texto: string;
  tom: "ok" | "info" | "atencao";
  tipo: "fatura" | "situacao" | "contrato" | "aviso";
  servicoId: string;
  servicoNome: string;
};

export type ResultadoServico = {
  id: string;
  nome: string;
  setor: string;
  estado: EstadoResultado;
  titulo: string;
  /** Frase curta de conclusão (ex.: "Está tudo certo por agora."). */
  conclusao: string | null;
  texto: string;
  /** Primeira verificação do serviço (só um documento verificado). */
  primeira: boolean;
  temContrato: boolean;
  ultimaVerificacao: string | null;
  /** "a fatura de outubro de 2026", "o contrato". */
  documentoVerificado: string | null;
  verificacoes: Verificacao[];
  /** Resumo de "Encontrámos". null = ainda não há resultado. */
  encontramos: string | null;
  situacoes: Situacao[];
  atentos: Atento[];
  proxima: ProximaData;
  /** O que ainda não conseguimos confirmar (só quando é relevante). */
  lacunas: string[];
  /** O que acontece a seguir. */
  seguinte: string | null;
  /** Há dados lidos à espera da confirmação do cliente. */
  confirmar: boolean;
  historico: ItemHistorico[];
};

// ---------------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------------

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTOS = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

/** Dia (AAAA-MM-DD) em Lisboa de uma data ou de um timestamp. */
export function diaLisboa(valor: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(d);
}

/** "4 de outubro de 2026" (sem o ano quando é o ano de `hoje`). */
export function dataExtenso(valor: string | null | undefined, hoje?: string): string {
  if (!valor) return "";
  const dia = diaLisboa(valor);
  const mes = MESES[Number(dia.slice(5, 7)) - 1];
  if (!mes) return "";
  const base = `${Number(dia.slice(8, 10))} de ${mes}`;
  return hoje && hoje.slice(0, 4) === dia.slice(0, 4) ? base : `${base} de ${dia.slice(0, 4)}`;
}

/** "4 out." (com o ano quando não é o de `hoje`). */
export function dataCurta(valor: string, hoje?: string): string {
  const dia = diaLisboa(valor);
  const mes = MESES_CURTOS[Number(dia.slice(5, 7)) - 1] ?? "";
  const base = `${Number(dia.slice(8, 10))} ${mes}`;
  return hoje && hoje.slice(0, 4) !== dia.slice(0, 4) ? `${base} ${dia.slice(0, 4)}` : base;
}

const eur = (c: unknown) => formatarEurosCents(typeof c === "number" ? c : null);
const num = (v: unknown) => (typeof v === "number" ? v : null);
const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const maisRecente = (datas: (string | null | undefined)[]) =>
  datas.filter((d): d is string => !!d).sort((a, b) => (new Date(a).getTime() < new Date(b).getTime() ? 1 : -1))[0] ?? null;

// ---------------------------------------------------------------------------
// Situações comunicadas
// ---------------------------------------------------------------------------

const CAUSAS: Record<string, string> = {
  aumento:
    "Um aumento da mensalidade pode resultar, por exemplo, do fim de uma promoção, de uma atualização de preços comunicada pelo fornecedor ou de um serviço acrescentado. Nem sempre é um erro, mas vale a pena confirmar.",
  desconto:
    "Um desconto pode deixar de aparecer quando a promoção chega ao fim, quando as condições são alteradas ou por um erro de faturação.",
  cobranca_nova:
    "Uma cobrança nova pode corresponder a um serviço ou equipamento acrescentado, a uma alteração do tarifário ou a um serviço que não pediu.",
  duplicado:
    "Duas cobranças iguais podem corresponder a dois serviços distintos com o mesmo nome ou a uma cobrança repetida por engano.",
  fidelizacao:
    "As datas podem diferir por causa de uma refidelização, de uma alteração do contrato ou de um erro num dos documentos.",
  cessacao:
    "O valor indicado pelo fornecedor pode incluir encargos que a nossa estimativa não considera, como equipamento, ou ser calculado de outra forma.",
};

export function situacaoDe(a: AchadoComunicado, eventos: EventoVisivel[], servico: { id: string; nome: string }): Situacao {
  const e = eventos.find((x) => x.achadoId === a.id) ?? null;
  const d = e?.dados ?? {};
  const base: Situacao = {
    id: a.id,
    servicoId: servico.id,
    servicoNome: servico.nome,
    resumo: null,
    curto: "uma situação que merece a sua atenção",
    texto: a.texto,
    valores: null,
    causas: null,
    comunicadoEm: a.comunicadoEm,
    problema: null,
  };
  const tipo = (e?.tipo ?? a.tipo) as TipoEvento | "cessacao_divergente";

  switch (tipo) {
    case "mensalidade_alterada": {
      const antes = num(d.anterior);
      const agora = num(d.atual);
      if (antes == null || agora == null) return { ...base, causas: CAUSAS.aumento, problema: "Aumento de mensalidade" };
      const dif = agora - antes;
      return {
        ...base,
        resumo:
          dif > 0
            ? `A sua mensalidade aumentou ${eur(dif)} relativamente ao valor que estávamos a acompanhar.`
            : `A sua mensalidade diminuiu ${eur(-dif)} relativamente ao valor que estávamos a acompanhar.`,
        valores: {
          antes: { rotulo: "Antes", valor: eur(antes) },
          agora: { rotulo: "Agora", valor: eur(agora) },
          diferenca: { rotulo: "Diferença", valor: `${dif > 0 ? "+" : "−"}${eur(Math.abs(dif))}/mês` },
        },
        causas: dif > 0 ? CAUSAS.aumento : null,
        problema: dif > 0 ? "Aumento de mensalidade" : null,
        curto: dif > 0 ? `um aumento de ${eur(dif)} na mensalidade` : `uma descida de ${eur(-dif)} na mensalidade`,
      };
    }
    case "diferenca_preco_contrato": {
      const esperada = num(d.esperada);
      const cobrada = num(d.mensalidade);
      if (esperada == null || cobrada == null) return { ...base, causas: CAUSAS.aumento, problema: "Aumento de mensalidade" };
      const dif = cobrada - esperada;
      return {
        ...base,
        resumo: `A mensalidade cobrada está ${eur(Math.abs(dif))} ${dif > 0 ? "acima" : "abaixo"} do valor do seu contrato.`,
        valores: {
          antes: { rotulo: "No contrato", valor: eur(esperada) },
          agora: { rotulo: "Cobrado", valor: eur(cobrada) },
          diferenca: { rotulo: "Diferença", valor: `${dif > 0 ? "+" : "−"}${eur(Math.abs(dif))}/mês` },
        },
        causas: dif > 0 ? CAUSAS.aumento : null,
        problema: dif > 0 ? "Aumento de mensalidade" : null,
        curto: `uma diferença de ${eur(Math.abs(dif))} face à mensalidade do contrato`,
      };
    }
    case "promocao_em_falta": {
      const desconto = num(d.desconto) ?? e?.montanteCents ?? null;
      if (desconto == null) return { ...base, causas: CAUSAS.desconto, problema: "Aumento de mensalidade" };
      return {
        ...base,
        resumo:
          e?.base === "contrato"
            ? `O desconto de ${eur(desconto)} previsto no seu contrato não aparece na fatura.`
            : `O desconto de ${eur(desconto)} que aparecia na fatura anterior deixou de aparecer.`,
        valores: {
          antes: { rotulo: e?.base === "contrato" ? "Desconto previsto" : "Desconto antes", valor: eur(desconto) },
          agora: { rotulo: "Desconto agora", valor: eur(0) },
          diferenca: { rotulo: "Diferença", valor: `+${eur(desconto)}/mês` },
        },
        causas: CAUSAS.desconto,
        problema: "Aumento de mensalidade",
        curto: `que o desconto de ${eur(desconto)} deixou de aparecer`,
      };
    }
    case "promocao_alterada": {
      const antes = num(d.anterior);
      const agora = num(d.atual);
      if (antes == null || agora == null) return { ...base, causas: CAUSAS.desconto };
      const dif = antes - agora;
      return {
        ...base,
        resumo: `O desconto passou de ${eur(antes)} para ${eur(agora)}.`,
        valores: {
          antes: { rotulo: "Desconto antes", valor: eur(antes) },
          agora: { rotulo: "Desconto agora", valor: eur(agora) },
          diferenca: { rotulo: "Diferença", valor: `${dif > 0 ? "+" : "−"}${eur(Math.abs(dif))}/mês` },
        },
        causas: CAUSAS.desconto,
        problema: dif > 0 ? "Aumento de mensalidade" : null,
        curto: "uma alteração do desconto",
      };
    }
    case "cobranca_recorrente_nova":
      return {
        ...base,
        resumo: e ? fraseEvento({ tipo: "cobranca_recorrente_nova", base: "historico", montanteCents: e.montanteCents, dados: d }) : null,
        causas: CAUSAS.cobranca_nova,
        curto: e?.montanteCents != null ? `uma cobrança nova de ${eur(e.montanteCents)}` : "uma cobrança nova",
      };
    case "possivel_duplicado":
      return {
        ...base,
        resumo: e ? fraseEvento({ tipo: "possivel_duplicado", base: "historico", montanteCents: e.montanteCents, dados: d }) : null,
        causas: CAUSAS.duplicado,
        curto: "uma possível cobrança em duplicado",
      };
    case "fidelizacao_diferente": {
      const contrato = texto(d.contrato);
      const fatura = texto(d.fatura);
      return {
        ...base,
        resumo: contrato && fatura ? "A data de fim da fidelização indicada na fatura é diferente da que está no contrato." : null,
        valores:
          contrato && fatura
            ? { antes: { rotulo: "No contrato", valor: dataExtenso(contrato) }, agora: { rotulo: "Na fatura", valor: dataExtenso(fatura) } }
            : null,
        causas: CAUSAS.fidelizacao,
        problema: "Fidelização ou penalização",
        curto: "uma diferença na data de fim da fidelização",
      };
    }
    case "cessacao_divergente":
      return { ...base, causas: CAUSAS.cessacao, problema: "Fidelização ou penalização", curto: "uma diferença no valor indicado para terminar o contrato" };
    default:
      return base;
  }
}

// ---------------------------------------------------------------------------
// Resultado de um serviço
// ---------------------------------------------------------------------------

// Campos que fazem do serviço um serviço "com contrato" (condições que não
// vêm de uma fatura).
const CAMPOS_CONDICOES = [
  "servico",
  "mensalidade_cents",
  "servicos_incluidos",
  "descricao_promocao",
  "desconto_promocao_cents",
  "data_inicio_promocao",
  "data_fim_promocao",
  "data_assinatura",
  "data_ativacao",
  "data_inicio",
  "duracao_fidelizacao_meses",
  "data_fim_fidelizacao",
  "vantagem_cents",
  "tipo_fidelizacao",
];

const ORIGEM_DATA: Record<string, string> = {
  contrato: "Indicado no contrato",
  cliente: "Indicado por si",
  admin: "Confirmado pela DoLado",
  calculado: "Calculado a partir do início e da duração da fidelização",
  fatura: "Indicado na fatura",
};

const REGRA_ALERTA: Record<string, "fidelizacao" | "promocao"> = {
  fidelizacao_60d: "fidelizacao",
  fidelizacao_30d: "fidelizacao",
  fidelizacao_fim: "fidelizacao",
  promocao_60d: "promocao",
  promocao_30d: "promocao",
  promocao_fim: "promocao",
};

export function dataCampo(c: CondicaoAtual | undefined): string | null {
  return c && typeof c.valor === "string" && /^\d{4}-\d{2}-\d{2}/.test(c.valor) ? c.valor.slice(0, 10) : null;
}

export function resultadoServico(s: EntradaServico, hoje: string): ResultadoServico {
  const ordenadas = ordenarFaturas(s.faturas);
  const ultima = ordenadas.at(-1) ?? null;
  const c = ultima ? componentesFatura(ultima) : null;
  const eventosUltima = ultima ? s.eventos.filter((e) => e.faturaId === ultima.id) : [];
  const temEvento = (tipo: string) => eventosUltima.some((e) => e.tipo === tipo);
  const emVerificacao = s.faturas.some((f) => f.emVerificacao);
  const ultimaEmVerificacao = !!ultima?.emVerificacao;

  const condicao = (campo: string) => {
    const x = s.campos[campo];
    return x && x.origem !== "fatura" ? x : undefined;
  };
  const temContrato = s.mensalidadeContratadaCents != null || CAMPOS_CONDICOES.some((campo) => condicao(campo));
  const docsContratoLidos = s.documentos.filter((d) => d.tipo === "contrato" && d.estado === "processado");
  const fimPromocao = dataCampo(s.campos.data_fim_promocao);
  const fimFidelizacao = dataCampo(s.campos.data_fim_fidelizacao);
  const proxima = proximaData({ data_fim_fidelizacao: fimFidelizacao, data_fim_promocao: fimPromocao }, hoje);
  const mesUltima = ultima ? mesAnoTexto(dataReferencia(ultima)) : null;

  // ---- Situações comunicadas ainda em destaque ----------------------------
  const situacoes = s.achados
    .filter((a) => (ultima && a.faturaId === ultima.id) || diasAte(diaLisboa(a.comunicadoEm), hoje) >= -ACHADO_ATIVO_DIAS)
    .sort((a, b) => (a.comunicadoEm < b.comunicadoEm ? 1 : -1))
    .map((a) => situacaoDe(a, s.eventos, s));

  // ---- O que verificámos -------------------------------------------------
  const verificacoes: Verificacao[] = [];
  const mensalidadeRef = temContrato && s.mensalidadeContratadaCents != null ? s.mensalidadeContratadaCents : c?.mensalidadeCents ?? null;
  if (temContrato && s.mensalidadeContratadaCents != null) {
    verificacoes.push({
      rotulo: "Mensalidade do contrato",
      valor: eur(s.mensalidadeContratadaCents),
      detalhe: temEvento("mensalidade_conforme") ? `A fatura de ${mesUltima} está de acordo com este valor.` : undefined,
    });
  } else if (c?.mensalidadeCents != null) {
    const alterada = eventosUltima.find((e) => e.tipo === "mensalidade_alterada");
    verificacoes.push({
      rotulo: "Mensalidade",
      valor: eur(c.mensalidadeCents),
      detalhe: alterada
        ? fraseEvento({ tipo: "mensalidade_alterada", base: "historico", montanteCents: alterada.montanteCents, dados: alterada.dados })
        : ordenadas.length === 1
          ? "Valor de referência para as próximas faturas."
          : temEvento("mensalidade_mantida")
            ? "Igual à fatura anterior."
            : undefined,
    });
  }
  const descontoContrato = temContrato && s.descontoContratadoCents ? s.descontoContratadoCents : 0;
  if (descontoContrato > 0) {
    verificacoes.push({
      rotulo: "Desconto da promoção",
      valor: `${eur(descontoContrato)}/mês`,
      detalhe: temEvento("promocao_aplicada") ? "Aplicado na última fatura." : undefined,
    });
  } else if (c && c.descontoCents > 0) {
    verificacoes.push({ rotulo: "Desconto", valor: `${eur(c.descontoCents)}/mês`, detalhe: `Identificado na fatura de ${mesUltima}.` });
  }
  if (fimPromocao) {
    verificacoes.push({ rotulo: "Fim da promoção", valor: dataExtenso(fimPromocao), detalhe: ORIGEM_DATA[s.campos.data_fim_promocao!.origem] });
  }
  if (fimFidelizacao) {
    verificacoes.push({
      rotulo: "Fim da fidelização",
      valor: dataExtenso(fimFidelizacao),
      detalhe: ORIGEM_DATA[s.campos.data_fim_fidelizacao!.origem],
    });
  }
  const servico = texto(condicao("servico")?.valor);
  if (servico) verificacoes.push({ rotulo: "Serviço", valor: servico });
  // Verificações sem resultado negativo só quando não há nada por rever.
  if (ultima && ultima.linhas.length > 0 && !ultimaEmVerificacao) {
    if (!temEvento("possivel_duplicado")) verificacoes.push({ rotulo: "Cobranças em duplicado", valor: "Nenhuma encontrada" });
    if (ordenadas.length >= 2 && !temEvento("cobranca_recorrente_nova")) {
      verificacoes.push({ rotulo: "Cobranças novas", valor: "Nenhuma face às faturas anteriores" });
    }
  }
  if (c && c.consumosCents > 0) verificacoes.push({ rotulo: "Consumo adicional", valor: eur(c.consumosCents), detalhe: `Na fatura de ${mesUltima}.` });
  if (c && c.pontuaisCents > 0) verificacoes.push({ rotulo: "Cobranças pontuais", valor: eur(c.pontuaisCents), detalhe: `Na fatura de ${mesUltima}.` });
  if (c && c.creditosCents > 0) verificacoes.push({ rotulo: "Crédito aplicado", valor: eur(c.creditosCents), detalhe: `Na fatura de ${mesUltima}.` });

  // ---- O que vamos acompanhar ---------------------------------------------
  const atentos: Atento[] = [];
  if (!s.terminado) {
    if (fimPromocao && diasAte(fimPromocao, hoje) >= 0) atentos.push({ texto: `Fim da promoção a ${dataExtenso(fimPromocao, hoje)}`, data: fimPromocao });
    if (fimFidelizacao && diasAte(fimFidelizacao, hoje) >= 0) {
      atentos.push({ texto: `Fim da fidelização a ${dataExtenso(fimFidelizacao, hoje)}`, data: fimFidelizacao });
    }
    if (mensalidadeRef != null) atentos.push({ texto: `Alterações à mensalidade de ${eur(mensalidadeRef)}` });
    const descontoAcompanhado = descontoContrato || (c?.descontoCents ?? 0);
    if (descontoAcompanhado > 0) atentos.push({ texto: `Que o desconto de ${eur(descontoAcompanhado)} continua a ser aplicado` });
    if (s.faturas.some((f) => f.linhas.length > 0)) atentos.push({ texto: "Cobranças novas ou repetidas nas próximas faturas" });
  }

  // ---- O que ainda não conseguimos confirmar ------------------------------
  const pendente = new Set(s.porConfirmar.campos);
  const lacunas: string[] = [];
  if (ultima && c?.mensalidadeCents == null && !temContrato) lacunas.push("Não conseguimos identificar a mensalidade na última fatura.");
  if (s.setor === "telecomunicacoes" && (ultima || temContrato) && !fimFidelizacao && !pendente.has("data_fim_fidelizacao")) {
    lacunas.push("Não conseguimos confirmar se este serviço tem fidelização, nem quando termina.");
  }
  if ((descontoContrato > 0 || (c?.descontoCents ?? 0) > 0) && !fimPromocao && !pendente.has("data_fim_promocao")) {
    lacunas.push("Não conseguimos confirmar até quando se aplica o desconto.");
  }

  // ---- Estado, título e texto ----------------------------------------------
  const verificado = ordenadas.length > 0 || temContrato;
  const docsEmCurso = s.documentos.filter((d) => emCurso(d.etapa));
  const docsARever = s.documentos.filter((d) => !emCurso(d.etapa) && (d.estado === "pendente" || d.estado === "a_rever"));
  const confirmar = s.porConfirmar.campos.length > 0;
  const primeira = ordenadas.length <= 1 && docsContratoLidos.length <= 1 && !(ordenadas.length === 1 && docsContratoLidos.length === 1);

  let estado: EstadoResultado;
  if (situacoes.length > 0) estado = "encontramos";
  else if (confirmar && s.porConfirmar.doContrato) estado = "por_confirmar";
  else if (emVerificacao) estado = "em_verificacao";
  else if (verificado) estado = "verificado";
  else if (docsARever.length > 0) estado = "a_rever";
  else if (docsEmCurso.length > 0) estado = "em_analise";
  else estado = "sem_dados";

  let titulo: string;
  let conclusao: string | null = null;
  let textoPrincipal: string;
  switch (estado) {
    case "encontramos":
      titulo = "Encontrámos algo que merece a sua atenção";
      textoPrincipal =
        situacoes.length === 1
          ? "A DoLado reviu esta situação antes de lha mostrar. Veja o que encontrámos e o que pode fazer."
          : `A DoLado reviu estas ${situacoes.length} situações antes de lhas mostrar. Veja o que encontrámos e o que pode fazer.`;
      break;
    case "por_confirmar":
      titulo = "Lemos o seu contrato";
      textoPrincipal =
        "Encontrámos as condições abaixo. Confirme-as para começarmos a acompanhá-las: só as usamos depois da sua confirmação.";
      break;
    case "em_verificacao": {
      const f = ordenadas.filter((x) => x.emVerificacao).at(-1);
      titulo = "Estamos a verificar uma alteração";
      textoPrincipal = `Encontrámos uma diferença na fatura de ${f ? mesAnoTexto(dataReferencia(f)) : mesUltima} e a DoLado está a revê-la. Se merecer a sua atenção, avisamo-lo por e-mail. Não precisa de fazer nada por agora.`;
      break;
    }
    case "verificado":
      if (ultima && c?.mensalidadeCents == null && !temContrato) {
        titulo = ordenadas.length === 1 ? "Já verificámos a sua primeira fatura" : "Verificámos a sua nova fatura";
        textoPrincipal =
          "Não conseguimos identificar a mensalidade nesta fatura, por isso ainda não a podemos usar como referência. Uma fatura mais recente ou o contrato ajudam-nos a acompanhar este serviço.";
      } else if (primeira) {
        conclusao = "Está tudo certo por agora.";
        if (ordenadas.length === 1) {
          titulo = "Já verificámos a sua primeira fatura";
          textoPrincipal = "Analisámos as condições relevantes do seu serviço e não encontrámos nada que exija a sua atenção neste momento.";
        } else if (docsContratoLidos.length > 0) {
          titulo = "Já verificámos o seu contrato";
          textoPrincipal = "Registámos as condições relevantes do seu contrato e não encontrámos nada que exija a sua atenção neste momento.";
        } else {
          titulo = "Registámos as condições que indicou";
          textoPrincipal = "Com estes dados já podemos acompanhar as datas importantes deste serviço.";
        }
      } else {
        titulo = "Continua tudo certo";
        textoPrincipal = ultima
          ? `Comparámos a fatura de ${mesUltima} com ${temContrato ? "as condições do contrato e com as faturas anteriores" : "as faturas anteriores"} e não encontrámos alterações relevantes.`
          : "Registámos as condições do seu contrato e não encontrámos nada que exija a sua atenção neste momento.";
      }
      break;
    case "a_rever":
      titulo = "Estamos a verificar o seu documento";
      textoPrincipal = "Não conseguimos ler tudo automaticamente. A DoLado vai verificá-lo e o resultado aparece aqui.";
      break;
    case "em_analise":
      titulo = "Estamos a verificar por si";
      textoPrincipal = "Estamos a analisar o documento e a identificar as condições que merecem acompanhamento.";
      break;
    default:
      titulo = "Ainda não verificámos este serviço";
      textoPrincipal = "Adicione uma fatura ou o contrato: verificamos a situação atual e, a partir daí, ficamos atentos por si.";
  }

  let seguinte: string | null = null;
  if (verificado && !s.terminado) {
    if (temContrato && ordenadas.length === 0) {
      seguinte = "Quando recebermos uma fatura, vamos comparar o que está a ser cobrado com estas condições.";
    } else if (!temContrato) {
      seguinte =
        ordenadas.length <= 1
          ? "Vamos usar esta fatura como referência para acompanhar alterações futuras. Se adicionar o contrato, passamos também a comparar o que é cobrado com o que foi contratado."
          : "Comparamos cada nova fatura com as anteriores. Se adicionar o contrato, passamos também a comparar o que é cobrado com o que foi contratado.";
    } else {
      seguinte = "A partir daqui, ficamos atentos por si. Vamos comparar as próximas faturas com o contrato e avisá-lo se alguma coisa mudar ou merecer a sua atenção.";
    }
  }

  let encontramos: string | null = null;
  if (situacoes.length > 0) encontramos = situacoes.length === 1 ? "1 situação que merece a sua atenção" : `${situacoes.length} situações que merecem a sua atenção`;
  else if (estado === "em_verificacao") encontramos = "Uma alteração em verificação pela DoLado";
  else if (estado === "por_confirmar") encontramos = "Condições por confirmar";
  else if (estado === "verificado") encontramos = "Nenhum problema neste momento";

  // ---- Última verificação ---------------------------------------------------
  const docsLidos = s.documentos.filter((d) => d.estado === "processado");
  const ultimaVerificacao = maisRecente([
    ...docsLidos.map((d) => d.etapaEm ?? d.criadoEm),
    ...s.faturas.map((f) => f.registadaEm),
    ...s.eventos.map((e) => e.criadoEm),
    // A revisão e comunicação de uma situação também é trabalho de verificação.
    ...s.achados.map((x) => x.comunicadoEm),
  ]);
  const ultimoContrato = maisRecente(docsContratoLidos.map((d) => d.criadoEm));
  const ultimaFaturaRegistada = maisRecente(s.faturas.map((f) => f.registadaEm));
  const documentoVerificado =
    ultimoContrato && (!ultimaFaturaRegistada || ultimoContrato > ultimaFaturaRegistada)
      ? "o contrato"
      : ultima
        ? `a fatura de ${mesUltima}`
        : null;

  return {
    id: s.id,
    nome: s.nome,
    setor: s.setor,
    estado,
    titulo,
    conclusao,
    texto: textoPrincipal,
    primeira: verificado && primeira,
    temContrato,
    ultimaVerificacao,
    documentoVerificado,
    verificacoes: verificado ? verificacoes : [],
    encontramos,
    situacoes,
    atentos: verificado ? atentos : [],
    proxima,
    lacunas: verificado ? lacunas : [],
    seguinte,
    confirmar,
    historico: historicoServico(s, ordenadas, situacoes, hoje),
  };
}

// ---------------------------------------------------------------------------
// O que já fizemos por si
// ---------------------------------------------------------------------------

function historicoServico(s: EntradaServico, ordenadas: FaturaServico[], situacoes: Situacao[], hoje: string): ItemHistorico[] {
  const itens: ItemHistorico[] = [];
  const item = (data: string, txt: string, tom: ItemHistorico["tom"], tipo: ItemHistorico["tipo"]) =>
    itens.push({ data, texto: txt, tom, tipo, servicoId: s.id, servicoNome: s.nome });
  const todas = s.achados.map((a) => situacoes.find((x) => x.id === a.id) ?? situacaoDe(a, s.eventos, s));

  ordenadas.forEach((f, i) => {
    const mes = mesAnoTexto(dataReferencia(f));
    const achado = todas.find((x) => s.achados.find((a) => a.id === x.id)?.faturaId === f.id);
    const semMensalidade = s.eventos.some((e) => e.faturaId === f.id && e.tipo === "dados_insuficientes");
    if (achado) {
      item(s.achados.find((a) => a.id === achado.id)!.comunicadoEm, `Detetámos ${achado.curto} na fatura de ${mes}.`, "atencao", "situacao");
      return;
    }
    const acao = i === 0 ? `Verificámos a primeira fatura (${mes})` : `Comparámos a fatura de ${mes}`;
    if (f.emVerificacao) item(f.registadaEm, `${acao} — estamos a verificar uma alteração.`, "info", "fatura");
    else if (semMensalidade) item(f.registadaEm, `${acao} — não conseguimos identificar a mensalidade.`, "info", "fatura");
    else item(f.registadaEm, `${acao} — ${i === 0 ? "tudo certo" : "sem alterações relevantes"}.`, "ok", "fatura");
  });

  // Situações sem fatura associada (ex.: valor de cessação).
  for (const a of s.achados.filter((x) => !x.faturaId || !ordenadas.some((f) => f.id === x.faturaId))) {
    const sit = todas.find((x) => x.id === a.id)!;
    item(a.comunicadoEm, `Detetámos ${sit.curto}.`, "atencao", "situacao");
  }

  for (const d of s.documentos.filter((x) => x.tipo === "contrato" && x.estado === "processado")) {
    item(d.criadoEm, "Lemos o contrato e identificámos as condições a acompanhar.", "ok", "contrato");
  }

  for (const a of s.alertas) {
    const sobre = REGRA_ALERTA[a.regra];
    if (!sobre) continue;
    item(a.enviadoEm, `Avisámo-lo por e-mail do fim da ${sobre === "fidelizacao" ? "fidelização" : "promoção"} (${dataExtenso(a.dataAlvo, hoje)}).`, "info", "aviso");
  }

  return itens.sort((a, b) => (new Date(a.data).getTime() < new Date(b.data).getTime() ? 1 : -1));
}

// ---------------------------------------------------------------------------
// Resultado geral (todos os serviços)
// ---------------------------------------------------------------------------

export type ResultadoGeral = {
  estado: EstadoResultado;
  titulo: string;
  conclusao: string | null;
  texto: string;
  ultimaVerificacao: string | null;
  /** Pontos verificados na última verificação de cada serviço. */
  pontos: number;
  servicosVerificados: number;
  encontramos: string | null;
  situacoes: Situacao[];
  atentos: (Atento & { servico: string })[];
  /** Com vários serviços: as datas acompanhadas (por ordem) e os serviços cujas faturas comparamos. */
  datasAcompanhadas: (Atento & { servico: string; data: string })[];
  faturasAcompanhadas: string[];
  proxima: { servico: string; servicoId: string; proxima: NonNullable<ProximaData> } | null;
  historico: ItemHistorico[];
};

export function resultadoGeral(servicos: ResultadoServico[]): ResultadoGeral {
  const ordenados = [...servicos].sort((a, b) => PRIORIDADE_ESTADO[a.estado] - PRIORIDADE_ESTADO[b.estado]);
  const principal = ordenados[0];
  const verificados = servicos.filter((s) => s.estado !== "em_analise" && s.estado !== "a_rever" && s.estado !== "sem_dados");
  const situacoes = servicos.flatMap((s) => s.situacoes).sort((a, b) => (a.comunicadoEm < b.comunicadoEm ? 1 : -1));
  const varios = servicos.length > 1;
  const proximas = servicos
    .filter((s) => s.proxima)
    .map((s) => ({ servico: s.nome, servicoId: s.id, proxima: s.proxima! }))
    .sort((a, b) => a.proxima.dias - b.proxima.dias);

  const base = {
    ultimaVerificacao: maisRecente(servicos.map((s) => s.ultimaVerificacao)),
    pontos: servicos.reduce((n, s) => n + s.verificacoes.length, 0),
    servicosVerificados: verificados.length,
    situacoes,
    atentos: servicos.flatMap((s) => s.atentos.map((a) => ({ ...a, servico: s.nome }))),
    datasAcompanhadas: servicos
      .flatMap((s) => s.atentos.filter((a): a is Atento & { data: string } => !!a.data).map((a) => ({ ...a, servico: s.nome })))
      .sort((a, b) => (a.data < b.data ? -1 : 1)),
    faturasAcompanhadas: servicos.filter((s) => s.atentos.some((a) => !a.data)).map((s) => s.nome),
    proxima: proximas[0] ?? null,
    historico: servicos.flatMap((s) => s.historico).sort((a, b) => (new Date(a.data).getTime() < new Date(b.data).getTime() ? 1 : -1)),
  };

  if (!principal) {
    return {
      ...base,
      estado: "sem_dados",
      titulo: "Comece pela sua situação atual",
      conclusao: null,
      texto: "Adicione uma fatura ou o contrato de um serviço. Verificamos a sua situação atual, mostramos-lhe o que encontrámos e, a partir daí, ficamos atentos por si.",
      encontramos: null,
    };
  }

  // Só um serviço: o resultado geral é o desse serviço.
  if (!varios) {
    return { ...base, estado: principal.estado, titulo: principal.titulo, conclusao: principal.conclusao, texto: principal.texto, encontramos: principal.encontramos };
  }

  const restantesBem = servicos.filter((s) => s.id !== principal.id).every((s) => s.estado === "verificado");
  const nota = restantesBem ? " Nos restantes serviços, está tudo certo." : "";
  switch (principal.estado) {
    case "encontramos":
      return {
        ...base,
        estado: "encontramos",
        titulo: "Encontrámos algo que merece a sua atenção",
        conclusao: null,
        texto: `${situacoes.length === 1 ? `Há uma situação no serviço ${principal.nome}` : `Há ${situacoes.length} situações nos seus serviços`} que a DoLado reviu antes de lha mostrar.${nota}`,
        encontramos: situacoes.length === 1 ? "1 situação que merece a sua atenção" : `${situacoes.length} situações que merecem a sua atenção`,
      };
    case "por_confirmar":
      return {
        ...base,
        estado: "por_confirmar",
        titulo: "Falta só a sua confirmação",
        conclusao: null,
        texto: `Lemos o contrato de ${principal.nome}. Confirme as condições que encontrámos para começarmos a acompanhá-las.${nota}`,
        encontramos: "Condições por confirmar",
      };
    case "em_verificacao":
      return {
        ...base,
        estado: "em_verificacao",
        titulo: "Estamos a verificar uma alteração",
        conclusao: null,
        texto: `Encontrámos uma diferença numa fatura de ${principal.nome} e a DoLado está a revê-la. Se merecer a sua atenção, avisamo-lo por e-mail.${nota}`,
        encontramos: "Uma alteração em verificação pela DoLado",
      };
    case "verificado":
      return {
        ...base,
        estado: "verificado",
        titulo: "Continua tudo certo",
        conclusao: null,
        texto: `Verificámos ${verificados.length === servicos.length ? `os seus ${servicos.length} serviços` : `${verificados.length} dos seus ${servicos.length} serviços`} e não encontrámos nada que exija a sua atenção neste momento.`,
        encontramos: "Nenhum problema neste momento",
      };
    default:
      return { ...base, estado: principal.estado, titulo: principal.titulo, conclusao: null, texto: principal.texto, encontramos: null };
  }
}
