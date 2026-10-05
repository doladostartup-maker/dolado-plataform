// Triagem do backoffice (estado, próxima ação, prazos) — `npm test`. Só
// apresentação: cobre todos os valores de casos.status e de casos_textos.estado.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ESTADOS_CASO,
  ESTADO_TEXTO_TOM,
  estadoCaso,
  pertenceVista,
  prazoPrincipal,
  prazosCaso,
  prioridade,
  proximaAcao,
} from "./triagem.ts";
import { ESTADO_TEXTO_EQUIPA } from "../textoCaso.ts";

const texto = (estado, extra = {}) => ({ estado, origem: "equipa", revisto_em: null, versao: 2, ...extra });

describe("estadoCaso", () => {
  test("todos os estados da base de dados têm rótulo e tom", () => {
    for (const s of ESTADOS_CASO) {
      const e = estadoCaso(s);
      assert.ok(e.rotulo.length > 0, s);
      assert.notEqual(e.tom, undefined, s);
    }
  });
  test("estado desconhecido mostra o valor, sem rebentar", () => {
    assert.deepEqual(estadoCaso("Outro"), { rotulo: "Outro", tom: "neutro" });
  });
  test("todos os estados do texto têm tom", () => {
    for (const e of Object.keys(ESTADO_TEXTO_EQUIPA)) assert.ok(ESTADO_TEXTO_TOM[e], e);
  });
});

describe("proximaAcao", () => {
  test("sem texto: preparar texto (ação da DoLado)", () => {
    const a = proximaAcao({ status: "Novo", email: "a@b.pt", texto: null });
    assert.equal(a.rotulo, "Analisar e preparar texto");
    assert.equal(a.interna, true);
    assert.equal(proximaAcao({ status: "Em investigação", texto: null }).rotulo, "Preparar texto");
  });

  test("sugestão da IA por rever vem antes de qualquer envio", () => {
    const a = proximaAcao({ status: "Novo", email: "a@b.pt", texto: texto("rascunho", { origem: "ia" }) });
    assert.equal(a.rotulo, "Rever sugestão da IA");
    assert.equal(a.tom, "acao");
  });

  test("rascunho revisto: enviar ao cliente; sem e-mail é um erro", () => {
    const revisto = texto("rascunho", { origem: "ia", revisto_em: "2026-10-05T10:00:00Z" });
    assert.equal(proximaAcao({ status: "Em investigação", email: "a@b.pt", texto: revisto }).rotulo, "Enviar texto ao cliente");
    const semEmail = proximaAcao({ status: "Em investigação", email: null, texto: texto("rascunho") });
    assert.equal(semEmail.tom, "erro");
  });

  test("cada estado do texto tem a ação certa e de quem é", () => {
    const casos = {
      alteracoes_solicitadas: ["Rever pedido de alterações", true, "dolado"],
      aguardando_aprovacao: ["À espera da aprovação do cliente", false, "cliente"],
      autorizado: ["Enviar reclamação", true, "dolado"],
      enviado: ["À espera da resposta da empresa", false, "empresa"],
    };
    for (const [estado, [rotulo, interna, aguarda]] of Object.entries(casos)) {
      const a = proximaAcao({ status: "Em investigação", email: "a@b.pt", texto: texto(estado) });
      assert.equal(a.rotulo, rotulo, estado);
      assert.equal(a.interna, interna, estado);
      assert.equal(a.aguarda, aguarda, estado);
    }
  });

  test("estado do caso prevalece: resolvido, bloqueado, decisão do cliente", () => {
    assert.equal(proximaAcao({ status: "Resolvido", texto: texto("autorizado") }).interna, false);
    assert.equal(proximaAcao({ status: "Bloqueado", texto: null }).tom, "bloqueado");
    assert.equal(proximaAcao({ status: "Aguardando decisão cliente", texto: texto("enviado") }).ancora, "decisao");
  });
});

describe("prazosCaso", () => {
  const hoje = new Date("2026-10-05T12:00:00");

  test("casos finais não têm prazos", () => {
    assert.deepEqual(prazosCaso({ status: "Resolvido", data_fim_fidelidade: "2026-10-06" }, hoje), []);
  });

  test("fim da fidelização: próximo a 15 dias, vencido depois", () => {
    const [p] = prazosCaso({ status: "Novo", primeira_resposta_em: "x", data_fim_fidelidade: "2026-10-15" }, hoje);
    assert.equal(p.nivel, "proximo");
    assert.equal(p.detalhe, "Faltam 10 dias");
    const [v] = prazosCaso({ status: "Novo", primeira_resposta_em: "x", data_fim_fidelidade: "2026-10-04" }, hoje);
    assert.equal(v.nivel, "vencido");
    const [ok] = prazosCaso({ status: "Novo", primeira_resposta_em: "x", data_fim_fidelidade: "2026-12-31" }, hoje);
    assert.equal(ok.nivel, "ok");
  });

  test("1.ª resposta: só enquanto não houver resposta", () => {
    const antigo = new Date(Date.now() - 30 * 86400000).toISOString();
    const [p] = prazosCaso({ status: "Novo", created_at: antigo });
    assert.equal(p.tipo, "primeira_resposta");
    assert.equal(p.nivel, "vencido");
    assert.equal(prazosCaso({ status: "Novo", created_at: antigo, primeira_resposta_em: antigo }).length, 0);
  });

  test("prazoPrincipal escolhe o mais urgente", () => {
    const p = prazoPrincipal([
      { tipo: "fidelizacao", rotulo: "", detalhe: "", nivel: "ok" },
      { tipo: "resposta_empresa", rotulo: "", detalhe: "", nivel: "vencido" },
    ]);
    assert.equal(p.tipo, "resposta_empresa");
    assert.equal(prazoPrincipal([]), null);
  });
});

describe("prioridade e vistas", () => {
  test("ação interna antes de espera; finais no fim", () => {
    const acao = { status: "Novo", email: "a@b.pt", primeira_resposta_em: "x", texto: null, created_at: "2026-10-01T00:00:00Z" };
    const espera = { status: "Em investigação", primeira_resposta_em: "x", texto: texto("aguardando_aprovacao"), created_at: "2026-09-01T00:00:00Z" };
    const final = { status: "Resolvido", created_at: "2026-08-01T00:00:00Z" };
    const ordem = [final, espera, acao].sort((a, b) => prioridade(a) - prioridade(b));
    assert.deepEqual(ordem, [acao, espera, final]);
  });

  test("vistas separam ação, espera e concluídos", () => {
    const acao = { status: "Novo", email: "a@b.pt", texto: null };
    const espera = { status: "Aguardando operador", texto: texto("enviado") };
    const final = { status: "Bloqueado" };
    assert.equal(pertenceVista(acao, "acao"), true);
    assert.equal(pertenceVista(espera, "acao"), false);
    assert.equal(pertenceVista(espera, "espera"), true);
    assert.equal(pertenceVista(final, "espera"), false);
    assert.equal(pertenceVista(final, "concluidos"), true);
    assert.equal(pertenceVista(final, "todos"), true);
  });
});
