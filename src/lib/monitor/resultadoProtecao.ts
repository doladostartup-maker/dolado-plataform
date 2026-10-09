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
import type { Idioma } from "../../i18n/config.ts";
import { tMonitor } from "../../i18n/mensagens/monitor.ts";

// Textos (pt-PT e en-GB): src/i18n/mensagens/*/monitor.ts. Todas as funções
// aceitam o idioma; por omissão português (e-mail mensal, backoffice, testes).

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


/** Dia (AAAA-MM-DD) em Lisboa de uma data ou de um timestamp. */
export function diaLisboa(valor: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(d);
}

/** "4 de outubro de 2026" (sem o ano quando é o ano de `hoje`). */
export function dataExtenso(valor: string | null | undefined, hoje?: string, idioma: Idioma = "pt-PT"): string {
  if (!valor) return "";
  const t = tMonitor[idioma].datas;
  const dia = diaLisboa(valor);
  const mes = t.meses[Number(dia.slice(5, 7)) - 1];
  if (!mes) return "";
  const mesmoAno = !!hoje && hoje.slice(0, 4) === dia.slice(0, 4);
  return t.extenso(Number(dia.slice(8, 10)), mes, mesmoAno ? null : dia.slice(0, 4));
}

/** "4 out." (com o ano quando não é o de `hoje`). */
export function dataCurta(valor: string, hoje?: string, idioma: Idioma = "pt-PT"): string {
  const t = tMonitor[idioma].datas;
  const dia = diaLisboa(valor);
  const mes = t.mesesCurtos[Number(dia.slice(5, 7)) - 1] ?? "";
  const outroAno = !!hoje && hoje.slice(0, 4) !== dia.slice(0, 4);
  return t.curta(Number(dia.slice(8, 10)), mes, outroAno ? dia.slice(0, 4) : null);
}

const euros = (idioma: Idioma) => (c: unknown) => formatarEurosCents(typeof c === "number" ? c : null, idioma);
const num = (v: unknown) => (typeof v === "number" ? v : null);
const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const maisRecente = (datas: (string | null | undefined)[]) =>
  datas.filter((d): d is string => !!d).sort((a, b) => (new Date(a).getTime() < new Date(b).getTime() ? 1 : -1))[0] ?? null;

// ---------------------------------------------------------------------------
// Situações comunicadas
// ---------------------------------------------------------------------------

