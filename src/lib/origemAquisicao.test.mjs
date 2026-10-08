// Origem de aquisição (?ref=…) — regras puras e ligações (`npm test`).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  COOKIE_CONSENTIMENTO_ESTATISTICA_ORIGEM,
  COOKIE_ORIGEM,
  ORIGEM_JANELA_DIAS,
  cookieOrigemParaDefinir,
  decidirCookiesOrigem,
  dominioCookiesOrigem,
  estadoConsentimentoOrigem,
  linhaCookieOrigem,
  pedidoDoProprioSite,
  lerCookieOrigem,
  normalizarOrigem,
  origemAquisicaoAtiva,
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

  test("desligado por omissão", () => {
    assert.equal(origemAquisicaoAtiva(undefined), false);
    assert.equal(origemAquisicaoAtiva("0"), false);
    assert.equal(origemAquisicaoAtiva("1"), true);
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

describe("consentimento de estatística (Cookiebot) e cookies da origem", () => {
  const base = { ativo: true, temResposta: true, estatisticas: true, marcaAtual: undefined, origemAtual: undefined, ref: "contabilista_marta", agoraMs: AGORA };
  const nomes = (r) => r.cookies.map((c) => `${c.nome}=${c.valor ?? "<apagar>"}`);

  test("com consentimento: marca 1 e origem first-touch", () => {
    const r = decidirCookiesOrigem(base);
    assert.deepEqual(nomes(r), [`${COOKIE_CONSENTIMENTO_ESTATISTICA_ORIGEM}=1`, `${COOKIE_ORIGEM}=${valorCookieOrigem("contabilista_marta", AGORA)}`]);
    assert.equal(r.avisarRetirada, false);
    // Uma origem válida já guardada nunca é substituída.
    const r2 = decidirCookiesOrigem({ ...base, origemAtual: valorCookieOrigem("instagram", AGORA - DIA), ref: "outra" });
    assert.deepEqual(nomes(r2), [`${COOKIE_CONSENTIMENTO_ESTATISTICA_ORIGEM}=1`]);
  });

  test("sem resposta no banner (ou sem Cookiebot, ex.: domínio não autorizado): não cria nada", () => {
    const r = decidirCookiesOrigem({ ...base, temResposta: false, estatisticas: false });
    assert.deepEqual(r, { cookies: [], avisarRetirada: false });
  });

  test("recusa: marca 0, cookie de origem apagado, sem pedido ao servidor se nunca houve consentimento", () => {
    const r = decidirCookiesOrigem({ ...base, estatisticas: false, origemAtual: valorCookieOrigem("instagram", AGORA) });
    assert.deepEqual(nomes(r), [`${COOKIE_CONSENTIMENTO_ESTATISTICA_ORIGEM}=0`, `${COOKIE_ORIGEM}=<apagar>`]);
    assert.equal(r.avisarRetirada, false);
    assert.ok(!r.cookies.some((c) => c.nome === COOKIE_ORIGEM && c.valor), "nunca grava a origem sem consentimento");
  });

  test("retirada (de 1 para recusado): avisa o servidor uma vez", () => {
    assert.equal(decidirCookiesOrigem({ ...base, estatisticas: false, marcaAtual: "1" }).avisarRetirada, true);
    assert.equal(decidirCookiesOrigem({ ...base, estatisticas: false, marcaAtual: "0" }).avisarRetirada, false);
  });

  test("funcionalidade desligada: não cria cookies e apaga um cookie de origem antigo", () => {
    assert.deepEqual(decidirCookiesOrigem({ ...base, ativo: false }), { cookies: [], avisarRetirada: false });
    assert.deepEqual(nomes(decidirCookiesOrigem({ ...base, ativo: false, origemAtual: "x.1" })), [`${COOKIE_ORIGEM}=<apagar>`]);
  });

  test("estado da marca: só 1 e 0 contam; tudo o resto é desconhecido (não grava nem apaga)", () => {
    assert.equal(estadoConsentimentoOrigem("1"), "dado");
    assert.equal(estadoConsentimentoOrigem("0"), "retirado");
    for (const v of [undefined, null, "", "true", "yes"]) assert.equal(estadoConsentimentoOrigem(v), "desconhecido");
  });

  test("cookies partilhados por dolado.pt e portal.dolado.pt, 30 dias, apagar com Max-Age=0", () => {
    assert.equal(dominioCookiesOrigem("portal.dolado.pt"), ".dolado.pt");
    assert.equal(dominioCookiesOrigem("dolado.pt"), ".dolado.pt");
    assert.equal(dominioCookiesOrigem("dolado.pt.evil.com"), undefined);
    assert.equal(dominioCookiesOrigem("localhost"), undefined);
    assert.equal(
      linhaCookieOrigem({ nome: COOKIE_ORIGEM, valor: "marta.1" }, "portal.dolado.pt", true),
      `dolado_origem=marta.1; Max-Age=${ORIGEM_JANELA_DIAS * 24 * 3600}; Path=/; Domain=.dolado.pt; SameSite=Lax; Secure`,
    );
    assert.equal(linhaCookieOrigem({ nome: COOKIE_ORIGEM, valor: null }, "localhost", false), "dolado_origem=; Max-Age=0; Path=/; SameSite=Lax");
  });
});

describe("rota de retirada: só pedidos do próprio site", () => {
  test("aceita o mesmo host; recusa outro site, sem Origin ou cross-site", () => {
    assert.equal(pedidoDoProprioSite("https://portal.dolado.pt", "portal.dolado.pt", "same-origin"), true);
    assert.equal(pedidoDoProprioSite("http://localhost:3000", "localhost:3000", null), true);
    assert.equal(pedidoDoProprioSite("https://evil.example", "portal.dolado.pt", "cross-site"), false);
    assert.equal(pedidoDoProprioSite("https://evil.example", "portal.dolado.pt", null), false);
    assert.equal(pedidoDoProprioSite(null, "portal.dolado.pt", "same-origin"), false);
    assert.equal(pedidoDoProprioSite("https://portal.dolado.pt", "portal.dolado.pt", "same-site"), false);
    assert.equal(pedidoDoProprioSite("null", "portal.dolado.pt", null), false);
  });

  test("a rota valida a origem antes da sessão e só apaga pela função da base de dados", () => {
    const r = fonte("../app/api/privacidade/origem-aquisicao/route.ts");
    assert.match(r, /export async function POST/);
    assert.doesNotMatch(r, /export async function GET/);
    assert.ok(r.indexOf("pedidoDoProprioSite(") < r.indexOf("getClaims("));
    assert.match(r, /retirarOrigemDaConta\(userId\)/);
    assert.doesNotMatch(r, /\.update\(/);
  });
});

describe("ligações e consentimento (o ?ref= nunca dá acesso)", () => {
  test("a persistência exige consentimento de estatística; o middleware nunca cria o cookie", () => {
    const m = fonte("../middleware.ts");
    const c = fonte("../components/MedicaoComConsentimento.tsx");
    const s = fonte("./origemAquisicaoServidor.ts");
    assert.match(m, /request\.cookies\.has\(COOKIE_ORIGEM\)[\s\S]*estadoConsentimentoOrigem\([\s\S]*resposta\.cookies\.delete\(\{ name: COOKIE_ORIGEM/);
    assert.match(m, /request\.cookies\.has\(COOKIE_INDICACAO\)[\s\S]*cookiebotAceitouMarketing/);
    assert.doesNotMatch(m, /cookies\.set\(/);
    assert.match(c, /Cookiebot\?\.hasResponse === true[\s\S]*consent\?\.statistics === true/);
    assert.match(c, /decidirCookiesOrigem\(/);
    assert.match(fonte("../components/AnalyticsScripts.tsx"), /origemAtiva=\{origemAquisicaoAtiva\(\)\}/);
    assert.match(s, /consentimento === "dado" \? lerCookieOrigem/);
    assert.match(s, /consentimento === "retirado"\) \{\s*await retirarOrigemDaConta\(userId\)/);
    assert.equal(COOKIE_ORIGEM, "dolado_origem");
  });

  test("a origem não é enviada à Stripe (única chamada a sessions.create)", () => {
    const s = fonte("../app/actions/stripe.ts");
    assert.equal(s.match(/checkout\.sessions\.create\(/g)?.length, 1);
    assert.match(s, /checkout\.sessions\.create\(parametros\(metadata\)\)/);
    assert.doesNotMatch(s, /acquisition_source|origemParaCheckout|comOrigemNaMetadata/);
    // Nem a criação da conta lê a origem da metadata de uma sessão da Stripe.
    assert.doesNotMatch(fonte("../app/criar-conta/actions.ts"), /origemDaMetadata|acquisition_source/);
  });

  test("a escolha de cookies é aplicada à conta na criação, no callback, no código, no início de sessão e no Checkout", () => {
    for (const f of ["../app/auth/callback/route.ts", "../app/registo/actions.ts", "../app/tratar-caso/actions.ts", "../app/criar-conta/actions.ts", "../app/login/actions.ts", "../app/actions/stripe.ts"]) {
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
    // A retirada: só passa a origem a null.
    const ret = fonte("../../supabase/migrations/20261008110000_origem_aquisicao_retirada.sql");
    const fr = ret.slice(ret.indexOf("create or replace function public.origem_aquisicao_retirar"));
    assert.equal(fr.match(/\bupdate public\./g)?.length, 1);
    assert.match(fr, /update public\.utilizadores\s+set acquisition_source = null\s+where/);
    assert.doesNotMatch(fr, /user_access|case_credit|insert into/);
  });

  test("o formato da base de dados é o mesmo do código", () => {
    const sql = fonte("../../supabase/migrations/20261008090000_origem_aquisicao.sql");
    assert.match(sql, /\^\[a-z0-9\]\[a-z0-9_-\]\{1,63\}\$/);
    assert.match(fonte("./origemAquisicao.ts"), /\^\[a-z0-9\]\[a-z0-9_-\]\{1,63\}\$/);
  });
});
