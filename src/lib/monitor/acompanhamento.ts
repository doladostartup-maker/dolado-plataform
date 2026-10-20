// DoLado — acompanhamento de um serviço: comparação mensal das faturas (sem
// I/O; `npm test`).
//
// O contrato diz o que foi contratado; a fatura diz o que aconteceu num
// período. Este módulo compara, em código:
//   * com contrato (versão válida no período da fatura): fatura × contrato;
//   * sem contrato: fatura atual × faturas anteriores (padrão observado).
// O resultado são EVENTOS estruturados (tipo, montante, dados) e as frases
// são geradas aqui a partir deles — sem IA.
//
// Linguagem: sem contrato nunca "contratado", "contratual", "deveria" nem
// "indevido" (não conhecemos as condições). Com contrato, descreve-se a
// diferença face ao contrato registado — nunca uma conclusão sobre a lei.
// Eventos "atencao" vão sempre para revisão humana antes de o cliente os ver.

import type { LinhaFatura } from "./extracaoFatura.ts";
import { formatarDataPt, formatarEurosCents } from "./contratos.ts";
import type { Idioma } from "../../i18n/config.ts";
import { tMonitor } from "../../i18n/mensagens/monitor.ts";

export const VERSAO_ACOMPANHAMENTO = "acomp_v1";

/** Diferença até 5 cêntimos = mesmo valor (arredondamentos). */
const TOLERANCIA_CENTS = 5;
/** Aumento que merece revisão (abaixo disto fica só informativo). */
const AUMENTO_MATERIAL_CENTS = 50;
/** Cobrança recorrente nova considerada material. */
const LINHA_MATERIAL_CENTS = 100;
/** Faturas anteriores consideradas para "cobrança nova". */
const ANTERIORES_LINHA_NOVA = 3;

export type FaturaComparavel = {
  id: string;
  dataEmissao: string | null;
  periodoInicio: string | null;
  periodoFim: string | null;
  totalCents: number | null;
  /** Mensalidade escrita na fatura (só usada se as linhas não chegarem). */
  mensalidadeLidaCents: number | null;
  /** Valor recorrente antigo (faturas anteriores a 04/10/2026, sem linhas úteis). */
  recorrenteCents?: number | null;
  linhas: LinhaFatura[];
  dataFimFidelizacao?: string | null;
};

export type VersaoContrato = {
  id: string;
  validoDesde: string | null;
  validoAte: string | null;
  mensalidadeCents: number | null;
  descontoCents: number | null;
  descricaoPromocao: string | null;
  promocaoInicio: string | null;
  promocaoFim: string | null;
  dataFimFidelizacao: string | null;
};

export type TipoEvento =
  | "sem_alteracao_relevante"
  | "primeira_fatura"
  | "mensalidade_conforme"
  | "mensalidade_mantida"
  | "mensalidade_alterada"
  | "diferenca_preco_contrato"
  | "promocao_aplicada"
  | "promocao_em_falta"
  | "promocao_alterada"
  | "promocao_terminada"
  | "consumo_adicional"
  | "cobranca_recorrente_nova"
  | "cobranca_pontual"
  | "credito_aplicado"
  | "possivel_duplicado"
  | "fidelizacao_diferente"
  | "dados_insuficientes";

export type Severidade = "ok" | "info" | "atencao";
export type Base = "contrato" | "historico";

export type Evento = {
  tipo: TipoEvento;
  base: Base;
  severidade: Severidade;
  periodo: string | null;
  montanteCents: number | null;
  dados: Record<string, unknown>;
  chave: string;
  contratoVersaoId: string | null;
};

// ---------------------------------------------------------------------------
// Componentes da fatura (a partir das linhas)
// ---------------------------------------------------------------------------

export function chaveDescricao(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\d+([.,]\d+)?/g, " ")
    .replace(/[^a-z]+/g, " ")
    .trim();
}

export type Componentes = {
  /** Mensalidade recorrente (preço base + serviços recorrentes − descontos recorrentes). */
  mensalidadeCents: number | null;
  baseCents: number;
  descontoCents: number;
  consumosCents: number;
  pontuaisCents: number;
  creditosCents: number;
  impostosCents: number;
  recorrentes: { chave: string; descricao: string; valorCents: number }[];
  pontuais: { descricao: string; valorCents: number }[];
};