export function situacaoDe(
  a: AchadoComunicado,
  eventos: EventoVisivel[],
  servico: { id: string; nome: string },
  idioma: Idioma = "pt-PT",
): Situacao {
  const t = tMonitor[idioma].situacao;
  const CAUSAS = t.causas;
  const eur = euros(idioma);
  const e = eventos.find((x) => x.achadoId === a.id) ?? null;
  const d = e?.dados ?? {};
  const base: Situacao = {
    id: a.id,
    servicoId: servico.id,
    servicoNome: servico.nome,
    resumo: null,
    curto: t.curtoGenerico,
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
        resumo: dif > 0 ? t.aumentou(eur(dif)) : t.diminuiu(eur(-dif)),
        valores: {
          antes: { rotulo: t.antes, valor: eur(antes) },
          agora: { rotulo: t.agora, valor: eur(agora) },
          diferenca: { rotulo: t.diferenca, valor: t.porMes(`${dif > 0 ? "+" : "−"}${eur(Math.abs(dif))}`) },
        },
        causas: dif > 0 ? CAUSAS.aumento : null,
        problema: dif > 0 ? "Aumento de mensalidade" : null,
        curto: dif > 0 ? t.curtoAumento(eur(dif)) : t.curtoDescida(eur(-dif)),
      };
    }
    case "diferenca_preco_contrato": {
      const esperada = num(d.esperada);
      const cobrada = num(d.mensalidade);
      if (esperada == null || cobrada == null) return { ...base, causas: CAUSAS.aumento, problema: "Aumento de mensalidade" };
      const dif = cobrada - esperada;
      return {
        ...base,
        resumo: t.contratoDif(eur(Math.abs(dif)), dif > 0),
        valores: {
          antes: { rotulo: t.noContrato, valor: eur(esperada) },
          agora: { rotulo: t.cobrado, valor: eur(cobrada) },
          diferenca: { rotulo: t.diferenca, valor: t.porMes(`${dif > 0 ? "+" : "−"}${eur(Math.abs(dif))}`) },
        },
        causas: dif > 0 ? CAUSAS.aumento : null,
        problema: dif > 0 ? "Aumento de mensalidade" : null,
        curto: t.curtoContrato(eur(Math.abs(dif))),
      };
    }
    case "promocao_em_falta": {
      const desconto = num(d.desconto) ?? e?.montanteCents ?? null;
      if (desconto == null) return { ...base, causas: CAUSAS.desconto, problema: "Aumento de mensalidade" };
      return {
        ...base,
        resumo: e?.base === "contrato" ? t.descontoContrato(eur(desconto)) : t.descontoDeixou(eur(desconto)),
        valores: {
          antes: { rotulo: e?.base === "contrato" ? t.descontoPrevisto : t.descontoAntes, valor: eur(desconto) },
          agora: { rotulo: t.descontoAgora, valor: eur(0) },
          diferenca: { rotulo: t.diferenca, valor: t.porMes(`+${eur(desconto)}`) },
        },
        causas: CAUSAS.desconto,
        problema: "Aumento de mensalidade",
        curto: t.curtoDesconto(eur(desconto)),
      };
    }
    case "promocao_alterada": {
      const antes = num(d.anterior);
      const agora = num(d.atual);
      if (antes == null || agora == null) return { ...base, causas: CAUSAS.desconto };
      const dif = antes - agora;
      return {
        ...base,
        resumo: t.descontoPassou(eur(antes), eur(agora)),
        valores: {
          antes: { rotulo: t.descontoAntes, valor: eur(antes) },
          agora: { rotulo: t.descontoAgora, valor: eur(agora) },
          diferenca: { rotulo: t.diferenca, valor: t.porMes(`${dif > 0 ? "+" : "−"}${eur(Math.abs(dif))}`) },
        },
        causas: CAUSAS.desconto,
        problema: dif > 0 ? "Aumento de mensalidade" : null,
        curto: t.curtoDescontoAlterado,
      };
    }
    case "cobranca_recorrente_nova":
      return {
        ...base,
        resumo: e ? fraseEvento({ tipo: "cobranca_recorrente_nova", base: "historico", montanteCents: e.montanteCents, dados: d }, idioma) : null,
        causas: CAUSAS.cobranca_nova,
        curto: e?.montanteCents != null ? t.curtoCobrancaNova(eur(e.montanteCents)) : t.curtoCobrancaNovaSem,
      };
    case "possivel_duplicado":
      return {
        ...base,
        resumo: e ? fraseEvento({ tipo: "possivel_duplicado", base: "historico", montanteCents: e.montanteCents, dados: d }, idioma) : null,
        causas: CAUSAS.duplicado,
        curto: t.curtoDuplicado,
      };
    case "fidelizacao_diferente": {
      const contrato = texto(d.contrato);
      const fatura = texto(d.fatura);
      return {
        ...base,
        resumo: contrato && fatura ? t.fidelizacaoDiferente : null,
        valores:
          contrato && fatura
            ? {
                antes: { rotulo: t.noContrato, valor: dataExtenso(contrato, undefined, idioma) },
                agora: { rotulo: t.naFatura, valor: dataExtenso(fatura, undefined, idioma) },
              }
            : null,
        causas: CAUSAS.fidelizacao,
        problema: "Fidelização ou penalização",
        curto: t.curtoFidelizacao,
      };
    }
    case "cessacao_divergente":
      return { ...base, causas: CAUSAS.cessacao, problema: "Fidelização ou penalização", curto: t.curtoCessacao };
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

