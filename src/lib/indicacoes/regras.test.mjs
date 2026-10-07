// Programa de indicação — regras puras (`npm test`).
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { PLANOS } from "../planos.ts";
import {
  ALFABETO_CODIGO,
  CUPAO_INDICACAO_NOVO_CLIENTE,
  CUPAO_INDICACAO_RECOMPENSA,
  REGRA_CASO_PROTECAO,
  TEXTOS_INDICACAO,
  VALIDADE_RECOMPENSA_MESES,
  camposDescontoCheckout,
  cupaoConforme,
  escolherDescontoCheckout,
  faturaComCupao,
  gerarCodigo,
  indicacoesAtivas,
  normalizarCodigo,
  precoComDescontoCentimos,
  produtoComDescontoIndicacao,
  produtoDaCompra,
  subscricaoAceitaRecompensa,
  textoDescontoNaCompra,
  textoDescontosDisponiveis,
  textoValidade,
  urlIndicacao,
  visitaDoCookie,
} from "./regras.ts";

const base = {
  fluxo: "pedido_caso",
  conversao: false,
  novoClienteIndicado: false,
  recompensasDisponiveis: 0,
  prescindiu: false,
};

describe("código e link", () => {
  test("código opaco de 8 símbolos, sem 0/O/1/I, a partir de bytes aleatórios", () => {
    for (let i = 0; i < 200; i++) {
      const c = gerarCodigo(randomBytes(8));
      assert.match(c, /^[A-HJ-NP-Z2-9]{8}$/);
      for (const ch of c) assert.ok(ALFABETO_CODIGO.includes(ch));
    }
    assert.throws(() => gerarCodigo(new Uint8Array(4)));
  });

  test("normalizar: aceita minúsculas, recusa tudo o que não é um código", () => {
    assert.equal(normalizarCodigo("abcd2345"), "ABCD2345");
    assert.equal(normalizarCodigo(" ABCD2345 "), "ABCD2345");
    for (const mau of ["ABC", "ABCD23450", "ABCD234O", "ABCD2341", "../admin", "", null, 42, "abcd-234"]) {
      assert.equal(normalizarCodigo(mau), null, String(mau));
    }
  });

  test("cookie da visita: só um UUID", () => {
    assert.equal(visitaDoCookie("3f1c2b8e-1d2a-4b3c-9d4e-5f6a7b8c9d0e"), "3f1c2b8e-1d2a-4b3c-9d4e-5f6a7b8c9d0e");
    assert.equal(visitaDoCookie("ABCD2345"), null);
    assert.equal(visitaDoCookie("x' or 1=1"), null);
    assert.equal(visitaDoCookie(undefined), null);
  });

  test("link pessoal sem dados pessoais nem IDs internos", () => {
    assert.equal(urlIndicacao("ABC23DEF"), "https://dolado.pt/r/ABC23DEF");
  });

  test("ligado só com INDICACOES_ATIVO=1", () => {
    assert.equal(indicacoesAtivas("1"), true);
    assert.equal(indicacoesAtivas(undefined), false);
    assert.equal(indicacoesAtivas("true"), false);
  });
});

