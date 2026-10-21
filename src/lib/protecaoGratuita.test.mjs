// Proteção gratuita (30 dias) — regras, acesso, compras, e-mails e job
// (`npm test`). A base de dados tem os próprios testes em
// supabase/tests/database/protecao_gratuita.test.sql.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  DIAS_PROTECAO_GRATUITA,
  estadoPortal,
  inicioCobrancaAdesao,
  lerMotivo,
  lerOrigem,
  normalizarEmail,
  ofertaLigada,
  protecaoGratuitaDe,
  trialEndStripe,
} from "./protecaoGratuita.ts";
import { calcularAcesso, avisoDoPortal } from "./acesso.ts";
import { opcoesDoPedido } from "./pedidoCaso.ts";
import { decidirCompra } from "./compra/decisao.ts";
import { escolherDescontoCheckout } from "./indicacoes/regras.ts";
import { montarEmailProtecaoGratuita } from "./email/protecaoGratuita.ts";
import { processarProtecaoGratuita } from "./protecaoGratuitaAvisos.ts";
import { cobrancaDiferidaDaSessao } from "./stripe/webhook.ts";

const DIA = 24 * 60 * 60 * 1000;
const AGORA = new Date("2026-10-18T10:00:00Z");
const linha = (inicioDiasAtras, estado = "ativa") => {
  const inicio = new Date(AGORA.getTime() - inicioDiasAtras * DIA);
  return { estado, inicio_em: inicio.toISOString(), termina_em: new Date(inicio.getTime() + 30 * DIA).toISOString() };
};

describe("período gratuito", () => {
  test("30 dias, em curso até ao fim, dias restantes arredondados para cima", () => {
    assert.equal(DIAS_PROTECAO_GRATUITA, 30);
    const g = protecaoGratuitaDe(linha(0), AGORA);
    assert.equal(g.emCurso, true);
    assert.equal(g.diasRestantes, 30);
    assert.equal(protecaoGratuitaDe(linha(18), AGORA).diasRestantes, 12);
    assert.equal(protecaoGratuitaDe(linha(29.9), AGORA).diasRestantes, 1);
  });

  test("termina pela data, mesmo com o estado ainda 'activa' (job atrasado)", () => {
    const g = protecaoGratuitaDe(linha(31), AGORA);
    assert.equal(g.emCurso, false);
    assert.equal(g.diasRestantes, 0);
  });

  test("terminada ou convertida nunca está em curso", () => {
    assert.equal(protecaoGratuitaDe(linha(5, "terminada"), AGORA).emCurso, false);
    assert.equal(protecaoGratuitaDe(linha(5, "convertida"), AGORA).emCurso, false);
    assert.equal(protecaoGratuitaDe(null, AGORA), null);
  });
});

describe("adesão durante o período: quando começa a cobrança", () => {
  test("Protecção: 1.ª cobrança no fim do período (trial_end)", () => {
    const g = protecaoGratuitaDe(linha(10), AGORA);
    const d = inicioCobrancaAdesao(g, "protecao", AGORA);
    assert.equal(d.toISOString(), g.fim);
    assert.equal(trialEndStripe(d, AGORA), Math.ceil(new Date(g.fim).getTime() / 1000));
  });

  test("menos de 48 h (2 dias, Termos secção 5): cobrança no dia da adesão", () => {
    assert.equal(inicioCobrancaAdesao(protecaoGratuitaDe(linha(28.5), AGORA), "protecao", AGORA), null);
    assert.equal(inicioCobrancaAdesao(protecaoGratuitaDe(linha(28.02), AGORA), "protecao", AGORA), null);
    assert.ok(inicioCobrancaAdesao(protecaoGratuitaDe(linha(27.9), AGORA), "protecao", AGORA));
    // 48 h exactas e entre 48 h e 49 h: cobrança no fim do período (antes eram 49 h).
    assert.ok(inicioCobrancaAdesao(protecaoGratuitaDe(linha(28), AGORA), "protecao", AGORA));
    assert.ok(inicioCobrancaAdesao(protecaoGratuitaDe(linha(27.98), AGORA), "protecao", AGORA));
  });

  test("trial_end nunca abaixo do mínimo do Stripe; no máximo 5 minutos depois do fim", () => {
    const g = protecaoGratuitaDe(linha(28), AGORA); // 48 h por correr
    const d = inicioCobrancaAdesao(g, "protecao", AGORA);
    const te = trialEndStripe(d, AGORA) * 1000;
    assert.ok(te >= AGORA.getTime() + 48 * 3600 * 1000 + 5 * 60 * 1000);
    assert.ok(te >= new Date(g.fim).getTime());
    assert.ok(te - new Date(g.fim).getTime() <= 5 * 60 * 1000 + 1000);
  });

  test("Caso + Protecção e Avulso são cobrados logo; sem período em curso também", () => {
    const g = protecaoGratuitaDe(linha(1), AGORA);
    assert.equal(inicioCobrancaAdesao(g, "caso_protecao", AGORA), null);
    assert.equal(inicioCobrancaAdesao(g, "avulso", AGORA), null);
    assert.equal(inicioCobrancaAdesao(protecaoGratuitaDe(linha(1, "terminada"), AGORA), "protecao", AGORA), null);
    assert.equal(inicioCobrancaAdesao(null, "protecao", AGORA), null);
  });

  test("webhook: só o Checkout a 0 € com a marca protecao_gratuita é uma cobrança diferida", () => {
    assert.equal(cobrancaDiferidaDaSessao({ metadata: { protecao_gratuita: "1" }, amount_total: 0 }), true);
    assert.equal(cobrancaDiferidaDaSessao({ metadata: { protecao_gratuita: "1" }, amount_total: 499 }), false);
    assert.equal(cobrancaDiferidaDaSessao({ metadata: {}, amount_total: 0 }), false);
    assert.equal(cobrancaDiferidaDaSessao({ metadata: null, amount_total: null }), false);
  });
});

