// Função online de livre resolução — `npm test`. RLS e imutabilidade da
// tabela pedidos_livre_resolucao: supabase/tests/database/rls_isolamento.test.sql.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, test } from "node:test";
import {
  FORMULARIO_LIVRE_RESOLUCAO_VERSAO,
  ROTULO_CONFIRMAR,
  ROTULO_RESOLVER,
  lerPedidoLivreResolucao,
} from "./livreResolucao.ts";
import { montarHtmlAvisoLivreResolucao, montarHtmlConfirmacaoLivreResolucao } from "./email/livreResolucao.ts";
import {
  COMO_EXERCER_LIVRE_RESOLUCAO,
  ENTIDADES_RAL,
  LIVRO_RECLAMACOES_URL,
  MODELO_FORMULARIO_LIVRE_RESOLUCAO,
  PRIVACIDADE_VERSAO,
  TERMOS_VERSAO,
} from "./legal.ts";
import { MORADA_SEDE, NIPC } from "./site.ts";

const fonte = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const HOJE = "2026-10-01";
const valido = {
  nome: "Maria Silva",
  email: "Maria@Exemplo.pt",
  plano: "caso_protecao",
  data_compra: "2026-09-28",
  identificacao: "",
  mensagem: "",
  confirmo: "sim",
};

describe("lerPedidoLivreResolucao", () => {
  test("aceita um pedido válido e normaliza o e-mail", () => {
    const r = lerPedidoLivreResolucao(valido, HOJE);
    assert.equal(r.ok, true);
    assert.equal(r.pedido.email, "maria@exemplo.pt");
    assert.equal(r.pedido.identificacao, null);
    assert.equal(r.pedido.mensagem, null);
  });

  test("exige a confirmação explícita (sem ela, nada é registado)", () => {
    assert.deepEqual(lerPedidoLivreResolucao({ ...valido, confirmo: undefined }, HOJE), { ok: false, erro: "confirmacao" });
    assert.deepEqual(lerPedidoLivreResolucao({ ...valido, confirmo: "on" }, HOJE), { ok: false, erro: "confirmacao" });
  });

  test("recusa campos inválidos", () => {
    assert.equal(lerPedidoLivreResolucao({ ...valido, nome: "a" }, HOJE).erro, "nome");
    assert.equal(lerPedidoLivreResolucao({ ...valido, email: "sem-arroba" }, HOJE).erro, "email");
    assert.equal(lerPedidoLivreResolucao({ ...valido, plano: "premium" }, HOJE).erro, "plano");
    assert.equal(lerPedidoLivreResolucao({ ...valido, data_compra: "2026-12-01" }, HOJE).erro, "data_compra");
    assert.equal(lerPedidoLivreResolucao({ ...valido, data_compra: "01/09/2026" }, HOJE).erro, "data_compra");
    assert.equal(lerPedidoLivreResolucao({ ...valido, mensagem: "x".repeat(2001) }, HOJE).erro, "mensagem");
  });

  test("data da compra é opcional", () => {
    const r = lerPedidoLivreResolucao({ ...valido, data_compra: "" }, HOJE);
    assert.equal(r.ok, true);
    assert.equal(r.pedido.data_compra, null);
  });
});

describe("e-mails da livre resolução", () => {
  const pedido = {
    nome: '<a href="https://mau.example">Clique</a>',
    email: "maria@exemplo.pt",
    plano: "avulso",
    data_compra: null,
    identificacao: "<script>x</script>",
    mensagem: "Visite https://mau.example",
  };

  test("a confirmação ao cliente não leva texto livre do formulário", () => {
    const html = montarHtmlConfirmacaoLivreResolucao(pedido, "ref-1", "2026-10-01T10:00:00Z");
    assert.ok(!html.includes("mau.example"));
    assert.ok(!html.includes("<script>"));
    assert.ok(!html.includes("Clique"));
    assert.ok(html.includes("ref-1"));
    assert.ok(html.includes("Avulso"));
    assert.ok(html.includes("14 dias"));
  });

  test("o aviso interno faz escape de todo o texto do formulário", () => {
    const html = montarHtmlAvisoLivreResolucao(pedido, "ref-1", "2026-10-01T10:00:00Z", {
      contaConhecida: false,
      confirmacaoEnviada: false,
    });
    assert.ok(!html.includes("<script>"));
    assert.ok(!html.includes('<a href="https://mau.example">'));
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(html.includes("confirmar a identidade"));
  });
});

