// DoLado — perfil de seleção das regras jurídicas para casos de painéis
// solares (Energia → Autoconsumo). Sem I/O; `npm test`.
//
// Um caso solar é a venda, instalação ou registo de equipamento — não o
// fornecimento de eletricidade. Por isso, em vez do critério geral (setor +
// categoria + corte alfabético), este perfil:
//   * aceita regras gerais, de Compras & Reembolsos (DL 84/2021, DL 24/2014
//     — sem lhes mudar o setor) e de Energia só da categoria Autoconsumo
//     (e CAER, quando o contrato o indica);
//   * exclui as regras do fornecimento de energia (cortes, cauções, tarifa
//     social, leituras, faturação, mudança de comercializador…) e as da Lei
//     n.º 23/96 — a venda e instalação de painéis não é serviço público
//     essencial;
//   * só considera contratação à distância/fora do estabelecimento, crédito
//     coligado e CAER quando as respostas do caso (detalhes_caso) o indicam;
//   * ordena por prioridade (1 = mais relevante para o tipo de problema) e só
//     depois aplica o limite MAX_REGRAS_AUTOCONSUMO.
// Mudar as prioridades é uma decisão de produto/jurídica (Thiago): decide que
// fundamentos a IA pode considerar. Testes: autoconsumo.test.mjs.

import {
  PROBLEMA_SOLAR_CONTRATO,
  PROBLEMA_SOLAR_INSTALACAO,
  PROBLEMA_SOLAR_REGISTO,
  type DetalhesCaso,
} from "../pedidoCaso.ts";
import type { RegraJuridica } from "./regras.ts";

/** Limite próprio, aplicado só depois da filtragem e da ordenação. */
export const MAX_REGRAS_AUTOCONSUMO = 18;

export const CATEGORIA_AUTOCONSUMO = "Autoconsumo";
export const CATEGORIA_CAER = "CAER";
export const CATEGORIA_CREDITO_COLIGADO = "Crédito coligado";
export const CATEGORIA_DANOS = "Danos";

/** Categorias que só chegam à IA por este perfil (nunca pelo critério geral). */
export const CATEGORIAS_SO_AUTOCONSUMO: readonly string[] = [CATEGORIA_AUTOCONSUMO, CATEGORIA_CAER, CATEGORIA_CREDITO_COLIGADO];

/** Setores de onde o perfil aceita regras (além das gerais). */
const SETOR_COMPRAS = "Compras & Reembolsos";
const SETOR_ENERGIA = "Energia";

/** Grupos de regras com aplicabilidade condicional (pelo diploma ou pela categoria). */
type Grupo = "dl24" | "credito" | "caer" | "spe" | "outro";

const DL_24_2014 = /\b(?:Decreto-Lei|DL)\s+n\.?\s*º?\s*24\/2014\b/i;
const DL_133_2009 = /\b(?:Decreto-Lei|DL)\s+n\.?\s*º?\s*133\/2009\b/i;
const LEI_29_2026 = /\bLei\s+n\.?\s*º?\s*29\/2026\b/i;
const LEI_23_96 = /\bLei\s+n\.?\s*º?\s*23\/96\b/i;

const norm = (v: string | null | undefined) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function grupoDaRegra(r: Pick<RegraJuridica, "codigo" | "diploma" | "categoria">): Grupo {
  if (LEI_23_96.test(r.diploma) || /^SPE[_-]/.test(r.codigo)) return "spe";
  if (DL_133_2009.test(r.diploma) || norm(r.categoria) === norm(CATEGORIA_CREDITO_COLIGADO)) return "credito";
  if (LEI_29_2026.test(r.diploma) || norm(r.categoria) === norm(CATEGORIA_CAER)) return "caer";
  if (DL_24_2014.test(r.diploma)) return "dl24";
  return "outro";
}

/** Primeiro artigo citado na regra ("Artigo 5.º, n.º 8" → 5). */
function primeiroArtigo(artigo: string | null): number | null {
  const m = /(\d+)\.?\s*º/.exec(artigo ?? "");
  return m ? Number(m[1]) : null;
}

