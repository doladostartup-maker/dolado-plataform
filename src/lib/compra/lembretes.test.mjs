// Lembretes de compras pagas sem conta — `npm test`. As dependências
// falsas seguem as funções SQL compras_sem_conta_pendentes e
// reservar_lembrete_compra (o teste de contrato corre as reais).
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { enviarLembretesCompraSemConta } from "./lembretes.ts";

const DIA = 24 * 3600 * 1000;
const SITE = "https://portal.dolado.pt";
const T0 = new Date("2026-10-03T10:00:00Z");

let compras;
let emails;
let avisos;
let contasComEmail;

function deps() {
  return {
    async pendentes(agora) {
      return [...compras.values()]
        .filter((c) => !c.ligada)
        .flatMap((c) => {
          const passou = agora.getTime() - c.confirmado.getTime();
          if (passou >= 3 * DIA && !c.l3) return [{ ...c.linha, marco: "3d" }];
          if (passou >= DIA && passou < 3 * DIA && !c.l1) return [{ ...c.linha, marco: "1d" }];
          return [];
        });
    },
    async reservar(sessionId, marco) {
      const c = compras.get(sessionId);
      if (!c || c.ligada) return false;
      if (marco === "1d" && !c.l1 && !c.l3) return (c.l1 = true);
      if (marco === "3d" && !c.l3) return (c.l3 = true);
      return false;
    },
    async contaExisteComEmail(email) {
      return contasComEmail.has(email);
    },
    async enviarEmail(destinatario, assunto, html) {
      emails.push({ destinatario, assunto, html });
    },
    async notificarAdmin(assunto, texto) {
      avisos.push({ assunto, texto });
    },
  };
}

function compra(id, email = "cliente@teste.invalid") {
  compras.set(id, {
    confirmado: T0,
    linha: { stripe_session_id: id, email, plano: "caso_protecao", confirmado_em: T0.toISOString() },
  });
}

beforeEach(() => {
  compras = new Map();
  emails = [];
  avisos = [];
  contasComEmail = new Set();
});

describe("lembretes de compra sem conta", () => {
  test("antes de 1 dia: nada", async () => {
    compra("cs_1");
    await enviarLembretesCompraSemConta(deps(), SITE, new Date(T0.getTime() + 23 * 3600 * 1000));
    assert.equal(emails.length, 0);
  });

  test("1 dia: um lembrete; execuções seguintes no mesmo marco não repetem", async () => {
    compra("cs_1");
    for (let h = 24; h < 30; h++) {
      await enviarLembretesCompraSemConta(deps(), SITE, new Date(T0.getTime() + h * 3600 * 1000));
    }
    assert.equal(emails.length, 1);
    assert.match(emails[0].assunto, /^Falta concluir/);
    assert.match(emails[0].html, /\/criar-conta\?session_id=cs_1/);
    assert.equal(avisos.length, 0, "ao fim de 1 dia não há aviso interno");
  });

  test("3 dias: último lembrete + novo aviso interno, uma única vez", async () => {
    compra("cs_1");
    await enviarLembretesCompraSemConta(deps(), SITE, new Date(T0.getTime() + DIA + 1000));
    for (let h = 0; h < 5; h++) {
      await enviarLembretesCompraSemConta(deps(), SITE, new Date(T0.getTime() + 3 * DIA + h * 3600 * 1000));
    }
    assert.equal(emails.length, 2);
    assert.match(emails[1].assunto, /^Último lembrete/);
    assert.equal(avisos.length, 1);
    assert.match(avisos[0].texto, /cs_1/);
  });

  test("execuções sobrepostas no mesmo instante: o marco sai uma vez", async () => {
    compra("cs_1");
    const quando = new Date(T0.getTime() + DIA + 1000);
    await Promise.all([1, 2, 3].map(() => enviarLembretesCompraSemConta(deps(), SITE, quando)));
    assert.equal(emails.length, 1);
  });

  test("depois da associação (ou da conta criada): nenhum lembrete", async () => {
    compra("cs_1");
    await enviarLembretesCompraSemConta(deps(), SITE, new Date(T0.getTime() + DIA + 1000));
    compras.get("cs_1").ligada = true;
    await enviarLembretesCompraSemConta(deps(), SITE, new Date(T0.getTime() + 3 * DIA + 1000));
    assert.equal(emails.length, 1);
    assert.equal(avisos.length, 0);
  });

  test("e-mail que já tem conta: ligação para iniciar sessão e associar", async () => {
    compra("cs_1");
    contasComEmail.add("cliente@teste.invalid");
    await enviarLembretesCompraSemConta(deps(), SITE, new Date(T0.getTime() + DIA + 1000));
    assert.match(emails[0].html, /\/associar-compra\?session_id=cs_1/);
    assert.match(emails[0].html, /Já existe uma conta na DoLado com este e-mail/);
  });

  test("cron parado e retomado depois dos 3 dias: só o último lembrete (sem o de 1 dia atrasado)", async () => {
    compra("cs_1");
    await enviarLembretesCompraSemConta(deps(), SITE, new Date(T0.getTime() + 4 * DIA));
    assert.equal(emails.length, 1);
    assert.match(emails[0].assunto, /^Último lembrete/);
  });

  test("texto em português europeu, com 'e-mail' e sem 'você'", async () => {
    compra("cs_1");
    await enviarLembretesCompraSemConta(deps(), SITE, new Date(T0.getTime() + 3 * DIA));
    const texto = emails[0].html.replace(/<[^>]+>/g, " ");
    assert.equal(/\bvocê\b|\bemail\b/i.test(texto), false);
    assert.match(texto, /a DoLado|na DoLado/);
  });
});
