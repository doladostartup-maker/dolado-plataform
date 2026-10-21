import { TermosV20260930 } from "./v2026-09-30";
import { TermosV20261001 } from "./v2026-10-01";
import { TermosV20261001b } from "./v2026-10-01b";
import { TermosV20261002 } from "./v2026-10-02";
import { TermosV20261005 } from "./v2026-10-05";
import { TermosV20261006 } from "./v2026-10-06";
import { TermosV20261007 } from "./v2026-10-07";
import { TermosV20261008 } from "./v2026-10-08";
import { TermosV20261017 } from "./v2026-10-17";
import { TermosV20261018 } from "./v2026-10-18";
import { TermosV20261018b } from "./v2026-10-18b";
import { TermosV20261019 } from "./v2026-10-19";
import { TermosV20261020 } from "./v2026-10-20";
import { TermosV20261022 } from "./v2026-10-22";

// Todas as versões publicadas dos Termos (AAAA-MM-DD, com sufixo de letra
// para uma segunda versão no mesmo dia). Nunca remover uma versão: cada
// compra fica ligada à versão aceite (consentimentos_compra.termos_versao) e
// esta tem de continuar acessível em /termos/<versão>. A versão em vigor é
// TERMOS_VERSAO (src/lib/legal.ts).
export const VERSOES_TERMOS: Record<string, () => React.JSX.Element> = {
  "2026-09-30": TermosV20260930,
  "2026-10-01": TermosV20261001,
  "2026-10-01b": TermosV20261001b,
  "2026-10-02": TermosV20261002,
  "2026-10-05": TermosV20261005,
  "2026-10-06": TermosV20261006,
  "2026-10-07": TermosV20261007,
  "2026-10-08": TermosV20261008,
  "2026-10-17": TermosV20261017,
  "2026-10-18": TermosV20261018,
  "2026-10-18b": TermosV20261018b,
  "2026-10-19": TermosV20261019,
  "2026-10-20": TermosV20261020,
  "2026-10-22": TermosV20261022,
};
