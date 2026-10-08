// Origem de aquisição (?ref=…) — regras puras e ligações (`npm test`).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  CHAVE_METADATA_ORIGEM,
  COOKIE_ORIGEM,
  ORIGEM_JANELA_DIAS,
  comOrigemNaMetadata,
  cookieOrigemParaDefinir,
  lerCookieOrigem,
  normalizarOrigem,
  opcoesCookieOrigem,
  origemAquisicaoAtiva,
  origemDaMetadata,
  rotuloOrigem,
  valorCookieOrigem,
} from "./origemAquisicao.ts";

const fonte = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const AGORA = Date.UTC(2026, 9, 8, 10, 0, 0);
const DIA = 24 * 3600 * 1000;

describe("normalização e validação do ?ref=", () => {
  test("aceita identificadores seguros e normaliza para minúsculas", () => {
    assert.equal(normalizarOrigem("contabilista_marta"), "contabilista_marta");
    assert.equal(normalizarOrigem("  Remax_Duplo_Prestigio "), "remax_duplo_prestigio");
    assert.equal(normalizarOrigem("felipe-wesley"), "felipe-wesley");
    assert.equal(normalizarOrigem("instagram2"), "instagram2");
  });

  test("ignora valores inválidos (nunca corrige)", () => {
    for (const v of [
      null,
      undefined,
      "",
      "a",
      "x".repeat(65),
      "marta@exemplo.pt",
      "<script>",
      "a b",
      "contabilista_marta'; drop table utilizadores;--",
      "_marta",
      "-marta",
      "maría",
      "912345678", // só dígitos: pode ser telefone/NIF
      "123456789",
      ["contabilista_marta"],
      42,
    ]) {
      assert.equal(normalizarOrigem(v), null, String(v));
    }
  });

  test("limite de 64 caracteres", () => {
    assert.equal(normalizarOrigem("a".repeat(64)), "a".repeat(64));
    assert.equal(normalizarOrigem("a".repeat(65)), null);
  });
});

describe("cookie first-touch", () => {
  test("primeira visita com ?ref= válido grava a origem e a hora", () => {
    const valor = cookieOrigemParaDefinir("contabilista_marta", undefined, AGORA);
    assert.equal(valor, valorCookieOrigem("contabilista_marta", AGORA));
    assert.deepEqual(lerCookieOrigem(valor, AGORA), {
      origem: "contabilista_marta",
      primeiraVisita: new Date(Math.floor(AGORA / 1000) * 1000),
    });
  });

  test("cenário B: dois dias depois, sem ?ref=, a origem continua no cookie", () => {
    const valor = cookieOrigemParaDefinir("contabilista_marta", undefined, AGORA);
    assert.equal(cookieOrigemParaDefinir(null, valor, AGORA + 2 * DIA), null);
    assert.equal(lerCookieOrigem(valor, AGORA + 2 * DIA)?.origem, "contabilista_marta");
  });

  test("cenário C: um ?ref= posterior nunca substitui a primeira origem", () => {
    const primeira = cookieOrigemParaDefinir("contabilista_marta", undefined, AGORA);
    assert.equal(cookieOrigemParaDefinir("instagram", primeira, AGORA + DIA), null);
  });

  test("cenário D: sem ?ref= ou com ?ref= inválido não grava nada", () => {
    assert.equal(cookieOrigemParaDefinir(null, undefined, AGORA), null);
    assert.equal(cookieOrigemParaDefinir("", undefined, AGORA), null);
    assert.equal(cookieOrigemParaDefinir("marta@exemplo.pt", undefined, AGORA), null);
  });

  test("um ?ref= inválido não apaga uma origem válida", () => {
    const primeira = cookieOrigemParaDefinir("contabilista_marta", undefined, AGORA);
    assert.equal(cookieOrigemParaDefinir("<x>", primeira, AGORA), null);
  });

  test("expira ao fim de 30 dias: uma nova visita volta a gravar", () => {
    const antiga = valorCookieOrigem("contabilista_marta", AGORA - (ORIGEM_JANELA_DIAS + 1) * DIA);
    assert.equal(lerCookieOrigem(antiga, AGORA), null);
    assert.equal(cookieOrigemParaDefinir("instagram", antiga, AGORA), valorCookieOrigem("instagram", AGORA));
  });

  test("cookie mal formado, adulterado ou no futuro é ignorado", () => {
    for (const v of ["", "contabilista_marta", "Marta.123", "a@b.1728380000", "x.abc", valorCookieOrigem("x1", AGORA + DIA)]) {
      assert.equal(lerCookieOrigem(v, AGORA), null, v);
    }
  });

  test("cookie partilhado por dolado.pt e portal.dolado.pt, httpOnly, 30 dias", () => {
    for (const host of ["dolado.pt", "portal.dolado.pt", "www.dolado.pt"]) {
      const o = opcoesCookieOrigem(host, true);
      assert.equal(o.domain, ".dolado.pt");
      assert.equal(o.httpOnly, true);
      assert.equal(o.secure, true);
      assert.equal(o.sameSite, "lax");
      assert.equal(o.maxAge, ORIGEM_JANELA_DIAS * 24 * 3600);
    }
    assert.equal(opcoesCookieOrigem("localhost", false).domain, undefined);
    assert.equal(opcoesCookieOrigem("dolado.pt.evil.com", true).domain, undefined);
  });

  test("desligado por omissão", () => {
    assert.equal(origemAquisicaoAtiva(undefined), false);
    assert.equal(origemAquisicaoAtiva("0"), false);
    assert.equal(origemAquisicaoAtiva("1"), true);
  });
});