describe("textos e páginas legais", () => {
  test("rótulos da função online", () => {
    assert.equal(ROTULO_RESOLVER, "Resolver o contrato aqui");
    assert.equal(ROTULO_CONFIRMAR, "Confirmar a livre resolução");
    assert.match(FORMULARIO_LIVRE_RESOLUCAO_VERSAO, /^\d{4}-\d{2}-\d{2}/);
  });

  test("como exercer aponta para a função online e para o e-mail", () => {
    assert.ok(COMO_EXERCER_LIVRE_RESOLUCAO.includes("Resolver o contrato aqui"));
    assert.ok(COMO_EXERCER_LIVRE_RESOLUCAO.includes("contacto@dolado.pt"));
  });

  test("modelo de formulário identifica a entidade pela morada legal em vigor", () => {
    assert.ok(MODELO_FORMULARIO_LIVRE_RESOLUCAO[0].includes(MORADA_SEDE));
    assert.ok(MODELO_FORMULARIO_LIVRE_RESOLUCAO.some((l) => l.includes("resolvo o meu contrato")));
  });

  test("Livro de Reclamações e RAL: serviço oficial e CNIACC presentes", () => {
    assert.ok(LIVRO_RECLAMACOES_URL.startsWith("https://www.livroreclamacoes.pt"));
    // Nomes como na lista oficial da DGC (confrontada a 08/10/2026).
    assert.ok(ENTIDADES_RAL.some((e) => e.nome.endsWith("(CNIACC)") && e.site === "https://www.cniacc.pt" && e.tipo === "geral"));
    assert.ok(ENTIDADES_RAL.some((e) => e.nome.endsWith("(CACCL)") && e.tipo === "geral"));
    for (const e of ENTIDADES_RAL) assert.match(e.site, /^https:\/\//);
  });

  test("o rótulo \"Versão …\" de cada página versionada é a própria versão", () => {
    for (const doc of ["termos", "privacidade"]) {
      const dir = new URL(`../app/(legal)/${doc}/_versoes/`, import.meta.url);
      for (const f of readdirSync(dir).filter((n) => /^v[\d-]+[a-z]?\.tsx$/.test(n))) {
        const versao = f.slice(1, -4);
        const rotulos = [...readFileSync(new URL(f, dir), "utf8").matchAll(/Versão (\d{4}-\d{2}-\d{2}[a-z]?)/g)].map((m) => m[1]);
        for (const r of rotulos) assert.equal(r, versao, `${doc}/${f}`);
      }
    }
  });

  test("versões em vigor estão registadas nas páginas versionadas", () => {
    assert.ok(fonte("../app/(legal)/termos/_versoes/index.ts").includes(`"${TERMOS_VERSAO}"`));
    assert.ok(fonte("../app/(legal)/privacidade/_versoes/index.ts").includes(`"${PRIVACIDADE_VERSAO}"`));
  });

  test("documentos em vigor sem Beta, gratuitidade ou 'sem conta'", () => {
    const termos = fonte(`../app/(legal)/termos/_versoes/v${TERMOS_VERSAO}.tsx`);
    const privacidade = fonte(`../app/(legal)/privacidade/_versoes/v${PRIVACIDADE_VERSAO}.tsx`);
    for (const doc of [termos, privacidade]) {
      assert.ok(!/beta/i.test(doc));
      assert.ok(!/servi[çc]o (é )?gratuito|sem custo durante|n[ãa]o h[áa] cobran/i.test(doc));
      assert.ok(!/sem conta de utilizador|n[ãa]o existe conta/i.test(doc));
    }
  });

  test("identificação da entidade vem de site.ts (sem morada repetida no código)", () => {
    for (const p of [
      `../app/(legal)/termos/_versoes/v${TERMOS_VERSAO}.tsx`,
      `../app/(legal)/privacidade/_versoes/v${PRIVACIDADE_VERSAO}.tsx`,
      "../components/marketing-v2/FooterV2.tsx",
    ]) {
      const f = fonte(p);
      assert.ok(!f.includes("Manchester"), p);
      assert.ok(!f.includes(NIPC), p);
    }
  });

  test("a função online grava a prova no servidor e não faz reembolsos", () => {
    const acao = fonte("../app/(legal)/livre-resolucao/actions.ts");
    assert.ok(acao.includes('"use server"'));
    assert.ok(acao.includes("pedidos_livre_resolucao"));
    assert.ok(!/refunds|subscriptions\.(cancel|update)/.test(acao));
  });
});
