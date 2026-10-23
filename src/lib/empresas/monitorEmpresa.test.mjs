// DoLado Empresas — Fase 6A: âmbito automático e associação estrita
// (`npm test`), mais verificações estáticas do ramo de empresa no pipeline.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { foraDoAmbitoEmpresa } from "./ambito.ts";
import { TEXTO_OUTRA_INSTALACAO, TEXTO_SEM_IDENTIFICADOR, escolherServicoEmpresa } from "../monitor/identificacao.ts";

const RAIZ = new URL("../../../", import.meta.url).pathname;
const ler = (f) => readFileSync(join(RAIZ, f), "utf8");

const id = (tipo, valorNormalizado) => ({ tipo, valorNormalizado, apresentacao: null });
const NIPC = id("nif_titular", "hmac:nipc");

describe("âmbito automático", () => {
  test("telecomunicações e água entram", () => {
    assert.equal(foraDoAmbitoEmpresa({ tipo: "fatura", setor: "telecomunicacoes" }), null);
    assert.equal(foraDoAmbitoEmpresa({ tipo: "fatura", setor: "agua" }), null);
  });
  test("electricidade só em BTN (≤ 41,4 kVA) e com a potência lida", () => {
    const e = (p) => [{ tipo: "eletricidade", potenciaKva: p }];
    assert.equal(foraDoAmbitoEmpresa({ tipo: "fatura", setor: "eletricidade", energia: e(20.7) }), null);
    assert.equal(foraDoAmbitoEmpresa({ tipo: "fatura", setor: "eletricidade", energia: e(41.4) }), null);
    assert.equal(foraDoAmbitoEmpresa({ tipo: "fatura", setor: "eletricidade", energia: e(41.41) }), "eletricidade_fora_btn");
    assert.equal(foraDoAmbitoEmpresa({ tipo: "fatura", setor: "eletricidade", energia: e(null) }), "eletricidade_sem_potencia");
    assert.equal(foraDoAmbitoEmpresa({ tipo: "fatura", setor: "eletricidade", energia: [] }), "eletricidade_sem_potencia");
    assert.equal(foraDoAmbitoEmpresa({ tipo: "contrato", setor: "eletricidade" }), null, "contrato dá as condições");
  });
  test("gás e sector desconhecido ficam para análise manual", () => {
    assert.equal(foraDoAmbitoEmpresa({ tipo: "fatura", setor: "gas" }), "gas");
    assert.equal(foraDoAmbitoEmpresa({ tipo: "contrato", setor: "gas" }), "gas");
    assert.equal(foraDoAmbitoEmpresa({ tipo: "fatura", setor: "desconhecido" }), "setor_desconhecido");
  });
});

describe("associação estrita (duas lojas, mesmo fornecedor e NIPC)", () => {
  const loja = (servicoId, instalacaoId, cpe) => ({ id: servicoId, instalacaoId, fornecedorChave: "edp", ids: [NIPC, id("cpe", cpe)] });
  const servicos = [loja("s-centro", "i-centro", "hmac:cpe1"), loja("s-norte", "i-norte", "hmac:cpe2")];

  test("CPE coincidente na instalação escolhida → associa", () => {
    const r = escolherServicoEmpresa({ fornecedorChave: "edp", ids: [NIPC, id("cpe", "hmac:cpe2")] }, servicos, "i-norte");
    assert.deepEqual([r.acao, r.servicoId], ["associar", "s-norte"]);
  });
  test("CPE de outra instalação → pergunta (nunca automático)", () => {
    const r = escolherServicoEmpresa({ fornecedorChave: "edp", ids: [NIPC, id("cpe", "hmac:cpe2")] }, servicos, "i-centro");
    assert.equal(r.acao, "perguntar");
    assert.ok(r.resultado.conflitos.includes(TEXTO_OUTRA_INSTALACAO));
  });
  test("só fornecedor e NIPC → pergunta, mesmo com um único serviço na instalação", () => {
    const r = escolherServicoEmpresa({ fornecedorChave: "edp", ids: [NIPC] }, servicos, "i-centro");
    assert.deepEqual([r.acao, r.servicoId, r.resultado.estado], ["perguntar", "s-centro", "possivel"]);
    assert.ok(r.resultado.conflitos.includes(TEXTO_SEM_IDENTIFICADOR));
  });
  test("número de conta coincidente na instalação → associa", () => {
    const comConta = [{ ...servicos[0], ids: [NIPC, id("referencia_conta", "123")] }, servicos[1]];
    const r = escolherServicoEmpresa({ fornecedorChave: "edp", ids: [NIPC, id("numero_cliente", "123")] }, comConta, "i-centro");
    assert.deepEqual([r.acao, r.servicoId], ["associar", "s-centro"]);
  });
  test("instalação sem serviços desse fornecedor → serviço novo", () => {
    const r = escolherServicoEmpresa({ fornecedorChave: "meo", ids: [NIPC, id("numero_servico", "21")] }, servicos, "i-centro");
    assert.equal(r.acao, "novo_servico");
  });
  test("instalação nova, mesmo fornecedor noutra loja sem identificador coincidente → serviço novo", () => {
    const r = escolherServicoEmpresa({ fornecedorChave: "edp", ids: [NIPC, id("cpe", "hmac:cpe9")] }, servicos, "i-sul");
    assert.equal(r.acao, "novo_servico");
  });
});

describe("pipeline: ramo de empresa", () => {
  const s = ler("src/lib/monitor/servidor.ts");
  test("conta de empresa sem instalação nunca segue o caminho dos particulares", () => {
    assert.match(s, /!empresa && \(await ehContaEmpresa\(admin, doc\.utilizador_id\)\)/);
  });
  test("custo de saída só para particulares", () => {
    assert.match(s, /if \(fatura && !a\.empresa\) await avaliarCessacao/);
  });
  test("orçamento próprio e funcionalidade própria", () => {
    assert.match(s, /funcionalidade: empresa \? "monitor_empresa"/);
    assert.match(s, /ANTHROPIC_ORCAMENTO_EMPRESAS_USD/);
  });
  test("serviço novo de empresa respeita o limite e fica na instalação", () => {
    assert.match(s, /empresa && destino\.acao === "novo_servico" && !\(await podeCriarServicoEmpresa/);
    assert.match(s, /criarServico\(admin, doc\.utilizador_id, leitura, doc\.id, empresa\?\.instalacaoId \?\? null\)/);
  });
});
