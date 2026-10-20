// Programa de Parceiros (Parceiro de Indicação) — regras e e-mails
// (`npm test`). A base de dados tem os próprios testes em
// supabase/tests/database/programa_parceiros.test.sql; o webhook, em
// src/lib/stripe/webhook.test.mjs ("Programa de Parceiros").
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  codigoBloqueiaCompra,
  ivaMaximo,
  lerCandidatura,
  lerIva,
  lerResultadoAtribuicao,
  normalizarCodigoParceiro,
  parceirosAtivos,
  reembolsoIntegral,
  urlParceiro,
  valorCookieParceiro,
  valoresDaFatura,
  visitaParceiroDoCookie,
} from "./regras.ts";
import { visitaDoCookie } from "../indicacoes/regras.ts";
import {
  avisoAdminCandidatura,
  montarEmailCandidaturaAprovada,
  montarEmailCandidaturaRecebida,
  montarEmailPagamentoComissoes,
} from "../email/parceiros.ts";
import { TEXTO_ACEITACAO_CANDIDATURA_PARCEIROS } from "../legal.ts";
import { parceiros as pt } from "../../i18n/mensagens/pt-PT/parceiros.ts";

const UUID = "4f9a2b1c-1234-4abc-8def-0123456789ab";

describe("códigos, ligação e cookie", () => {
  test("desligado por omissão", () => {
    assert.equal(parceirosAtivos(undefined), false);
    assert.equal(parceirosAtivos("1"), true);
  });

  test("código escrito: espaços, hífenes e minúsculas; formato impossível → null", () => {
    assert.equal(normalizarCodigoParceiro(" parc-2345 "), "PARC2345");
    assert.equal(normalizarCodigoParceiro("PARC 2345"), "PARC2345");
    assert.equal(normalizarCodigoParceiro("PARC0345"), null, "0 não pertence ao alfabeto");
    assert.equal(normalizarCodigoParceiro(""), null);
    assert.equal(urlParceiro("PARC2345"), "https://dolado.pt/r/PARC2345");
  });

  test("visita de parceiro no mesmo cookie, nunca lida como de amigo (e vice-versa)", () => {
    const valor = valorCookieParceiro(UUID);
    assert.equal(valor, `p.${UUID}`);
    assert.equal(visitaParceiroDoCookie(valor), UUID);
    assert.equal(visitaDoCookie(valor), null, "o programa de amigos ignora a visita de parceiro");
    assert.equal(visitaParceiroDoCookie(UUID), null, "uma visita de amigo não é de parceiro");
    assert.equal(visitaParceiroDoCookie("p.nao-e-uuid"), null);
  });

  test("antes do Checkout só um código inexistente (ou do próprio parceiro) pára a compra", () => {
    assert.equal(codigoBloqueiaCompra("codigo_invalido"), true);
    assert.equal(codigoBloqueiaCompra("auto_indicacao"), true);
    assert.equal(codigoBloqueiaCompra("ja_cliente"), false);
    assert.equal(codigoBloqueiaCompra("ja_atribuida"), false);
    assert.equal(codigoBloqueiaCompra("atribuida"), false);
    assert.equal(lerResultadoAtribuicao("estranho"), "codigo_invalido");
  });
});

describe("candidatura", () => {
  const campos = (extra = {}) => {
    const base = { nome: "Ana Teste", email: "Ana@Teste.Invalid ", empresa: "", tipo: "indicacao", descricao: "Trabalho com compradores de casa.", aceita: "sim", ...extra };
    return (n) => base[n];
  };

  test("válida: e-mail normalizado, empresa vazia → null", () => {
    const r = lerCandidatura(campos());
    assert.equal(r.ok, true);
    assert.equal(r.candidatura.email, "ana@teste.invalid");
    assert.equal(r.candidatura.empresa, null);
  });

  test("erros por campo e aceitação obrigatória", () => {
    assert.deepEqual(lerCandidatura(campos({ nome: "A" })), { ok: false, erro: "nome" });
    assert.deepEqual(lerCandidatura(campos({ email: "sem-arroba" })), { ok: false, erro: "email" });
    assert.deepEqual(lerCandidatura(campos({ tipo: "revenda" })), { ok: false, erro: "tipo" });
    assert.deepEqual(lerCandidatura(campos({ descricao: "curto" })), { ok: false, erro: "descricao" });
    assert.deepEqual(lerCandidatura(campos({ aceita: undefined })), { ok: false, erro: "aceitar" });
  });

  test("texto aceite registado = texto mostrado (português)", () => {
    assert.equal(pt.candidatura.aceitar, TEXTO_ACEITACAO_CANDIDATURA_PARCEIROS);
  });

  test("página sem promessas de rendimento nem valores de comissão", () => {
    const texto = JSON.stringify(pt.pagina);
    assert.ok(!/€|\d+\s?%|ganhe|rendimento garantido|garantimos/i.test(texto), texto);
    assert.match(texto, /não há rendimentos garantidos/);
  });
});

