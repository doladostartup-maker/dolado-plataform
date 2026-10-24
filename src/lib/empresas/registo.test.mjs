// DoLado Empresas — Fase 4: registo, entrada, MFA, recuperação e aprovação
// (`npm test`). Regras de registo.ts, e-mails e verificações estáticas das
// páginas e acções.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
  APRESENTACAO_ESTADO,
  MSG_REGISTO_ENVIADO,
  ROTAS_EMPRESA,
  ehCaminhoDeContaEmpresa,
  empresasAtivo,
  mensagemResultadoRegisto,
  nifValidoParaTipo,
  normalizarNif,
  validarPedidoRecuperacao,
  validarRegisto,
} from "./registo.ts";
import { ASSUNTOS_EMPRESA, montarHtmlEmpresa } from "../email/empresas.ts";

const RAIZ = new URL("../../../", import.meta.url).pathname;
const ler = (f) => readFileSync(join(RAIZ, f), "utf8");

function ficheiros(dir) {
  return readdirSync(join(RAIZ, dir)).flatMap((nome) => {
    const rel = join(dir, nome);
    if (statSync(join(RAIZ, rel)).isDirectory()) return ficheiros(rel);
    return /\.(ts|tsx)$/.test(nome) ? [rel] : [];
  });
}

const FORM = {
  tipo: "sociedade",
  nome: " Loja do Bairro, Lda. ",
  nif: "PT 500 000 000",
  responsavel: "Ana Silva",
  email: " Geral@Loja.PT ",
  palavraPasse: "segura123",
  confirmar: "segura123",
};

describe("interruptor", () => {
  test("só EMPRESAS_ATIVO=1 liga", () => {
    assert.equal(empresasAtivo({ EMPRESAS_ATIVO: "1" }), true);
    for (const v of [undefined, "", "0", "true", "sim"]) assert.equal(empresasAtivo({ EMPRESAS_ATIVO: v }), false);
  });
});

describe("NIPC/NIF", () => {
  test("normalização: espaços, pontos e PT", () => {
    assert.equal(normalizarNif("PT 500 000 000"), "500000000");
    assert.equal(normalizarNif("500.000.000"), "500000000");
    assert.equal(normalizarNif("50000000"), null);
    assert.equal(normalizarNif(123), null);
  });
  test("sociedades 5/6/9; empresários e profissionais 1/2/3; dígito de controlo", () => {
    assert.equal(nifValidoParaTipo("500000000", "sociedade"), true);
    assert.equal(nifValidoParaTipo("600000001", "sociedade"), true);
    assert.equal(nifValidoParaTipo("200000004", "sociedade"), false);
    assert.equal(nifValidoParaTipo("200000004", "empresario_nome_individual"), true);
    assert.equal(nifValidoParaTipo("234567899", "profissional_independente"), true);
    assert.equal(nifValidoParaTipo("500000000", "empresario_nome_individual"), false);
    assert.equal(nifValidoParaTipo("500000001", "sociedade"), false, "dígito de controlo errado");
  });
});

describe("formulário de registo", () => {
  test("dados normalizados", () => {
    const r = validarRegisto(FORM);
    assert.equal(r.ok, true);
    assert.deepEqual(r.dados, {
      tipo: "sociedade",
      nome: "Loja do Bairro, Lda.",
      nif: "500000000",
      responsavel: "Ana Silva",
      email: "geral@loja.pt",
      palavraPasse: "segura123",
    });
  });
  test("recusas, uma de cada vez", () => {
    const casos = [
      [{ tipo: "outro" }, /tipo de entidade/],
      [{ nome: "  " }, /nome da empresa/],
      [{ nif: "500000001" }, /NIPC não é válido/],
      [{ tipo: "empresario_nome_individual" }, /NIF não é válido/],
      [{ responsavel: "" }, /responsável/],
      [{ email: "sem-arroba" }, /e-mail válido/],
      [{ palavraPasse: "curta1", confirmar: "curta1" }, /pelo menos 8/],
      [{ confirmar: "outra123" }, /não coincidem/],
    ];
    for (const [muda, erro] of casos) {
      const r = validarRegisto({ ...FORM, ...muda });
      assert.equal(r.ok, false, JSON.stringify(muda));
      assert.match(r.erro, erro);
    }
  });
  test("e-mail já usado e registo novo têm a mesma resposta", () => {
    assert.equal(mensagemResultadoRegisto("registada"), null);
    for (const r of ["ja_empresa", "conta_antiga", "com_historico", "conta_admin", "sem_conta"]) {
      assert.equal(mensagemResultadoRegisto(r), MSG_REGISTO_ENVIADO, r);
    }
    assert.doesNotMatch(mensagemResultadoRegisto("nif_em_uso"), /já existe|registad[oa] com/i);
  });
});

