// DoLado — comparação de facturas de electricidade e gás (sem I/O, sem IA;
// `npm test`).
//
// Objectivo: explicar ao cliente porque mudou o valor de uma factura,
// separando o efeito do consumo, dos preços e dos outros componentes, sem
// conclusões que os dados não demonstram.
//
// Regras:
//   * Compara-se cada fornecimento (electricidade, gás) só com o mesmo
//     fornecimento (mesmo tipo e, quando conhecido, o mesmo CPE/CUI) de uma
//     factura anterior cujo período não se sobreponha (uma factura de acerto
//     que volta a cobrir dias antigos não é comparável).
//   * Componentes fixos normalizados pelo número de dias: a diferença do
//     termo fixo divide-se em "dias facturados" e "preço diário".
//   * Energia: efeito do consumo = (kWh actuais − kWh anteriores) × preço
//     anterior; efeito do preço = kWh actuais × (preço actual − anterior).
//     Por período horário quando as duas facturas têm a mesma estrutura; com
//     estruturas diferentes, preço médio por kWh (certeza média) — e nunca se
//     comparam preços unitários.
//   * Reconciliação: a soma dos componentes tem de dar a diferença dos totais.
//     Até 10 cêntimos de diferença são arredondamentos; acima disso, a
//     explicação é parcial e o resto fica como "não identificado". Nunca se
//     inventa um valor em falta.
//   * Subida de preço unitário, do termo fixo/potência, mudança de tarifário,
//     acerto relevante, serviço adicional novo e desconto que desaparece são
//     "atencao": revisão humana antes de o cliente os ver (achados). Num
//     tarifário indexado ou dinâmico, a variação do preço é só informativa.
//   * Nunca "indevido", "incumprimento" nem conclusões sobre a lei: descreve-se
//     o facto, a diferença e, quando faz sentido, o que o cliente pode
//     confirmar.

import { diasEntre, type FornecimentoEnergia, type TipoFornecimento } from "./energia.ts";

export const VERSAO_ENERGIA = "energia_v1";

/** Diferença tolerada nos totais (arredondamentos). */
export const TOLERANCIA_ARREDONDAMENTO_CENTS = 10;
/** Diferença de total até 5 cêntimos = mesmo valor. */
const IGUAL_CENTS = 5;
/** Variação de preço unitário relevante: ≥ 0,001 €/kWh e ≥ 1%. */
const PRECO_MIN_MICRO = 1000;
const PRECO_MIN_RELATIVO = 0.01;
/** Variação do preço diário fixo relevante: ≥ 0,001 €/dia e ≥ 1%. */
const TERMO_MIN_MICRO = 1000;
/** Consumo por dia superior: +20% e pelo menos +1 kWh/dia. */
const CONSUMO_RELATIVO = 0.2;
const CONSUMO_MIN_KWH_DIA = 1;
/** Acerto que merece revisão: ≥ 20 € ou ≥ 30% do total. */
const ACERTO_RELEVANTE_CENTS = 2000;
const ACERTO_RELEVANTE_RELATIVO = 0.3;
/** Serviço adicional novo ou aumento considerado material. */
const SERVICO_MIN_CENTS = 50;
/** Dias de sobreposição tolerados entre períodos (a leitura do último dia pode repetir-se). */
const SOBREPOSICAO_TOLERADA = 1;
/** Mesmo período do ano anterior: meio do período a 365 ± 31 dias. */
const JANELA_ANO_ANTERIOR = 31;

export type FaturaEnergia = {
  id: string;
  dataEmissao: string | null;
  periodoInicio: string | null;
  periodoFim: string | null;
  totalCents: number | null;
  energia: FornecimentoEnergia[];
};

export type Certeza = "alta" | "media" | "baixa";

export type ChaveComponente =
  | "consumo"
  | "preco_energia"
  | "preco_medio_energia"
  | "energia"
  | "dias"
  | "preco_termo_fixo"
  | "potencia"
  | "termo_fixo"
  | "redes"
  | "impostos"
  | "descontos"
  | "acertos"
  | "servicos_adicionais";