function recorrente(l: LinhaFatura) {
  if (l.categoria === "imposto" || l.categoria === "consumo") return false;
  if (l.recorrente === true) return true;
  return l.recorrente === null && (l.categoria === "servico_base" || l.categoria === "desconto");
}

export function componentesFatura(f: FaturaComparavel): Componentes {
  const linhas = f.linhas ?? [];
  const rec = linhas.filter(recorrente);
  const naoRec = linhas.filter((l) => !recorrente(l));
  const soma = (ls: LinhaFatura[]) => ls.reduce((s, l) => s + l.valorCents, 0);

  const mensalidade = rec.length > 0 ? soma(rec) : f.mensalidadeLidaCents ?? f.recorrenteCents ?? null;
  return {
    mensalidadeCents: mensalidade,
    baseCents: soma(rec.filter((l) => l.valorCents > 0)),
    descontoCents: -soma(rec.filter((l) => l.valorCents < 0)),
    consumosCents: soma(naoRec.filter((l) => l.categoria === "consumo" && l.valorCents > 0)),
    pontuaisCents: soma(naoRec.filter((l) => l.categoria !== "consumo" && l.categoria !== "imposto" && l.valorCents > 0)),
    creditosCents: -soma(naoRec.filter((l) => l.categoria !== "imposto" && l.valorCents < 0)),
    impostosCents: soma(linhas.filter((l) => l.categoria === "imposto")),
    recorrentes: rec
      .filter((l) => l.valorCents > 0)
      .map((l) => ({ chave: chaveDescricao(l.descricao), descricao: l.descricao, valorCents: l.valorCents })),
    pontuais: naoRec
      .filter((l) => l.categoria !== "consumo" && l.categoria !== "imposto" && l.valorCents > 0)
      .map((l) => ({ descricao: l.descricao, valorCents: l.valorCents })),
  };
}

// ---------------------------------------------------------------------------
// Datas e ordenação
// ---------------------------------------------------------------------------

/** Data que situa a fatura no tempo (emissão; senão fim/início do período). */
export function dataReferencia(f: Pick<FaturaComparavel, "dataEmissao" | "periodoFim" | "periodoInicio">): string | null {
  return f.dataEmissao ?? f.periodoFim ?? f.periodoInicio;
}

export function ordenarFaturas<T extends FaturaComparavel>(faturas: T[]): T[] {
  return [...faturas].sort((a, b) => {
    const ra = dataReferencia(a) ?? "";
    const rb = dataReferencia(b) ?? "";
    return ra === rb ? a.id.localeCompare(b.id) : ra < rb ? -1 : 1;
  });
}

/** Versão do contrato válida no período da fatura (a mais recente que a cubra). */
export function versaoValida(versoes: VersaoContrato[], f: FaturaComparavel): VersaoContrato | null {
  const ref = f.periodoInicio ?? f.dataEmissao ?? f.periodoFim;
  const validas = versoes.filter((v) => {
    if (!ref) return v.validoAte === null;
    return (v.validoDesde === null || v.validoDesde <= ref) && (v.validoAte === null || v.validoAte >= ref);
  });
  validas.sort((a, b) => ((a.validoDesde ?? "") < (b.validoDesde ?? "") ? 1 : -1));
  return validas[0] ?? null;
}

function promocaoAtiva(v: VersaoContrato, f: FaturaComparavel) {
  if (!v.descontoCents) return false;
  const ref = f.periodoInicio ?? f.dataEmissao ?? f.periodoFim;
  if (!ref) return true;
  return (!v.promocaoInicio || v.promocaoInicio <= ref) && (!v.promocaoFim || v.promocaoFim >= ref);
}

const igual = (a: number, b: number) => Math.abs(a - b) <= TOLERANCIA_CENTS;

// ---------------------------------------------------------------------------
// Comparação de uma fatura
// ---------------------------------------------------------------------------

