// E-mails do acompanhamento depois do envio — `npm test`.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ASSUNTO_PEDIDO_INFORMACAO,
  ASSUNTO_RESPOSTA_RECEBIDA,
  ASSUNTO_SOLUCAO_APRESENTADA,
  montarHtmlAvisoEquipa,
  montarHtmlPedidoInformacao,
  montarHtmlRespostaRecebida,
  montarHtmlSolucaoApresentada,
} from "./acompanhamento.ts";
import { ASSUNTO_NOVA_COMUNICACAO_PARA_REVISAO, montarHtmlTextoParaRevisao } from "./textoRevisao.ts";

const URL = "https://portal.dolado.test/portal/casos/x";

describe("e-mails ao cliente", () => {
  test("resposta recebida: texto pedido, sem conteúdo da resposta", () => {
    const html = montarHtmlRespostaRecebida({ empresa: "Operadora X", urlCaso: URL });
    assert.equal(ASSUNTO_RESPOSTA_RECEBIDA, "Recebemos uma resposta relacionada com o seu caso");
    assert.match(html, /Recebemos uma comunicação relacionada com a sua reclamação/);
    assert.match(html, /Não precisa de fazer nada neste momento\. Entraremos em contacto consigo se for necessária alguma ação\./);
    assert.match(html, /Operadora X/);
  });

  test("nome da empresa é escapado (texto do cliente)", () => {
    for (const f of [montarHtmlRespostaRecebida, montarHtmlPedidoInformacao, montarHtmlSolucaoApresentada]) {
      const html = f({ empresa: '<script>alert("x")</script>', urlCaso: URL });
      assert.doesNotMatch(html, /<script>alert/);
      assert.match(html, /&lt;script&gt;/);
    }
  });

  test("português europeu: e-mail com hífen, terceira pessoa", () => {
    const todos = [ASSUNTO_RESPOSTA_RECEBIDA, ASSUNTO_PEDIDO_INFORMACAO, ASSUNTO_SOLUCAO_APRESENTADA].join(" ") +
      [montarHtmlRespostaRecebida, montarHtmlPedidoInformacao, montarHtmlSolucaoApresentada].map((f) => f({ empresa: null, urlCaso: URL })).join(" ");
    assert.doesNotMatch(todos, /\bemail\b|você|\bteu\b|\btua\b/i);
  });

  test("aviso interno à equipa: sem dados do caso além da ligação", () => {
    const html = montarHtmlAvisoEquipa({ texto: "Nova resposta recebida num caso — por analisar", urlCaso: "https://x/backoffice/casos/1" });
    assert.match(html, /por analisar/);
  });

  test("revisão de uma nova comunicação: assunto e texto próprios", () => {
    const html = montarHtmlTextoParaRevisao({ urlRever: "r", urlAlterar: "a", assunto: "Operadora X", validadeDias: 14, novoLink: false, seguimento: true });
    assert.match(html, new RegExp(ASSUNTO_NOVA_COMUNICACAO_PARA_REVISAO));
    assert.match(html, /preparámos uma nova comunicação/);
    assert.match(html, /Nada é enviado sem a sua autorização explícita/);
  });
});
