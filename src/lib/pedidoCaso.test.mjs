// Pedido de caso antes do pagamento ("Tratar o meu caso") — `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  contactoConhecido,
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
  problemaValidoParaSetor,
  PROBLEMAS_AUTOCONSUMO,
  camposDetalhes,
  ehCasoAutoconsumo,
  ehContratacaoEnergia,
  PROBLEMAS_CONTRATACAO_ENERGIA,
  lerDetalhesCaso,
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

  test("aceita todos os sectores, incluindo Gás, Compras & Reembolsos e Ginásios", () => {
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

  test("tipos de problema por sector", () => {
    assert.deepEqual(Object.keys(PROBLEMAS_POR_SETOR).sort(), [...SETORES].sort(), "cada sector tem a sua lista");
    for (const setor of SETORES) {
      const lista = problemasDoSetor(setor);
      assert.equal(lista.at(-1), "Outro", setor);
      assert.equal(new Set(lista).size, lista.length, setor);
      for (const p of lista) assert.ok(PROBLEMAS.includes(p));
    }
    // Telecomunicações e Água continuam com a lista de sempre.
    const SERVICOS = ["Aumento de mensalidade", "Cobrança indevida", "Fidelização ou penalização", "Corte ou falha de serviço", "Cancelamento recusado"];
    for (const setor of ["Telecomunicações", "Água"]) {
      assert.deepEqual(problemasDoSetor(setor), [...SERVICOS, "Outro"]);
    }
    // Energia e Gás: os tipos comuns, os de facturação e contratação (20/10/2026),
    // a mudança de comercializador e a tarifa social (06/10/2026); Energia tem
    // também os três tipos de painéis solares (13/10/2026), antes de "Outro".
    const ENERGIA_GAS = [
      "Aumento de mensalidade",
      "Factura alta, estimativa ou acerto",
      "Cobrança indevida",
      "Cobrança após cancelamento",
      "Contrato ou condições que não aceitei",
      "Fidelização ou penalização",
      "Corte ou falha de serviço",
      "Cancelamento recusado",
      "Mudança de comercializador",
      "Tarifa social",
    ];
    assert.deepEqual(problemasDoSetor("Gás"), [...ENERGIA_GAS, "Outro"]);
    assert.deepEqual(problemasDoSetor("Energia"), [...ENERGIA_GAS, ...PROBLEMAS_AUTOCONSUMO, "Outro"]);
    for (const p of ["Factura alta, estimativa ou acerto", "Contrato ou condições que não aceitei"]) {
      for (const setor of ["Telecomunicações", "Água", "Compras & Reembolsos", "Ginásios"]) {
        assert.ok(!problemasDoSetor(setor).includes(p), `${p} não aparece em ${setor}`);
      }
    }
    for (const setor of SETORES.filter((s) => s !== "Energia")) {
      for (const p of PROBLEMAS_AUTOCONSUMO) assert.ok(!problemasDoSetor(setor).includes(p), `${p} só em Energia (não em ${setor})`);
    }
    for (const p of ["Mudança de comercializador", "Tarifa social"]) {
      for (const setor of ["Telecomunicações", "Água", "Compras & Reembolsos", "Ginásios"]) {
        assert.ok(!problemasDoSetor(setor).includes(p), `${p} não aparece em ${setor}`);
      }
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

  test("o problema tem de existir no sector escolhido", () => {
    assert.equal(lerDadosPedido(formulario({ sector: "Compras & Reembolsos", problema_tipo: "Produto com defeito" })).ok, true);
    assert.equal(lerDadosPedido(formulario({ sector: "Ginásios", problema_tipo: "Cobrança após cancelamento" })).ok, true);
    assert.equal(lerDadosPedido(formulario({ sector: "Energia", problema_tipo: "Produto com defeito" })).ok, false);
    assert.equal(lerDadosPedido(formulario({ sector: "Ginásios", problema_tipo: "Corte ou falha de serviço" })).ok, false);
    // Mudança de comercializador e tarifa social: só Energia e Gás.
    for (const p of ["Mudança de comercializador", "Tarifa social"]) {
      // (a mudança de comercializador pergunta a forma de contratação)
      assert.equal(lerDadosPedido(formulario({ sector: "Gás", problema_tipo: p, forma_contratacao: "nao_sei" })).ok, true, p);
      assert.equal(lerDadosPedido(formulario({ sector: "Energia", problema_tipo: p, forma_contratacao: "nao_sei" })).ok, true, p);
      assert.equal(lerDadosPedido(formulario({ sector: "Telecomunicações", problema_tipo: p })).ok, false, p);
      assert.equal(lerDadosPedido(formulario({ sector: "Compras & Reembolsos", problema_tipo: p })).ok, false, p);
    }
  });

  test("contratação de Energia/Gás: só a forma de contratação, obrigatória (com \"Não sei\")", () => {
    for (const setor of ["Energia", "Gás"]) {
      for (const problema_tipo of PROBLEMAS_CONTRATACAO_ENERGIA) {
        assert.ok(ehContratacaoEnergia(setor, problema_tipo), `${setor} / ${problema_tipo}`);
        assert.deepEqual(camposDetalhes(setor, problema_tipo), ["forma_contratacao"]);
        const base = { sector: setor, problema_tipo };
        assert.equal(lerDadosPedido(formulario(base)).ok, false, "sem resposta");
        assert.equal(lerDadosPedido(formulario({ ...base, forma_contratacao: "telefone" })).ok, false, "fora da lista");
        const r = lerDadosPedido(formulario({ ...base, forma_contratacao: "distancia", financiamento: "sim_com_compra" }));
        assert.equal(r.ok, true);
        // Nunca guarda respostas que não foram pedidas.
        assert.deepEqual(r.dados.detalhes_caso, { forma_contratacao: "distancia" });
        assert.deepEqual(lerDadosPedido(formulario({ ...base, forma_contratacao: "nao_sei" })).dados.detalhes_caso, { forma_contratacao: "nao_sei" });
      }
    }
    // Outros tipos e sectores: sem pergunta e sem respostas guardadas.
    assert.equal(ehContratacaoEnergia("Telecomunicações", "Cancelamento recusado"), false);
    assert.equal(ehContratacaoEnergia("Energia", "Cobrança indevida"), false);
    assert.deepEqual(camposDetalhes("Energia", "Factura alta, estimativa ou acerto"), []);
    assert.equal(lerDadosPedido(formulario({ sector: "Ginásios", problema_tipo: "Cancelamento recusado", forma_contratacao: "domicilio" })).dados.detalhes_caso, null);
    assert.deepEqual(camposDetalhes("Energia", PROBLEMAS_AUTOCONSUMO[0]), ["forma_contratacao", "financiamento", "tipo_contrato_solar"]);
  });

  test("painéis solares: três respostas obrigatórias (com \"Não sei\"), só nos tipos de Autoconsumo", () => {
    const solar = { sector: "Energia", problema_tipo: PROBLEMAS_AUTOCONSUMO[0] };
    const respostas = { forma_contratacao: "domicilio", financiamento: "sim_com_compra", tipo_contrato_solar: "compra_instalacao" };
    const r = lerDadosPedido(formulario({ ...solar, ...respostas }));
    assert.equal(r.ok, true);
    assert.deepEqual(r.dados.detalhes_caso, respostas);
    // Falta uma resposta, ou valor fora da lista → recusado.
    assert.equal(lerDadosPedido(formulario({ ...solar, ...respostas, financiamento: "" })).ok, false);
    assert.equal(lerDadosPedido(formulario({ ...solar, ...respostas, forma_contratacao: "porta" })).ok, false);
    // "Não sei" é uma resposta válida.
    const naoSei = { forma_contratacao: "nao_sei", financiamento: "nao_sei", tipo_contrato_solar: "nao_sei" };
    assert.deepEqual(lerDadosPedido(formulario({ ...solar, ...naoSei })).dados.detalhes_caso, naoSei);
    // Fora dos casos solares as respostas são ignoradas (nunca gravadas).
    assert.equal(lerDadosPedido(formulario({ ...respostas })).dados.detalhes_caso, null);
    assert.equal(lerDadosPedido(formulario({ sector: "Gás", problema_tipo: PROBLEMAS_AUTOCONSUMO[0], ...respostas })).ok, false);
    assert.equal(ehCasoAutoconsumo("Energia", PROBLEMAS_AUTOCONSUMO[2]), true);
    assert.equal(ehCasoAutoconsumo("Energia", "Cobrança indevida"), false);
    assert.equal(ehCasoAutoconsumo("Compras & Reembolsos", PROBLEMAS_AUTOCONSUMO[0]), false);
  });

  test("lerDetalhesCaso: valores fora da lista → \"nao_sei\"; sem nada válido → null", () => {
    assert.equal(lerDetalhesCaso(null), null);
    assert.equal(lerDetalhesCaso([]), null);
    assert.equal(lerDetalhesCaso({ outro: "x" }), null);
    assert.deepEqual(lerDetalhesCaso({ financiamento: "nao", forma_contratacao: 3 }), {
      forma_contratacao: "nao_sei",
      financiamento: "nao",
      tipo_contrato_solar: "nao_sei",
    });
  });

  test("backoffice: o tipo de problema tem de pertencer ao sector (vazio continua válido)", () => {
    assert.equal(problemaValidoParaSetor("Gás", "Tarifa social"), true);
    assert.equal(problemaValidoParaSetor("Ginásios", "Tarifa social"), false);
    assert.equal(problemaValidoParaSetor("Água", "Mudança de comercializador"), false);
    assert.equal(problemaValidoParaSetor("Ginásios", null), true);
    assert.equal(problemaValidoParaSetor(null, "Tarifa social"), true, "sem sector: qualquer tipo da lista");
    assert.equal(problemaValidoParaSetor(null, "x"), false);
  });

  test("só aceita sectores, problemas e momentos das listas", () => {
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
  test("conta sem compras: Avulso e Caso + Protecção, nada de graça", () => {
    assert.deepEqual(opcoesDoPedido({ creditos: 0, temSubscricao: false }), {
      usarCasoDisponivel: false,
      casoExtra: false,
      modalidades: ["avulso", "caso_protecao"],
    });
  });
  test("com casos disponíveis já pagos: pode usar um", () => {
    assert.equal(opcoesDoPedido({ creditos: 2, temSubscricao: true }).usarCasoDisponivel, true);
  });
  test("com protecção activa (sem casos): não abre segunda subscrição, só Avulso", () => {
    assert.deepEqual(opcoesDoPedido({ creditos: 0, temSubscricao: true }).modalidades, ["avulso"]);
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

  test("Caso + Protecção activa, caso do ciclo por usar: usa-o, sem pagamento", () => {
    const { opcoes, entrada } = fluxo(linha({ case_credits: 1 }));
    assert.equal(opcoes.usarCasoDisponivel, true);
    assert.equal(entrada, "usar_caso");
  });
  test("Caso + Protecção activa, caso do ciclo já usado: só Avulso, nunca segunda subscrição", () => {
    const { opcoes, entrada } = fluxo(linha({ case_credits: 0 }));
    assert.equal(opcoes.usarCasoDisponivel, false);
    assert.deepEqual(opcoes.modalidades, ["avulso"]);
    assert.equal(entrada, "so_avulso");
  });
  test("Protecção activa (não inclui casos): só Avulso", () => {
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
  test("Protecção activa com um Avulso comprado à parte: usa-o, sem pagamento", () => {
    const { entrada } = fluxo(linha({ subscription_plan: "protecao", case_credits: 1, avulso_credits: 1 }));
    assert.equal(entrada, "usar_caso");
  });
  test("sem subscrição e sem casos: escolhe Avulso ou Caso + Protecção e paga", () => {
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
    const pagina = readFileSync(new URL("../app/[idioma]/tratar-caso/page.tsx", import.meta.url), "utf8");
    assert.match(pagina, /obterAcesso\(/);
    assert.match(pagina, /entradaDoPedido\(acesso, casoExtraConfigurado\(\)\)/);
    assert.doesNotMatch(pagina, /case_credits/);
  });
  test("o botão da área de contratos leva ao mesmo fluxo", () => {
    const contrato = readFileSync(new URL("../app/[idioma]/portal/contratos/[id]/page.tsx", import.meta.url), "utf8");
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
    assert.equal(destinoSeguro("//evil.example"), "/portal");
    assert.equal(destinoSeguro("https://evil.example"), "/portal");
    assert.equal(destinoSeguro("@evil.example"), "/portal");
    assert.equal(destinoSeguro("/\\evil.example"), "/portal");
    assert.equal(destinoSeguro(null), "/portal");
  });
});

describe("nenhuma rota pública cria casos sem pagamento (código)", () => {
  const fonte = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

  test("o formulário e as acções de conta só gravam pedidos — nunca casos", () => {
    for (const f of ["../app/[idioma]/tratar-caso/actions.ts", "../lib/pedidoCasoServidor.ts", "../app/actions/formulario-guiado.ts"]) {
      assert.equal(/from\("casos"\)/.test(fonte(f)), false, f);
    }
  });

  test("o caso só nasce de converter_pedido_em_caso (que gasta um caso pago) ou do portal com caso disponível", () => {
    const portal = fonte("../app/[idioma]/portal/casos/actions.ts");
    assert.match(portal, /consumir_credito_caso[\s\S]*from\("casos"\)[\s\S]*insert/);
    assert.equal(/acesso\.casoConsomeCredito/.test(portal), false, "sem o antigo caminho gratuito");
  });

  test("a página de regresso do Stripe só lê estado (não converte nem concede)", () => {
    const recebido = fonte("../app/[idioma]/tratar-caso/recebido/page.tsx");
    assert.equal(/converterPedidoEmCaso|concederCredito|conceder_credito_caso|\.insert\(|\.update\(/.test(recebido), false);
  });
});

describe("nome e telemóvel já conhecidos (contactoConhecido)", () => {
  test("sem dados conhecidos, os campos ficam vazios", () => {
    assert.deepEqual(contactoConhecido({}), { nome: "", telefone: "" });
  });

  test("o nome do perfil prevalece; o telemóvel vem do caso/pedido mais recente", () => {
    const r = contactoConhecido({
      perfilNome: "Ana Silva",
      anteriores: [{ nome: "Ana S.", telefone: "912 345 678" }, { nome: "Outra", telefone: "933333333" }],
      nomeDaConta: "Ana Google",
    });
    assert.deepEqual(r, { nome: "Ana Silva", telefone: "912 345 678" });
  });

  test("sem nome no perfil usa o dos casos/pedidos e, por fim, o da conta Google", () => {
    assert.equal(contactoConhecido({ perfilNome: null, anteriores: [{ nome: "Rui Costa" }] }).nome, "Rui Costa");
    assert.equal(contactoConhecido({ perfilNome: " ", anteriores: [{ nome: null }], nomeDaConta: "Rui Google" }).nome, "Rui Google");
  });

  test("ignora valores inválidos e salta para o seguinte", () => {
    const r = contactoConhecido({
      perfilNome: "A1",
      anteriores: [{ nome: "Jo", telefone: "123" }, { nome: "Joana Reis", telefone: "+351 961 234 567" }],
    });
    assert.deepEqual(r, { nome: "Joana Reis", telefone: "+351 961 234 567" });
  });

  test("só nome conhecido: telemóvel fica vazio", () => {
    assert.deepEqual(contactoConhecido({ perfilNome: "Ana Silva", anteriores: [{ telefone: null }] }), { nome: "Ana Silva", telefone: "" });
  });

  test("a página lê os dados com o cliente da sessão (RLS), nunca com a service role", () => {
    const pagina = readFileSync(new URL("../app/[idioma]/tratar-caso/page.tsx", import.meta.url), "utf8");
    assert.equal(/createAdminClient/.test(pagina), false);
    assert.match(pagina, /\.from\("utilizadores"\)\.select\("nome"\)\.eq\("id", userId\)/);
    assert.match(pagina, /\.from\("casos"\)[^;]*\.eq\("utilizador_id", userId\)/);
    assert.match(pagina, /\.from\("pedidos_caso"\)[^;]*\.eq\("user_id", userId\)/);
  });
});