describe("faturas, reembolsos e IVA", () => {
  test("valor pago, IVA (só se o Stripe o calcular) e descontos", () => {
    assert.deepEqual(valoresDaFatura({ amount_paid: 499, total_taxes: [{ amount: 93 }], total_discount_amounts: [{ amount: 100 }] }), {
      valorPagoCents: 499,
      ivaCents: 93,
      descontoCents: 100,
    });
    assert.deepEqual(valoresDaFatura({ amount_paid: 0 }), { valorPagoCents: 0, ivaCents: 0, descontoCents: 0 });
  });

  test("só o reembolso integral reverte uma mensalidade", () => {
    assert.equal(reembolsoIntegral({ amount: 499 }, 499), true);
    assert.equal(reembolsoIntegral({ amount: 200 }, 499), false);
    assert.equal(reembolsoIntegral({ amount: 499 }, null), false);
  });

  test("IVA do pagamento: vazio = isento; vírgula decimal; máximo 23 %", () => {
    assert.deepEqual(lerIva(""), { ok: true, cents: null });
    assert.deepEqual(lerIva("1,15"), { ok: true, cents: 115 });
    assert.deepEqual(lerIva("-1"), { ok: false });
    assert.equal(ivaMaximo(500), 115);
    assert.equal(ivaMaximo(1300), 299);
  });
});

describe("e-mails", () => {
  test("candidatura recebida: prazo de 2 dias úteis, nos dois idiomas", () => {
    assert.match(montarEmailCandidaturaRecebida("pt-PT").texto, /no prazo máximo de 2 dias úteis/);
    assert.match(montarEmailCandidaturaRecebida("en-GB").texto, /within 2 working days/);
  });

  test("aprovação: código e ligação; só distribuição: sem código", () => {
    const e = montarEmailCandidaturaAprovada({ idioma: "pt-PT", codigo: "PARC2345", url: urlParceiro("PARC2345"), distribuicao: false });
    assert.match(e.texto, /PARC2345/);
    assert.match(e.texto, /https:\/\/dolado\.pt\/r\/PARC2345/);
    assert.match(e.texto, /Não tem acesso aos casos/);
    const d = montarEmailCandidaturaAprovada({ idioma: "en-GB", codigo: null, url: null, distribuicao: true });
    assert.ok(!/\/r\//.test(d.texto));
    assert.match(d.texto, /Protection packages/);
  });

  test("pagamento: comissões sem IVA, IVA e valor transferido — sem dados de clientes", () => {
    const e = montarEmailPagamentoComissoes({ idioma: "pt-PT", comissoes: 2, totalCents: 1300, ivaCents: 299, referencia: "TRF <1>", data: "2026-11-05" });
    assert.match(e.texto, /Comissões \(sem IVA\): 13,00/);
    assert.match(e.texto, /IVA: 2,99/);
    assert.match(e.texto, /Valor transferido: 15,99/);
    assert.ok(e.html.includes("TRF &lt;1&gt;"));
    assert.ok(!/@teste|user_id|cus_/.test(e.texto));
  });

  test("aviso ao admin sem o texto livre da candidatura", () => {
    const a = avisoAdminCandidatura({ tipo: "ambos", temEmpresa: true });
    assert.match(a.texto, /\/backoffice\/parceiros\/candidaturas/);
  });
});

describe("integração (estática)", () => {
  const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

  test("/parceiros fora do índice e só com o programa ligado", () => {
    const pagina = ler("../../app/[idioma]/parceiros/page.tsx");
    assert.match(pagina, /robots: \{ index: false, follow: true \}/);
    assert.match(pagina, /parceirosAtivos\(\)/);
  });

  test("o cliente indicado por um parceiro nunca recebe desconto (a atribuição de parceiro não passa por indicacoes)", () => {
    const servidor = ler("./servidor.ts");
    assert.ok(!/cupao|coupon|discounts?:|camposDesconto|prepararDesconto/i.test(servidor.replace(/\/\/.*$/gm, "")));
  });

  test("webhook: sempre ligado às dependências reais (contas já atribuídas continuam a contar)", () => {
    assert.match(ler("../stripe/webhookDependencias.ts"), /deps\.parceiros = criarDependenciasParceiros/);
  });
});