describe("estados e recuperação assistida", () => {
  test("cada estado da base de dados tem texto", () => {
    const sql = ler("supabase/migrations/20261030090000_empresas_fundacao.sql");
    const lista = sql.match(/check \(estado in \(([^)]*)\)\)/)[1];
    const estados = [...lista.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    assert.deepEqual([...estados].sort(), Object.keys(APRESENTACAO_ESTADO).sort());
  });
  test("o texto antes da aprovação nunca promete acesso ao portal", () => {
    for (const e of ["a_aguardar_aprovacao", "lista_espera", "rejeitada"]) {
      assert.doesNotMatch(APRESENTACAO_ESTADO[e].texto, /já pode|aceda ao portal/i);
    }
  });
  test("pedido de recuperação: só forma, NIPC opcional", () => {
    assert.deepEqual(validarPedidoRecuperacao({ email: " A@B.pt ", nif: "", mensagem: " " }), {
      ok: true,
      email: "a@b.pt",
      nif: null,
      mensagem: null,
    });
    assert.equal(validarPedidoRecuperacao({ email: "a@b.pt", nif: "123", mensagem: "" }).ok, false);
    assert.equal(validarPedidoRecuperacao({ email: "x", nif: "", mensagem: "" }).ok, false);
  });
});

describe("rotas (só português, D1)", () => {
  test("contas e portal das empresas", () => {
    for (const c of ["/empresa", "/empresa/seguranca", "/empresas/entrar", "/empresas/registo", "/empresas/redefinir-palavra-passe"]) {
      assert.equal(ehCaminhoDeContaEmpresa(c), true, c);
    }
    for (const c of ["/empresas", "/empresas/beneficios", "/empresarial", "/entrar"]) assert.equal(ehCaminhoDeContaEmpresa(c), false, c);
  });
  test("o middleware redirecciona /en nestes caminhos e não aplica a preferência de inglês (sem ciclo)", () => {
    const s = ler("src/middleware.ts");
    assert.match(s, /prefixado && ehCaminhoDeContaEmpresa\(caminho\)/);
    assert.match(s, /preferido === "en-GB" && \(request\.method === "GET" \|\| request\.method === "HEAD"\) && !ehCaminhoDeContaEmpresa\(caminho\)/);
  });
});

describe("e-mails", () => {
  test("nome escapado; motivo só quando escrito para o cliente", () => {
    const html = montarHtmlEmpresa("rejeitada", { nome: "<b>X</b>", motivo: null });
    assert.match(html, /&lt;b&gt;X&lt;\/b&gt;/);
    assert.doesNotMatch(html, /<b>X<\/b>/);
    assert.match(montarHtmlEmpresa("rejeitada", { nome: "X", motivo: "Falta <o> NIPC" }), /Falta &lt;o&gt; NIPC/);
  });
  test("cada momento tem assunto e corpo, sem preços nem planos particulares", () => {
    for (const m of Object.keys(ASSUNTOS_EMPRESA)) {
      const html = montarHtmlEmpresa(m, { nome: "Loja" });
      assert.match(html, /Loja/);
      assert.doesNotMatch(html, /Caso \+ Prote|Avulso|€/);
    }
  });
  test("prazo de resposta como nas regras de escrita", () => {
    assert.match(montarHtmlEmpresa("pedidoRecebido", { nome: "L" }), /no prazo máximo de 2 dias úteis/);
  });
});

