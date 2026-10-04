// Consentimentos obrigatórios antes do Stripe Checkout — `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  CAMPO_ACEITA_TERMOS,
  CAMPO_INICIO_IMEDIATO,
  abrirCheckoutComConsentimento,
  consentimentoDaMetadata,
  lerPedidoCompra,
  montarRegistoConsentimento,
} from "./consentimentoCompra.ts";
import {
  CONSENTIMENTO_INICIO_IMEDIATO_VERSAO,
  INICIO_IMEDIATO_POR_PLANO,
  PRIVACIDADE_VERSAO,
  TERMOS_VERSAO,
  TEXTO_ACEITACAO_TERMOS,
} from "./legal.ts";

const USER = "00000000-0000-4000-a000-00000000000a";
const formulario = (extra = {}) => {
  const campos = {
    plano: "caso_protecao",
    fluxo: "adesao",
    origem: "portal",
    [CAMPO_ACEITA_TERMOS]: "sim",
    [CAMPO_INICIO_IMEDIATO]: "sim",
    ...extra,
  };
  return (c) => campos[c] ?? null;
};

describe("validação no servidor (lerPedidoCompra)", () => {
  test("10. as duas checkboxes aceites → pedido válido", () => {
    assert.deepEqual(lerPedidoCompra(formulario()), {
      ok: true,
      pedido: { plano: "caso_protecao", fluxo: "adesao", origem: "portal" },
    });
  });

  test("8. sem aceitar os Termos → recusado", () => {
    assert.deepEqual(lerPedidoCompra(formulario({ [CAMPO_ACEITA_TERMOS]: null })), { ok: false, erro: "termos" });
    assert.deepEqual(lerPedidoCompra(formulario({ [CAMPO_ACEITA_TERMOS]: "on" })), { ok: false, erro: "termos" });
  });

  test("9. sem pedir início imediato → recusado", () => {
    assert.deepEqual(lerPedidoCompra(formulario({ [CAMPO_INICIO_IMEDIATO]: null })), { ok: false, erro: "inicio_imediato" });
  });

  test("plano, fluxo e origem inválidos ou incoerentes → recusado", () => {
    for (const extra of [
      { plano: "price_x" },
      { fluxo: "outro" },
      { origem: "hack" },
      { plano: "avulso", fluxo: "adesao" },
      { plano: "protecao", fluxo: "avulso_conta" },
    ]) {
      assert.deepEqual(lerPedidoCompra(formulario(extra)), { ok: false, erro: "dados_invalidos" }, JSON.stringify(extra));
    }
  });

  test("todos os fluxos e origens de compra são aceites", () => {
    for (const [plano, fluxo, origem] of [
      ["avulso", "publico", "landing"],
      ["protecao", "publico", "landing"],
      ["caso_protecao", "publico", "landing"],
      ["avulso", "avulso_conta", "novo_caso"],
      ["avulso", "avulso_conta", "repetir_pagamento"],
      ["protecao", "adesao", "portal"],
      ["caso_protecao", "adesao", "novo_caso"],
      ["protecao", "adesao", "repetir_pagamento"],
    ]) {
      assert.equal(lerPedidoCompra(formulario({ plano, fluxo, origem })).ok, true, `${plano}/${fluxo}/${origem}`);
    }
  });
});

