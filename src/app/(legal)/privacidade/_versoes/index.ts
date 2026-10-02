import { PrivacidadeV20260930 } from "./v2026-09-30";
import { PrivacidadeV20261001 } from "./v2026-10-01";
import { PrivacidadeV20261001b } from "./v2026-10-01b";
import { PrivacidadeV20261001c } from "./v2026-10-01c";
import { PrivacidadeV20261002 } from "./v2026-10-02";
import { PrivacidadeV20261002b } from "./v2026-10-02b";

// Todas as versões publicadas da Política de Privacidade (AAAA-MM-DD, com sufixo de letra para
// uma segunda versão no mesmo dia). Nunca
// remover uma versão: cada compra regista a versão em vigor
// (consentimentos_compra.privacidade_versao). Em vigor: PRIVACIDADE_VERSAO.
export const VERSOES_PRIVACIDADE: Record<string, () => React.JSX.Element> = {
  "2026-09-30": PrivacidadeV20260930,
  "2026-10-01": PrivacidadeV20261001,
  "2026-10-01b": PrivacidadeV20261001b,
  "2026-10-01c": PrivacidadeV20261001c,
  "2026-10-02": PrivacidadeV20261002,
  "2026-10-02b": PrivacidadeV20261002b,
};
