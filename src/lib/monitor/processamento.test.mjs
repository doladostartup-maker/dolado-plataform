// Etapas da leitura de documentos e nomes comerciais dos fornecedores — `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  LIMITE_SEM_AVANCO_MS,
  PASSOS,
  falhaTransitoria,
  indicePasso,
  parado,
  situacaoDocumento,
} from "./processamento.ts";
import { encontrarFornecedor, nomeComercial, normalizarNomeEmpresa } from "./fornecedores.ts";

const AGORA = Date.parse("2026-10-03T18:00:00Z");
const ha = (ms) => new Date(AGORA - ms).toISOString();
const doc = (extra) => ({ etapa: "recebido", etapa_atualizada_em: ha(1000), estado: "pendente", contrato_id: null, ...extra });
const fonte = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("etapas reais da leitura", () => {
  test("4 passos pela ordem do processamento, sem percentagens", () => {
    assert.deepEqual(PASSOS.map((p) => p.etapa), ["recebido", "a_verificar", "a_ler", "a_registar"]);
    assert.equal(indicePasso("a_ler"), 2);
  });
  test("em curso mostra o passo atual", () => {
    assert.deepEqual(situacaoDocumento(doc({ etapa: "a_ler" }), AGORA), { tipo: "em_curso", passo: 2 });
  });
  test("concluído leva ao contrato com o estado do documento", () => {
    assert.deepEqual(situacaoDocumento(doc({ etapa: "concluido", estado: "processado", contrato_id: "c1" }), AGORA), {
      tipo: "pronto",
      contratoId: "c1",
      estado: "processado",
    });
  });
  test("documentos anteriores (sem etapa) contam como prontos", () => {
    assert.equal(situacaoDocumento(doc({ etapa: null, estado: "processado" }), AGORA).tipo, "pronto");
  });
  test("falha transitória: não concluído, pode tentar de novo", () => {
    assert.deepEqual(situacaoDocumento(doc({ etapa: "falhou" }), AGORA), { tipo: "nao_concluido", podeRepetir: true });
  });
  test("sem avanço há mais de 3 minutos (ex.: servidor reiniciado): nunca fica em espera infinita", () => {
    assert.equal(parado("a_ler", ha(LIMITE_SEM_AVANCO_MS + 1), AGORA), true);
    assert.equal(parado("a_ler", ha(LIMITE_SEM_AVANCO_MS - 1000), AGORA), false);
    assert.deepEqual(situacaoDocumento(doc({ etapa: "a_ler", etapa_atualizada_em: ha(4 * 60_000) }), AGORA), {
      tipo: "nao_concluido",
      podeRepetir: true,
    });
  });
  test("repetido aponta para o contrato que já tem o documento", () => {
    assert.deepEqual(situacaoDocumento(doc({ etapa: "repetido", contrato_id: "c9" }), AGORA), { tipo: "repetido", contratoId: "c9" });
  });
  test("só falhas técnicas são transitórias (sem chave/orçamento: caminho manual)", () => {
    assert.equal(falhaTransitoria("erro_api"), true);
    assert.equal(falhaTransitoria("erro_inesperado"), true);
    assert.equal(falhaTransitoria("api_nao_configurada"), false);
    assert.equal(falhaTransitoria("orcamento_atingido"), false);
  });
});

