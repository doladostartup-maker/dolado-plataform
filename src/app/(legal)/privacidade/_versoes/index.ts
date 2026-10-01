import { PrivacidadeV20260930 } from "./v2026-09-30";
import { PrivacidadeV20261001 } from "./v2026-10-01";

// Todas as versões publicadas da Política de Privacidade (AAAA-MM-DD). Nunca
// remover uma versão: cada compra regista a versão em vigor
// (consentimentos_compra.privacidade_versao). Em vigor: PRIVACIDADE_VERSAO.
export const VERSOES_PRIVACIDADE: Record<string, () => React.JSX.Element> = {
  "2026-09-30": PrivacidadeV20260930,
  "2026-10-01": PrivacidadeV20261001,
};