describe("desconto no Checkout", () => {
  test("Avulso: 20% para o novo cliente indicado (≈ 11,99 €)", () => {
    assert.equal(escolherDescontoCheckout({ ...base, plano: "avulso", novoClienteIndicado: true }), "novo_cliente");
    assert.equal(precoComDescontoCentimos(PLANOS.avulso.precoCentimos), 1199);
  });

  test("Proteção: 20% só na primeira mensalidade (≈ 3,99 €)", () => {
    assert.equal(escolherDescontoCheckout({ ...base, fluxo: "adesao", plano: "protecao", novoClienteIndicado: true }), "novo_cliente");
    assert.equal(precoComDescontoCentimos(PLANOS.protecao.precoCentimos), 399);
    assert.equal(CUPAO_INDICACAO_NOVO_CLIENTE.duration, "once");
    assert.equal(CUPAO_INDICACAO_RECOMPENSA.duration, "once");
  });

  test("Caso + Proteção: sem desconto de aquisição (nem de novo cliente, nem de quem indicou, na adesão)", () => {
    assert.equal(produtoComDescontoIndicacao("caso_protecao"), false);
    assert.equal(
      escolherDescontoCheckout({ ...base, plano: "caso_protecao", novoClienteIndicado: true, recompensasDisponiveis: 3 }),
      null,
    );
  });

  test("um só desconto por compra: o de novo cliente primeiro, nunca os dois", () => {
    assert.equal(
      escolherDescontoCheckout({ ...base, plano: "avulso", novoClienteIndicado: true, recompensasDisponiveis: 2 }),
      "novo_cliente",
    );
    assert.equal(escolherDescontoCheckout({ ...base, plano: "avulso", recompensasDisponiveis: 2 }), "recompensa");
    assert.equal(escolherDescontoCheckout({ ...base, plano: "avulso" }), null);
  });

  test("sem desconto: compra sem conta, Caso Extra, conversão do Avulso, ou o cliente preferiu um código", () => {
    const comTudo = { novoClienteIndicado: true, recompensasDisponiveis: 1 };
    assert.equal(escolherDescontoCheckout({ ...base, ...comTudo, plano: "protecao", fluxo: "publico" }), null);
    assert.equal(escolherDescontoCheckout({ ...base, ...comTudo, plano: "avulso", fluxo: "caso_extra" }), null);
    assert.equal(escolherDescontoCheckout({ ...base, ...comTudo, plano: "protecao", fluxo: "adesao", conversao: true }), null);
    assert.equal(escolherDescontoCheckout({ ...base, ...comTudo, plano: "avulso", prescindiu: true }), null);
  });

  test("voucher + indicação: com desconto não há códigos promocionais; sem ele, os códigos de sempre", () => {
    const comDesconto = camposDescontoCheckout({ discounts: [{ coupon: CUPAO_INDICACAO_NOVO_CLIENTE.id }] });
    assert.deepEqual(comDesconto, { discounts: [{ coupon: CUPAO_INDICACAO_NOVO_CLIENTE.id }] });
    assert.equal("allow_promotion_codes" in comDesconto, false);
    assert.deepEqual(camposDescontoCheckout(null), { allow_promotion_codes: true });
  });

  test("cupão no Stripe tem de ser exatamente 20%, uma cobrança, válido", () => {
    assert.equal(cupaoConforme({ percent_off: 20, duration: "once", valid: true }, CUPAO_INDICACAO_RECOMPENSA), true);
    assert.equal(cupaoConforme({ percent_off: 40, duration: "once", valid: true }, CUPAO_INDICACAO_RECOMPENSA), false);
    assert.equal(cupaoConforme({ percent_off: 20, duration: "forever", valid: true }, CUPAO_INDICACAO_RECOMPENSA), false);
    assert.equal(cupaoConforme({ percent_off: 20, duration: "once", valid: false }, CUPAO_INDICACAO_RECOMPENSA), false);
  });
});

describe("desconto de quem indicou na subscrição", () => {
  const ok = { plano: "protecao", status: "active", cancelamentoAgendado: false, outrosDescontos: 0 };
  test("renovação da Proteção ou do Caso + Proteção ativa, sem cancelamento e sem outro desconto", () => {
    assert.equal(subscricaoAceitaRecompensa(ok), true);
    // REGRA_CASO_PROTECAO: uma recompensa já ganha pode ser usada numa renovação do Caso + Proteção.
    assert.equal(subscricaoAceitaRecompensa({ ...ok, plano: "caso_protecao" }), true);
    assert.equal(subscricaoAceitaRecompensa({ ...ok, plano: "caso_protecao", outrosDescontos: 1 }), false, "cupão do piloto: não acumula");
    assert.equal(subscricaoAceitaRecompensa({ ...ok, plano: null }), false);
    assert.equal(subscricaoAceitaRecompensa({ ...ok, status: "past_due" }), false);
    assert.equal(subscricaoAceitaRecompensa({ ...ok, cancelamentoAgendado: true }), false);
    assert.equal(subscricaoAceitaRecompensa({ ...ok, outrosDescontos: 1 }), false);
  });

  test("fatura: reconhece o cupão nos descontos expandidos (ids sozinhos não chegam)", () => {
    const id = CUPAO_INDICACAO_RECOMPENSA.id;
    assert.equal(faturaComCupao([{ source: { coupon: id } }], id), true);
    assert.equal(faturaComCupao([{ source: { coupon: { id } } }], id), true);
    assert.equal(faturaComCupao(["di_123"], id), false);
    assert.equal(faturaComCupao([{ source: { coupon: "duploprestigio26" } }], id), false);
    assert.equal(faturaComCupao(null, id), false);
  });
});