/** Componentes que resultam do consumo (o resto: preços e outros valores). */
export const COMPONENTES_CONSUMO: readonly ChaveComponente[] = ["consumo"];

export type Decomposicao = {
  tipo: TipoFornecimento;
  anteriorId: string;
  totalAnteriorCents: number;
  totalAtualCents: number;
  diferencaCents: number;
  /** Só os componentes diferentes de zero, por ordem de grandeza. */
  componentes: { chave: ChaveComponente; cents: number }[];
  arredondamentoCents: number;
  /** Parte da diferença que os dados não explicam (0 quando reconcilia). */
  naoExplicadoCents: number;
  parcial: boolean;
  certeza: Certeza;
  /** Mesma opção horária e mesmos períodos nas duas facturas. */
  estruturaCompativel: boolean;
  estimada: boolean;
  diasAnterior: number | null;
  diasAtual: number | null;
  consumoDiaAnterior: number | null;
  consumoDiaAtual: number | null;
};

export type TipoEventoEnergia =
  | "energia_variacao"
  | "energia_preco_alterado"
  | "energia_preco_indexado"
  | "energia_termo_fixo_alterado"
  | "energia_potencia_alterada"
  | "energia_tarifario_alterado"
  | "energia_consumo_superior"
  | "energia_leitura_estimada"
  | "energia_acerto"
  | "energia_servico_adicional"
  | "energia_dados_insuficientes";

export type EventoEnergia = {
  tipo: TipoEventoEnergia | "promocao_em_falta" | "promocao_alterada" | "promocao_terminada";
  base: "historico" | "contrato";
  severidade: "ok" | "info" | "atencao";
  periodo: string | null;
  montanteCents: number | null;
  dados: Record<string, unknown>;
  chave: string;
  confianca: Certeza;
};

// ---------------------------------------------------------------------------
// Fornecimento comparável
// ---------------------------------------------------------------------------

const inicioDe = (f: FornecimentoEnergia, fat: FaturaEnergia) => f.periodoInicio ?? fat.periodoInicio;
const fimDe = (f: FornecimentoEnergia, fat: FaturaEnergia) => f.periodoFim ?? fat.periodoFim;
const referencia = (fat: FaturaEnergia) => fat.periodoFim ?? fat.dataEmissao ?? fat.periodoInicio ?? "";

/** Mesmo fornecimento: mesmo tipo e, se as duas facturas o indicam, o mesmo CPE/CUI. */
export function mesmoFornecimento(a: FornecimentoEnergia, b: FornecimentoEnergia): boolean {
  return a.tipo === b.tipo && (!a.local || !b.local || a.local === b.local);
}

function diasSobrepostos(a: FornecimentoEnergia, fa: FaturaEnergia, b: FornecimentoEnergia, fb: FaturaEnergia): number {
  const ia = inicioDe(a, fa);
  const fA = fimDe(a, fa);
  const ib = inicioDe(b, fb);
  const fB = fimDe(b, fb);
  if (!ia || !fA || !ib || !fB) return 0;
  const inicio = ia > ib ? ia : ib;
  const fim = fA < fB ? fA : fB;
  return fim < inicio ? 0 : diasEntre(inicio, fim);
}

function meio(f: FornecimentoEnergia, fat: FaturaEnergia): number | null {
  const i = inicioDe(f, fat);
  const fim = fimDe(f, fat);
  if (!i || !fim) return null;
  return (Date.parse(`${i}T00:00:00Z`) + Date.parse(`${fim}T00:00:00Z`)) / 2 / 86_400_000;
}

type Par = { fatura: FaturaEnergia; f: FornecimentoEnergia };

/**
 * Fornecimento anterior comparável: o mais recente do mesmo fornecimento sem
 * sobreposição de período. `sobreposto` = a factura anterior mais recente
 * cobre os mesmos dias (factura de acerto/rectificativa).
 */
