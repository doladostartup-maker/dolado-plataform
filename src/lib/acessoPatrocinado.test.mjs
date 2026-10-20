// Protecção oferecida por um parceiro (acesso patrocinado) — regras, acesso,
// cobrança adiada, relatório, e-mails e job (`npm test`). A base de dados
// tem os próprios testes em supabase/tests/database/programa_parceiros.test.sql.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ALFABETO_CODIGO,
  COMPRIMENTO_CODIGO_ACESSO,
  acessoPatrocinadoDe,
  acessosPatrocinadosLigados,
  csvCodigos,
  csvRelatorio,
  formatarCodigoAcesso,
  gerarCodigoAcesso,
  lerMotivoAtivacao,
  normalizarCodigoAcesso,
  periodoSemCusto,
  relatorioParaEmpresa,
} from "./acessoPatrocinado.ts";
import { calcularAcesso } from "./acesso.ts";
import { inicioCobrancaAdesao } from "./protecaoGratuita.ts";
import { montarEmailAcessoPatrocinado } from "./email/acessoPatrocinado.ts";
import { processarAvisosAcessoPatrocinado } from "./acessoPatrocinadoAvisos.ts";
import { TEXTO_ACEITACAO_ACESSO_PATROCINADO } from "./legal.ts";
import { acessoPatrocinado as pt } from "../i18n/mensagens/pt-PT/acessoPatrocinado.ts";

const DIA = 24 * 60 * 60 * 1000;
const AGORA = new Date("2026-10-21T10:00:00Z");
const linha = (inicioDiasAtras, dias = 92, estado = "ativo") => {
  const inicio = new Date(AGORA.getTime() - inicioDiasAtras * DIA);
  return { estado, inicio_em: inicio.toISOString(), termina_em: new Date(inicio.getTime() + dias * DIA).toISOString() };
};

describe("códigos de activação", () => {
  test("12 caracteres do alfabeto sem 0/O/1/I, a partir de bytes aleatórios", () => {
    const codigo = gerarCodigoAcesso(new Uint8Array(16).map((_, i) => i * 37));
    assert.equal(codigo.length, COMPRIMENTO_CODIGO_ACESSO);
    for (const c of codigo) assert.ok(ALFABETO_CODIGO.includes(c));
    assert.equal(ALFABETO_CODIGO.length, 32);
    assert.ok(!/[01OI]/.test(ALFABETO_CODIGO));
  });

  test("bytes insuficientes são recusados", () => {
    assert.throws(() => gerarCodigoAcesso(new Uint8Array(4)));
  });

  test("normalização: minúsculas, espaços e hífenes; formato impossível → null", () => {
    assert.equal(normalizarCodigoAcesso(" abcd-efgh-jklm "), "ABCDEFGHJKLM");
    assert.equal(normalizarCodigoAcesso("ABCD EFGH JKLM"), "ABCDEFGHJKLM");
    assert.equal(normalizarCodigoAcesso("ABCDEFGHJKL0"), null, "0 não pertence ao alfabeto");
    assert.equal(normalizarCodigoAcesso("ABC"), null);
    assert.equal(normalizarCodigoAcesso(42), null);
  });

  test("apresentação e CSV de emissão só com códigos (sem dados de pessoas)", () => {
    assert.equal(formatarCodigoAcesso("ABCDEFGHJKLM"), "ABCD-EFGH-JKLM");
    const csv = csvCodigos({ pacote: 'Pacote "A"', validade: "2026-12-31", codigos: ["ABCDEFGHJKLM", "MNPQRSTUVWXY"] });
    assert.deepEqual(csv.split("\n"), [
      "codigo,pacote,ativar_ate",
      '"ABCD-EFGH-JKLM","Pacote ""A""",2026-12-31',
      '"MNPQ-RSTU-VWXY","Pacote ""A""",2026-12-31',
    ]);
  });

  test("motivo desconhecido da base de dados → código inválido", () => {
    assert.equal(lerMotivoAtivacao("ativado"), "ativado");
    assert.equal(lerMotivoAtivacao("protecao_ativa"), "protecao_ativa");
    assert.equal(lerMotivoAtivacao("outra_coisa"), "codigo_invalido");
    assert.equal(lerMotivoAtivacao(null), "codigo_invalido");
  });

  test("desligado por omissão", () => {
    assert.equal(acessosPatrocinadosLigados({}), false);
    assert.equal(acessosPatrocinadosLigados({ ACESSOS_PATROCINADOS_ATIVO: "0" }), false);
    assert.equal(acessosPatrocinadosLigados({ ACESSOS_PATROCINADOS_ATIVO: "1" }), true);
  });
});