export function compararFatura(atual: FaturaComparavel, anteriores: FaturaComparavel[], versao: VersaoContrato | null): Evento[] {
  const eventos: Evento[] = [];
  const periodo = dataReferencia(atual);
  const comContrato = !!versao && versao.mensalidadeCents != null;
  function evento(tipo: TipoEvento, base: Base, severidade: Severidade, montanteCents: number | null, dados: Record<string, unknown> = {}, detalhe = "") {
    eventos.push({
      tipo,
      base,
      severidade,
      periodo,
      montanteCents,
      dados,
      chave: `${VERSAO_ACOMPANHAMENTO}:${atual.id}:${tipo}:${base}${detalhe ? `:${detalhe}` : ""}`,
      contratoVersaoId: base === "contrato" ? versao?.id ?? null : null,
    });
  }

  const ordenadas = ordenarFaturas(anteriores.filter((f) => f.id !== atual.id));
  const prev = ordenadas.at(-1) ?? null;
  const c = componentesFatura(atual);
  const cp = prev ? componentesFatura(prev) : null;
  const m = c.mensalidadeCents;

  // Cobranças recorrentes novas face às últimas faturas.
  const comparadas = ordenadas.slice(-ANTERIORES_LINHA_NOVA).filter((f) => f.linhas.length > 0);
  const conhecidas = new Set(comparadas.flatMap((f) => f.linhas.map((l) => chaveDescricao(l.descricao))));
  const novas = comparadas.length === 0 ? [] : c.recorrentes.filter((l) => l.chave && l.valorCents >= LINHA_MATERIAL_CENTS && !conhecidas.has(l.chave));
  const totalNovas = novas.reduce((s, l) => s + l.valorCents, 0);

  // ---- Mensalidade e promoção -------------------------------------------
  if (m === null) {
    evento("dados_insuficientes", comContrato ? "contrato" : "historico", "info", null);
  } else if (comContrato) {
    const v = versao!;
    const contratada = v.mensalidadeCents!;
    const desconto = v.descontoCents ?? 0;
    const ativa = promocaoAtiva(v, atual);
    if (ativa && igual(m, contratada - desconto)) {
      evento("mensalidade_conforme", "contrato", "ok", m, { mensalidade: m, contratada, desconto });
      evento("promocao_aplicada", "contrato", "ok", desconto, { desconto });
    } else if (ativa && igual(m, contratada) && c.descontoCents >= desconto - TOLERANCIA_CENTS) {
      // Preço do contrato já líquido do desconto, que aparece na fatura.
      evento("mensalidade_conforme", "contrato", "ok", m, { mensalidade: m, contratada });
      evento("promocao_aplicada", "contrato", "ok", desconto, { desconto });
    } else if (ativa && igual(m, contratada)) {
      evento("promocao_em_falta", "contrato", "atencao", desconto, { desconto, mensalidade: m, contratada });
    } else if (!ativa && igual(m, contratada)) {
      evento("mensalidade_conforme", "contrato", "ok", m, { mensalidade: m, contratada });
    } else {
      const esperada = ativa ? contratada - desconto : contratada;
      const dif = m - esperada;
      evento("diferenca_preco_contrato", "contrato", dif > 0 ? "atencao" : "info", Math.abs(dif), {
        mensalidade: m,
        esperada,
        contratada,
        desconto: ativa ? desconto : 0,
        sentido: dif > 0 ? "acima" : "abaixo",
      });
    }
    // Promoção terminada conforme o contrato.
    if (!ativa && v.descontoCents && v.promocaoFim && cp && cp.descontoCents > 0 && c.descontoCents === 0) {
      evento("promocao_terminada", "contrato", "info", cp.descontoCents, { fim: v.promocaoFim });
    }
    if (v.dataFimFidelizacao && atual.dataFimFidelizacao && v.dataFimFidelizacao !== atual.dataFimFidelizacao) {
      evento("fidelizacao_diferente", "contrato", "atencao", null, { fatura: atual.dataFimFidelizacao, contrato: v.dataFimFidelizacao });
    }
  } else if (!prev || cp?.mensalidadeCents == null) {
    if (!prev) evento("primeira_fatura", "historico", "info", m, { mensalidade: m });
  } else {
    const pm = cp.mensalidadeCents;
    const dif = m - pm;
    const difDesconto = cp.descontoCents - c.descontoCents;
    if (igual(m, pm)) {
      // Faturas seguidas com este valor e valor anterior diferente (se houver).
      const valores = [...ordenadas.map((f) => componentesFatura(f).mensalidadeCents), m];
      let n = 0;
      for (let i = valores.length - 1; i >= 0 && valores[i] != null && igual(valores[i]!, m); i--) n++;
      const antes = valores[valores.length - 1 - n];
      evento("mensalidade_mantida", "historico", n >= 2 && antes != null && n <= 3 ? "info" : "ok", m, {
        mensalidade: m,
        consecutivas: n,
        anterior: antes ?? null,
      });
    } else if (difDesconto > 0 && igual(dif, difDesconto)) {
      // O aumento é exatamente o desconto que deixou de aparecer: ver abaixo.
    } else if (novas.length > 0 && igual(dif, totalNovas)) {
      // O aumento é a cobrança nova: ver abaixo.
    } else {
      evento("mensalidade_alterada", "historico", dif >= AUMENTO_MATERIAL_CENTS ? "atencao" : "info", Math.abs(dif), {
        anterior: pm,
        atual: m,
        sentido: dif > 0 ? "aumento" : "diminuicao",
      });
    }
  }

  // ---- Descontos observados (sem promoção no contrato) -------------------
  if (!comContrato || !versao?.descontoCents) {
    if (cp && cp.descontoCents > 0) {
      if (c.descontoCents === 0) {
        evento("promocao_em_falta", "historico", "atencao", cp.descontoCents, { desconto: cp.descontoCents });
      } else if (igual(c.descontoCents, cp.descontoCents)) {
        evento("promocao_aplicada", "historico", "ok", c.descontoCents, { desconto: c.descontoCents, continua: true });
      } else {
        evento("promocao_alterada", "historico", "atencao", Math.abs(c.descontoCents - cp.descontoCents), {
          anterior: cp.descontoCents,
          atual: c.descontoCents,
        });
      }
    } else if (c.descontoCents > 0) {
      evento("promocao_aplicada", "historico", "info", c.descontoCents, { desconto: c.descontoCents, novo: !!prev });
    }
  }

  // ---- Consumos, cobranças pontuais, créditos -----------------------------
  if (c.consumosCents > 0) evento("consumo_adicional", "historico", "info", c.consumosCents, { consumos: c.consumosCents });
  if (c.pontuaisCents > 0) {
    evento("cobranca_pontual", "historico", "info", c.pontuaisCents, { linhas: c.pontuais.slice(0, 3).map((l) => l.descricao) });
  }
  if (c.creditosCents > 0) evento("credito_aplicado", "historico", "info", c.creditosCents);

  for (const l of novas) {
    evento("cobranca_recorrente_nova", "historico", "atencao", l.valorCents, { descricao: l.descricao }, l.chave.replace(/\s+/g, "_"));
  }

  // ---- Possíveis duplicados ----------------------------------------------
  const porLinha = new Map<string, LinhaFatura[]>();
  for (const l of atual.linhas) {
    if (l.valorCents < LINHA_MATERIAL_CENTS || l.categoria === "imposto" || l.categoria === "desconto") continue;
    const k = `${chaveDescricao(l.descricao)}|${l.valorCents}`;
    porLinha.set(k, [...(porLinha.get(k) ?? []), l]);
  }
  for (const [k, ls] of porLinha) {
    if (ls.length < 2 || !k.split("|")[0]) continue;
    evento("possivel_duplicado", "historico", "atencao", ls[0].valorCents, { descricao: ls[0].descricao, ocorrencias: ls.length }, k.replace(/[^a-z0-9]+/g, "_"));
  }
  if (atual.periodoInicio && atual.periodoFim) {
    const mesmo = ordenadas.find((f) => f.periodoInicio === atual.periodoInicio && f.periodoFim === atual.periodoFim);
    if (mesmo) {
      evento("possivel_duplicado", "historico", "atencao", null, {
        outra_fatura: mesmo.id,
        periodo_inicio: atual.periodoInicio,
        periodo_fim: atual.periodoFim,
      }, "periodo");
    }
  }

  if (!eventos.some((e) => e.severidade !== "ok") && !eventos.some((e) => e.tipo === "mensalidade_conforme" || e.tipo === "mensalidade_mantida")) {
    evento("sem_alteracao_relevante", comContrato ? "contrato" : "historico", "ok", null);
  }
  return eventos;
}