export function resultadoServico(s: EntradaServico, hoje: string, idioma: Idioma = "pt-PT"): ResultadoServico {
  const t = tMonitor[idioma].servico;
  const ORIGEM_DATA = tMonitor[idioma].origemData as Record<string, string>;
  const eur = euros(idioma);
  const extenso = (v: string, h?: string) => dataExtenso(v, h, idioma);
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
  const mesUltima = ultima ? mesAnoTexto(dataReferencia(ultima), idioma) : null;

  // ---- Situações comunicadas ainda em destaque ----------------------------
  const situacoes = s.achados
    .filter((a) => (ultima && a.faturaId === ultima.id) || diasAte(diaLisboa(a.comunicadoEm), hoje) >= -ACHADO_ATIVO_DIAS)
    .sort((a, b) => (a.comunicadoEm < b.comunicadoEm ? 1 : -1))
    .map((a) => situacaoDe(a, s.eventos, s, idioma));

  // ---- O que verificámos -------------------------------------------------
  const verificacoes: Verificacao[] = [];
  const mensalidadeRef = temContrato && s.mensalidadeContratadaCents != null ? s.mensalidadeContratadaCents : c?.mensalidadeCents ?? null;
  if (temContrato && s.mensalidadeContratadaCents != null) {
    verificacoes.push({
      rotulo: t.mensalidadeContrato,
      valor: eur(s.mensalidadeContratadaCents),
      detalhe: temEvento("mensalidade_conforme") ? t.faturaDeAcordo(mesUltima ?? "") : undefined,
    });
  } else if (c?.mensalidadeCents != null) {
    const alterada = eventosUltima.find((e) => e.tipo === "mensalidade_alterada");
    verificacoes.push({
      rotulo: t.mensalidade,
      valor: eur(c.mensalidadeCents),
      detalhe: alterada
        ? fraseEvento({ tipo: "mensalidade_alterada", base: "historico", montanteCents: alterada.montanteCents, dados: alterada.dados }, idioma)
        : ordenadas.length === 1
          ? t.referencia
          : temEvento("mensalidade_mantida")
            ? t.igualAnterior
            : undefined,
    });
  }
  const descontoContrato = temContrato && s.descontoContratadoCents ? s.descontoContratadoCents : 0;
  if (descontoContrato > 0) {
    verificacoes.push({
      rotulo: t.descontoPromocao,
      valor: tMonitor[idioma].situacao.porMes(eur(descontoContrato)),
      detalhe: temEvento("promocao_aplicada") ? t.aplicadoUltima : undefined,
    });
  } else if (c && c.descontoCents > 0) {
    verificacoes.push({ rotulo: t.desconto, valor: tMonitor[idioma].situacao.porMes(eur(c.descontoCents)), detalhe: t.identificadoFatura(mesUltima ?? "") });
  }
  if (fimPromocao) {
    verificacoes.push({ rotulo: t.fimPromocao, valor: extenso(fimPromocao), detalhe: ORIGEM_DATA[s.campos.data_fim_promocao!.origem] });
  }
  if (fimFidelizacao) {
    verificacoes.push({
      rotulo: t.fimFidelizacao,
      valor: extenso(fimFidelizacao),
      detalhe: ORIGEM_DATA[s.campos.data_fim_fidelizacao!.origem],
    });
  }
  const servico = texto(condicao("servico")?.valor);
  if (servico) verificacoes.push({ rotulo: t.servico, valor: servico });
  // Verificações sem resultado negativo só quando não há nada por rever.
  if (ultima && ultima.linhas.length > 0 && !ultimaEmVerificacao) {
    if (!temEvento("possivel_duplicado")) verificacoes.push({ rotulo: t.duplicados, valor: t.nenhumaEncontrada });
    if (ordenadas.length >= 2 && !temEvento("cobranca_recorrente_nova")) {
      verificacoes.push({ rotulo: t.cobrancasNovas, valor: t.nenhumaFaceAnteriores });
    }
  }
  if (c && c.consumosCents > 0) verificacoes.push({ rotulo: t.consumoAdicional, valor: eur(c.consumosCents), detalhe: t.naFaturaDe(mesUltima ?? "") });
  if (c && c.pontuaisCents > 0) verificacoes.push({ rotulo: t.cobrancasPontuais, valor: eur(c.pontuaisCents), detalhe: t.naFaturaDe(mesUltima ?? "") });
  if (c && c.creditosCents > 0) verificacoes.push({ rotulo: t.credito, valor: eur(c.creditosCents), detalhe: t.naFaturaDe(mesUltima ?? "") });

  // ---- O que vamos acompanhar ---------------------------------------------
  const atentos: Atento[] = [];
  if (!s.terminado) {
    if (fimPromocao && diasAte(fimPromocao, hoje) >= 0) atentos.push({ texto: t.atentoFimPromocao(extenso(fimPromocao, hoje)), data: fimPromocao });
    if (fimFidelizacao && diasAte(fimFidelizacao, hoje) >= 0) {
      atentos.push({ texto: t.atentoFimFidelizacao(extenso(fimFidelizacao, hoje)), data: fimFidelizacao });
    }
    if (mensalidadeRef != null) atentos.push({ texto: t.atentoMensalidade(eur(mensalidadeRef)) });
    const descontoAcompanhado = descontoContrato || (c?.descontoCents ?? 0);
    if (descontoAcompanhado > 0) atentos.push({ texto: t.atentoDesconto(eur(descontoAcompanhado)) });
    if (s.faturas.some((f) => f.linhas.length > 0)) atentos.push({ texto: t.atentoCobrancas });
  }

  // ---- O que ainda não conseguimos confirmar ------------------------------
  const pendente = new Set(s.porConfirmar.campos);
  const lacunas: string[] = [];
  if (ultima && c?.mensalidadeCents == null && !temContrato) lacunas.push(t.lacunaMensalidade);
  if (s.setor === "telecomunicacoes" && (ultima || temContrato) && !fimFidelizacao && !pendente.has("data_fim_fidelizacao")) {
    lacunas.push(t.lacunaFidelizacao);
  }
  if ((descontoContrato > 0 || (c?.descontoCents ?? 0) > 0) && !fimPromocao && !pendente.has("data_fim_promocao")) {
    lacunas.push(t.lacunaDesconto);
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
      titulo = t.encontramosTitulo;
      textoPrincipal = situacoes.length === 1 ? t.encontramosUma : t.encontramosVarias(situacoes.length);
      break;
    case "por_confirmar":
      titulo = t.porConfirmarTitulo;
      textoPrincipal = t.porConfirmarTexto;
      break;
    case "em_verificacao": {
      const f = ordenadas.filter((x) => x.emVerificacao).at(-1);
      titulo = t.emVerificacaoTitulo;
      textoPrincipal = t.emVerificacaoTexto((f ? mesAnoTexto(dataReferencia(f), idioma) : mesUltima) ?? "");
      break;
    }
    case "verificado":
      if (ultima && c?.mensalidadeCents == null && !temContrato) {
        titulo = ordenadas.length === 1 ? t.primeiraFaturaTitulo : t.novaFaturaTitulo;
        textoPrincipal = t.semMensalidadeTexto;
      } else if (primeira) {
        conclusao = t.tudoCerto;
        if (ordenadas.length === 1) {
          titulo = t.primeiraFaturaTitulo;
          textoPrincipal = t.primeiraFaturaTexto;
        } else if (docsContratoLidos.length > 0) {
          titulo = t.contratoTitulo;
          textoPrincipal = t.contratoTexto;
        } else {
          titulo = t.indicadasTitulo;
          textoPrincipal = t.indicadasTexto;
        }
      } else {
        titulo = t.continuaTitulo;
        textoPrincipal = ultima ? t.comparamos(mesUltima ?? "", temContrato) : t.registamosContrato;
      }
      break;
    case "a_rever":
      titulo = t.aReverTitulo;
      textoPrincipal = t.aReverTexto;
      break;
    case "em_analise":
      titulo = t.emAnaliseTitulo;
      textoPrincipal = t.emAnaliseTexto;
      break;
    default:
      titulo = t.semDadosTitulo;
      textoPrincipal = t.semDadosTexto;
  }

  let seguinte: string | null = null;
  if (verificado && !s.terminado) {
    if (temContrato && ordenadas.length === 0) {
      seguinte = t.seguinteContratoSemFatura;
    } else if (!temContrato) {
      seguinte = ordenadas.length <= 1 ? t.seguintePrimeira : t.seguinteSemContrato;
    } else {
      seguinte = t.seguinteComContrato;
    }
  }

  let encontramos: string | null = null;
  if (situacoes.length > 0) encontramos = situacoes.length === 1 ? t.encontramosUmaSituacao : t.encontramosSituacoes(situacoes.length);
  else if (estado === "em_verificacao") encontramos = t.alteracaoVerificacao;
  else if (estado === "por_confirmar") encontramos = t.condicoesPorConfirmar;
  else if (estado === "verificado") encontramos = t.nenhumProblema;

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
      ? t.oContrato
      : ultima
        ? t.aFaturaDe(mesUltima ?? "")
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
    historico: historicoServico(s, ordenadas, situacoes, hoje, idioma),
  };
}

