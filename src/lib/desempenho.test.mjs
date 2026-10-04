import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";

// Regras do incidente de 04/10/2026 (instância pico saturada).
const fonte = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

// Componentes das páginas públicas (V2 e conteúdo partilhado).
function publicos() {
  const base = new URL("../components/", import.meta.url).pathname;
  return readdirSync(base)
    .filter((d) => d.endsWith("-v2") || d === "landing")
    .flatMap((d) => tsx(join(base, d)));
}

function tsx(dir) {
  return readdirSync(dir).flatMap((n) => {
    const c = join(dir, n);
    return statSync(c).isDirectory() ? tsx(c) : /\.tsx$/.test(n) && !/ \d\.tsx$/.test(n) ? [c] : [];
  });
}

describe("desempenho em produção", () => {
  test("sem otimização de imagens no servidor (sharp bloqueava a instância)", () => {
    assert.match(fonte("../../next.config.ts"), /images: \{ unoptimized: true \}/);
    assert.match(fonte("../components/marketing-v2/OrigemFundador.tsx"), /founder-thiago-600\.webp/);
  });

  test("páginas públicas: nenhum <Link> para /entrar; login é <a> absoluto no portal", () => {
    for (const f of publicos()) {
      assert.doesNotMatch(readFileSync(f, "utf8"), /<Link[^>]*href="\/entrar"/, f);
    }
    assert.match(fonte("../components/marketing-v2/rotas.ts"), /entrar: `\$\{process\.env\.NEXT_PUBLIC_SITE_URL \?\? ""\}\/entrar`/);
    assert.match(fonte("../components/marketing-v2/NavbarV2.tsx"), /<a href=\{ROTAS_V2\.entrar\}/);
  });

  test("prefetch só nos 4 links principais da navbar", () => {
    for (const f of publicos()) {
      if (f.endsWith("marketing-v2/NavbarV2.tsx")) continue;
      for (const m of readFileSync(f, "utf8").matchAll(/<Link(?=[\s>])[^>]*/g)) {
        assert.match(m[0], /prefetch=\{false\}/, `${f}: ${m[0].slice(0, 60)}`);
      }
    }
    const nav = fonte("../components/marketing-v2/NavbarV2.tsx");
    assert.equal((nav.match(/<Link\b/g) || []).length, 2); // desktop + menu do telemóvel (mesmos 4 links)
  });

  test("limite de pedidos não cresce sem limite", () => {
    assert.match(fonte("./rateLimit.ts"), /registos\.size >= LIMPAR_A_PARTIR_DE\) limparExpirados/);
  });
});