/**
 * Regras do DL 24/2014 por modalidade de contratação, pelo artigo:
 * 5.º, 6.º e 19.º só à distância; 9.º só fora do estabelecimento; 2.º
 * (compra na loja, sem livre resolução) só no estabelecimento. As restantes
 * (4.º, 10.º a 17.º) valem para as duas modalidades do regime.
 */
function modalidadeDl24(r: Pick<RegraJuridica, "artigo">): "distancia" | "fora" | "loja" | "ambas" {
  const a = primeiroArtigo(r.artigo);
  if (a === 5 || a === 6 || a === 19) return "distancia";
  if (a === 9) return "fora";
  if (a === 2) return "loja";
  return "ambas";
}

const SEM_DETALHES: DetalhesCaso = { forma_contratacao: "nao_sei", financiamento: "nao_sei", tipo_contrato_solar: "nao_sei" };

/**
 * A regra pode ser considerada para este caso solar? (antes da prioridade)
 * Exclui pela aplicabilidade real ao caso, não só pelo diploma.
 */
export function regraAplicavelAutoconsumo(r: RegraJuridica, detalhes: DetalhesCaso | null): boolean {
  const d = detalhes ?? SEM_DETALHES;
  const setor = norm(r.setor);
  const cat = norm(r.categoria);

  // Setores: gerais, Compras & Reembolsos e, de Energia, só Autoconsumo/CAER.
  if (setor && setor !== norm(SETOR_COMPRAS) && setor !== norm(SETOR_ENERGIA)) return false;
  if (setor === norm(SETOR_ENERGIA) && cat !== norm(CATEGORIA_AUTOCONSUMO) && cat !== norm(CATEGORIA_CAER)) return false;

  switch (grupoDaRegra(r)) {
    case "spe":
      return false;
    case "credito":
      // Só com indícios de unidade económica: financiamento apresentado ou
      // contratado com a compra. Empréstimo independente ou "não sei" → fora.
      return d.financiamento === "sim_com_compra";
    case "caer":
      return d.tipo_contrato_solar === "caer";
    case "dl24": {
      const m = modalidadeDl24(r);
      switch (d.forma_contratacao) {
        case "estabelecimento":
          return m === "loja";
        case "distancia":
          return m === "ambas" || m === "distancia";
        case "domicilio":
        case "fora_estabelecimento":
          return m === "ambas" || m === "fora";
        default: // não sei: pode ser qualquer uma — a pessoa confirma
          return m !== "loja";
      }
    }
    default:
      return true;
  }
}

// ---------------------------------------------------------------------------
// Prioridades (1 = mais relevante). Por tipo de problema:
//   1 — diretamente relacionada com o problema escolhido;
//   2 — gerais indispensáveis (conformidade, instalação, entrega, garantia,
//       reparação, resolução, livre resolução quando aplicável);
//   3 — específicas de autoconsumo/UPAC;
//   4 — complementares (práticas comerciais, cláusulas, financiamento,
//       danos, fabricante);
//   5 — sempre enviadas (reclamação, resolução de conflitos) e o resto.

type Prioridades = {
  /** Prioridade por categoria da regra (normalizada). */
  categorias: Record<string, number>;
  /** Regras do DL 24/2014 (contratação à distância/fora do estabelecimento). */
  dl24: number;
  /** Crédito coligado, quando aplicável. */
  credito: number;
  /** CAER, quando aplicável. */
  caer: number;
  /** Ajustes por regra neste tipo de problema (prevalecem sobre AJUSTES). */
  ajustes?: Record<string, number>;
};