describe("acesso da conta", () => {
  test("acesso patrocinado em curso dá Protecção, sem subscrição paga", () => {
    const a = calcularAcesso(null, null, AGORA, linha(10));
    assert.equal(a.temProtecao, true);
    assert.equal(a.temSubscricao, false, "não bloqueia uma adesão voluntária nem conta como subscrição");
    assert.equal(a.acessoPatrocinado.emCurso, true);
    assert.equal(a.acessoPatrocinado.diasRestantes, 82);
  });

  test("acesso terminado (pela data ou pelo estado) não dá Protecção", () => {
    assert.equal(calcularAcesso(null, null, AGORA, linha(100)).temProtecao, false);
    assert.equal(calcularAcesso(null, null, AGORA, linha(10, 92, "terminado")).temProtecao, false);
  });

  test("subscrição paga mantém-se igual com um acesso patrocinado", () => {
    const ua = { subscription_plan: "protecao", subscription_status: "active", case_credits: 0, avulso_credits: 0 };
    const a = calcularAcesso(ua, null, AGORA, linha(10));
    assert.equal(a.temSubscricao, true);
    assert.equal(a.plano, "protecao");
    assert.equal(a.temProtecao, true);
  });

  test("sem acesso patrocinado: igual ao que era (regressão)", () => {
    const a = calcularAcesso(null, null, AGORA);
    assert.equal(a.temProtecao, false);
    assert.equal(a.acessoPatrocinado, null);
  });
});

describe("adesão durante a oferta: cobrança no fim, sem cobrança automática antes", () => {
  test("o período sem custo é o que termina mais tarde", () => {
    const gratuita = { emCurso: true, fim: "2026-11-01T00:00:00Z" };
    const patrocinado = { emCurso: true, fim: "2027-01-21T00:00:00Z" };
    assert.equal(periodoSemCusto(gratuita, patrocinado).fim, patrocinado.fim);
    assert.equal(periodoSemCusto(null, { emCurso: false, fim: patrocinado.fim }), null);
  });

  test("Protecção: 1.ª cobrança no fim da oferta; Caso + Protecção: logo", () => {
    const a = acessoPatrocinadoDe(linha(10), AGORA);
    assert.equal(inicioCobrancaAdesao(periodoSemCusto(a), "protecao", AGORA).toISOString(), a.fim);
    assert.equal(inicioCobrancaAdesao(periodoSemCusto(a), "caso_protecao", AGORA), null);
  });

  test("a menos de 49 h do fim, a cobrança é no dia da adesão", () => {
    const a = acessoPatrocinadoDe(linha(91, 92), AGORA);
    assert.equal(inicioCobrancaAdesao(periodoSemCusto(a), "protecao", AGORA), null);
  });
});

describe("relatório para a empresa", () => {
  const base = { adquiridos: 50, emitidos: 50, ativados: 20, disponiveis: 28, expirados: 0, anulados: 2, ativos_agora: 18 };

  test("contagens com valores exactos acima do limiar", () => {
    const r = relatorioParaEmpresa(base);
    assert.equal(r.find((l) => l.indicador === "Códigos utilizados").valor, "20");
    assert.equal(r.find((l) => l.indicador === "Taxa de activação").valor, "40,0%");
  });

  test("grupos pequenos: \"menos de 5\" e sem os números que permitiriam deduzir as activações", () => {
    const r = relatorioParaEmpresa({ ...base, ativados: 3, disponiveis: 45, ativos_agora: 2 });
    const v = Object.fromEntries(r.map((l) => [l.indicador, l.valor]));
    assert.equal(v["Códigos utilizados"], "menos de 5");
    assert.equal(v["Acessos patrocinados activos"], "menos de 5");
    assert.equal(v["Códigos disponíveis"], "—");
    assert.equal(v["Taxa de activação"], "—");
  });

  test("zero activações mostra 0 (nenhuma pessoa a identificar)", () => {
    const r = relatorioParaEmpresa({ ...base, ativados: 0, disponiveis: 48, ativos_agora: 0 });
    assert.equal(r.find((l) => l.indicador === "Códigos utilizados").valor, "0");
  });

  test("CSV só com indicadores e valores", () => {
    const csv = csvRelatorio(relatorioParaEmpresa(base));
    assert.match(csv, /^indicador,valor\n"Acessos adquiridos","50"/);
    assert.ok(!/@|user_id|email/i.test(csv));
  });
});

describe("textos", () => {
  test("aceitação registada como prova: Termos + o que o beneficiário compreende", () => {
    assert.match(TEXTO_ACEITACAO_ACESSO_PATROCINADO, /^Li e aceito os Termos e Condições da DoLado\. /);
    assert.match(TEXTO_ACEITACAO_ACESSO_PATROCINADO, /sem qualquer cobrança/);
    assert.equal(pt.ativar.aceitar, TEXTO_ACEITACAO_ACESSO_PATROCINADO.slice("Li e aceito os Termos e Condições da DoLado.".length));
  });
});

