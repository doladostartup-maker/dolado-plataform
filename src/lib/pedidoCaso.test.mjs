// Pedido de caso antes do pagamento ("Tratar o meu caso") — `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  destinoSeguro,
  lerDadosPedido,
  entradaDoPedido,
  opcoesDoPedido,
  pedidoDaMetadata,
  pedidoPorPagar,
  posseDoPedido,
  SETORES,
  PROBLEMAS,
  PROBLEMAS_POR_SETOR,
  problemasDoSetor,
} from "./pedidoCaso.ts";
import { calcularAcesso } from "./acesso.ts";

const A = "00000000-0000-4000-a000-00000000000a";
const B = "00000000-0000-4000-a000-00000000000b";

const formulario = (extra = {}) => {
  const campos = {
    sector: "Energia",
    empresa: "EDP",
    problema_tipo: "Cobrança indevida",
    descricao: "Cobraram duas vezes.",
    momento_cliente: "Ainda não reclamei",
    nome: "Maria Silva",
    telefone: "912345678",
    autorizacao: "on",
    origem: "/",
    ...extra,
  };
  return (c) => campos[c] ?? null;
};

describe("formulário do caso (lerDadosPedido)", () => {
  test("dados completos → pedido válido", () => {
    const r = lerDadosPedido(formulario());
    assert.equal(r.ok, true);
    assert.equal(r.dados.empresa, "EDP");
    assert.equal(r.dados.anexo, null);
  });

  test("aceita todos os setores, incluindo Gás, Compras & Reembolsos e Ginásios", () => {
    assert.deepEqual(SETORES, ["Telecomunicações", "Energia", "Gás", "Água", "Compras & Reembolsos", "Ginásios"]);
    for (const sector of SETORES) {
      const r = lerDadosPedido(formulario({ sector }));
      assert.equal(r.ok, true, sector);
      assert.equal(r.dados.sector, sector);
    }
    // Sem variações nem slugs: o valor gravado é o nome mostrado.
    for (const sector of ["gas", "Gas", "compras-reembolsos", "Compras e Reembolsos", "ginasios"]) {
      assert.equal(lerDadosPedido(formulario({ sector })).ok, false, sector);
    }
  });

  test("tipos de problema por setor", () => {
    assert.deepEqual(Object.keys(PROBLEMAS_POR_SETOR).sort(), [...SETORES].sort(), "cada setor tem a sua lista");
    for (const setor of SETORES) {
      const lista = problemasDoSetor(setor);
      assert.equal(lista.at(-1), "Outro", setor);
      assert.equal(new Set(lista).size, lista.length, setor);
      for (const p of lista) assert.ok(PROBLEMAS.includes(p));
    }
    // Os serviços continuam com a lista de sempre.
    for (const setor of ["Telecomunicações", "Energia", "Gás", "Água"]) {
      assert.deepEqual(problemasDoSetor(setor), ["Aumento de mensalidade", "Cobrança indevida", "Fidelização ou penalização", "Corte ou falha de serviço", "Cancelamento recusado", "Outro"]);
    }
    for (const p of ["Produto com defeito", "Produto errado ou danificado", "Encomenda não entregue", "Devolução ou reembolso em falta", "Garantia recusada"]) {
      assert.ok(problemasDoSetor("Compras & Reembolsos").includes(p), p);
      assert.ok(!problemasDoSetor("Telecomunicações").includes(p), p);
    }
    for (const p of ["Cobrança após cancelamento", "Serviço diferente do contratado", "Cancelamento recusado", "Fidelização ou penalização"]) {
      assert.ok(problemasDoSetor("Ginásios").includes(p), p);
    }
    assert.deepEqual(problemasDoSetor(""), PROBLEMAS);
  });

  test("o problema tem de existir no setor escolhido", () => {
    assert.equal(lerDadosPedido(formulario({ sector: "Compras & Reembolsos", problema_tipo: "Produto com defeito" })).ok, true);
    assert.equal(lerDadosPedido(formulario({ sector: "Ginásios", problema_tipo: "Cobrança após cancelamento" })).ok, true);
    assert.equal(lerDadosPedido(formulario({ sector: "Energia", problema_tipo: "Produto com defeito" })).ok, false);
    assert.equal(lerDadosPedido(formulario({ sector: "Ginásios", problema_tipo: "Corte ou falha de serviço" })).ok, false);
  });

  test("só aceita setores, problemas e momentos das listas", () => {
    assert.equal(lerDadosPedido(formulario({ sector: "Banca" })).ok, false);
    assert.equal(lerDadosPedido(formulario({ problema_tipo: "x" })).ok, false);
    assert.equal(lerDadosPedido(formulario({ momento_cliente: "x" })).ok, false);
  });

  test("sem a confirmação do pedido → recusado", () => {
    assert.deepEqual(lerDadosPedido(formulario({ autorizacao: null })), { ok: false, erro: "Confirme o pedido para avançar." });
  });

  test("nome e telemóvel validados", () => {
    assert.equal(lerDadosPedido(formulario({ nome: "A1" })).ok, false);
    assert.equal(lerDadosPedido(formulario({ telefone: "123" })).ok, false);
    assert.equal(lerDadosPedido(formulario({ telefone: "" })).ok, true);
  });

  test("anexo só da pasta pendentes/ gerada pelo servidor", () => {
    assert.equal(lerDadosPedido(formulario({ anexo_caminho: "pendentes/abc-f.pdf" })).dados.anexo.caminho, "pendentes/abc-f.pdf");
    assert.equal(lerDadosPedido(formulario({ anexo_caminho: "outro-user/f.pdf" })).dados.anexo, null);
    assert.equal(lerDadosPedido(formulario({ anexo_caminho: "pendentes/../casoB/b.pdf" })).dados.anexo, null);
  });

  test("o browser não consegue escolher estado, plano, caso nem dono", () => {
    const r = lerDadosPedido(formulario({ estado: "convertido", caso_id: "x", user_id: B, plano_escolhido: "avulso" }));
    assert.equal(r.ok, true);
    for (const campo of ["estado", "caso_id", "user_id", "plano_escolhido", "token_hash"]) {
      assert.equal(campo in r.dados, false, campo);
    }
  });
});

