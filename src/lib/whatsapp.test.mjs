// WhatsApp como canal secundário de apoio: número, links, mensagens fixas
// (sem dados pessoais nem chamadas) e páginas onde nunca pode aparecer.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { LOCAIS_WHATSAPP, linkWhatsApp, normalizarNumeroWhatsApp, parametrosEventoWhatsApp } from "./whatsapp.ts";
import { whatsapp as pt } from "../i18n/mensagens/pt-PT/whatsapp.ts";
import { whatsapp as en } from "../i18n/mensagens/en-GB/whatsapp.ts";

const SRC = fileURLToPath(new URL("..", import.meta.url));

function textos(valor, saida = []) {
  if (typeof valor === "string") saida.push(valor);
  else if (valor && typeof valor === "object") Object.values(valor).forEach((v) => textos(v, saida));
  return saida;
}

function mensagens(d) {
  const c = d.contextos;
  return [
    c.homepage.mensagem,
    c.precario.mensagem,
    c.calculadora.mensagem,
    c.simulador.mensagem,
    c.ajuda.mensagem,
    c.contacto.mensagem,
    ...Object.values(c.setor.mensagens),
  ];
}

function ficheiros(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? ficheiros(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

describe("número do WhatsApp", () => {
  test("formato internacional, só dígitos", () => {
    assert.equal(normalizarNumeroWhatsApp("351912345678"), "351912345678");
    assert.equal(normalizarNumeroWhatsApp("+351 912 345 678"), "351912345678");
    assert.equal(normalizarNumeroWhatsApp("00351-912-345-678"), "351912345678");
  });

  test("sem número válido não há CTA", () => {
    for (const v of [undefined, null, "", "  ", "912", "0912345678", "351XXXXXXXXX", "3519123456789012"]) {
      assert.equal(normalizarNumeroWhatsApp(v), null, String(v));
    }
  });
});

describe("links", () => {
  test("wa.me com a mensagem codificada (acentos preservados)", () => {
    const m = pt.contextos.homepage.mensagem;
    const url = new URL(linkWhatsApp("351912345678", m));
    assert.equal(url.origin + url.pathname, "https://wa.me/351912345678");
    assert.equal(url.searchParams.get("text"), m);
    assert.match(url.searchParams.get("text"), /começar/);
    assert.ok(!linkWhatsApp("351912345678", m).includes(" "));
  });

  test("evento só com valores fixos", () => {
    assert.deepEqual(parametrosEventoWhatsApp("/precario", "pricing", "planos"), {
      page: "/precario",
      placement: "pricing",
      context: "planos",
    });
    assert.ok(!LOCAIS_WHATSAPP.includes("portal_help"));
  });
});

describe("mensagens", () => {
  test("as duas línguas têm uma mensagem por setor", () => {
    assert.deepEqual(Object.keys(en.contextos.setor.mensagens), Object.keys(pt.contextos.setor.mensagens));
    assert.deepEqual(Object.keys(pt.contextos.setor.mensagens).sort(), ["agua", "compras-reembolsos", "energia", "gas", "telecomunicacoes"]);
  });

  test("genéricas: sem marcadores, números nem dados pessoais", () => {
    for (const m of [...mensagens(pt), ...mensagens(en)]) {
      assert.doesNotMatch(m, /[{}[\]<>$%]|\d/, m);
      assert.doesNotMatch(m, /NIF|morada|e-mail|n\.º|caso n|contrat|cliente n|address|account number|case number/i, m);
    }
  });

  test("só mensagens: nunca chamadas de voz ou vídeo", () => {
    for (const t of [...textos(pt), ...textos(en)]) {
      assert.doesNotMatch(t, /lig(ue|ar|ue-nos)|telefon|chamada|v[íi]deo|\bcall\b|phone|ring us|video/i, t);
    }
  });
});

describe("onde o WhatsApp aparece", () => {
  const USO = /ApoioWhatsApp|LigacaoWhatsApp|lib\/whatsapp|mensagens\/whatsapp/;

  test("nunca no portal, compra, Tratar o meu caso, texto, conta nem backoffice", () => {
    const proibidos = [
      "app/[idioma]/portal",
      "app/[idioma]/tratar-caso",
      "app/[idioma]/comprar",
      "app/[idioma]/texto",
      "app/[idioma]/criar-conta",
      "app/[idioma]/associar-compra",
      "app/[idioma]/conta",
      "app/[idioma]/entrar",
      "app/[idioma]/login",
      "app/[idioma]/registo",
      "app/backoffice",
      "app/api",
      "components/compra",
      "components/portal",
      "components/backoffice",
    ];
    for (const d of proibidos) {
      for (const f of ficheiros(join(SRC, d))) assert.doesNotMatch(readFileSync(f, "utf8"), USO, f);
    }
  });

  test("sem botão flutuante na moldura das páginas", () => {
    for (const f of ["components/marketing-v2/PaginaV2.tsx", "app/[idioma]/layout.tsx", "components/marketing-v2/NavbarV2.tsx"]) {
      assert.doesNotMatch(readFileSync(join(SRC, f), "utf8"), USO, f);
    }
  });

  test("a mensagem vem sempre do dicionário (nunca de dados da página)", () => {
    for (const f of ficheiros(SRC)) {
      const s = readFileSync(f, "utf8");
      if (f.endsWith("ApoioWhatsApp.tsx") || !/<(ApoioWhatsApp|LigacaoWhatsApp)\b/.test(s)) continue;
      for (const [, valor] of s.matchAll(/mensagem=\{([^}]+)\}/g)) {
        assert.match(valor, /^(tw\.|tWhatsApp\[|mensagemWhatsAppSetor\()/, `${f}: mensagem={${valor}}`);
      }
    }
  });
});
