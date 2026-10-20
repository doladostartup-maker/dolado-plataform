// Verifica (e, com --corrigir, corrige) a ortografia tradicional nos textos
// visíveis da DoLado. Mesmas regras do teste src/lib/normaLinguistica/verificacao.test.mjs.
//   node scripts/dev/ortografia-tradicional.mjs            → lista
//   node scripts/dev/ortografia-tradicional.mjs --corrigir → corrige no sítio
// Depois de corrigir: rever o diff, correr `npx tsc --noEmit` (traduções
// en-GB com chaves em português) e `npm test`.

import { varrer } from "../../src/lib/normaLinguistica/varrimento.mjs";

const corrigir = process.argv.includes("--corrigir");
const achados = varrer({ corrigir });
for (const a of achados) console.log(`${a.ficheiro}:${a.linha}  ${a.palavras.join(", ")}  "${a.texto.slice(0, 100)}"`);
console.log(achados.length === 0 ? "Sem grafias fora da norma." : `${achados.length} texto(s) ${corrigir ? "corrigido(s)" : "fora da norma"}.`);
process.exitCode = achados.length && !corrigir ? 1 : 0;