describe("acesso", () => {
  test("período em curso dá Protecção, sem subscrição nem casos", () => {
    const a = calcularAcesso(null, linha(3), AGORA);
    assert.equal(a.temProtecao, true);
    assert.equal(a.temSubscricao, false);
    assert.equal(a.podeCriarCaso, false);
    assert.equal(a.creditos, 0);
    assert.equal(a.plano, "none");
  });

  test("período terminado: sem Protecção", () => {
    assert.equal(calcularAcesso(null, linha(40, "terminada"), AGORA).temProtecao, false);
    assert.equal(calcularAcesso(null, linha(40), AGORA).temProtecao, false);
  });

  test("subscrição paga continua a decidir sozinha; o período não muda nada nela", () => {
    const ua = { subscription_plan: "caso_protecao", subscription_status: "active", case_credits: 1, avulso_credits: 0 };
    const a = calcularAcesso(ua, linha(5, "convertida"), AGORA);
    assert.equal(a.temProtecao, true);
    assert.equal(a.temSubscricao, true);
    assert.equal(a.creditos, 1);
  });

  test("regresso do Checkout só mostra 'plano activo' com subscrição paga", () => {
    const a = calcularAcesso(null, linha(3), AGORA);
    assert.equal(avisoDoPortal({ regressoDoCheckout: true, acesso: a, ultimoPagamentoEstado: null }), null);
  });

  test("durante o período pode aderir à Protecção ou ao Caso + Protecção (não é uma subscrição)", () => {
    const a = calcularAcesso(null, linha(3), AGORA);
    assert.deepEqual(decidirCompra({ plano: "protecao", autenticado: true, acesso: a, subscricoesAtivasStripe: [] }), { acao: "adesao" });
    assert.deepEqual(opcoesDoPedido(a).modalidades, ["avulso", "caso_protecao"]);
  });
});

describe("não acumula com a indicação", () => {
  const base = { fluxo: "adesao", conversao: false, novoClienteIndicado: true, recompensasDisponiveis: 1, prescindiu: false };
  test("Protecção de quem usou o período gratuito: sem desconto de indicação", () => {
    assert.equal(escolherDescontoCheckout({ ...base, plano: "protecao", usouProtecaoGratuita: true }), null);
  });
  test("sem período gratuito: tudo como antes", () => {
    assert.equal(escolherDescontoCheckout({ ...base, plano: "protecao" }), "novo_cliente");
  });
  test("Avulso de quem usou o período gratuito: mantém as regras do Avulso", () => {
    assert.equal(escolherDescontoCheckout({ ...base, plano: "avulso", usouProtecaoGratuita: true }), "novo_cliente");
  });
});

describe("e-mail normalizado (uma vez por e-mail)", () => {
  test("maiúsculas, espaços e etiquetas", () => {
    assert.equal(normalizarEmail("  Ana.Silva+promo@Exemplo.PT "), "ana.silva@exemplo.pt");
  });
  test("Gmail: pontos e googlemail.com", () => {
    assert.equal(normalizarEmail("a.n.a+x@googlemail.com"), "ana@gmail.com");
    assert.equal(normalizarEmail("ana@gmail.com"), normalizarEmail("A.NA@gmail.com"));
  });
  test("inválidos", () => {
    assert.equal(normalizarEmail("sem-arroba"), null);
    assert.equal(normalizarEmail("@x.pt"), null);
    assert.equal(normalizarEmail("+x@x.pt"), null);
  });
});