export function resultadoFatura(eventos: Pick<Evento, "severidade">[]): Severidade {
  if (eventos.some((e) => e.severidade === "atencao")) return "atencao";
  if (eventos.some((e) => e.severidade === "info")) return "info";
  return "ok";
}

// ---------------------------------------------------------------------------
// Frases (determinísticas)
// ---------------------------------------------------------------------------

// Frases no idioma da interface (português por omissão: backoffice, e-mail
// mensal, testes). Textos em src/i18n/mensagens/*/monitor.ts.
const euros = (idioma: Idioma) => (c: unknown) => formatarEurosCents(typeof c === "number" ? c : null, idioma);

export function fraseEvento(e: Pick<Evento, "tipo" | "base" | "montanteCents" | "dados">, idioma: Idioma = "pt-PT"): string {
  const t = tMonitor[idioma].eventos;
  const eur = euros(idioma);
  const ordinal = tMonitor[idioma].datas.ordinal;
  const d = e.dados ?? {};
  const contrato = e.base === "contrato";
  switch (e.tipo) {
    case "primeira_fatura":
      return t.primeiraFatura;
    case "mensalidade_conforme":
      return t.mensalidadeConforme(eur(d.mensalidade));
    case "mensalidade_mantida": {
      const n = Number(d.consecutivas ?? 0);
      if (d.anterior != null && n >= 2 && n <= 3) return t.mensalidadeNovoValor(ordinal(n), eur(d.mensalidade));
      if (n >= 3) return t.mensalidadeMesma(ordinal(n), eur(d.mensalidade));
      return t.mensalidadeIgual(eur(d.mensalidade));
    }
    case "mensalidade_alterada":
      return d.sentido === "aumento"
        ? t.mensalidadeAumentou(eur(e.montanteCents), eur(d.anterior), eur(d.atual))
        : t.mensalidadeDiminuiu(eur(e.montanteCents), eur(d.anterior), eur(d.atual));
    case "diferenca_preco_contrato":
      return t.diferencaContrato(eur(d.mensalidade), eur(e.montanteCents), d.sentido === "acima", eur(d.esperada));
    case "promocao_aplicada":
      if (contrato) return t.descontoContratual(eur(e.montanteCents));
      if (d.continua) return t.descontoContinua(eur(e.montanteCents));
      if (d.novo) return t.descontoNovo(eur(e.montanteCents));
      return t.descontoIdentificado(eur(e.montanteCents));
    case "promocao_em_falta":
      return contrato ? t.descontoEmFaltaContrato(eur(e.montanteCents)) : t.descontoEmFalta(eur(e.montanteCents));
    case "promocao_alterada":
      return t.descontoAlterado(eur(d.anterior), eur(d.atual));
    case "promocao_terminada":
      return t.promocaoTerminada(formatarDataPt(String(d.fim ?? "")));
    case "consumo_adicional":
      return t.consumoAdicional(eur(e.montanteCents));
    case "cobranca_pontual": {
      const linhas = Array.isArray(d.linhas) ? (d.linhas as string[]) : [];
      return t.cobrancasPontuais(eur(e.montanteCents), linhas.join(", "));
    }
    case "credito_aplicado":
      return t.credito(eur(e.montanteCents));
    case "cobranca_recorrente_nova":
      return t.cobrancaNova(eur(e.montanteCents), String(d.descricao ?? ""));
    case "possivel_duplicado":
      return d.outra_fatura
        ? t.outraFatura(formatarDataPt(String(d.periodo_inicio)), formatarDataPt(String(d.periodo_fim)))
        : t.cobrancasIguais(String(d.ocorrencias), String(d.descricao ?? ""), eur(e.montanteCents));
    case "fidelizacao_diferente":
      return t.fidelizacaoDiferente(formatarDataPt(String(d.fatura)), formatarDataPt(String(d.contrato)));
    case "dados_insuficientes":
      return t.dadosInsuficientes;
    case "sem_alteracao_relevante":
    default:
      return contrato ? t.semDiferencasContrato : t.semDiferencas;
  }
}

