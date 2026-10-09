// E-mails ao cliente em inglês britânico (en-GB) — `npm test`.
// O português continua a ser o de sempre (os testes de cada e-mail); aqui:
// cada e-mail tem versão inglesa completa, sem português residual, com
// ligações para as páginas /en e com o mesmo escape de texto do cliente.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { assuntoPagamentoConfirmado, montarHtmlBoasVindasPagamento } from "./pagamento.ts";
import { assuntoLembreteCompra, montarHtmlLembreteCompra } from "./compraSemConta.ts";
import { assuntoTextoParaRevisao, montarHtmlTextoParaRevisao } from "./textoRevisao.ts";
import {
  assuntoAcompanhamento,
  montarHtmlCasoEncerradoExterno,
  montarHtmlPedidoInformacao,
  montarHtmlRespostaRecebida,
  montarHtmlSolucaoApresentada,
} from "./acompanhamento.ts";
import { assuntoAchadoMonitor, montarHtmlAchadoMonitor } from "./achadoMonitor.ts";
import { assuntoBoasVindas, montarHtmlBoasVindas } from "./boas-vindas.ts";
import { assuntoConfirmacaoLivreResolucao, montarHtmlConfirmacaoLivreResolucao } from "./livreResolucao.ts";
import { assuntoAvisoSetorial, montarHtmlAvisoSetorial } from "./avisoSetorial.ts";
import { assuntoResumoMensal, montarHtmlResumoMensal, montarTextoResumoMensal } from "./resumoMensal.ts";
import { montarResumoMensal } from "../resumoMensal/resumo.ts";
import { assuntoConfirmacaoCliente, htmlConfirmacaoCliente } from "../../../supabase/functions/_shared/emailNovoCaso.ts";
import { assuntoAlertaMonitor, htmlAlertaMonitor } from "../../../supabase/functions/_shared/emailAlertas.ts";
import { idiomaDosMetadados } from "../../../supabase/functions/_shared/idiomaConta.ts";
import { tEmails } from "../../i18n/mensagens/emails.ts";
import { chavesEmFalta } from "../../i18n/dicionario.ts";
import { emails as pt } from "../../i18n/mensagens/pt-PT/emails.ts";
import { emails as en } from "../../i18n/mensagens/en-GB/emails.ts";

const EN = "en-GB";
const PORTAL = "https://portal.dolado.pt";

/** Texto visível (sem etiquetas nem atributos). */
const visivel = (html) => html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");

// Palavras portuguesas que nunca devem aparecer num e-mail em inglês (fora
// de nomes próprios: DoLado, dolado.pt/livre-resolucao, "Avulso" na nota do Checkout…).
const PORTUGUES = /\b(Olá|obrigad[oa]|caso\b|casos\b|fatura|subscrição|palavra-passe|reclamação|Proteção|Pagamento|Iniciar sessão|Ver o|consigo|precisamos|Recebemos|Termos e Condições|Política de Privacidade|Com os melhores|A equipa|Estamos juntos|Do lado dos consumidores)\b/i;

function semPortugues(nome, texto) {
  const m = visivel(texto).match(PORTUGUES);
  assert.equal(m, null, `${nome}: português no inglês → "${m?.[0]}"`);
}

const PAGAMENTO = {
  ligacao: `${PORTAL}/criar-conta?session_id=cs_1`,
  contaExiste: false,
  valorPagoCentimos: 799,
  renovacao: "2026-11-09T10:00:00Z",
  consentimento: { termos_versao: "2026-10-07", pediu_inicio_imediato: true },
  portalUrl: PORTAL,
};

describe("dicionário dos e-mails", () => {
  test("inglês completo (mesmas chaves e formatos que o português)", () => {
    assert.deepEqual(chavesEmFalta(pt, en), []);
  });

  test("inglês britânico: authorise, cancelled…, nunca formas americanas", () => {
    const tudo = JSON.stringify(en) + Object.values(en).map(String).join(" ");
    assert.doesNotMatch(tudo, /\b(authorize|authorization|canceled|color|center)\b/i);
  });
});