describe("interruptor, origem e motivos", () => {
  test("ligada só com o interruptor e uma chave de 32+ caracteres", () => {
    assert.equal(ofertaLigada({}), false);
    assert.equal(ofertaLigada({ PROTECAO_GRATUITA_ATIVA: "1" }), false);
    assert.equal(ofertaLigada({ PROTECAO_GRATUITA_ATIVA: "1", PROTECAO_GRATUITA_CHAVE: "x".repeat(31) }), false);
    assert.equal(ofertaLigada({ PROTECAO_GRATUITA_ATIVA: "1", PROTECAO_GRATUITA_CHAVE: "x".repeat(32) }), true);
    assert.equal(ofertaLigada({ PROTECAO_GRATUITA_ATIVA: "0", PROTECAO_GRATUITA_CHAVE: "x".repeat(64) }), false);
  });
  test("origem: só valores fixos", () => {
    assert.equal(lerOrigem("homepage"), "homepage");
    assert.equal(lerOrigem("<script>"), "outro");
  });
  test("motivo desconhecido nunca é 'elegivel'", () => {
    assert.equal(lerMotivo("elegivel"), "elegivel");
    assert.equal(lerMotivo("qualquer"), "conta_invalida");
  });
});

describe("estado no portal", () => {
  test("em curso: datas reais e data da 1.ª cobrança", () => {
    const g = protecaoGratuitaDe(linha(10), AGORA);
    const e = estadoPortal({ gratuita: g, temSubscricao: false, temProtecao: true, elegivel: false }, AGORA);
    assert.equal(e.tipo, "em_curso");
    assert.equal(e.diasRestantes, 20);
    assert.equal(e.primeiraCobranca, g.fim);
  });
  test("terminada: só nos 60 dias seguintes e sem Protecção paga", () => {
    const g = protecaoGratuitaDe(linha(40, "terminada"), AGORA);
    assert.equal(estadoPortal({ gratuita: g, temSubscricao: false, temProtecao: false, elegivel: false }, AGORA).tipo, "terminada");
    assert.equal(estadoPortal({ gratuita: g, temSubscricao: true, temProtecao: true, elegivel: false }, AGORA), null);
    const antiga = protecaoGratuitaDe(linha(120, "terminada"), AGORA);
    assert.equal(estadoPortal({ gratuita: antiga, temSubscricao: false, temProtecao: false, elegivel: false }, AGORA), null);
  });
  test("convite só a quem é elegível e nunca a quem já tem Protecção", () => {
    assert.equal(estadoPortal({ gratuita: null, temSubscricao: false, temProtecao: false, elegivel: true }, AGORA).tipo, "oferta");
    assert.equal(estadoPortal({ gratuita: null, temSubscricao: false, temProtecao: false, elegivel: false }, AGORA), null);
    assert.equal(estadoPortal({ gratuita: null, temSubscricao: true, temProtecao: true, elegivel: true }, AGORA), null);
  });
});