describe("produto da primeira compra", () => {
  test("Avulso, Proteção, Caso + Proteção contam; Caso Extra não", () => {
    assert.equal(produtoDaCompra("payment", "avulso", null), "avulso");
    assert.equal(produtoDaCompra("payment", "caso_extra", null), null);
    assert.equal(produtoDaCompra("subscription", "assinatura", "protecao"), "protecao");
    assert.equal(produtoDaCompra("subscription", "assinatura", "caso_protecao"), "caso_protecao");
    assert.equal(produtoDaCompra("subscription", "assinatura", null), null);
  });
});

describe("textos", () => {
  test("mensagens pedidas e contagem de descontos", () => {
    assert.equal(TEXTOS_INDICACAO.mensagem, "20% para si. 20% para quem indicar.");
    assert.equal(textoDescontosDisponiveis(0), "Sem descontos disponíveis");
    assert.equal(textoDescontosDisponiveis(1), "1 desconto de 20% disponível");
    assert.equal(textoDescontosDisponiveis(2), "2 descontos de 20% disponíveis");
    assert.match(TEXTOS_INDICACAO.casoProtecaoSemDesconto, /não acumula/);
  });

  test("regra do Caso + Proteção escrita de forma explícita", () => {
    assert.equal(
      REGRA_CASO_PROTECAO,
      "Caso + Proteção não é elegível para o desconto de aquisição de 20%. Contudo, uma recompensa de indicação já ganha pelo cliente pode ser utilizada numa renovação mensal futura do Caso + Proteção.",
    );
    assert.match(TEXTOS_INDICACAO.regras, /renovações mensais da Proteção e do Caso \+ Proteção/);
    assert.match(TEXTOS_INDICACAO.regras, /Caso Extra/);
  });

  test("validade de 12 meses mostrada no portal", () => {
    assert.equal(VALIDADE_RECOMPENSA_MESES, 12);
    assert.equal(textoValidade("2027-10-07T10:00:00Z"), "válido até 07/10/2027");
    assert.match(TEXTOS_INDICACAO.regras, /12 meses/);
  });

  test("sem conta: diz como ativar os 20% (criar conta ou iniciar sessão)", () => {
    assert.match(TEXTOS_INDICACAO.semConta, /crie conta ou inicie sessão/);
    assert.match(TEXTOS_INDICACAO.semConta, /sem o desconto de indicação/);
  });

  test("regras de escrita: português europeu, «e-mail», «a DoLado», terceira pessoa", () => {
    const todos = [
      ...Object.values(TEXTOS_INDICACAO),
      textoDescontoNaCompra("novo_cliente", true),
      textoDescontoNaCompra("novo_cliente", false),
      textoDescontoNaCompra("recompensa", true),
      textoDescontoNaCompra("recompensa", false),
    ].join("\n");
    for (const proibido of [/\bemail/i, /\bvocê/i, /\bo DoLado/, /Dolado/, /\btu\b/i, /\bteu\b/i, /\bpartilha o\b/i, /cadastro/i, /créditos?/i, /saldo/i]) {
      assert.doesNotMatch(todos, proibido, String(proibido));
    }
  });

  test("componentes do portal usam só os textos centralizados (sem nomes nem e-mails de indicados)", () => {
    const portal = readFileSync(new URL("../../components/portal/Indicacao.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(portal, /referred_user_id|email|\.nome\b/);
  });
});