export function anteriorComparavel(atual: Par, anteriores: FaturaEnergia[]): { par: Par | null; sobreposto: boolean } {
  const candidatos = [...anteriores]
    .filter((x) => x.id !== atual.fatura.id)
    .sort((a, b) => (referencia(a) < referencia(b) ? 1 : -1))
    .flatMap((fatura) => fatura.energia.filter((f) => mesmoFornecimento(f, atual.f)).map((f) => ({ fatura, f })));
  if (candidatos.length === 0) return { par: null, sobreposto: false };
  const semSobreposicao = candidatos.find((c) => diasSobrepostos(c.f, c.fatura, atual.f, atual.fatura) <= SOBREPOSICAO_TOLERADA);
  const sobreposto = diasSobrepostos(candidatos[0].f, candidatos[0].fatura, atual.f, atual.fatura) > SOBREPOSICAO_TOLERADA;
  return { par: sobreposto ? null : semSobreposicao ?? null, sobreposto };
}

/** Mesmo período do ano anterior (para o consumo, que varia com a estação). */
function anoAnterior(atual: Par, anteriores: FaturaEnergia[]): Par | null {
  const m = meio(atual.f, atual.fatura);
  if (m === null) return null;
  for (const fatura of anteriores) {
    for (const f of fatura.energia.filter((x) => mesmoFornecimento(x, atual.f))) {
      const mx = meio(f, fatura);
      if (mx !== null && Math.abs(m - mx - 365) <= JANELA_ANO_ANTERIOR) return { fatura, f };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Decomposição da diferença
// ---------------------------------------------------------------------------

/** Mesma opção horária e o mesmo conjunto de períodos, todos com kWh e preço. */
export function estruturaCompativel(a: FornecimentoEnergia, b: FornecimentoEnergia): boolean {
  if (a.opcaoHoraria && b.opcaoHoraria && a.opcaoHoraria !== b.opcaoHoraria) return false;
  const completos = (f: FornecimentoEnergia) => f.energia.length > 0 && f.energia.every((p) => p.kwh !== null && p.precoMicro !== null);
  if (!completos(a) || !completos(b)) return false;
  const periodos = (f: FornecimentoEnergia) => [...new Set(f.energia.map((p) => p.periodo))].sort().join(",");
  return periodos(a) === periodos(b) && !a.energia.some((p) => p.periodo === "outro");
}

/** Parcelas somadas por período (algumas facturas dividem o mesmo período em duas linhas, ex. mudança de preço). */
function porPeriodo(f: FornecimentoEnergia): Map<string, { kwh: number; precoMicro: number }> {
  const m = new Map<string, { kwh: number; custo: number }>();
  for (const p of f.energia) {
    const x = m.get(p.periodo) ?? { kwh: 0, custo: 0 };
    x.kwh += p.kwh!;
    x.custo += p.kwh! * p.precoMicro!;
    m.set(p.periodo, x);
  }
  return new Map([...m].map(([k, v]) => [k, { kwh: v.kwh, precoMicro: v.kwh > 0 ? v.custo / v.kwh : 0 }]));
}

const estimada = (f: FornecimentoEnergia) => f.tipoLeitura === "estimada" || f.tipoLeitura === "mista";
const porDia = (kwh: number | null, dias: number | null) => (kwh !== null && dias ? Math.round((kwh / dias) * 100) / 100 : null);

export function decompor(atual: Par, anterior: Par): Decomposicao | null {
  const a = anterior.f;
  const b = atual.f;
  if (a.totalCents === null || b.totalCents === null) return null;
  const diferenca = b.totalCents - a.totalCents;
  const partes: { chave: ChaveComponente; valor: number }[] = [];
  let parcial = false;
  let certeza: Certeza = "alta";
  const compativel = estruturaCompativel(a, b);

  // ---- Energia ------------------------------------------------------------
  if (a.energiaCents !== null && b.energiaCents !== null) {
    const difEnergia = b.energiaCents - a.energiaCents;
    if (compativel) {
      const pa = porPeriodo(a);
      const pb = porPeriodo(b);
      let consumo = 0;
      let preco = 0;
      for (const [periodo, x] of pb) {
        const y = pa.get(periodo)!;
        consumo += ((x.kwh - y.kwh) * y.precoMicro) / 10_000;
        preco += (x.kwh * (x.precoMicro - y.precoMicro)) / 10_000;
      }
      // O que as linhas dizem (valor escrito) pode diferir de kWh × preço em
      // cêntimos: essa diferença fica nos arredondamentos.
      partes.push({ chave: "consumo", valor: consumo }, { chave: "preco_energia", valor: preco });
      partes.push({ chave: "energia", valor: difEnergia - consumo - preco });
    } else if (a.consumoKwh && b.consumoKwh !== null) {
      // Estruturas diferentes (ou parcelas incompletas): preço médio por kWh.
      const precoMedioAnterior = a.energiaCents / a.consumoKwh;
      const consumo = (b.consumoKwh - a.consumoKwh) * precoMedioAnterior;
      partes.push({ chave: "consumo", valor: consumo }, { chave: "preco_medio_energia", valor: difEnergia - consumo });
      certeza = "media";
    } else {
      partes.push({ chave: "energia", valor: difEnergia });
      parcial = true;
    }
  } else {
    parcial = true;
  }

  // ---- Potência / termo fixo (normalizado pelos dias) ---------------------
  if (a.termoFixoCents !== null && b.termoFixoCents !== null) {
    const difFixo = b.termoFixoCents - a.termoFixoCents;
    if (a.termoFixoDiaMicro !== null && b.termoFixoDiaMicro !== null && a.dias && b.dias) {
      const dias = ((b.dias - a.dias) * a.termoFixoDiaMicro) / 10_000;
      const preco = (b.dias * (b.termoFixoDiaMicro - a.termoFixoDiaMicro)) / 10_000;
      const mudouPotencia = a.potenciaKva !== null && b.potenciaKva !== null && a.potenciaKva !== b.potenciaKva;
      partes.push({ chave: "dias", valor: dias }, { chave: mudouPotencia ? "potencia" : "preco_termo_fixo", valor: preco });
      partes.push({ chave: "termo_fixo", valor: difFixo - dias - preco });
    } else {
      partes.push({ chave: "termo_fixo", valor: difFixo });
    }
  } else {
    parcial = true;
  }

  // ---- Restantes componentes ---------------------------------------------
  // Redes, descontos, acertos e serviços: ausentes = 0 (o que faltar fica
  // na parte não identificada). Impostos em falta = explicação parcial.
  const dif = (x: number | null, y: number | null) => (x ?? 0) - (y ?? 0);
  partes.push({ chave: "redes", valor: dif(b.redesCents, a.redesCents) });
  if (a.impostosCents !== null && b.impostosCents !== null) partes.push({ chave: "impostos", valor: b.impostosCents - a.impostosCents });
  else parcial = true;
  partes.push({ chave: "descontos", valor: -dif(b.descontosCents, a.descontosCents) });
  partes.push({ chave: "acertos", valor: dif(b.acertosCents, a.acertosCents) });
  partes.push({ chave: "servicos_adicionais", valor: dif(b.servicosAdicionaisCents, a.servicosAdicionaisCents) });

  // ---- Reconciliação ------------------------------------------------------
  // Cada componente é arredondado ao cêntimo. Quando a energia ou o termo
  // fixo foram divididos (consumo/preço, dias/preço), o que sobra entre o
  // valor escrito e kWh × preço é arredondamento — salvo se for maior do que
  // a tolerância (ex.: preço sem IVA e valor com IVA): fica então visível.
  const divididos = new Set<ChaveComponente>();
  if (partes.some((p) => p.chave === "consumo")) divididos.add("energia");
  if (partes.some((p) => p.chave === "dias")) divididos.add("termo_fixo");
  const componentes: { chave: ChaveComponente; cents: number }[] = [];
  for (const p of partes) {
    const cents = Math.round(p.valor);
    if (cents === 0 || (divididos.has(p.chave) && Math.abs(cents) <= TOLERANCIA_ARREDONDAMENTO_CENTS)) continue;
    componentes.push({ chave: p.chave, cents });
  }
  const explicado = componentes.reduce((s, c) => s + c.cents, 0);
  const resto = diferenca - explicado;
  let arredondamento = 0;
  let naoExplicado = 0;
  if (Math.abs(resto) <= TOLERANCIA_ARREDONDAMENTO_CENTS) arredondamento = resto;
  else {
    naoExplicado = resto;
    parcial = true;
  }

  componentes.sort((x, y) => Math.abs(y.cents) - Math.abs(x.cents));
  if (estimada(a) || estimada(b) || a.tipoLeitura === null || b.tipoLeitura === null) certeza = certeza === "alta" ? "media" : certeza;
  if (a.reconciliado === false || b.reconciliado === false) certeza = "media";
  if (parcial) certeza = "baixa";

  return {
    tipo: b.tipo,
    anteriorId: anterior.fatura.id,
    totalAnteriorCents: a.totalCents,
    totalAtualCents: b.totalCents,
    diferencaCents: diferenca,
    componentes,
    arredondamentoCents: arredondamento,
    naoExplicadoCents: naoExplicado,
    parcial,
    certeza,
    estruturaCompativel: compativel,
    estimada: estimada(a) || estimada(b),
    diasAnterior: a.dias,
    diasAtual: b.dias,
    consumoDiaAnterior: porDia(a.consumoKwh, a.dias),
    consumoDiaAtual: porDia(b.consumoKwh, b.dias),
  };
}

/** Parte da diferença que vem do consumo e parte que vem dos preços e de outros valores. */
export function separarConsumoPrecos(d: Pick<Decomposicao, "componentes" | "parcial" | "diferencaCents">): { consumoCents: number; outrosCents: number } | null {
  const consumo = d.componentes.find((c) => c.chave === "consumo");
  if (!consumo) return null;
  return { consumoCents: consumo.cents, outrosCents: d.diferencaCents - consumo.cents };
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

function chaveTexto(t: string) {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim();
}

const variou = (antes: number, depois: number, minimo: number) => Math.abs(depois - antes) >= Math.max(minimo, Math.abs(antes) * PRECO_MIN_RELATIVO);

export type ContextoEnergia = {
  /** Fim da promoção registada no contrato (contratos_versoes), se houver. */
  promocaoFim?: string | null;
};

/** Eventos de uma factura de electricidade/gás face às anteriores. */
export function compararEnergia(atual: FaturaEnergia, anteriores: FaturaEnergia[], contexto: ContextoEnergia = {}): EventoEnergia[] {
  const eventos: EventoEnergia[] = [];
  const periodo = atual.dataEmissao ?? atual.periodoFim ?? atual.periodoInicio;
  const fornecimentos = atual.energia.length;

  for (const f of atual.energia) {
    const sufixo = fornecimentos > 1 || f.tipo === "gas" ? `:${f.tipo}` : "";
    const evento = (
      tipo: EventoEnergia["tipo"],
      severidade: EventoEnergia["severidade"],
      montanteCents: number | null,
      dados: Record<string, unknown>,
      confianca: Certeza = "alta",
      detalhe = "",
    ) =>
      eventos.push({
        tipo,
        base: "historico",
        severidade,
        periodo,
        montanteCents,
        dados: { fornecimento: f.tipo, ...dados },
        chave: `${VERSAO_ENERGIA}:${atual.id}:${tipo}${sufixo}${detalhe ? `:${detalhe}` : ""}`,
        confianca,
      });

    // ---- Leituras e acertos (só desta factura) ----------------------------
    if (f.tipoLeitura === "estimada" || f.tipoLeitura === "mista") {
      evento("energia_leitura_estimada", "info", null, { leitura: f.tipoLeitura });
    }
    if (f.acertosCents) {
      const cobranca = f.acertosCents > 0;
      const relevante =
        cobranca && (f.acertosCents >= ACERTO_RELEVANTE_CENTS || (f.totalCents ? f.acertosCents >= f.totalCents * ACERTO_RELEVANTE_RELATIVO : false));
      evento("energia_acerto", relevante ? "atencao" : "info", Math.abs(f.acertosCents), {
        valor: f.acertosCents,
        inicio: f.acertoInicio,
        fim: f.acertoFim,
        kwh: f.acertoKwh,
      });
    }

    // ---- Factura comparável ---------------------------------------------
    const { par, sobreposto } = anteriorComparavel({ fatura: atual, f }, anteriores);
    if (!par) {
      if (sobreposto) evento("energia_dados_insuficientes", "info", null, { motivo: "periodo_sobreposto" }, "baixa");
      else if (anteriores.length > 0) evento("energia_dados_insuficientes", "info", null, { motivo: "sem_factura_comparavel" }, "baixa");
      continue;
    }
    const a = par.f;

    const d = decompor({ fatura: atual, f }, par);
    if (!d) evento("energia_dados_insuficientes", "info", null, { motivo: "sem_totais" }, "baixa");
    else {
      evento("energia_variacao", Math.abs(d.diferencaCents) <= IGUAL_CENTS ? "ok" : "info", Math.abs(d.diferencaCents), { ...d }, d.certeza);
    }

    // ---- Estrutura tarifária --------------------------------------------
    const mudouOpcao = !!(a.opcaoHoraria && f.opcaoHoraria && a.opcaoHoraria !== f.opcaoHoraria);
    const mudouTarifario = !!(a.tipoTarifario && f.tipoTarifario && a.tipoTarifario !== f.tipoTarifario);
    if (mudouOpcao || mudouTarifario) {
      evento("energia_tarifario_alterado", "atencao", null, {
        anterior: mudouOpcao ? a.opcaoHoraria : a.tipoTarifario,
        atual: mudouOpcao ? f.opcaoHoraria : f.tipoTarifario,
      });
    }

    // ---- Preço unitário da energia (só estruturas compatíveis) -----------
    if (!mudouTarifario && estruturaCompativel(a, f)) {
      const pa = porPeriodo(a);
      const subidas: { periodo: string; anterior: number; atual: number }[] = [];
      const descidas: { periodo: string; anterior: number; atual: number }[] = [];
      let efeito = 0;
      for (const [p, x] of porPeriodo(f)) {
        const y = pa.get(p)!;
        if (!variou(y.precoMicro, x.precoMicro, PRECO_MIN_MICRO)) continue;
        const item = { periodo: p, anterior: Math.round(y.precoMicro), atual: Math.round(x.precoMicro) };
        if (x.precoMicro > y.precoMicro) {
          subidas.push(item);
          efeito += (x.kwh * (x.precoMicro - y.precoMicro)) / 10_000;
        } else descidas.push(item);
      }
      const indexado = f.tipoTarifario === "indexado" || f.tipoTarifario === "dinamico" || a.tipoTarifario === "indexado" || a.tipoTarifario === "dinamico";
      const certeza: Certeza = f.tipoTarifario && a.tipoTarifario ? "alta" : "media";
      if (indexado && (subidas.length || descidas.length)) {
        evento("energia_preco_indexado", "info", null, { periodos: [...subidas, ...descidas], tarifario: f.tipoTarifario ?? a.tipoTarifario });
      } else {
        if (subidas.length) evento("energia_preco_alterado", "atencao", Math.round(efeito), { periodos: subidas, sentido: "subida" }, certeza);
        if (descidas.length) evento("energia_preco_alterado", "info", null, { periodos: descidas, sentido: "descida" }, certeza, "descida");
      }
    }

    // ---- Potência e termo fixo -------------------------------------------
    if (a.potenciaKva !== null && f.potenciaKva !== null && a.potenciaKva !== f.potenciaKva) {
      evento("energia_potencia_alterada", f.potenciaKva > a.potenciaKva ? "atencao" : "info", null, { anterior: a.potenciaKva, atual: f.potenciaKva });
    } else if (a.termoFixoDiaMicro !== null && f.termoFixoDiaMicro !== null && variou(a.termoFixoDiaMicro, f.termoFixoDiaMicro, TERMO_MIN_MICRO)) {
      const sobe = f.termoFixoDiaMicro > a.termoFixoDiaMicro;
      evento(
        "energia_termo_fixo_alterado",
        sobe ? "atencao" : "info",
        sobe && f.dias ? Math.round((f.dias * (f.termoFixoDiaMicro - a.termoFixoDiaMicro)) / 10_000) : null,
        { anterior: a.termoFixoDiaMicro, atual: f.termoFixoDiaMicro, sentido: sobe ? "subida" : "descida" },
      );
    }

    // ---- Consumo por dia (mesmo período do ano anterior, se houver) -------
    const base = anoAnterior({ fatura: atual, f }, anteriores) ?? par;
    const mediaAtual = porDia(f.consumoKwh, f.dias);
    const mediaBase = porDia(base.f.consumoKwh, base.f.dias);
    if (mediaAtual !== null && mediaBase !== null && mediaBase > 0) {
      if (mediaAtual >= mediaBase * (1 + CONSUMO_RELATIVO) && mediaAtual - mediaBase >= CONSUMO_MIN_KWH_DIA) {
        evento(
          "energia_consumo_superior",
          "info",
          null,
          { media_atual: mediaAtual, media_anterior: mediaBase, base: base === par ? "anterior" : "ano_anterior", estimada: estimada(f) || estimada(base.f) },
          estimada(f) || estimada(base.f) ? "media" : "alta",
        );
      }
    }

    // ---- Descontos ----------------------------------------------------------
    if (a.descontosCents && f.descontosCents !== null) {
      const inicio = f.periodoInicio ?? atual.periodoInicio;
      if (f.descontosCents === 0) {
        if (contexto.promocaoFim && inicio && contexto.promocaoFim < inicio) {
          eventos.push({
            tipo: "promocao_terminada",
            base: "contrato",
            severidade: "info",
            periodo,
            montanteCents: a.descontosCents,
            dados: { fornecimento: f.tipo, fim: contexto.promocaoFim },
            chave: `${VERSAO_ENERGIA}:${atual.id}:promocao_terminada${sufixo}`,
            confianca: "alta",
          });
        } else {
          evento("promocao_em_falta", "atencao", a.descontosCents, { desconto: a.descontosCents });
        }
      } else if (a.descontosCents - f.descontosCents > IGUAL_CENTS) {
        // Com menos dias facturados, um desconto diário dá menos: compara-se por dia.
        const porDiaA = a.dias ? a.descontosCents / a.dias : null;
        const porDiaF = f.dias ? f.descontosCents / f.dias : null;
        if (porDiaA === null || porDiaF === null || porDiaA - porDiaF > 0.5) {
          evento("promocao_alterada", "atencao", a.descontosCents - f.descontosCents, { anterior: a.descontosCents, atual: f.descontosCents });
        }
      }
    }

    // ---- Serviços adicionais ---------------------------------------------
    const anterioresServ = new Map(a.servicosAdicionais.map((s) => [chaveTexto(s.descricao), s]));
    for (const s of f.servicosAdicionais) {
      const k = chaveTexto(s.descricao);
      const antes = anterioresServ.get(k);
      if (!antes) {
        if (s.valorCents >= SERVICO_MIN_CENTS) evento("energia_servico_adicional", "atencao", s.valorCents, { descricao: s.descricao, novo: true, atual: s.valorCents }, "alta", k.replace(/\s+/g, "_"));
      } else if (s.valorCents - antes.valorCents >= SERVICO_MIN_CENTS) {
        evento(
          "energia_servico_adicional",
          "atencao",
          s.valorCents - antes.valorCents,
          { descricao: s.descricao, novo: false, anterior: antes.valorCents, atual: s.valorCents },
          "alta",
          k.replace(/\s+/g, "_"),
        );
      }
    }
  }
  return eventos;
}
