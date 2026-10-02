// DoLado — Monitor de Faturas (F2): regras sobre o histórico estruturado.
//
// Código puro (sem I/O; `npm test`). A IA só leu as faturas; aqui comparam-se
// valores já normalizados. Cada regra tem versão: mudar a interpretação =
// nova versão, sem alterar resultados antigos.
//
// Nenhuma regra conclui nada sobre a lei ou o contrato: o resultado é uma
// situação que merece ser verificada, sempre revista por uma pessoa antes de
// chegar ao cliente (docs/especificacoes/F2_MONITOR_FATURAS.md, secção 12).
// Linguagem: nunca "sem aviso", "não pedido" nem "cobrado indevidamente".

import type { LinhaFatura } from "./extracaoFatura.ts";
import { formatarDataPt, formatarEurosCents } from "./contratos.ts";

export const VERSAO_REGRA = {
  aumento_nao_explicado: "f2_aumento_v1",
  linha_nova: "f2_linha_nova_v1",
  possivel_dupla_faturacao: "f2_dupla_v1",
} as const;

export type TipoAchadoF2 = keyof typeof VERSAO_REGRA;

export type FaturaHistorico = {
  id: string;
  dataEmissao: string | null;
  periodoInicio: string | null;
  periodoFim: string | null;
  recorrenteCents: number | null;
  linhas: LinhaFatura[];
};

export type ContextoContrato = {
  dataFimPromocao: string | null;
};

export type AchadoProposto = {
  tipo: TipoAchadoF2;
  versaoRegra: string;
  chave: string;
  evidencia: Record<string, unknown>;
  textoProposto: string;
};

// Aumento material: pelo menos 1 € e 2% do valor anterior.
const AUMENTO_MINIMO_CENTS = 100;
const AUMENTO_MINIMO_PCT = 2;
// Linha recorrente com valor relevante (1 € ou mais).
const LINHA_MATERIAL_CENTS = 100;
// Faturas anteriores consideradas para "linha nova".
const FATURAS_ANTERIORES_LINHA_NOVA = 3;
const CATEGORIAS_IGNORADAS = new Set(["imposto", "desconto"]);

export function chaveDescricao(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\d+([.,]\d+)?/g, " ")
    .replace(/[^a-z]+/g, " ")
    .trim();
}

function referencia(f: FaturaHistorico): string | null {
  return f.periodoFim ?? f.dataEmissao;
}

function mesAno(iso: string | null): string {
  if (!iso) return "data desconhecida";
  const [a, m] = iso.split("-");
  return `${m}/${a}`;
}

// Ordena por fim de período (ou data de emissão); faturas sem data ficam de fora.
export function ordenarHistorico(faturas: FaturaHistorico[]): FaturaHistorico[] {
  return faturas.filter((f) => referencia(f)).sort((a, b) => (referencia(a)! < referencia(b)! ? -1 : 1));
}

// ---------------------------------------------------------------------------
// 7.1 Aumento não explicado pelos dados do contrato
// ---------------------------------------------------------------------------

export type ClassificacaoAumento =
  | { resultado: "sem_aumento" | "sem_dados" }
  | { resultado: "explicado"; motivo: "fim_promocao"; anteriorCents: number; atualCents: number }
  | { resultado: "nao_explicado"; anteriorCents: number; atualCents: number; diferencaCents: number; pct: number };

