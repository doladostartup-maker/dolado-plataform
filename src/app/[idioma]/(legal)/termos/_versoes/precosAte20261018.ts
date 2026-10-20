import { CASO_EXTRA as CASO_EXTRA_ATUAL, PLANOS as PLANOS_ATUAIS } from "./planosAte20261019";

// Preços em vigor nas versões dos Termos publicadas até 2026-10-18 (inclusive).
// Uma versão publicada nunca muda: estas versões leem os preços daqui, não de
// src/lib/planos.ts, para que uma mudança de preço (ex.: Avulso 14,99 € →
// 11,99 €) não reescreva o texto que o cliente aceitou. Versões novas usam
// src/lib/planos.ts. Os nomes e as descrições vêm de planosAte20261019.ts.

export const PLANOS = {
  protecao: { ...PLANOS_ATUAIS.protecao, precoCentimos: 499 },
  caso_protecao: { ...PLANOS_ATUAIS.caso_protecao, precoCentimos: 799 },
  avulso: { ...PLANOS_ATUAIS.avulso, precoCentimos: 1499 },
} as const;

export const CASO_EXTRA = { ...CASO_EXTRA_ATUAL, precoCentimos: 1199, descontoPercentagem: 20 } as const;