describe("posse do pedido", () => {
  test("a conta dona usa o pedido", () => {
    assert.equal(posseDoPedido({ user_id: A, token_hash: "h", estado: "rascunho" }, A, null), "dono");
  });
  test("outra conta nunca usa o pedido, mesmo com o cookie", () => {
    assert.equal(posseDoPedido({ user_id: A, token_hash: "h", estado: "rascunho" }, B, "h"), "negado");
  });
  test("pedido sem conta: só quem tem o cookie do browser o reclama", () => {
    assert.equal(posseDoPedido({ user_id: null, token_hash: "h", estado: "rascunho" }, A, "h"), "reclamar");
    assert.equal(posseDoPedido({ user_id: null, token_hash: "h", estado: "rascunho" }, A, "outro"), "negado");
    assert.equal(posseDoPedido({ user_id: null, token_hash: "h", estado: "rascunho" }, A, null), "negado");
    assert.equal(posseDoPedido({ user_id: null, token_hash: null, estado: "rascunho" }, A, null), "negado");
  });
  test("só rascunho e aguarda_pagamento podem seguir para pagamento", () => {
    assert.equal(pedidoPorPagar("rascunho"), true);
    assert.equal(pedidoPorPagar("aguarda_pagamento"), true);
    assert.equal(pedidoPorPagar("convertido"), false);
    assert.equal(pedidoPorPagar("cancelado"), false);
  });
});

describe("modalidades oferecidas (opcoesDoPedido)", () => {
  test("conta sem compras: Avulso e Caso + Proteção, nada de graça", () => {
    assert.deepEqual(opcoesDoPedido({ creditos: 0, temProtecao: false }), {
      usarCasoDisponivel: false,
      casoExtra: false,
      modalidades: ["avulso", "caso_protecao"],
    });
  });
  test("com casos disponíveis já pagos: pode usar um", () => {
    assert.equal(opcoesDoPedido({ creditos: 2, temProtecao: true }).usarCasoDisponivel, true);
  });
  test("com proteção ativa (sem casos): não abre segunda subscrição, só Avulso", () => {
    assert.deepEqual(opcoesDoPedido({ creditos: 0, temProtecao: true }).modalidades, ["avulso"]);
  });
});