/** Explicação curta da diferença de total face à fatura anterior. */
export function fraseVariacaoTotal(atual: FaturaComparavel, anterior: FaturaComparavel | null, idioma: Idioma = "pt-PT"): string | null {
  const t = tMonitor[idioma].variacao;
  const eur = euros(idioma);
  if (!anterior || atual.totalCents == null || anterior.totalCents == null) return null;
  const dif = atual.totalCents - anterior.totalCents;
  if (Math.abs(dif) <= TOLERANCIA_CENTS) return t.igual;
  const c = componentesFatura(atual);
  const p = componentesFatura(anterior);
  const causas: string[] = [];
  if (c.mensalidadeCents != null && p.mensalidadeCents != null && !igual(c.mensalidadeCents, p.mensalidadeCents)) causas.push(t.mensalidade);
  if (!igual(c.consumosCents, p.consumosCents)) causas.push(dif > 0 && c.consumosCents > p.consumosCents ? t.consumoAdicional : t.variacaoConsumos);
  if (!igual(c.pontuaisCents, p.pontuaisCents)) causas.push(t.pontuais);
  if (!igual(c.creditosCents, p.creditosCents)) causas.push(t.creditos);
  const sentido = dif > 0 ? t.superior : t.inferior;
  if (causas.length === 0) return t.semCausa(eur(Math.abs(dif)), sentido);
  return t.comCausa(eur(Math.abs(dif)), sentido, t.lista(causas));
}

