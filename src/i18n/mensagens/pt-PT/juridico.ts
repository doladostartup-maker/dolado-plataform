// Textos jurídicos com prova gravada (consentimentos e pedido de início
// imediato). O texto VINCULATIVO é sempre o português de src/lib/legal.ts —
// é esse que fica registado (consentimentos_compra, consentimentos_comunicacoes)
// e que o cliente vê. Em inglês, mostra-se o português e, por baixo, uma
// tradução só informativa (componente TextoVinculativo). Mudar o português =
// nova versão em legal.ts, como sempre.

import {
  ACEITACAO_TERMOS,
  COMO_EXERCER_LIVRE_RESOLUCAO,
  RESUMO_LIVRE_RESOLUCAO,
  TEXTO_CONSENTIMENTO_COMUNICACOES,
  consentimentoInicioImediato,
} from "../../../lib/legal.ts";

export const juridico = {
  /** Etiqueta da tradução informativa (só usada em inglês). */
  rotuloTraducao: "",
  comunicacoes: TEXTO_CONSENTIMENTO_COMUNICACOES,
  aceitacaoTermos: `${ACEITACAO_TERMOS.antes}${ACEITACAO_TERMOS.ligacao}${ACEITACAO_TERMOS.depois}`,
  inicioImediato: consentimentoInicioImediato("caso_protecao").texto,
  resumoLivreResolucao: RESUMO_LIVRE_RESOLUCAO,
  comoExercer: COMO_EXERCER_LIVRE_RESOLUCAO,
};