// ---------------------------------------------------------------------------
// O que já fizemos por si
// ---------------------------------------------------------------------------

function historicoServico(
  s: EntradaServico,
  ordenadas: FaturaServico[],
  situacoes: Situacao[],
  hoje: string,
  idioma: Idioma = "pt-PT",
): ItemHistorico[] {
  const t = tMonitor[idioma].historico;
  const itens: ItemHistorico[] = [];
  const item = (data: string, txt: string, tom: ItemHistorico["tom"], tipo: ItemHistorico["tipo"]) =>
    itens.push({ data, texto: txt, tom, tipo, servicoId: s.id, servicoNome: s.nome });
  const todas = s.achados.map((a) => situacoes.find((x) => x.id === a.id) ?? situacaoDe(a, s.eventos, s, idioma));

  ordenadas.forEach((f, i) => {
    const mes = mesAnoTexto(dataReferencia(f), idioma);
    const achado = todas.find((x) => s.achados.find((a) => a.id === x.id)?.faturaId === f.id);
    const semMensalidade = s.eventos.some((e) => e.faturaId === f.id && e.tipo === "dados_insuficientes");
    if (achado) {
      item(s.achados.find((a) => a.id === achado.id)!.comunicadoEm, t.detetamosNaFatura(achado.curto, mes), "atencao", "situacao");
      return;
    }
    const acao = i === 0 ? t.verificamosPrimeira(mes) : t.comparamos(mes);
    if (f.emVerificacao) item(f.registadaEm, t.emVerificacao(acao), "info", "fatura");
    else if (semMensalidade) item(f.registadaEm, t.semMensalidade(acao), "info", "fatura");
    else item(f.registadaEm, i === 0 ? t.tudoCerto(acao) : t.semAlteracoes(acao), "ok", "fatura");
  });

  // Situações sem fatura associada (ex.: valor de cessação).
  for (const a of s.achados.filter((x) => !x.faturaId || !ordenadas.some((f) => f.id === x.faturaId))) {
    const sit = todas.find((x) => x.id === a.id)!;
    item(a.comunicadoEm, t.detetamos(sit.curto), "atencao", "situacao");
  }

  for (const d of s.documentos.filter((x) => x.tipo === "contrato" && x.estado === "processado")) {
    item(d.criadoEm, t.lemosContrato, "ok", "contrato");
  }

  for (const a of s.alertas) {
    const sobre = REGRA_ALERTA[a.regra];
    if (!sobre) continue;
    item(a.enviadoEm, t.avisamos(sobre === "fidelizacao", dataExtenso(a.dataAlvo, hoje, idioma)), "info", "aviso");
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

export function resultadoGeral(servicos: ResultadoServico[], idioma: Idioma = "pt-PT"): ResultadoGeral {
  const t = tMonitor[idioma].geral;
  const ts = tMonitor[idioma].servico;
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
      titulo: t.semDadosTitulo,
      conclusao: null,
      texto: t.semDadosTexto,
      encontramos: null,
    };
  }

  // Só um serviço: o resultado geral é o desse serviço.
  if (!varios) {
    return { ...base, estado: principal.estado, titulo: principal.titulo, conclusao: principal.conclusao, texto: principal.texto, encontramos: principal.encontramos };
  }

  const restantesBem = servicos.filter((s) => s.id !== principal.id).every((s) => s.estado === "verificado");
  const nota = restantesBem ? t.restantesBem : "";
  switch (principal.estado) {
    case "encontramos":
      return {
        ...base,
        estado: "encontramos",
        titulo: ts.encontramosTitulo,
        conclusao: null,
        texto: situacoes.length === 1 ? t.encontramosUma(principal.nome, nota) : t.encontramosVarias(situacoes.length, nota),
        encontramos: situacoes.length === 1 ? ts.encontramosUmaSituacao : ts.encontramosSituacoes(situacoes.length),
      };
    case "por_confirmar":
      return {
        ...base,
        estado: "por_confirmar",
        titulo: t.porConfirmarTitulo,
        conclusao: null,
        texto: t.porConfirmarTexto(principal.nome, nota),
        encontramos: ts.condicoesPorConfirmar,
      };
    case "em_verificacao":
      return {
        ...base,
        estado: "em_verificacao",
        titulo: ts.emVerificacaoTitulo,
        conclusao: null,
        texto: t.emVerificacaoTexto(principal.nome, nota),
        encontramos: ts.alteracaoVerificacao,
      };
    case "verificado":
      return {
        ...base,
        estado: "verificado",
        titulo: ts.continuaTitulo,
        conclusao: null,
        texto: t.verificadoTexto(verificados.length, servicos.length),
        encontramos: ts.nenhumProblema,
      };
    default:
      return { ...base, estado: principal.estado, titulo: principal.titulo, conclusao: null, texto: principal.texto, encontramos: null };
  }
}