describe("e-mails do período", () => {
  const dados = (marco, idioma = "pt-PT", extra = {}) => ({
    marco,
    idioma,
    inicio: "2026-10-18T10:00:00Z",
    fim: "2026-11-17T10:00:00Z",
    documentos: 0,
    portalUrl: "https://portal.dolado.pt",
    urlLembretes: "https://portal.dolado.pt/protecao-gratuita/lembretes?id=x&t=y",
    ...extra,
  });

  test("cada marco tem o seu assunto e diz que não há cobrança automática", () => {
    const assuntos = new Set();
    for (const marco of ["d0", "d7", "d25", "d29", "d30"]) {
      const m = montarEmailProtecaoGratuita(dados(marco));
      assuntos.add(m.assunto);
      assert.match(m.texto, /sem qualquer cobrança|nenhuma cobrança automática|Não pedimos cartão/);
      assert.ok(m.html.includes('lang="pt-PT"'));
    }
    assert.equal(assuntos.size, 5);
  });

  test("ligação para deixar de receber só nos lembretes opcionais (dias 7 e 25)", () => {
    for (const marco of ["d7", "d25"]) assert.ok(montarEmailProtecaoGratuita(dados(marco)).html.includes("protecao-gratuita/lembretes"));
    for (const marco of ["d0", "d29", "d30"]) assert.ok(!montarEmailProtecaoGratuita(dados(marco)).html.includes("protecao-gratuita/lembretes"));
  });

  test("dia 7: convite a adicionar documentos só quando ainda não há", () => {
    assert.match(montarEmailProtecaoGratuita(dados("d7")).texto, /Ainda não adicionou/);
    assert.match(montarEmailProtecaoGratuita(dados("d7", "pt-PT", { documentos: 2 })).texto, /Já tem 2 documentos/);
  });

  test("português europeu: e-mail com hífen, sem 'você' nem urgência; preço de planos.ts", () => {
    for (const marco of ["d0", "d7", "d25", "d29", "d30"]) {
      const { texto, assunto } = montarEmailProtecaoGratuita(dados(marco));
      const tudo = `${assunto}\n${texto}`;
      assert.doesNotMatch(tudo, /\bvocê\b|\bemail\b|última oportunidade|apresse/i);
    }
    assert.match(montarEmailProtecaoGratuita(dados("d25")).texto, /4,99 €\/mês/);
  });

  test("inglês britânico, com /en nas ligações do portal", () => {
    const m = montarEmailProtecaoGratuita(dados("d25", "en-GB"));
    assert.match(m.assunto, /5 days left/);
    assert.ok(m.html.includes('lang="en-GB"'));
    assert.ok(m.html.includes("https://portal.dolado.pt/en/portal/subscricao"));
    assert.doesNotMatch(m.texto, /cobrança|Protecção gratuita/);
  });
});

describe("job: e-mails idempotentes", () => {
  function deps({ reserva = "aviso-1", falha = null } = {}) {
    const registo = { enviados: [], concluidos: [] };
    return {
      registo,
      async manutencao() {
        return { terminadas: 1, pseudonimos_apagados: 0 };
      },
      async pendentes() {
        return [
          { gratuita_id: "g1", user_id: "u1", email: "u1@exemplo.pt", marco: "d0", inicio_em: "2026-10-18T10:00:00Z", termina_em: "2026-11-17T10:00:00Z" },
          { gratuita_id: "g2", user_id: "u2", email: "u2@exemplo.pt", marco: "desconhecido", inicio_em: "x", termina_em: "y" },
        ];
      },
      async reservar() {
        return reserva;
      },
      async idiomaDaConta() {
        return "pt-PT";
      },
      async contarDocumentos() {
        return 0;
      },
      urlLembretes: () => "https://portal.dolado.pt/protecao-gratuita/lembretes",
      async enviarEmail(para, assunto) {
        if (falha) throw Object.assign(new Error("x"), { code: falha });
        registo.enviados.push({ para, assunto });
      },
      async concluir(id, enviado, erro, repetir) {
        registo.concluidos.push({ id, enviado, erro, repetir });
      },
    };
  }

  test("reserva antes de enviar e conclui; marcos desconhecidos são ignorados", async () => {
    const d = deps();
    const r = await processarProtecaoGratuita(d, "https://portal.dolado.pt");
    assert.deepEqual(r, { terminadas: 1, pseudonimosApagados: 0, enviados: 1, falhados: 0, ignorados: 1 });
    assert.deepEqual(d.registo.concluidos, [{ id: "aviso-1", enviado: true, erro: undefined, repetir: undefined }]);
  });

  test("sem reserva (já enviado ou em curso) não envia", async () => {
    const d = deps({ reserva: null });
    const r = await processarProtecaoGratuita(d, "https://portal.dolado.pt");
    assert.equal(r.enviados, 0);
    assert.equal(d.registo.enviados.length, 0);
  });

  test("Brevo recusou: nova tentativa; resultado incerto: sem nova tentativa", async () => {
    const recusa = deps({ falha: "brevo_400" });
    await processarProtecaoGratuita(recusa, "https://portal.dolado.pt");
    assert.deepEqual(recusa.registo.concluidos[0], { id: "aviso-1", enviado: false, erro: "brevo_400", repetir: true });
    const incerto = deps({ falha: "ETIMEDOUT" });
    await processarProtecaoGratuita(incerto, "https://portal.dolado.pt");
    assert.deepEqual(incerto.registo.concluidos[0], { id: "aviso-1", enviado: false, erro: "envio_incerto", repetir: false });
  });

  test("logo depois da activação: só o período activado, sem manutenção", async () => {
    const d = deps();
    const r = await processarProtecaoGratuita(d, "https://portal.dolado.pt", { soGratuita: "g1", semManutencao: true });
    assert.equal(r.terminadas, 0);
    assert.equal(r.enviados, 1);
    assert.equal(r.ignorados, 0);
  });
});