export function classificarAumento(anterior: FaturaHistorico, atual: FaturaHistorico, contrato: ContextoContrato): ClassificacaoAumento {
  if (anterior.recorrenteCents == null || atual.recorrenteCents == null || anterior.recorrenteCents <= 0) {
    return { resultado: "sem_dados" };
  }
  const diferenca = atual.recorrenteCents - anterior.recorrenteCents;
  const pct = (diferenca / anterior.recorrenteCents) * 100;
  if (diferenca < AUMENTO_MINIMO_CENTS || pct < AUMENTO_MINIMO_PCT) return { resultado: "sem_aumento" };

  // Um fim de promoção registado entre as duas faturas explica o aumento.
  const desde = anterior.periodoInicio ?? referencia(anterior);
  const ate = atual.periodoFim ?? referencia(atual);
  if (contrato.dataFimPromocao && desde && ate && contrato.dataFimPromocao >= desde && contrato.dataFimPromocao <= ate) {
    return { resultado: "explicado", motivo: "fim_promocao", anteriorCents: anterior.recorrenteCents, atualCents: atual.recorrenteCents };
  }

  return {
    resultado: "nao_explicado",
    anteriorCents: anterior.recorrenteCents,
    atualCents: atual.recorrenteCents,
    diferencaCents: diferenca,
    pct: Math.round(pct * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// Avaliação de uma fatura nova contra o histórico
// ---------------------------------------------------------------------------

export function avaliarFatura(atualId: string, historico: FaturaHistorico[], contrato: ContextoContrato): AchadoProposto[] {
  const ordenado = ordenarHistorico(historico);
  const atual = ordenado.find((f) => f.id === atualId) ?? historico.find((f) => f.id === atualId);
  if (!atual) return [];
  const indice = ordenado.findIndex((f) => f.id === atualId);
  const anteriores = indice > 0 ? ordenado.slice(0, indice) : [];
  const achados: AchadoProposto[] = [];

  // 7.1 Aumento
  const anterior = anteriores.at(-1);
  if (anterior) {
    const c = classificarAumento(anterior, atual, contrato);
    if (c.resultado === "nao_explicado") {
      achados.push({
        tipo: "aumento_nao_explicado",
        versaoRegra: VERSAO_REGRA.aumento_nao_explicado,
        chave: `${VERSAO_REGRA.aumento_nao_explicado}:${atual.id}`,
        evidencia: {
          fatura_anterior_id: anterior.id,
          fatura_atual_id: atual.id,
          periodo_anterior: referencia(anterior),
          periodo_atual: referencia(atual),
          anterior_cents: c.anteriorCents,
          atual_cents: c.atualCents,
          diferenca_cents: c.diferencaCents,
          pct: c.pct,
          data_fim_promocao_registada: contrato.dataFimPromocao,
        },
        textoProposto:
          `O valor recorrente da fatura passou de ${formatarEurosCents(c.anteriorCents)} para ${formatarEurosCents(c.atualCents)} ` +
          `(+${String(c.pct).replace(".", ",")}%) entre as faturas de ${mesAno(referencia(anterior))} e de ${mesAno(referencia(atual))}. ` +
          "Não encontrámos nos dados do contrato que temos registados uma alteração que explique este aumento. Merece ser verificado junto do fornecedor.",
      });
    }
  }

  // 7.2 Linha / serviço recorrente novo
  const comparadas = anteriores.slice(-FATURAS_ANTERIORES_LINHA_NOVA);
  if (comparadas.length > 0) {
    const conhecidas = new Set(comparadas.flatMap((f) => f.linhas.map((l) => chaveDescricao(l.descricao))));
    const vistas = new Set<string>();
    for (const l of atual.linhas) {
      const chave = chaveDescricao(l.descricao);
      if (!chave || vistas.has(chave)) continue;
      vistas.add(chave);
      if (l.recorrente !== true || l.valorCents < LINHA_MATERIAL_CENTS || CATEGORIAS_IGNORADAS.has(l.categoria)) continue;
      if (conhecidas.has(chave)) continue;
      achados.push({
        tipo: "linha_nova",
        versaoRegra: VERSAO_REGRA.linha_nova,
        chave: `${VERSAO_REGRA.linha_nova}:${atual.id}:${chave}`,
        evidencia: {
          fatura_atual_id: atual.id,
          descricao: l.descricao,
          valor_cents: l.valorCents,
          categoria: l.categoria,
          faturas_comparadas: comparadas.map((f) => f.id),
        },
        textoProposto:
          `Apareceu uma cobrança recorrente de ${formatarEurosCents(l.valorCents)} com a descrição “${l.descricao}”, ` +
          `que não estava ${comparadas.length === 1 ? "na fatura anterior" : `nas ${comparadas.length} faturas anteriores`}. ` +
          "Merece ser verificada: confirme se corresponde a um serviço que pediu.",
      });
    }
  }

  // 7.3 Possível dupla faturação
  // a) duas linhas iguais na mesma fatura
  const porLinha = new Map<string, LinhaFatura[]>();
  for (const l of atual.linhas) {
    if (l.valorCents < LINHA_MATERIAL_CENTS || CATEGORIAS_IGNORADAS.has(l.categoria)) continue;
    const chave = `${chaveDescricao(l.descricao)}|${l.valorCents}`;
    porLinha.set(chave, [...(porLinha.get(chave) ?? []), l]);
  }
  for (const [chave, linhas] of porLinha) {
    if (linhas.length < 2 || !chave.split("|")[0]) continue;
    achados.push({
      tipo: "possivel_dupla_faturacao",
      versaoRegra: VERSAO_REGRA.possivel_dupla_faturacao,
      chave: `${VERSAO_REGRA.possivel_dupla_faturacao}:${atual.id}:${chave}`,
      evidencia: { fatura_atual_id: atual.id, descricao: linhas[0].descricao, valor_cents: linhas[0].valorCents, ocorrencias: linhas.length },
      textoProposto:
        `Encontrámos ${linhas.length} cobranças semelhantes na mesma fatura (“${linhas[0].descricao}”, ${formatarEurosCents(linhas[0].valorCents)} cada). ` +
        "Pode tratar-se de uma cobrança em duplicado e deve ser verificado.",
    });
  }
  // b) outra fatura do mesmo contrato para o mesmo período
  if (atual.periodoInicio && atual.periodoFim) {
    const mesmoPeriodo = historico.find(
      (f) => f.id !== atual.id && f.periodoInicio === atual.periodoInicio && f.periodoFim === atual.periodoFim,
    );
    if (mesmoPeriodo) {
      const [a, b] = [atual.id, mesmoPeriodo.id].sort();
      achados.push({
        tipo: "possivel_dupla_faturacao",
        versaoRegra: VERSAO_REGRA.possivel_dupla_faturacao,
        chave: `${VERSAO_REGRA.possivel_dupla_faturacao}:periodo:${a}:${b}`,
        evidencia: { faturas: [a, b], periodo_inicio: atual.periodoInicio, periodo_fim: atual.periodoFim },
        textoProposto:
          `Encontrámos duas faturas para o mesmo período (${formatarDataPt(atual.periodoInicio)} a ${formatarDataPt(atual.periodoFim)}). ` +
          "Pode tratar-se de uma faturação em duplicado e deve ser verificado.",
      });
    }
  }

  return achados;
}