describe("registo de prova", () => {
  const agora = new Date("2026-10-01T10:00:00Z");

  test("versões, textos e horas vêm do servidor — nunca do browser", () => {
    const r = montarRegistoConsentimento(
      { plano: "avulso", tipo: "avulso", origem: "landing", userId: null, email: null },
      agora,
    );
    assert.equal(r.termos_versao, TERMOS_VERSAO);
    assert.equal(r.privacidade_versao, PRIVACIDADE_VERSAO);
    assert.equal(r.consentimento_inicio_imediato_versao, CONSENTIMENTO_INICIO_IMEDIATO_VERSAO);
    assert.equal(r.texto_aceitacao_termos, TEXTO_ACEITACAO_TERMOS);
    assert.equal(r.texto_consentimento_inicio_imediato, INICIO_IMEDIATO_POR_PLANO.avulso.texto);
    assert.equal(r.aceitou_termos_em, "2026-10-01T10:00:00.000Z");
    assert.equal(r.pediu_inicio_imediato_em, "2026-10-01T10:00:00.000Z");
    assert.equal(r.user_id, null); // 18. compra sem conta
  });

  test("17. utilizador autenticado e conversão Avulso ficam no registo", () => {
    const r = montarRegistoConsentimento(
      { plano: "protecao", tipo: "conversao_avulso", origem: "portal", userId: USER, email: "a@teste.invalid", conversaoId: "conv" },
      agora,
    );
    assert.equal(r.user_id, USER);
    assert.equal(r.email, "a@teste.invalid");
    assert.equal(r.tipo_compra, "conversao_avulso");
    assert.equal(r.conversao_id, "conv");
  });

  test("texto de início imediato definido por produto (estrutura pronta para versões diferentes)", () => {
    assert.deepEqual(Object.keys(INICIO_IMEDIATO_POR_PLANO).sort(), ["avulso", "caso_protecao", "protecao"]);
    for (const c of Object.values(INICIO_IMEDIATO_POR_PLANO)) {
      assert.match(c.texto, /^Peço expressamente que a DoLado inicie a prestação do serviço imediatamente/);
      assert.ok(c.versao);
    }
    assert.equal(TEXTO_ACEITACAO_TERMOS, "Li e aceito os Termos e Condições da DoLado.");
  });
});

describe("ordem: registo antes do Checkout, id na metadata", () => {
  test("11/12. regista primeiro, cria a sessão com consentimento_compra_id e liga a sessão", async () => {
    const passos = [];
    const r = await abrirCheckoutComConsentimento(
      montarRegistoConsentimento({ plano: "caso_protecao", tipo: "subscricao", origem: "portal", userId: USER, email: null }),
      {
        async registarConsentimento() {
          passos.push("registar");
          return "11111111-1111-4111-a111-111111111111";
        },
        async criarSessao(metadata) {
          passos.push(["sessao", metadata]);
          return { id: "cs_1", url: "https://checkout.stripe.com/x" };
        },
        async ligarSessao(id, sessionId) {
          passos.push(["ligar", id, sessionId]);
        },
      },
    );
    assert.equal(passos[0], "registar");
    assert.deepEqual(passos[1], [
      "sessao",
      { consentimento_compra_id: "11111111-1111-4111-a111-111111111111", produto: "caso_protecao", tipo_compra: "subscricao" },
    ]);
    assert.deepEqual(passos[2], ["ligar", "11111111-1111-4111-a111-111111111111", "cs_1"]);
    assert.equal(r.url, "https://checkout.stripe.com/x");
  });

  test("se o registo falhar, não há Checkout", async () => {
    let sessoes = 0;
    await assert.rejects(
      abrirCheckoutComConsentimento(
        montarRegistoConsentimento({ plano: "avulso", tipo: "avulso", origem: "landing", userId: null, email: null }),
        {
          async registarConsentimento() {
            throw new Error("db em baixo");
          },
          async criarSessao() {
            sessoes++;
            return { id: "x", url: null };
          },
          async ligarSessao() {},
        },
      ),
    );
    assert.equal(sessoes, 0);
  });

  test("id da metadata: só UUID", () => {
    assert.equal(consentimentoDaMetadata({ consentimento_compra_id: "11111111-1111-4111-a111-111111111111" }), "11111111-1111-4111-a111-111111111111");
    assert.equal(consentimentoDaMetadata({ consentimento_compra_id: "x' or 1=1" }), null);
    assert.equal(consentimentoDaMetadata(null), null);
  });
});