describe("a leitura não corre dentro do pedido do upload (código)", () => {
  const acoes = fonte("../../app/[idioma]/portal/contratos/actions.ts");
  test("registarDocumento agenda a leitura com after() e não chama a Claude API", () => {
    const corpo = acoes.slice(acoes.indexOf("export async function registarDocumento"), acoes.indexOf("async function documentoDoCliente"));
    assert.match(corpo, /after\(\(\) => processarDocumentoEmSegundoPlano\(doc\.id\)\)/);
    assert.doesNotMatch(corpo, /await processarDocumento|lerDocumentoComClaude|inspecionarFicheiro/);
    assert.doesNotMatch(corpo, /redirect\(/);
  });
  test("as decisões sobre os valores lidos gravam-se numa só chamada, sem redirect", () => {
    const corpo = acoes.slice(acoes.indexOf("export async function confirmarDadosContrato"), acoes.indexOf("export async function corrigirContrato"));
    assert.equal(corpo.split(".rpc(").length - 1, 1);
    assert.match(corpo, /monitor_campos_decidir/);
    assert.doesNotMatch(corpo, /redirect\(|irPara\(/);
    assert.doesNotMatch(acoes, /export async function confirmarValor|export async function rejeitarValor/);
  });
  test("a chamada à Claude API tem limite de tempo por tentativa", () => {
    assert.match(fonte("./claudeDocumentos.ts"), /timeout: TIMEOUT_TENTATIVA_MS/);
    assert.match(fonte("./claudeDocumentos.ts"), /TIMEOUT_TENTATIVA_MS = 45_000/);
  });
  test("os clientes Supabase do servidor e a Brevo têm limite de tempo", () => {
    for (const f of ["../supabase/admin.ts", "../supabase/server.ts", "../supabase/middleware.ts"]) {
      assert.match(fonte(f), /fetchComLimite\(\d/);
    }
    assert.match(fonte("../email/brevo.ts"), /AbortSignal\.timeout/);
  });
});

const LISTA = [
  { id: "1", nome_comercial: "Vodafone", nome_legal: "Vodafone Portugal, Comunicações Pessoais, S.A.", aliases: ["Vodafone", "Vodafone Portugal"] },
  { id: "2", nome_comercial: "NOS", nome_legal: "NOS Comunicações, S.A.", aliases: ["NOS", "NOS Comunicações"] },
  { id: "3", nome_comercial: "MEO", nome_legal: "MEO - Serviços de Comunicações e Multimédia, S.A.", aliases: ["MEO", "Altice Portugal"] },
  { id: "4", nome_comercial: "EDP", nome_legal: "EDP Comercial - Comercialização de Energia, S.A.", aliases: ["EDP", "EDP Comercial"] },
  { id: "5", nome_comercial: "Águas do Porto", nome_legal: "Águas e Energia do Porto, EM", aliases: ["Aguas do Porto"] },
];

describe("nome comercial dos fornecedores (sem IA)", () => {
  test("designação jurídica → nome comercial", () => {
    assert.equal(nomeComercial("Vodafone Portugal, Comunicações Pessoais, S.A.", LISTA), "Vodafone");
    assert.equal(nomeComercial("VODAFONE PORTUGAL - COMUNICACOES PESSOAIS SA", LISTA), "Vodafone");
    assert.equal(nomeComercial("MEO – Serviços de Comunicações e Multimédia, S.A.", LISTA), "MEO");
    assert.equal(nomeComercial("NOS Comunicações S.A.", LISTA), "NOS");
    assert.equal(nomeComercial("EDP Comercial", LISTA), "EDP");
    assert.equal(nomeComercial("Águas e Energia do Porto, E.M.", LISTA), "Águas do Porto");
  });
  test("nome comercial seguido de outras palavras (prefixo de palavras inteiras)", () => {
    assert.equal(nomeComercial("Vodafone Portugal SA - Sede", LISTA), "Vodafone");
    assert.equal(nomeComercial("Altice Portugal", LISTA), "MEO");
  });
  test("siglas curtas não apanham outras empresas", () => {
    assert.equal(encontrarFornecedor("Nossa Energia, Lda.", LISTA), null);
    assert.equal(encontrarFornecedor("NOS Açores Comunicações", LISTA), null);
    assert.equal(encontrarFornecedor("EDPR Renováveis", LISTA), null);
  });
  test("sem correspondência: mantém o nome lido (nunca inventa)", () => {
    assert.equal(nomeComercial("Empresa Desconhecida, Lda.", LISTA), "Empresa Desconhecida, Lda.");
    assert.equal(nomeComercial(null, LISTA), null);
  });
  test("normalização ignora acentos, pontuação e formas jurídicas", () => {
    assert.equal(normalizarNomeEmpresa("Vodafone Portugal, Comunicações Pessoais, S.A."), "vodafone portugal comunicacoes pessoais");
  });
  test("a migration semeia os principais fornecedores dos setores suportados", () => {
    const sql = fonte("../../../supabase/migrations/20261003150000_monitor_processamento_lote_fornecedores.sql");
    for (const nome of ["MEO", "NOS", "Vodafone", "NOWO", "DIGI", "EDP", "Galp", "Endesa", "Iberdrola", "Goldenergy", "EPAL"]) {
      assert.match(sql, new RegExp(`\\('${nome}',`));
    }
  });
});