describe("páginas e acções das empresas", () => {
  const paginas = [...ficheiros("src/app/[idioma]/empresas"), ...ficheiros("src/app/[idioma]/empresa")].filter(
    (f) => !f.endsWith("src/app/[idioma]/empresas/page.tsx"),
  );

  test("desligadas sem EMPRESAS_ATIVO (página ou guarda)", () => {
    // portalEmpresa() (Fase 7) chama requireEmpresa(), que dá 404 sem o interruptor.
    assert.match(ler("src/lib/empresas/portalSessao.ts"), /await requireEmpresa\(/);
    const semInterruptor = paginas.filter((f) => !/empresasAtivo\(\)|exigirEmpresasAtivo\(\)|requireEmpresa\(|portalEmpresa\(/.test(ler(f)));
    assert.deepEqual(semInterruptor, []);
  });
  test("nenhum Google nas contas de empresa", () => {
    assert.deepEqual(paginas.filter((f) => /signInWithOAuth|\/auth\/login\/google/.test(ler(f))), []);
  });
  test("acções com sessão usam requireEmpresa", () => {
    for (const f of ["src/app/[idioma]/empresa/seguranca/actions.ts", "src/app/[idioma]/empresas/verificar/actions.ts"]) {
      const s = ler(f);
      const exportadas = s.match(/export async function \w+/g)?.length ?? 0;
      assert.ok((s.match(/requireEmpresa\(/g) ?? []).length >= exportadas, f);
    }
  });
  test("o backoffice verifica o admin em cada acção", () => {
    const s = ler("src/app/backoffice/empresas/actions.ts");
    assert.equal((s.match(/export async function \w+/g) ?? []).length, (s.match(/await requireAdmin\(\)/g) ?? []).length);
  });
  test("a recuperação da palavra-passe pede o segundo factor antes de alterar", () => {
    const s = ler("src/app/[idioma]/empresas/redefinir-palavra-passe/actions.ts");
    assert.ok(s.indexOf("challengeAndVerify") < s.indexOf("updateUser"));
    assert.match(s, /signOut\(\{ scope: "global" \}\)/);
  });
  test("registo: e-mail já usado não grava nada (identities vazio)", () => {
    const s = ler("src/app/[idioma]/empresas/registo/actions.ts");
    assert.ok(s.indexOf("identities?.length") < s.indexOf('rpc("empresa_registar"'));
  });
});

describe("callback", () => {
  test("conta de empresa confirmada segue para /empresa antes de qualquer atribuição; Google é recusado", () => {
    const s = ler("src/app/auth/callback/route.ts");
    const ramo = s.indexOf("ROTAS_EMPRESA.painel");
    assert.ok(ramo > 0);
    assert.ok(s.indexOf("sessaoPeloGoogle(") < ramo);
    for (const passo of ["atribuirIndicacaoDoBrowser(", "registarOrigemDaConta(", "associarDiagnosticosDaSessao("]) {
      assert.ok(ramo < s.indexOf(passo), passo);
    }
  });
  test("a identidade Google é retirada no servidor (ligação manual desligada)", () => {
    const s = ler("src/lib/empresas/contaServidor.ts");
    assert.match(s, /rpc\("empresa_retirar_identidade_google"/);
    assert.doesNotMatch(s, /unlinkIdentity/);
  });
  test("templates de Auth: sem ramo de empresa (o texto serve as duas contas)", () => {
    for (const f of ["supabase/templates/confirmacao.html", "supabase/templates/recuperacao.html"]) {
      assert.doesNotMatch(ler(f), /tipo_conta|empresa/i, f);
    }
  });
});

describe("rotas declaradas", () => {
  test("cada rota tem página", () => {
    for (const r of Object.values(ROTAS_EMPRESA)) {
      const pagina = `src/app/[idioma]${r}/page.tsx`;
      assert.doesNotThrow(() => statSync(join(RAIZ, pagina)), pagina);
    }
  });
});
