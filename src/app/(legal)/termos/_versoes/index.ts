import { TermosV20260930 } from "./v2026-09-30";
import { TermosV20261001 } from "./v2026-10-01";
import { TermosV20261001b } from "./v2026-10-01b";

// Todas as versões publicadas dos Termos (AAAA-MM-DD, com sufixo de letra
// para uma segunda versão no mesmo dia). Nunca remover uma versão: cada
// compra fica ligada à versão aceite (consentimentos_compra.termos_versao) e
// esta tem de continuar acessível em /termos/<versão>. A versão em vigor é
// TERMOS_VERSAO (src/lib/legal.ts).
export const VERSOES_TERMOS: Record<string, () => React.JSX.Element> = {
  "2026-09-30": TermosV20260930,
  "2026-10-01": TermosV20261001,
  "2026-10-01b": TermosV20261001b,
};
