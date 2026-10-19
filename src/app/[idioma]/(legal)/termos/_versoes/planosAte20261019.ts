import { CASO_EXTRA as CASO_EXTRA_ATUAL, PLANOS as PLANOS_ATUAIS } from "@/lib/planos";

// Nomes e descrições dos planos nas versões dos Termos publicadas até
// 2026-10-18b (inclusive), na grafia em que foram aceites. Uma versão
// publicada nunca muda: quando a DoLado adoptou a ortografia tradicional
// (19/10/2026), os nomes em src/lib/planos.ts passaram a "Protecção" — estas
// versões continuam a ler daqui. Os preços continuam a vir de planos.ts (ou de
// precosAte20261018.ts, nas versões até 2026-10-18).

export const PLANOS = {
  protecao: {
    ...PLANOS_ATUAIS.protecao,
    nome: "Proteção",
    descricaoCurta:
      "Ajuda a identificar situações que possam tornar-se num problema: comparação das suas faturas para identificar alterações, avisos antes do fim de promoções e de períodos de fidelização, e avisos de alterações relevantes no seu setor. Não inclui o tratamento de casos.",
  },
  caso_protecao: {
    ...PLANOS_ATUAIS.caso_protecao,
    nome: "Caso + Proteção",
    descricaoCurta: `Tudo o que a Proteção inclui, mais 1 caso por mês. Os casos não utilizados acumulam até ao limite de 4.`,
  },
  avulso: {
    ...PLANOS_ATUAIS.avulso,
    nome: "Avulso",
    descricaoCurta: "Tratamento de 1 caso, sem subscrição. Não inclui as funcionalidades de proteção.",
  },
} as const;

export const CASO_EXTRA = {
  ...CASO_EXTRA_ATUAL,
  nome: "Caso Extra",
  descricaoCurta: "Tratamento de mais 1 caso, com pagamento único. A sua subscrição continua ativa e não é alterada.",
} as const;
