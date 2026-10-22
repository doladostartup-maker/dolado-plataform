// Diagnóstico gratuito — organização do resultado em duas áreas (22/10/2026,
// landing /analisar-fatura). Só apresentação, sem I/O e sem IA: tudo o que
// aparece aqui vem do diagnóstico já gravado (factos lidos com confiança
// alta/média e cálculos feitos em código em regras.ts).
//
//   A. O que identificámos — o que foi lido e calculado.
//   B. Em destaque no documento — os mesmos factos e contas, escolhidos por
//      regras fixas (datas a terminar ou já terminadas, linhas que não somam
//      o total, total acima da mensalidade, cobranças que não se repetem, o
//      que não foi possível ler, o que só consta do contrato), cada um com a
//      origem: do documento, não confirmado, ou do contrato.
//
// Só factos (decisão de Thiago, 22/10/2026): nunca uma conclusão de que algo
// está errado, nem passos a seguir ou recomendações para o caso da pessoa —
// isso aproxima-se do aconselhamento individual (regras 2 e 4 do "Uso de
// IA"). O que merecer atenção chega pelo Monitor, com revisão humana.

import type { Calculo, Diagnostico } from "./regras.ts";

/** Datas de fim (fidelização, promoção) a este número de dias ou menos passam para "Em destaque". */
export const DIAS_DATA_PROXIMA = 90;

export type OrigemItem = "documento" | "nao_confirmado" | "contrato";

export type ItemDestaque =
  | { chave: "soma_linhas_difere"; origem: "documento"; somaCents: number; totalCents: number }
  | { chave: "diferenca_mensalidade"; origem: "documento"; diferencaCents: number; mensalidadeCents: number }
  | { chave: "cobrancas_pontuais"; origem: "documento"; quantidade: number; totalCents: number }
  | { chave: "data_proxima"; origem: "documento"; tipo: "fidelizacao" | "promocao"; data: string; dias: number }
  | { chave: "data_passada"; origem: "documento"; tipo: "fidelizacao" | "promocao"; data: string }
  | { chave: "por_confirmar"; origem: "nao_confirmado"; campo: string }
  | { chave: "so_com_contrato"; origem: "contrato" };

export type SeccoesDiagnostico = {
  /** Cálculos que ficam em "O que identificámos" (os restantes passam para B). */
  calculos: Calculo[];
  destaques: ItemDestaque[];
};

function tipoData(c: Calculo): "fidelizacao" | "promocao" {
  return c.chave.includes("promocao") ? "promocao" : "fidelizacao";
}

export function seccoesDiagnostico(d: Diagnostico): SeccoesDiagnostico {
  const calculos: Calculo[] = [];
  const destaques: ItemDestaque[] = [];

  for (const c of d.calculos) {
    switch (c.chave) {
      case "soma_linhas":
        if (c.coincide) calculos.push(c);
        else destaques.push({ chave: "soma_linhas_difere", origem: "documento", somaCents: c.somaCents, totalCents: c.totalCents });
        break;
      case "diferenca_mensalidade":
        // Só uma factura com mais do que a mensalidade fica em destaque;
        // com menos (descontos, créditos), a conta fica em A.
        if (c.diferencaCents > 0) {
          destaques.push({ chave: "diferenca_mensalidade", origem: "documento", diferencaCents: c.diferencaCents, mensalidadeCents: c.mensalidadeCents });
        } else calculos.push(c);
        break;
      case "dias_fim_fidelizacao":
      case "dias_fim_promocao":
        if (c.dias <= DIAS_DATA_PROXIMA) destaques.push({ chave: "data_proxima", origem: "documento", tipo: tipoData(c), data: c.data, dias: c.dias });
        else calculos.push(c);
        break;
      case "fidelizacao_terminada":
      case "promocao_terminada":
        destaques.push({ chave: "data_passada", origem: "documento", tipo: tipoData(c), data: c.data });
        break;
      default:
        calculos.push(c);
    }
  }

  const pontuais = d.linhas.filter((l) => l.recorrente === false && l.valorCents > 0);
  if (pontuais.length) {
    destaques.push({
      chave: "cobrancas_pontuais",
      origem: "documento",
      quantidade: pontuais.length,
      totalCents: pontuais.reduce((s, l) => s + l.valorCents, 0),
    });
  }

  for (const campo of d.porConfirmar) destaques.push({ chave: "por_confirmar", origem: "nao_confirmado", campo });
  // Uma factura mostra o que foi cobrado; as condições acordadas (preço,
  // fidelização, promoções) constam do contrato.
  if (d.tipo === "fatura") destaques.push({ chave: "so_com_contrato", origem: "contrato" });

  return { calculos, destaques };
}