describe("nenhum fluxo abre o Checkout sem consentimento (código das ações)", () => {
  const acoes = readFileSync(new URL("../app/actions/stripe.ts", import.meta.url), "utf8");

  test("a única Server Action exportada é confirmarCompra", () => {
    const exportadas = [...acoes.matchAll(/export async function (\w+)/g)].map((m) => m[1]);
    assert.deepEqual(exportadas, ["confirmarCompra"]);
  });

  test("há uma única chamada a checkout.sessions.create, dentro do helper com registo prévio", () => {
    assert.equal((acoes.match(/checkout\.sessions\.create\(/g) ?? []).length, 1);
    const helper = acoes.slice(acoes.indexOf("function dependenciasCheckout"), acoes.indexOf("async function checkoutPublico"));
    assert.match(helper, /checkout\.sessions\.create\(/);
    assert.match(helper, /consentimentos_compra/);
  });

  test("confirmarCompra valida antes de qualquer fluxo", () => {
    const corpo = acoes.slice(acoes.indexOf("export async function confirmarCompra"));
    assert.ok(corpo.indexOf("lerPedidoCompra") < corpo.indexOf("checkoutPublico("));
    assert.match(corpo, /if \(!lido\.ok\) return/);
  });

  test("os 4 fluxos (Avulso, subscrição, conversão, público) passam por abrirCheckoutComConsentimento", () => {
    assert.equal((acoes.match(/abrirCheckoutComConsentimento\(/g) ?? []).length, 4);
  });

  test("metadata do consentimento também vai para a subscrição e para o pagamento", () => {
    assert.match(acoes, /subscription_data: \{ metadata \}/);
    assert.match(acoes, /payment_intent_data: \{ metadata \}/);
    assert.match(acoes, /metadataExtra: \{ \.\.\.metadata/);
  });

  test("o servidor continua a escolher o preço (o browser só envia o PlanoId)", () => {
    assert.match(acoes, /precoDoPlano\(pedido\.plano\)/);
    assert.match(acoes, /plano: avulso \? "avulso" : "assinatura"/);
  });
});

describe("pontos de entrada usam a confirmação", () => {
  const fonte = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
  const pontos = {
    "5. landing (preçário → portal /comprar)": [
      "../app/comprar/page.tsx",
      /<BotaoComprar[\s\S]*fluxo="publico"[\s\S]*origem="landing"[\s\S]*<CompraConfirmacao[\s\S]*fluxo="adesao"/,
    ],
    "6. portal (painel)": ["../app/portal/_components/PortalDashboard.tsx", /<ConfirmarCompra[\s\S]*fluxo="adesao"[\s\S]*origem="portal"/],
    "7. pedido de caso (modalidade)": [
      "../app/tratar-caso/modalidade/page.tsx",
      /<BotaoComprar[\s\S]*fluxo="pedido_caso"[\s\S]*origem="tratar_caso"[\s\S]*pedidoId=\{pedido\.id\}/,
    ],
    "tentar pagar novamente": ["../app/portal/page.tsx", /origem="repetir_pagamento"/],
  };
  for (const [nome, [ficheiro, padrao]] of Object.entries(pontos)) {
    test(`${nome}: abre a confirmação e não chama ações de Checkout antigas`, () => {
      const f = fonte(ficheiro);
      assert.match(f, padrao);
      assert.equal(/iniciarCheckout|iniciarCompraAvulsoComConta|iniciarUpgradePara/.test(f), false);
    });
  }

  test("preçário de dolado.pt não abre Checkout: leva sempre a portal.dolado.pt/comprar (ou ao Tratar o meu caso)", () => {
    const destino = fonte("./precario.ts");
    assert.match(destino, /plano === "avulso" \? urlTratarCaso\(origem\) : urlComprar\(plano\)/);
    const precarioV2 = fonte("../components/precario-v2/PrecarioV2.tsx");
    for (const f of [destino, precarioV2]) {
      assert.equal(/ConfirmarCompra|confirmarCompra|BotaoComprar|stripe/i.test(f), false);
    }
    assert.match(precarioV2, /destinoPlano\(plano, "\/precario"\)/);
    const confirmacao = fonte("../app/comprar/CompraConfirmacao.tsx");
    assert.match(confirmacao, /<ConfirmarCompra[\s\S]*origem="landing"/);
  });

  test("compra pública com sessão iniciada segue os fluxos da conta (nunca checkoutPublico)", () => {
    const acoes = fonte("../app/actions/stripe.ts");
    assert.match(acoes, /comSessao = pedido\.fluxo === "publico" && !!\(await utilizadorAtual\(\)\)\.user/);
    assert.match(acoes, /pedido\.fluxo === "publico" && !comSessao\s*\?\s*await checkoutPublico\(pedido\)/);
  });

  test("modal: checkboxes não pré-selecionadas, sem checkbox de Política de Privacidade", () => {
    const modal = fonte("../components/compra/ConfirmarCompra.tsx");
    assert.match(modal, /useState\(false\)[\s\S]*useState\(false\)/);
    assert.equal(/defaultChecked/.test(modal), false);
    assert.equal(/(type="checkbox"[\s\S]{0,200}){3}/.test(modal), false); // só duas
    assert.equal(/Aceito a Política de Privacidade/i.test(modal), false);
    assert.match(modal, /ROTAS_LEGAIS\.privacidade/);
    assert.match(modal, /ROTAS_LEGAIS\.livreResolucao/);
    assert.match(modal, /RESUMO_LIVRE_RESOLUCAO/);
  });
});

describe("checkout de um pedido de caso (fluxo pedido_caso)", () => {
  const PEDIDO = "20000000-0000-4000-a000-000000000001";
  const pedido = (extra = {}) =>
    formulario({ plano: "avulso", fluxo: "pedido_caso", origem: "tratar_caso", pedido_id: PEDIDO, ...extra });

  test("Avulso e Caso + Proteção com o pedido → válido, com o id do pedido", () => {
    assert.deepEqual(lerPedidoCompra(pedido()), {
      ok: true,
      pedido: { plano: "avulso", fluxo: "pedido_caso", origem: "tratar_caso", pedidoId: PEDIDO },
    });
    assert.equal(lerPedidoCompra(pedido({ plano: "caso_protecao" })).ok, true);
  });

  test("Proteção sozinha não trata casos → recusado", () => {
    assert.deepEqual(lerPedidoCompra(pedido({ plano: "protecao" })), { ok: false, erro: "dados_invalidos" });
  });

  test("sem pedido ou com id malformado → recusado (antes de gravar ou abrir o Checkout)", () => {
    assert.equal(lerPedidoCompra(pedido({ pedido_id: null })).ok, false);
    assert.equal(lerPedidoCompra(pedido({ pedido_id: "1; drop table casos" })).ok, false);
  });

  test("a origem tratar_caso só serve este fluxo, e este fluxo só esta origem", () => {
    assert.equal(lerPedidoCompra(pedido({ origem: "portal" })).ok, false);
    assert.equal(lerPedidoCompra(formulario({ origem: "tratar_caso" })).ok, false);
  });

  test("continua a exigir as duas checkboxes", () => {
    assert.deepEqual(lerPedidoCompra(pedido({ [CAMPO_ACEITA_TERMOS]: null })), { ok: false, erro: "termos" });
    assert.deepEqual(lerPedidoCompra(pedido({ [CAMPO_INICIO_IMEDIATO]: null })), { ok: false, erro: "inicio_imediato" });
  });

  test("outros fluxos ignoram um pedido_id enviado pelo browser", () => {
    const r = lerPedidoCompra(formulario({ pedido_id: PEDIDO }));
    assert.equal(r.ok, true);
    assert.equal(r.pedido.pedidoId, undefined);
  });
});

describe("checkout do pedido (código da Server Action)", () => {
  const acoes = readFileSync(new URL("../app/actions/stripe.ts", import.meta.url), "utf8");

  test("valida a posse do pedido no servidor antes de abrir o Checkout", () => {
    assert.match(acoes, /async function checkoutPedidoCaso[\s\S]*requireUser\(\)[\s\S]*pedidoDaConta\(/);
  });

  test("um pedido já pago ou em confirmação não abre segundo pagamento; um checkout aberto é expirado", () => {
    assert.match(acoes, /anterior\?\.status === "complete"[\s\S]*estado !== "falhado"\) return \{ destino: recebido \}/);
    assert.match(acoes, /anterior\?\.status === "open"[\s\S]*sessions\.expire/);
  });

  test("o id do pedido vai na metadata e o regresso é para as páginas do pedido", () => {
    assert.match(acoes, /pedido_id: ctx\.pedidoId/);
    assert.match(acoes, /\/tratar-caso\/recebido\?pedido=/);
    assert.match(acoes, /\/tratar-caso\/modalidade\?pedido=\$\{id\}&cancelado=1/);
  });
});
