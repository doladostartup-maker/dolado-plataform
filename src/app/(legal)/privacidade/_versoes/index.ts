import { PrivacidadeV20260930 } from "./v2026-09-30";
import { PrivacidadeV20261001 } from "./v2026-10-01";
import { PrivacidadeV20261001b } from "./v2026-10-01b";
import { PrivacidadeV20261001c } from "./v2026-10-01c";
import { PrivacidadeV20261002 } from "./v2026-10-02";
import { PrivacidadeV20261002b } from "./v2026-10-02b";
import { PrivacidadeV20261002c } from "./v2026-10-02c";
import { PrivacidadeV20261002d } from "./v2026-10-02d";
import { PrivacidadeV20261002e } from "./v2026-10-02e";
import { PrivacidadeV20261003 } from "./v2026-10-03";
import { PrivacidadeV20261005 } from "./v2026-10-05";
import { PrivacidadeV20261006 } from "./v2026-10-06";

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
  "2026-10-02c": PrivacidadeV20261002c,
  "2026-10-02d": PrivacidadeV20261002d,
  "2026-10-02e": PrivacidadeV20261002e,
  "2026-10-03": PrivacidadeV20261003,
  "2026-10-05": PrivacidadeV20261005,
  "2026-10-06": PrivacidadeV20261006,
};