describe("e-mails em inglês", () => {
  test("pagamento confirmado: nomes ingleses dos produtos, preço em €, lang en-GB, ligações /en", () => {
    for (const [plano, nome] of [
      ["avulso", "Single Case"],
      ["protecao", "Protection"],
      ["caso_protecao", "Case + Protection"],
      ["caso_extra", "Extra Case"],
    ]) {
      const html = montarHtmlBoasVindasPagamento(plano, { ...PAGAMENTO, contaExiste: plano === "caso_extra" }, EN);
      assert.match(html, /<html lang="en-GB">/);
      assert.match(html, new RegExp(nome.replace("+", "\\+")));
      assert.match(html, /€7\.99/);
      assert.match(html, /VAT included/);
      assert.match(html, /Right of withdrawal\./);
      assert.match(html, /the Portuguese version is the binding one/);
      semPortugues(`pagamento ${plano}`, html);
    }
    const html = montarHtmlBoasVindasPagamento("caso_protecao", PAGAMENTO, EN);
    assert.match(html, /href="https:\/\/portal\.dolado\.pt\/en\/criar-conta\?session_id=cs_1"/);
    assert.match(html, /href="https:\/\/portal\.dolado\.pt\/en\/portal\/subscricao"/);
    // Documentos legais: só existem em português — a ligação é a portuguesa.
    assert.match(html, /href="https:\/\/dolado\.pt\/termos\/2026-10-07"/);
    assert.equal(assuntoPagamentoConfirmado({ contaExiste: true, associarCompra: false }, EN), "Payment confirmed — your access is active ✓");
  });

  test("lembretes de compra sem conta", () => {
    for (const marco of ["1d", "3d"]) {
      const html = montarHtmlLembreteCompra({ plano: "avulso", marco, ligacao: `${PORTAL}/associar-compra?session_id=x`, associarCompra: true }, EN);
      assert.match(html, /Single Case/);
      assert.match(html, /\/en\/associar-compra\?session_id=x/);
      semPortugues(`lembrete ${marco}`, html + assuntoLembreteCompra(marco, EN));
    }
  });

  test("revisão do texto: mesmos tokens, páginas /en, escape do nome da empresa", () => {
    for (const novoLink of [true, false])
      for (const seguimento of [true, false]) {
        const html = montarHtmlTextoParaRevisao(
          { urlRever: `${PORTAL}/texto/rever/TOKEN1`, urlAlterar: `${PORTAL}/texto/alterar/TOKEN2`, assunto: "MEO <x>", validadeDias: 14, novoLink, seguimento },
          EN,
        );
        assert.match(html, /\/en\/texto\/rever\/TOKEN1/);
        assert.match(html, /\/en\/texto\/alterar\/TOKEN2/);
        assert.match(html, /MEO &lt;x&gt;/);
        assert.match(html, /authorisation/);
        semPortugues("revisão", html + assuntoTextoParaRevisao(seguimento, EN));
      }
  });

  test("acompanhamento depois do envio (4 momentos)", () => {
    const dados = { empresa: "NOS <b>", urlCaso: `${PORTAL}/portal/casos/1` };
    for (const [f, momento] of [
      [montarHtmlRespostaRecebida, "respostaRecebida"],
      [montarHtmlPedidoInformacao, "pedidoInformacao"],
      [montarHtmlSolucaoApresentada, "solucaoApresentada"],
      [montarHtmlCasoEncerradoExterno, "casoEncerradoExterno"],
    ]) {
      const html = f(dados, EN);
      assert.match(html, /NOS &lt;b&gt;/);
      assert.match(html, /\/en\/portal\/casos\/1/);
      semPortugues(momento, html + assuntoAcompanhamento(momento, EN));
    }
    assert.match(montarHtmlCasoEncerradoExterno(dados, EN), /does not represent consumers/);
  });

  test("achado do Monitor: moldura em inglês, texto do backoffice tal como escrito (escapado)", () => {
    const html = montarHtmlAchadoMonitor({ fornecedor: "Vodafone", texto: "Texto <i>escrito</i> pela DoLado", url: `${PORTAL}/portal/contratos/1` }, EN);
    assert.match(html, /When comparing the bills/);
    assert.match(html, /Texto &lt;i&gt;escrito&lt;\/i&gt; pela DoLado/);
    assert.match(html, /\/en\/portal\/contratos\/1/);
    assert.equal(assuntoAchadoMonitor(EN), "We have spotted a change in your bill that is worth checking");
  });

  test("boas-vindas, livre resolução e aviso setorial", () => {
    const bv = montarHtmlBoasVindas("Ana <b>", EN);
    assert.match(bv, /Hello Ana &lt;b&gt;,/);
    semPortugues("boas-vindas", bv + assuntoBoasVindas(EN));

    const lr = montarHtmlConfirmacaoLivreResolucao(
      { nome: "Ana", email: "a@b.pt", plano: "caso_protecao", data_compra: "2026-10-01", identificacao: null, mensagem: "" },
      "ref-1",
      "2026-10-09T10:00:00Z",
      EN,
    );
    assert.match(lr, /Case \+ Protection/);
    assert.match(lr, /9 October 2026/);
    semPortugues("livre resolução", lr + assuntoConfirmacaoLivreResolucao(EN));

    const as = montarHtmlAvisoSetorial("Ana", "Telecomunicações", "Título", "Descrição", new Date("2026-10-05T10:00:00Z"), EN);
    assert.match(as, /Telecoms/);
    assert.match(as, /The notice is written in Portuguese/);
    assert.match(as, /\/en\/portal\/perfil#avisos/);
    assert.equal(assuntoAvisoSetorial("Telecomunicações", EN), "[DoLado notice] News in the Telecoms sector");
  });

  test("resumo mensal da Proteção", () => {
    const r = montarResumoMensal([], "2026-09", "2026-10-01", EN);
    assert.equal(r.idioma, EN);
    assert.equal(assuntoResumoMensal(r), "Your Protection in September");
    const html = montarHtmlResumoMensal(r, `${PORTAL}/portal/contratos`);
    assert.match(html, /\/en\/portal\/contratos/);
    semPortugues("resumo", html + montarTextoResumoMensal(r, `${PORTAL}/portal/contratos`));
  });

  test("Edge Functions: confirmação do caso e alertas de datas", () => {
    const nc = htmlConfirmacaoCliente("Ana <b>", EN);
    assert.match(nc, /We have received your case\./);
    assert.match(nc, /Ana &lt;b&gt;/);
    assert.equal(assuntoConfirmacaoCliente(EN), "We have received your case");
    semPortugues("novo caso", nc);
    for (const regra of ["fidelizacao_30d", "promocao_fim"])
      for (const dias of [30, 1, 0, -1]) {
        const html = htmlAlertaMonitor({ regra, nome: "Ana", fornecedor: "MEO", descricaoPromocao: "50% <x>", dias, dataFim: "2026-12-01", contratoId: "c1", idioma: EN });
        assert.match(html, /1 December 2026/);
        assert.match(html, /portal\.dolado\.pt\/en\/portal\/contratos\/c1/);
        semPortugues(`alerta ${regra} ${dias}`, html + assuntoAlertaMonitor(regra, "MEO", dias, EN));
      }
  });
});

describe("sem idioma guardado → português", () => {
  test("Edge Functions: metadados sem idioma ou com valor desconhecido", () => {
    assert.equal(idiomaDosMetadados(undefined), "pt-PT");
    assert.equal(idiomaDosMetadados({}), "pt-PT");
    assert.equal(idiomaDosMetadados({ idioma: "fr-FR" }), "pt-PT");
    assert.equal(idiomaDosMetadados({ idioma: "en-GB" }), "en-GB");
  });

  test("por omissão, cada e-mail sai em português (lang pt-PT)", () => {
    assert.match(montarHtmlBoasVindasPagamento("avulso", PAGAMENTO), /<html lang="pt-PT">/);
    assert.match(htmlConfirmacaoCliente("Ana"), /Recebemos o seu caso\./);
    assert.equal(tEmails["pt-PT"].pagamento.titulo, "Pagamento confirmado — DoLado");
  });
});