const PRIORIDADES: Record<string, Prioridades> = {
  [PROBLEMA_SOLAR_INSTALACAO]: {
    categorias: {
      Conformidade: 1,
      Entrega: 1,
      Garantia: 2,
      Reembolso: 2,
      [CATEGORIA_DANOS]: 2,
      [CATEGORIA_AUTOCONSUMO]: 3,
      "Prática comercial": 4,
      Contrato: 4,
      Cobrança: 4,
      Pagamento: 4,
      "Livre resolução": 4,
    },
    dl24: 4,
    credito: 2,
    caer: 2,
    // Instalação incorreta: quem instalou tem de estar habilitado (DL 15/2022, art. 84.º).
    ajustes: { UPAC_INSTALADOR_84: 2 },
  },
  [PROBLEMA_SOLAR_CONTRATO]: {
    categorias: {
      "Livre resolução": 1,
      "Prática comercial": 1,
      Contrato: 2,
      Cancelamento: 2,
      "Alteração contratual": 2,
      Cobrança: 2,
      Pagamento: 2,
      Conformidade: 2,
      Reembolso: 2,
      Entrega: 3,
      Garantia: 4,
      [CATEGORIA_AUTOCONSUMO]: 4,
      [CATEGORIA_DANOS]: 4,
    },
    dl24: 1,
    credito: 1,
    caer: 1,
    // Complementares: contratos acessórios só se existirem; a retratação da
    // Lei 24/96 (falta de informação) não é a livre resolução.
    ajustes: { DIST_ACESSORIOS_16: 3, CONS_RETRATACAO_INFO_8: 3 },
  },
  [PROBLEMA_SOLAR_REGISTO]: {
    categorias: {
      [CATEGORIA_AUTOCONSUMO]: 1,
      Conformidade: 2,
      Entrega: 2,
      // O que a empresa prometeu sobre "legalização"/registo.
      Contrato: 3,
      "Prática comercial": 3,
      Cobrança: 4,
      Garantia: 4,
      Reembolso: 4,
      [CATEGORIA_DANOS]: 4,
    },
    dl24: 4,
    credito: 2,
    caer: 2,
    ajustes: { COMPRA_REJEICAO_30D_16: 4 },
  },
};

/**
 * Ajustes por regra (decisão de produto, 13/10/2026): o fabricante só como
 * complemento; transporte e bens usados raramente se aplicam a uma
 * instalação feita pelo profissional; regras de Compras sobre a recolha e
 * devolução de bens da livre resolução ficam atrás das gerais.
 */
const AJUSTES: Record<string, number> = {
  GAR_PRODUTOR_DIRETO_40: 4,
  COMPRA_RISCO_TRANSPORTE_11: 5,
  COMPRA_BENS_USADOS_12_13: 5,
};

const PRIORIDADE_MINIMA = 5;

export function prioridadeAutoconsumo(r: RegraJuridica, problema: string): number {
  const p = PRIORIDADES[problema];
  if (!p) return PRIORIDADE_MINIMA;
  const ajuste = p.ajustes?.[r.codigo] ?? AJUSTES[r.codigo];
  if (ajuste !== undefined) return ajuste;
  switch (grupoDaRegra(r)) {
    case "dl24":
      return p.dl24;
    case "credito":
      return p.credito;
    case "caer":
      return p.caer;
    default: {
      const porCategoria = Object.entries(p.categorias).find(([c]) => norm(c) === norm(r.categoria));
      return porCategoria ? porCategoria[1] : PRIORIDADE_MINIMA;
    }
  }
}

/**
 * Regras para um caso solar: aplicáveis (regraAplicavelAutoconsumo), por
 * prioridade; no mesmo nível, regras específicas (de um setor) antes das
 * gerais, depois pela ordem das categorias e só por fim pelo código. As
 * regras já têm de estar em vigor (regraEmVigor) — o chamador filtra.
 */
export function selecionarRegrasAutoconsumo(
  problema: string,
  detalhes: DetalhesCaso | null,
  regrasEmVigor: RegraJuridica[],
): RegraJuridica[] {
  return regrasEmVigor
    .filter((r) => regraAplicavelAutoconsumo(r, detalhes))
    .map((r) => ({ r, prioridade: prioridadeAutoconsumo(r, problema) }))
    .sort(
      (a, b) =>
        a.prioridade - b.prioridade ||
        Number(!!b.r.setor) - Number(!!a.r.setor) ||
        norm(a.r.categoria).localeCompare(norm(b.r.categoria)) ||
        a.r.codigo.localeCompare(b.r.codigo),
    )
    .slice(0, MAX_REGRAS_AUTOCONSUMO)
    .map(({ r }) => r);
}

/** Categorias consideradas por cada tipo de problema solar (formulário do backoffice e testes). */
export function categoriasAutoconsumo(problema: string): string[] {
  const p = PRIORIDADES[problema];
  return p ? Object.keys(p.categorias) : [];
}
