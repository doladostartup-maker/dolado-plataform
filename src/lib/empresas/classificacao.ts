// DoLado Empresas — classificação de cada resultado mostrado à empresa
// (regras sem I/O). Fase 6B. Três classes, sempre com a evidência por trás e
// nunca uma conclusão sobre a lei ("irregular", "indevido", "ilegal"):
//  - facto confirmado por evidência documental: lido com confiança e, quando
//    a revisão era necessária, já revisto;
//  - requer verificação: diferença potencial ou leitura incerta ainda por
//    rever;
//  - informação insuficiente: o valor não foi lido.
// Sem contrato, as verificações contratuais ficam sempre provisórias.

export type Classificacao = "facto_confirmado" | "requer_verificacao" | "informacao_insuficiente";

export const TEXTO_CLASSIFICACAO: Record<Classificacao, string> = {
  facto_confirmado: "Facto confirmado por evidência documental",
  requer_verificacao: "Requer verificação",
  informacao_insuficiente: "Informação insuficiente",
};

export type EntradaClassificacao = {
  /** O valor/facto foi lido do documento. */
  valorLido: boolean;
  /** Confiança baixa ou ambígua na leitura. */
  confiancaBaixa: boolean;
  /** Diferença potencial (aumento, cobrança nova, duplicado…). */
  diferencaPotencial: boolean;
  /** É uma verificação contra condições contratuais. */
  contratual: boolean;
  /** O serviço tem contrato registado. */
  temContrato: boolean;
  /** O documento precisa de revisão humana (D3). */
  revisaoNecessaria: boolean;
  /** A revisão já foi registada. */
  revisto: boolean;
};

export function classificarResultado(e: EntradaClassificacao): { classificacao: Classificacao; provisorio: boolean } {
  const porRever = e.revisaoNecessaria && !e.revisto;
  const provisorio = porRever || (e.contratual && !e.temContrato);
  if (!e.valorLido) return { classificacao: "informacao_insuficiente", provisorio };
  if (e.contratual && !e.temContrato) return { classificacao: "requer_verificacao", provisorio: true };
  if ((e.diferencaPotencial || e.confiancaBaixa) && !e.revisto) return { classificacao: "requer_verificacao", provisorio };
  return { classificacao: "facto_confirmado", provisorio };
}

/**
 * Classificação de uma factura na lista "Facturas e análises": total lido,
 * situação em verificação pela DoLado (diferença potencial ainda por rever)
 * e revisão humana obrigatória (D3) ainda por registar.
 */
export function classificarFatura(f: { total_cents: number | null; em_verificacao?: boolean | null }, revisaoPendente: boolean) {
  return classificarResultado({
    valorLido: f.total_cents !== null,
    confiancaBaixa: false,
    diferencaPotencial: !!f.em_verificacao,
    contratual: false,
    temContrato: true,
    revisaoNecessaria: revisaoPendente,
    revisto: false,
  });
}
