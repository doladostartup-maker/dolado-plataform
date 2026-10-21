// Comunicações comerciais: ligações (tokens HMAC), e-mail de confirmação e
// moldura dos e-mails comerciais — `npm test`. As regras na base de dados
// estão em supabase/tests/database/comunicacoes_dupla_confirmacao.test.sql.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  cabecalhosDeixarDeReceber,
  comunicacoesDisponiveis,
  ligacaoConfirmar,
  ligacaoDeixarDeReceber,
  tokenValido,
} from "./ligacoes.ts";
import { montarEmailComercial, montarEmailConfirmacao } from "../email/comunicacoesComerciais.ts";

const ID = "22000000-0000-4000-c000-000000000001";
const ler = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
const parametros = (url) => Object.fromEntries(new URL(url).searchParams);

beforeEach(() => {
  process.env.COMUNICACOES_CHAVE = "chave-local-de-teste-comunicacoes-0123456789";
  process.env.NEXT_PUBLIC_SITE_URL = "https://portal.dolado.pt";
});
afterEach(() => {
  delete process.env.COMUNICACOES_CHAVE;
});

describe("ligações", () => {
  test("sem chave (ou curta): sem ligações nem e-mails — falha fechada", () => {
    process.env.COMUNICACOES_CHAVE = "curta";
    assert.equal(comunicacoesDisponiveis(), false);
    assert.equal(ligacaoConfirmar(ID, "pt-PT"), null);
    assert.equal(cabecalhosDeixarDeReceber("conta", ID), null);
    assert.equal(montarEmailConfirmacao(ID, "pt-PT"), null);
    assert.equal(tokenValido("confirmar", "sem_conta", ID, "x"), false);
  });

  test("confirmar: o token só vale para essa acção, tipo e id", () => {
    const p = parametros(ligacaoConfirmar(ID, "pt-PT"));
    assert.equal(p.tipo, "sem_conta");
    assert.equal(p.id, ID);
    assert.equal(tokenValido("confirmar", "sem_conta", ID, p.t), true);
    assert.equal(tokenValido("retirar", "sem_conta", ID, p.t), false, "não serve para deixar de receber");
    assert.equal(tokenValido("confirmar", "conta", ID, p.t), false, "não serve para outro tipo");
    assert.equal(tokenValido("confirmar", "sem_conta", "22000000-0000-4000-c000-000000000002", p.t), false, "não serve para outro id");
    assert.equal(tokenValido("confirmar", "sem_conta", ID, `${p.t}x`), false);
    assert.equal(tokenValido("confirmar", "sem_conta", "nao-uuid", p.t), false);
  });

  test("outra chave invalida as ligações", () => {
    const { t } = parametros(ligacaoDeixarDeReceber("conta", ID, "pt-PT"));
    process.env.COMUNICACOES_CHAVE = "outra-chave-local-de-teste-comunicacoes-987654";
    assert.equal(tokenValido("retirar", "conta", ID, t), false);
  });

  test("páginas no portal, em inglês com /en, e cabeçalho de um clique", () => {
    assert.match(ligacaoConfirmar(ID, "pt-PT"), /^https:\/\/portal\.dolado\.pt\/comunicacoes\/confirmar\?/);
    assert.match(ligacaoDeixarDeReceber("sem_conta", ID, "en-GB"), /^https:\/\/portal\.dolado\.pt\/en\/comunicacoes\/deixar-de-receber\?tipo=sem_conta&/);
    const c = cabecalhosDeixarDeReceber("conta", ID);
    assert.match(c["List-Unsubscribe"], /^<https:\/\/portal\.dolado\.pt\/api\/comunicacoes\/deixar-de-receber\?tipo=conta&id=.+&t=.+>$/);
    assert.equal(c["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
    const url = c["List-Unsubscribe"].slice(1, -1);
    assert.equal(tokenValido("retirar", "conta", ID, parametros(url).t), true);
  });
});

describe("e-mails", () => {
  test("confirmação: ligação, validade, sem promoção, nas duas línguas", () => {
    const pt = montarEmailConfirmacao(ID, "pt-PT");
    assert.match(pt.assunto, /Confirme/);
    assert.ok(pt.html.includes("/comunicacoes/confirmar?tipo=sem_conta&amp;id="));
    assert.match(pt.texto, /30 dias/);
    assert.doesNotMatch(pt.html, /Protecção|precario|Tratar o meu caso/);
    const en = montarEmailConfirmacao(ID, "en-GB");
    assert.match(en.assunto, /Confirm/);
    assert.ok(en.html.includes("/en/comunicacoes/confirmar"));
  });

  test("comercial: rodapé com 'Deixar de receber' e cabeçalhos; sem chave não sai", () => {
    const m = montarEmailComercial({
      destinatario: { tipo: "sem_conta", consentimentoId: ID, idioma: "pt-PT" },
      assunto: "Novidades",
      titulo: "Novidades",
      corpoHtml: "<p>Olá</p>",
      corpoTexto: "Olá",
    });
    assert.ok(m.html.includes("Deixar de receber estes e-mails"));
    assert.ok(m.html.includes("/comunicacoes/deixar-de-receber?tipo=sem_conta&amp;id="));
    assert.match(m.texto, /Deixar de receber estes e-mails: https:\/\/portal\.dolado\.pt\/comunicacoes\/deixar-de-receber\?/);
    assert.ok(m.cabecalhos["List-Unsubscribe"]);
    delete process.env.COMUNICACOES_CHAVE;
    assert.equal(
      montarEmailComercial({ destinatario: { tipo: "conta", consentimentoId: ID, idioma: "pt-PT" }, assunto: "a", titulo: "a", corpoHtml: "", corpoTexto: "" }),
      null,
    );
  });
});

describe("regras estáticas", () => {
  test("o GET das páginas nunca altera: só a Server Action (POST) chama a base de dados", () => {
    for (const f of ["confirmar/page.tsx", "deixar-de-receber/page.tsx"]) {
      const src = ler(`../../app/[idioma]/comunicacoes/${f}`);
      assert.doesNotMatch(src, /confirmarEndereco|retirarAutorizacao|createAdminClient/);
    }
  });

  test("um clique: só POST, sem sessão no middleware", () => {
    const rota = ler("../../app/api/comunicacoes/deixar-de-receber/route.ts");
    assert.match(rota, /export async function POST/);
    assert.doesNotMatch(rota, /export async function GET/);
    assert.ok(ler("../../middleware.ts").includes('"/api/comunicacoes/deixar-de-receber"'));
  });

  test("envio comercial só com destinatários de comunicacoes_destinatarios e com ligação", () => {
    const s = ler("./servidor.ts");
    assert.match(s, /rpc\("comunicacoes_destinatarios"\)/);
    assert.match(s, /sem_ligacao/);
  });

  test("o pedido do guia com a caixa marcada pede a confirmação (depois da resposta)", () => {
    assert.match(ler("../../app/actions/guiaFacturas.ts"), /if \(comunicacoes\) after\(\(\) => enviarConfirmacaoSePreciso\(email, idioma\)\)/);
  });
});
