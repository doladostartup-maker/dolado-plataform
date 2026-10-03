// Associação segura de uma compra sem conta a uma conta existente —
// `npm test`. A reclamação falsa segue as regras da função SQL
// reclamar_compra_sem_conta (o teste de contrato corre a real).
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { associarCompraAConta, avaliarSessaoParaAssociar, MENSAGENS_ASSOCIACAO } from "./associacao.ts";

const USER = "00000000-0000-4000-a000-0000000000a1";
const OUTRA = "00000000-0000-4000-a000-0000000000b2";
const PRECO_CASO_PROTECAO = "price_1UJYnPBtJL9VeDPfnQTlVwsq";

const sessaoSub = (extra = {}) => ({
  id: "cs_pub",
  object: "checkout.session",
  mode: "subscription",
  status: "complete",
  payment_status: "no_payment_required",
  customer: "cus_novo",
  subscription: "sub_nova",
  invoice: "in_nova",
  customer_details: { email: "Cliente@Teste.invalid" },
  metadata: { plano: "assinatura" },
  ...extra,
});

let estado;
let conta;
let sessao;

function deps() {
  const webhook = {
    async garantirConta(userId, customerId) {
      estado.contas[userId] ??= { stripe_customer_id: customerId, plano: "none", sub: null, creditos: 0 };
    },
    async concederCreditoCaso(userId, origem) {
      if (estado.origens.has(origem)) return false;
      estado.origens.add(origem);
      estado.contas[userId].creditos += 1;
      return true;
    },
    async obterSubscricaoStripe(id) {
      return { stripe_subscription_id: id, stripe_customer_id: "cus_novo", price_id: PRECO_CASO_PROTECAO, status: "active", cancel_at_period_end: false, cancel_at: null };
    },
    planoDoPreco: (p) => (p === PRECO_CASO_PROTECAO ? "caso_protecao" : null),
    async subscricaoAtivaDaConta(userId) {
      const c = estado.contas[userId];
      return c?.sub && c.plano !== "none" ? c.sub : null;
    },
    async registarSubscricaoDuplicada() {
      return true;
    },
    async aplicarSubscricaoNaConta(userId, sub) {
      Object.assign(estado.contas[userId], { plano: sub.plano, sub: sub.stripe_subscription_id, stripe_customer_id: sub.stripe_customer_id });
    },
    async restaurarCreditosCaso() {
      return 0;
    },
    async notificarAdmin(assunto, texto) {
      estado.avisos.push({ assunto, texto });
    },
  };
  return {
    contaAutenticada: async () => conta,
    lerSessaoStripe: async (id) => (sessao && sessao.id === id ? sessao : null),
    // Regras de reclamar_compra_sem_conta (lock, posse única, e-mail, IDs, duplicado).
    async reclamar({ sessionId, userId, customerId, subscriptionId, subscricaoExistente }) {
      estado.reclamacoes += 1;
      const p = estado.pagamentos[sessionId];
      if (!p) return "sem_pagamento";
      const a = estado.associacoes[sessionId];
      if (a) return a.user_id !== userId ? "outra_conta" : a.resultado === "associada" ? "ja_associada" : "ja_em_revisao";
      if (p.user_id) return p.user_id === userId ? "ja_associada" : "outra_conta";
      if (p.estado !== "concluido") return "pagamento_nao_confirmado";
      const u = estado.utilizadores[userId];
      if (!u?.confirmado) return "email_nao_confirmado";
      if (u.email.toLowerCase() !== p.email.toLowerCase()) return "email_diferente";
      if (p.customer !== customerId || p.subscription !== subscriptionId) return "dados_diferentes";
      if (subscricaoExistente && subscriptionId) {
        estado.associacoes[sessionId] = { user_id: userId, resultado: "duplicado_por_rever" };
        return "duplicado_por_rever";
      }
      estado.associacoes[sessionId] = { user_id: userId, resultado: "associada" };
      p.user_id = userId;
      return "associada";
    },
    webhook,
  };
}

beforeEach(() => {
  estado = {
    pagamentos: {
      cs_pub: { email: "cliente@teste.invalid", estado: "concluido", user_id: null, customer: "cus_novo", subscription: "sub_nova" },
    },
    associacoes: {},
    utilizadores: {
      [USER]: { email: "cliente@teste.invalid", confirmado: true },
      [OUTRA]: { email: "cliente@teste.invalid", confirmado: true },
    },
    contas: {},
    origens: new Set(),
    avisos: [],
    reclamacoes: 0,
  };
  conta = { id: USER, email: "cliente@teste.invalid", emailConfirmado: true };
  sessao = sessaoSub();
});