// Direito a um caso: vem sempre de user_access (calcularAcesso). O caso
// incluído no Caso + Proteção é o crédito concedido pelo webhook em cada
// ciclo pago (case_credits); abrir um caso gasta-o. Não há outra contagem.
describe("direito a caso no fluxo Tratar o meu caso (acesso → opções)", () => {
  const linha = (extra) => ({
    subscription_plan: "caso_protecao",
    subscription_status: "active",
    case_credits: 0,
    avulso_credits: 0,
    ...extra,
  });
  const fluxo = (l) => {
    const acesso = calcularAcesso(l);
    return { opcoes: opcoesDoPedido(acesso), entrada: entradaDoPedido(acesso) };
  };

  test("Caso + Proteção ativa, caso do ciclo por usar: usa-o, sem pagamento", () => {
    const { opcoes, entrada } = fluxo(linha({ case_credits: 1 }));
    assert.equal(opcoes.usarCasoDisponivel, true);
    assert.equal(entrada, "usar_caso");
  });
  test("Caso + Proteção ativa, caso do ciclo já usado: só Avulso, nunca segunda subscrição", () => {
    const { opcoes, entrada } = fluxo(linha({ case_credits: 0 }));
    assert.equal(opcoes.usarCasoDisponivel, false);
    assert.deepEqual(opcoes.modalidades, ["avulso"]);
    assert.equal(entrada, "so_avulso");
  });
  test("Proteção ativa (não inclui casos): só Avulso", () => {
    const { opcoes, entrada } = fluxo(linha({ subscription_plan: "protecao", case_credits: 0 }));
    assert.equal(opcoes.usarCasoDisponivel, false);
    assert.deepEqual(opcoes.modalidades, ["avulso"]);
    assert.equal(entrada, "so_avulso");
  });
  test("Avulso por usar (sem subscrição): usa-o, sem pagamento", () => {
    const { opcoes, entrada } = fluxo(
      linha({ subscription_plan: "none", subscription_status: null, case_credits: 1, avulso_credits: 1 }),
    );
    assert.equal(opcoes.usarCasoDisponivel, true);
    assert.equal(entrada, "usar_caso");
  });
  test("Proteção ativa com um Avulso comprado à parte: usa-o, sem pagamento", () => {
    const { entrada } = fluxo(linha({ subscription_plan: "protecao", case_credits: 1, avulso_credits: 1 }));
    assert.equal(entrada, "usar_caso");
  });
  test("sem subscrição e sem casos: escolhe Avulso ou Caso + Proteção e paga", () => {
    for (const l of [null, linha({ subscription_plan: "none", subscription_status: null })]) {
      const { opcoes, entrada } = fluxo(l);
      assert.equal(opcoes.usarCasoDisponivel, false);
      assert.deepEqual(opcoes.modalidades, ["avulso", "caso_protecao"]);
      assert.equal(entrada, "escolher");
    }
  });
  test("sem sessão: o formulário anuncia a escolha com pagamento", () => {
    assert.equal(entradaDoPedido(null), "escolher");
  });
  test("a página do formulário lê o acesso da conta e usa a mesma regra (sem lógica própria)", () => {
    const pagina = readFileSync(new URL("../app/tratar-caso/page.tsx", import.meta.url), "utf8");
    assert.match(pagina, /obterAcesso\(/);
    assert.match(pagina, /entradaDoPedido\(acesso, casoExtraConfigurado\(\)\)/);
    assert.doesNotMatch(pagina, /case_credits/);
  });
  test("o botão da área de contratos leva ao mesmo fluxo", () => {
    const contrato = readFileSync(new URL("../app/portal/contratos/[id]/page.tsx", import.meta.url), "utf8");
    assert.match(contrato, /urlTratarCaso\(/);
  });
});

describe("metadata e redirecionamentos", () => {
  test("pedido_id da metadata só em formato UUID", () => {
    assert.equal(pedidoDaMetadata({ pedido_id: "20000000-0000-4000-a000-000000000001" }), "20000000-0000-4000-a000-000000000001");
    assert.equal(pedidoDaMetadata({ pedido_id: "abc" }), null);
    assert.equal(pedidoDaMetadata(null), null);
  });
  test("destino depois do login: só caminhos deste site", () => {
    assert.equal(destinoSeguro("/tratar-caso/recebido?pedido=x"), "/tratar-caso/recebido?pedido=x");
    assert.equal(destinoSeguro("//evil.example"), "/portal/casos");
    assert.equal(destinoSeguro("https://evil.example"), "/portal/casos");
    assert.equal(destinoSeguro("@evil.example"), "/portal/casos");
    assert.equal(destinoSeguro("/\\evil.example"), "/portal/casos");
    assert.equal(destinoSeguro(null), "/portal/casos");
  });
});

describe("nenhuma rota pública cria casos sem pagamento (código)", () => {
  const fonte = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

  test("o formulário e as ações de conta só gravam pedidos — nunca casos", () => {
    for (const f of ["../app/tratar-caso/actions.ts", "../lib/pedidoCasoServidor.ts", "../app/actions/formulario-guiado.ts"]) {
      assert.equal(/from\("casos"\)/.test(fonte(f)), false, f);
    }
  });

  test("o caso só nasce de converter_pedido_em_caso (que gasta um caso pago) ou do portal com caso disponível", () => {
    const portal = fonte("../app/portal/casos/actions.ts");
    assert.match(portal, /consumir_credito_caso[\s\S]*from\("casos"\)[\s\S]*insert/);
    assert.equal(/acesso\.casoConsomeCredito/.test(portal), false, "sem o antigo caminho gratuito");
  });

  test("a página de regresso do Stripe só lê estado (não converte nem concede)", () => {
    const recebido = fonte("../app/tratar-caso/recebido/page.tsx");
    assert.equal(/converterPedidoEmCaso|concederCredito|conceder_credito_caso|\.insert\(|\.update\(/.test(recebido), false);
  });
});