describe("metadata do Stripe", () => {
  test("acrescenta acquisition_source sem substituir a metadata existente", () => {
    const base = { consentimento_compra_id: "c1", plano: "avulso" };
    assert.deepEqual(comOrigemNaMetadata(base, "contabilista_marta"), { ...base, acquisition_source: "contabilista_marta" });
    assert.deepEqual(base, { consentimento_compra_id: "c1", plano: "avulso" }, "não muda o objeto original");
  });

  test("sem origem (ou inválida) a metadata fica igual", () => {
    const base = { plano: "avulso" };
    assert.equal(comOrigemNaMetadata(base, null), base);
    assert.equal(comOrigemNaMetadata(base, "a@b"), base);
  });

  test("nunca substitui um acquisition_source já presente", () => {
    const base = { [CHAVE_METADATA_ORIGEM]: "remax_duplo_prestigio" };
    assert.equal(comOrigemNaMetadata(base, "instagram"), base);
  });

  test("cenários E/F: origem e voucher são independentes", () => {
    // E: veio pela Marta, compra sem cupão → continua atribuída.
    assert.equal(comOrigemNaMetadata({}, "contabilista_marta").acquisition_source, "contabilista_marta");
    // F: usa o cupão CONTABILISTAMARTA sem ter vindo pelo link → sem origem.
    assert.equal(comOrigemNaMetadata({ promo: "CONTABILISTAMARTA" }, null).acquisition_source, undefined);
    assert.equal(origemDaMetadata({ promo: "CONTABILISTAMARTA" }), null);
  });

  test("lê a origem da metadata só no formato válido", () => {
    assert.equal(origemDaMetadata({ acquisition_source: "contabilista_marta" }), "contabilista_marta");
    assert.equal(origemDaMetadata({ acquisition_source: "<b>" }), null);
    assert.equal(origemDaMetadata(null), null);
  });
});

describe("backoffice", () => {
  test("nome amigável quando existe, identificador técnico quando não", () => {
    assert.equal(rotuloOrigem("contabilista_marta"), "Contabilista Marta");
    assert.equal(rotuloOrigem("instagram"), "instagram");
    assert.equal(rotuloOrigem("constructor"), "constructor");
    assert.equal(rotuloOrigem(null), null);
  });
});

describe("ligações e isolamento (o ?ref= nunca dá acesso)", () => {
  test("o middleware só define o cookie, sem I/O", () => {
    const m = fonte("../middleware.ts");
    assert.match(m, /cookieOrigemParaDefinir\(ref, request\.cookies\.get\(COOKIE_ORIGEM\)/);
    assert.match(m, /return comOrigemAquisicao\(request, resposta\)/);
    assert.equal(COOKIE_ORIGEM, "dolado_origem");
  });

  test("todas as Checkout Sessions levam a origem (única chamada a sessions.create)", () => {
    const s = fonte("../app/actions/stripe.ts");
    assert.equal(s.match(/checkout\.sessions\.create\(/g)?.length, 1);
    assert.match(s, /checkout\.sessions\.create\(parametros\(comOrigemNaMetadata\(metadata, origem\)\)\)/);
  });

  test("a conta é atribuída na criação, no callback e no código", () => {
    for (const f of ["../app/auth/callback/route.ts", "../app/registo/actions.ts", "../app/tratar-caso/actions.ts", "../app/criar-conta/actions.ts"]) {
      assert.match(fonte(f), /registarOrigemDaConta\(/, f);
    }
  });

  test("os módulos da origem não tocam em acesso, planos, casos, cupões nem papéis", () => {
    for (const f of ["./origemAquisicao.ts", "./origemAquisicaoServidor.ts"]) {
      // Só o código (sem comentários, que explicam precisamente o que não faz).
      const s = fonte(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      for (const proibido of [/user_access/, /case_credit/, /credito/i, /coupon|cupao|cupão|promotion/i, /role/, /planos/, /subscription_plan/, /\.insert\(/, /\.update\(/, /\.upsert\(/, /\.delete\(/]) {
        assert.doesNotMatch(s, proibido, `${f}: ${proibido}`);
      }
    }
    // A única escrita é a função da base de dados, que só mexe na origem.
    const sql = fonte("../../supabase/migrations/20261008090000_origem_aquisicao.sql");
    const funcao = sql.slice(sql.indexOf("create or replace function public.origem_aquisicao_registar"));
    assert.equal(funcao.match(/\bupdate public\./g)?.length, 1);
    assert.match(funcao, /update public\.utilizadores\s+set acquisition_source = p_origem\s+where/);
    assert.doesNotMatch(funcao, /user_access|case_credit|insert into/);
  });

  test("o formato da base de dados é o mesmo do código", () => {
    const sql = fonte("../../supabase/migrations/20261008090000_origem_aquisicao.sql");
    assert.match(sql, /\^\[a-z0-9\]\[a-z0-9_-\]\{1,63\}\$/);
    assert.match(fonte("./origemAquisicao.ts"), /\^\[a-z0-9\]\[a-z0-9_-\]\{1,63\}\$/);
  });
});