// ---------------------------------------------------------------------------
// Padrão observado (sem contrato) — calculado das faturas, que não mudam
// ---------------------------------------------------------------------------

export type TrechoObservado = { valorCents: number; desde: string | null; ate: string | null; faturas: number };

export type PadraoObservado = {
  faturas: number;
  inicio: string | null;
  /** Mensalidade habitual: a mais recente que se repete (ou a última). */
  mensalidadeHabitualCents: number | null;
  /** Trechos com a mesma mensalidade, do mais antigo para o mais recente. */
  trechos: TrechoObservado[];
  descontoAtualCents: number;
};

export function padraoObservado(faturas: FaturaComparavel[]): PadraoObservado {
  const ordenadas = ordenarFaturas(faturas);
  const trechos: TrechoObservado[] = [];
  for (const f of ordenadas) {
    const m = componentesFatura(f).mensalidadeCents;
    if (m == null) continue;
    const ultimo = trechos.at(-1);
    if (ultimo && igual(ultimo.valorCents, m)) {
      ultimo.ate = dataReferencia(f);
      ultimo.faturas++;
    } else {
      trechos.push({ valorCents: m, desde: dataReferencia(f), ate: dataReferencia(f), faturas: 1 });
    }
  }
  const recente = trechos.at(-1);
  const habitual = recente && recente.faturas >= 2 ? recente : trechos.length >= 2 ? trechos.at(-2)! : recente;
  return {
    faturas: ordenadas.length,
    inicio: ordenadas[0] ? dataReferencia(ordenadas[0]) : null,
    mensalidadeHabitualCents: habitual?.valorCents ?? null,
    trechos,
    descontoAtualCents: ordenadas.length ? componentesFatura(ordenadas.at(-1)!).descontoCents : 0,
  };
}

// ---------------------------------------------------------------------------
// Achados (revisão humana) a partir dos eventos "atencao"
// ---------------------------------------------------------------------------

export const TIPO_ACHADO: Partial<Record<TipoEvento, string>> = {
  mensalidade_alterada: "mensalidade_alterada",
  diferenca_preco_contrato: "diferenca_preco_contrato",
  promocao_em_falta: "promocao_em_falta",
  promocao_alterada: "promocao_alterada",
  cobranca_recorrente_nova: "cobranca_recorrente_nova",
  possivel_duplicado: "possivel_duplicado",
  fidelizacao_diferente: "fidelizacao_diferente",
};

/** "Outubro 2026" a partir de uma data ISO. */
export function mesAno(iso: string | null | undefined, idioma: Idioma = "pt-PT"): string {
  const t = tMonitor[idioma].datas;
  if (!iso) return t.desconhecida;
  const m = t.meses[Number(iso.slice(5, 7)) - 1];
  return m ? t.mesAno(m, iso.slice(0, 4)) : t.desconhecida;
}

/** "outubro de 2026", para usar a meio de uma frase. */
export function mesAnoTexto(iso: string | null | undefined, idioma: Idioma = "pt-PT"): string {
  const t = tMonitor[idioma].datas;
  if (!iso) return t.desconhecidaTexto;
  const m = t.meses[Number(iso.slice(5, 7)) - 1];
  return m ? t.mesAnoTexto(m, iso.slice(0, 4)) : t.desconhecidaTexto;
}