describe("associação segura depois de login", () => {
  test("conta com e-mail confirmado igual ao do Checkout: associa e aplica o plano uma única vez", async () => {
    assert.equal(await associarCompraAConta("cs_pub", deps()), "associada");
    assert.equal(estado.pagamentos.cs_pub.user_id, USER);
    assert.equal(estado.contas[USER].plano, "caso_protecao");
    assert.equal(estado.contas[USER].sub, "sub_nova");
    assert.equal(estado.contas[USER].creditos, 1);

    // Repetir (ex.: duplo clique): idempotente, sem novo caso.
    assert.equal(await associarCompraAConta("cs_pub", deps()), "ja_associada");
    assert.equal(estado.contas[USER].creditos, 1);
  });

  test("sem sessão: não associa nem consulta a base de dados", async () => {
    conta = null;
    assert.equal(await associarCompraAConta("cs_pub", deps()), "sem_sessao");
    assert.equal(estado.reclamacoes, 0);
  });

  test("mismatch de e-mail: recusado, sem efeitos", async () => {
    conta = { ...conta, email: "outra@teste.invalid" };
    assert.equal(await associarCompraAConta("cs_pub", deps()), "email_diferente");
    assert.equal(estado.reclamacoes, 0);
    assert.equal(estado.pagamentos.cs_pub.user_id, null);
  });

  test("e-mail da conta por confirmar: recusado", async () => {
    conta = { ...conta, emailConfirmado: false };
    assert.equal(await associarCompraAConta("cs_pub", deps()), "email_nao_confirmado");
    assert.equal(estado.reclamacoes, 0);
  });

  test("a base de dados também recusa um e-mail não confirmado (defesa em profundidade)", async () => {
    estado.utilizadores[USER].confirmado = false;
    assert.equal(await associarCompraAConta("cs_pub", deps()), "email_nao_confirmado");
    assert.equal(estado.pagamentos.cs_pub.user_id, null);
  });

  test("pagamento ainda pendente: recusado", async () => {
    sessao = sessaoSub({ payment_status: "unpaid" });
    assert.equal(await associarCompraAConta("cs_pub", deps()), "pagamento_nao_confirmado");
  });

  test("compra já reclamada por outra conta: recusada, a primeira fica intacta", async () => {
    assert.equal(await associarCompraAConta("cs_pub", deps()), "associada");
    conta = { id: OUTRA, email: "cliente@teste.invalid", emailConfirmado: true };
    assert.equal(await associarCompraAConta("cs_pub", deps()), "outra_conta");
    assert.equal(estado.pagamentos.cs_pub.user_id, USER);
    assert.equal(estado.contas[OUTRA], undefined, "a segunda conta não recebe nada");
  });

  test("compra já ligada a uma conta (ex.: por /criar-conta): outra conta não a reclama", async () => {
    estado.pagamentos.cs_pub.user_id = OUTRA;
    assert.equal(await associarCompraAConta("cs_pub", deps()), "outra_conta");
    assert.equal(estado.contas[USER], undefined);
  });

  test("compra de uma conta (metadata.user_id): não é do fluxo público", async () => {
    sessao = sessaoSub({ metadata: { plano: "assinatura", user_id: OUTRA } });
    assert.equal(await associarCompraAConta("cs_pub", deps()), "compra_com_conta");
    assert.equal(estado.reclamacoes, 0);
  });

  test("dados Stripe diferentes dos gravados: recusado", async () => {
    estado.pagamentos.cs_pub.subscription = "sub_outra";
    assert.equal(await associarCompraAConta("cs_pub", deps()), "dados_diferentes");
  });

  test("subscrição duplicada: não junta, não aplica, fica por rever e avisa o admin", async () => {
    estado.contas[USER] = { stripe_customer_id: "cus_antigo", plano: "caso_protecao", sub: "sub_antiga", creditos: 2 };
    assert.equal(await associarCompraAConta("cs_pub", deps()), "duplicado_por_rever");
    assert.equal(estado.contas[USER].sub, "sub_antiga");
    assert.equal(estado.contas[USER].creditos, 2);
    assert.equal(estado.pagamentos.cs_pub.user_id, null, "o pagamento não fica ligado");
    assert.equal(estado.avisos.length, 1);
    assert.match(estado.avisos[0].texto, /sub_antiga[\s\S]*Ação recomendada/);

    // Repetir: em revisão, sem segundo aviso.
    assert.equal(await associarCompraAConta("cs_pub", deps()), "ja_em_revisao");
    assert.equal(estado.avisos.length, 1);
  });

  test("Avulso numa conta com subscrição ativa: não é duplicado (soma um caso)", async () => {
    estado.contas[USER] = { stripe_customer_id: "cus_antigo", plano: "protecao", sub: "sub_antiga", creditos: 0 };
    estado.pagamentos.cs_pub.subscription = null;
    sessao = sessaoSub({ mode: "payment", subscription: null, invoice: null, metadata: { plano: "avulso" } });
    assert.equal(await associarCompraAConta("cs_pub", deps()), "associada");
    assert.equal(estado.contas[USER].sub, "sub_antiga");
    assert.equal(estado.contas[USER].creditos, 1);
  });

  test("avaliarSessaoParaAssociar: compara e-mails sem diferenças de maiúsculas/espaços", () => {
    assert.equal(avaliarSessaoParaAssociar(sessaoSub(), { id: USER, email: " CLIENTE@teste.invalid ", emailConfirmado: true }), "ok");
  });

  test("todas as respostas têm mensagem em português europeu, sem 'você'", () => {
    for (const m of Object.values(MENSAGENS_ASSOCIACAO)) {
      assert.ok(m.length > 0);
      assert.equal(/\bvocê\b|\bemail\b/i.test(m), false);
    }
  });
});
