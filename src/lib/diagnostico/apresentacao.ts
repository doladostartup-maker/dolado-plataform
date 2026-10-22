// Diagnóstico gratuito — organização do resultado em três áreas (22/10/2026,
// landing /analisar-fatura). Só apresentação, sem I/O e sem IA: tudo o que
// aparece aqui vem do diagnóstico já gravado (factos lidos com confiança
// alta/média e cálculos feitos em código em regras.ts).
//
//   A. O que identificámos — o que foi lido e calculado.
//   B. O que merece confirmação — situações determinadas por regras fixas
//      (datas a terminar, totais que não batem certo, cobranças que não se
//      repetem, dados que não foi possível ler, condições que só o contrato
//      confirma), sempre com a indicação de onde vem: do documento, não
//      confirmado, ou só com o contrato. Nunca uma conclusão de que algo
//      está errado (regras 2 e 4 do "Uso de IA"; decisão de 22/10/2026:
//      nada de "pontos de atenção" interpretados).
//   C. O que recomendamos — passos práticos fixos, escolhidos pelas
//      situações de B. Informação geral, nunca aconselhamento jurídico.

import type { Calculo, Diagnostico } from "./regras.ts";

/** Datas de fim (fidelização, promoção) a este número de dias ou menos passam para "merece confirmação". */
export const DIAS_DATA_PROXIMA = 90;

export type OrigemItem = "documento" | "nao_confirmado" | "contrato";

export type ItemConfirmar =
  | { chave: "soma_linhas_difere"; origem: "documento"; somaCents: number; totalCents: number }
  | { chave: "diferenca_mensalidade"; origem: "documento"; diferencaCents: number; mensalidadeCents: number }
  | { chave: "cobrancas_pontuais"; origem: "documento"; quantidade: number; totalCents: number }
  | { chave: "data_proxima"; origem: "documento"; tipo: "fidelizacao" | "promocao"; data: string; dias: number }
  | { chave: "data_passada"; origem: "documento"; tipo: "fidelizacao" | "promocao"; data: string }
  | { chave: "por_confirmar"; origem: "nao_confirmado"; campo: string }
  | { chave: "so_com_contrato"; origem: "contrato" };

export type Recomendacao =
  | "anotar_data"
  | "comparar_anterior"
  | "pedir_esclarecimento"
  | "rever_condicoes"
  | "pdf_original"
  | "ter_contrato"
  | "comparar_facturas_contrato"
  | "guardar_factura";

export type SeccoesDiagnostico = {
  /** Cálculos que ficam em "O que identificámos" (os restantes passam para B). */
  calculos: Calculo[];
  confirmar: ItemConfirmar[];
  recomendacoes: Recomendacao[];
};

const MAX_RECOMENDACOES = 4;

function tipoData(c: Calculo): "fidelizacao" | "promocao" {
  return c.chave.includes("promocao") ? "promocao" : "fidelizacao";
}

export function seccoesDiagnostico(d: Diagnostico): SeccoesDiagnostico {
  const calculos: Calculo[] = [];
  const confirmar: ItemConfirmar[] = [];

  for (const c of d.calculos) {
    switch (c.chave) {
      case "soma_linhas":
        if (c.coincide) calculos.push(c);
        else confirmar.push({ chave: "soma_linhas_difere", origem: "documento", somaCents: c.somaCents, totalCents: c.totalCents });
        break;
      case "diferenca_mensalidade":
        // Só uma factura com mais do que a mensalidade pede confirmação;
        // com menos (descontos, créditos), a conta fica em A.
        if (c.diferencaCents > 0) {
          confirmar.push({ chave: "diferenca_mensalidade", origem: "documento", diferencaCents: c.diferencaCents, mensalidadeCents: c.mensalidadeCents });
        } else calculos.push(c);
        break;
      case "dias_fim_fidelizacao":
      case "dias_fim_promocao":
        if (c.dias <= DIAS_DATA_PROXIMA) confirmar.push({ chave: "data_proxima", origem: "documento", tipo: tipoData(c), data: c.data, dias: c.dias });
        else calculos.push(c);
        break;
      case "fidelizacao_terminada":
      case "promocao_terminada":
        confirmar.push({ chave: "data_passada", origem: "documento", tipo: tipoData(c), data: c.data });
        break;
      default:
        calculos.push(c);
    }
  }

  const pontuais = d.linhas.filter((l) => l.recorrente === false && l.valorCents > 0);
  if (pontuais.length) {
    confirmar.push({
      chave: "cobrancas_pontuais",
      origem: "documento",
      quantidade: pontuais.length,
      totalCents: pontuais.reduce((s, l) => s + l.valorCents, 0),
    });
  }

  for (const campo of d.porConfirmar) confirmar.push({ chave: "por_confirmar", origem: "nao_confirmado", campo });
  // Uma factura mostra o que foi cobrado; as condições acordadas (preço,
  // fidelização, promoções) só o contrato as confirma.
  if (d.tipo === "fatura") confirmar.push({ chave: "so_com_contrato", origem: "contrato" });

  return { calculos, confirmar, recomendacoes: recomendacoesPara(d, confirmar) };
}

function recomendacoesPara(d: Diagnostico, confirmar: ItemConfirmar[]): Recomendacao[] {
  const tem = (chave: ItemConfirmar["chave"]) => confirmar.some((i) => i.chave === chave);
  const r: Recomendacao[] = [];

  if (tem("data_proxima")) r.push("anotar_data");
  if (tem("data_passada")) r.push("rever_condicoes");
  if (tem("cobrancas_pontuais") || tem("diferenca_mensalidade") || tem("soma_linhas_difere")) {
    r.push("comparar_anterior", "pedir_esclarecimento");
  }
  if (confirmar.some((i) => i.chave === "por_confirmar" && (i.campo === "total" || i.campo === "periodo"))) r.push("pdf_original");
  r.push(d.tipo === "fatura" ? "ter_contrato" : "comparar_facturas_contrato");
  if (d.tipo === "fatura" && !r.includes("comparar_anterior")) r.push("guardar_factura");

  return r.slice(0, MAX_RECOMENDACOES);
}