describe("e-mails ao beneficiário", () => {
  const dados = (marco, idioma = "pt-PT", parceiro = "Imobiliária <Teste>") => ({
    marco,
    idioma,
    inicio: "2026-10-21T10:00:00Z",
    fim: "2027-01-21T10:00:00Z",
    parceiro,
    portalUrl: "https://portal.dolado.pt",
  });

  test("activação: parceiro escapado, datas e sem cobrança", () => {
    const e = montarEmailAcessoPatrocinado(dados("ativacao"));
    assert.equal(e.assunto, "A sua Protecção oferecida está activa");
    assert.ok(e.html.includes("Imobiliária &lt;Teste&gt;"));
    assert.ok(!e.html.includes("<Teste>"));
    assert.match(e.texto, /21 de Outubro de 2026/);
    assert.match(e.texto, /sem qualquer cobrança/);
    assert.match(e.texto, /não tem acesso às suas facturas/);
  });

  test("15 dias antes e fim levam à adesão voluntária; inglês com /en", () => {
    assert.match(montarEmailAcessoPatrocinado(dados("d15")).texto, /portal\.dolado\.pt\/portal\/subscricao/);
    const fim = montarEmailAcessoPatrocinado(dados("fim", "en-GB"));
    assert.equal(fim.assunto, "Your gifted Protection has ended");
    assert.match(fim.texto, /portal\.dolado\.pt\/en\/portal\/subscricao/);
    assert.match(fim.texto, /with no charge/);
  });
});

describe("job dos avisos", () => {
  const pendente = (marco, id = "a1") => ({
    acesso_id: id,
    user_id: "u1",
    email: "cliente@teste.invalid",
    marco,
    inicio_em: "2026-10-21T10:00:00Z",
    termina_em: "2027-01-21T10:00:00Z",
    parceiro: "Empresa",
  });

  function deps(pendentes, { reserva = "r1", falhaEnvio = null } = {}) {
    const registo = { enviados: [], concluidos: [] };
    return {
      registo,
      deps: {
        pendentes: async () => pendentes,
        reservar: async () => reserva,
        idiomaDaConta: async () => "pt-PT",
        enviarEmail: async (para, assunto) => {
          if (falhaEnvio) throw Object.assign(new Error("x"), { code: falhaEnvio });
          registo.enviados.push({ para, assunto });
        },
        concluir: async (id, enviado, erro, repetir) => registo.concluidos.push({ id, enviado, erro, repetir }),
      },
    };
  }

  test("reserva → envio → concluído", async () => {
    const { deps: d, registo } = deps([pendente("ativacao")]);
    const r = await processarAvisosAcessoPatrocinado(d, "https://portal.dolado.pt");
    assert.deepEqual(r, { enviados: 1, falhados: 0, ignorados: 0 });
    assert.equal(registo.enviados[0].para, "cliente@teste.invalid");
    assert.deepEqual(registo.concluidos, [{ id: "r1", enviado: true, erro: undefined, repetir: undefined }]);
  });

  test("sem reserva não envia (nunca em duplicado); marco desconhecido é ignorado", async () => {
    const { deps: d, registo } = deps([pendente("ativacao"), pendente("d99", "a2")], { reserva: null });
    const r = await processarAvisosAcessoPatrocinado(d, "https://portal.dolado.pt");
    assert.equal(r.ignorados, 2);
    assert.equal(registo.enviados.length, 0);
  });

  test("recusa da Brevo repete; envio incerto não repete", async () => {
    const recusa = deps([pendente("d15")], { falhaEnvio: "brevo_400" });
    await processarAvisosAcessoPatrocinado(recusa.deps, "https://portal.dolado.pt");
    assert.equal(recusa.registo.concluidos[0].repetir, true);
    const incerto = deps([pendente("d15")], { falhaEnvio: "ETIMEDOUT" });
    await processarAvisosAcessoPatrocinado(incerto.deps, "https://portal.dolado.pt");
    assert.deepEqual(incerto.registo.concluidos[0], { id: "r1", enviado: false, erro: "envio_incerto", repetir: false });
  });

  test("filtro por acesso (logo depois da activação)", async () => {
    const { deps: d, registo } = deps([pendente("ativacao", "a1"), pendente("ativacao", "a2")]);
    await processarAvisosAcessoPatrocinado(d, "https://portal.dolado.pt", { soAcesso: "a2" });
    assert.equal(registo.enviados.length, 1);
  });
});
