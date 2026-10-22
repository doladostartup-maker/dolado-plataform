// Diagnóstico gratuito sem registo — `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  canalDeOrigem,
  diagnosticoAtivo,
  diagnosticoDaFatura,
  diagnosticoDoContrato,
  dispositivoDe,
  dominioCookieDiagnostico,
  fimPelaDuracao,
  formatoPelaAssinatura,
  lerCookieSessao,
  lerDiagnostico,
  normalizarPagina,
  normalizarUtm,
  validarFicheiro,
  valorCookieSessao,
} from "./regras.ts";

const fonte = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

const faturaValida = (extra = {}) => ({
  ok: true,
  setor: "telecomunicacoes",
  fornecedor: "Operadora X",
  identificacao: [],
  propostas: [{ campo: "data_fim_fidelizacao", valor: "2027-01-31", confianca: "high", pagina: 2, evidencia: null }],
  precisaRevisao: false,
  avisos: [],
  fatura: {
    numeroFatura: "FT 1",
    mensalidadeLidaCents: 3999,
    dataEmissao: "2026-10-05",
    periodoInicio: "2026-09-01",
    periodoFim: "2026-09-30",
    totalCents: 4499,
    recorrenteCents: 3999,
    pontualCents: 500,
    descontosCents: null,
    linhas: [
      { descricao: "Pacote TV+Net", categoria: "mensalidade", valorCents: 3999, recorrente: true },
      { descricao: "Chamadas", categoria: "consumo", valorCents: 500, recorrente: false },
    ],
    cessacaoOperadorCents: null,
    dataFimFidelizacao: "2027-01-31",
    energia: [],
  },
  ...extra,
});

describe("ficheiros", () => {
  test("formato, tamanho e ficheiro vazio", () => {
    assert.equal(validarFicheiro("application/pdf", 1000), null);
    assert.equal(validarFicheiro("image/heic", 1000), "formato");
    assert.equal(validarFicheiro("application/pdf", 11 * 1024 * 1024), "tamanho");
    assert.equal(validarFicheiro("application/pdf", 0), "vazio");
  });

  test("a assinatura do formato decide, não o tipo indicado pelo browser", () => {
    assert.equal(formatoPelaAssinatura(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])), "application/pdf");
    assert.equal(formatoPelaAssinatura(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
    assert.equal(formatoPelaAssinatura(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), "image/png");
    assert.equal(formatoPelaAssinatura(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])), "image/webp");
    assert.equal(formatoPelaAssinatura(new Uint8Array([0x4d, 0x5a, 0x90, 0x00])), null); // executável
  });

  test("desligado por omissão", () => {
    assert.equal(diagnosticoAtivo(undefined), false);
    assert.equal(diagnosticoAtivo("true"), false);
    assert.equal(diagnosticoAtivo("1"), true);
  });
});

describe("sessão anónima", () => {
  const s = { sessaoId: "0b8f2c1e-1111-4222-8333-444455556666", segredo: "a".repeat(64) };
  test("ida e volta do cookie; valores forjados são ignorados", () => {
    assert.deepEqual(lerCookieSessao(valorCookieSessao(s)), s);
    assert.equal(lerCookieSessao("x.y"), null);
    assert.equal(lerCookieSessao(`${s.sessaoId}.${"a".repeat(63)}`), null);
    assert.equal(lerCookieSessao(`${s.sessaoId}.${s.segredo}.extra`), null);
    assert.equal(lerCookieSessao(undefined), null);
  });
  test("cookie partilhado só entre dolado.pt e portal.dolado.pt", () => {
    assert.equal(dominioCookieDiagnostico("dolado.pt"), ".dolado.pt");
    assert.equal(dominioCookieDiagnostico("portal.dolado.pt"), ".dolado.pt");
    assert.equal(dominioCookieDiagnostico("localhost:3000"), undefined);
    assert.equal(dominioCookieDiagnostico("dolado.pt.exemplo.com"), undefined);
  });
});

describe("origem", () => {
  test("canais por UTM e por anfitrião de origem", () => {
    assert.equal(canalDeOrigem({ utmSource: "ig", utmMedium: "paid" }), "instagram");
    assert.equal(canalDeOrigem({ utmSource: "facebook" }), "facebook");
    assert.equal(canalDeOrigem({ utmSource: "google", utmMedium: "cpc" }), "campanha");
    assert.equal(canalDeOrigem({ utmSource: "google", utmMedium: "organic" }), "google");
    assert.equal(canalDeOrigem({ utmSource: "remax", utmMedium: "parceiro" }), "parceiro");
    assert.equal(canalDeOrigem({ referrer: "https://www.google.pt/" }), "google");
    assert.equal(canalDeOrigem({ referrer: "https://l.instagram.com/x" }), "instagram");
    assert.equal(canalDeOrigem({ referrer: "https://lm.facebook.com/" }), "facebook");
    assert.equal(canalDeOrigem({ referrer: "https://jornal.pt/artigo" }), "referencia");
    assert.equal(canalDeOrigem({ referrer: "https://dolado.pt/precario" }), "direto");
    assert.equal(canalDeOrigem({}), "direto");
  });
  test("UTM e página normalizados; nunca URL completo nem texto livre", () => {
    assert.equal(normalizarUtm(" Outubro_2026 "), "outubro_2026");
    assert.equal(normalizarUtm("joao@exemplo.pt"), null);
    assert.equal(normalizarPagina("/precario?email=a@b.pt"), "/precario");
    assert.equal(normalizarPagina("https://dolado.pt/"), null);
  });
  test("dispositivo só como categoria", () => {
    assert.equal(dispositivoDe("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)"), "movel");
    assert.equal(dispositivoDe("Mozilla/5.0 (Macintosh; Intel Mac OS X)"), "computador");
    assert.equal(dispositivoDe(null), null);
  });
});

describe("diagnóstico: só factos e cálculos", () => {
  test("factura: factos lidos, dias até ao fim da fidelização e soma das linhas", () => {
    const d = diagnosticoDaFatura(faturaValida(), "2026-10-22");
    assert.equal(d.tipo, "fatura");
    assert.equal(d.fornecedor, "Operadora X");
    assert.deepEqual(d.factos.find((f) => f.chave === "total"), { chave: "total", tipo: "euros", valor: 4499, pagina: null });
    assert.equal(d.factos.find((f) => f.chave === "data_fim_fidelizacao").pagina, 2);
    assert.deepEqual(d.calculos[0], { chave: "dias_fim_fidelizacao", data: "2027-01-31", dias: 101 });
    assert.deepEqual(d.calculos[1], { chave: "soma_linhas", somaCents: 4499, totalCents: 4499, coincide: true });
    assert.deepEqual(d.porConfirmar, []);
  });

  test("factura sem fidelização nem total: diz o que não foi possível confirmar", () => {
    const v = faturaValida({ fornecedor: null });
    v.fatura = { ...v.fatura, totalCents: null, dataFimFidelizacao: null };
    const d = diagnosticoDaFatura(v, "2026-10-22");
    assert.deepEqual(d.porConfirmar, ["fornecedor", "total", "fidelizacao"]);
    assert.equal(d.calculos.length, 0);
  });

  test("fidelização terminada não é contada como dias negativos", () => {
    const v = faturaValida();
    v.fatura = { ...v.fatura, dataFimFidelizacao: "2026-01-31" };
    const d = diagnosticoDaFatura(v, "2026-10-22");
    assert.deepEqual(d.calculos[0], { chave: "fidelizacao_terminada", data: "2026-01-31" });
  });

  test("contrato: fim pela duração só com início factual, nunca a data de assinatura", () => {
    const p = (campo, valor) => ({ campo, valor, confianca: "high", pagina: 1, evidencia: null });
    const base = { ok: true, setor: "telecomunicacoes", fornecedor: "Operadora X", identificacao: [], precisaRevisao: false, avisos: [] };
    const comInicio = diagnosticoDoContrato({ ...base, propostas: [p("data_ativacao", "2026-03-01"), p("duracao_fidelizacao_meses", 24), p("mensalidade_cents", 3500)] }, "2026-10-22");
    assert.deepEqual(comInicio.calculos[0], { chave: "fim_fidelizacao_pela_duracao", data: "2028-02-29", inicio: "2026-03-01", meses: 24 });
    assert.deepEqual(comInicio.porConfirmar, []);

    const soAssinatura = diagnosticoDoContrato({ ...base, propostas: [p("data_assinatura", "2026-03-01"), p("duracao_fidelizacao_meses", 24), p("inicio_na_ativacao", "sim")] }, "2026-10-22");
    assert.equal(soAssinatura.calculos.length, 0);
    assert.deepEqual(soAssinatura.porConfirmar, ["mensalidade", "data_ativacao"]);
  });

  test("mesma convenção de datas do Monitor (fim = véspera do aniversário)", () => {
    assert.equal(fimPelaDuracao("2025-03-01", 24), "2027-02-28");
    assert.equal(fimPelaDuracao("2026-01-31", 1), "2026-02-27");
  });

  test("o diagnóstico nunca tem campos de interpretação", () => {
    const d = diagnosticoDaFatura(faturaValida(), "2026-10-22");
    assert.deepEqual(Object.keys(d).sort(), ["calculos", "factos", "fornecedor", "linhas", "porConfirmar", "setor", "tipo", "versao"]);
    const texto = fonte("../../i18n/mensagens/pt-PT/diagnostico.ts")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    for (const proibido of ["poupa", "indevid", "ilegal", "violou", "tem direito", "irregular"]) {
      assert.ok(!texto.toLowerCase().includes(proibido), proibido);
    }
  });

  test("leitura defensiva do jsonb gravado", () => {
    assert.equal(lerDiagnostico(null), null);
    assert.equal(lerDiagnostico({ tipo: "outro" }), null);
    assert.ok(lerDiagnostico(diagnosticoDaFatura(faturaValida(), "2026-10-22")));
  });
});

describe("servidor: modelo e segurança", () => {
  const servidor = fonte("./servidor.ts");
  const acoes = fonte("../../app/actions/diagnostico.ts");
  const cliente = fonte("../../components/diagnostico/CarregarDocumento.tsx");
  const claude = fonte("../claude.ts");

  test("Haiku 5.5 por omissão, escolhido só no servidor", () => {
    assert.match(claude, /MODELO_DIAGNOSTICO = process\.env\.ANTHROPIC_DIAGNOSTICO_MODEL \|\| "claude-haiku-5-5"/);
    assert.equal((servidor.match(/modelo: MODELO_DIAGNOSTICO/g) ?? []).length, 3);
    assert.ok(!/modelo|model/i.test(acoes.match(/prepararDiagnosticoAction\(dados: \{[\s\S]*?\}\)/)[0]));
    assert.ok(!/claude-|MODELO_/.test(cliente));
  });

  test("custo de cada leitura gratuita registado com o diagnóstico", () => {
    assert.match(servidor, /funcionalidade: FUNCIONALIDADE_IA,\s+diagnostico_id: id/);
    assert.match(fonte("../monitor/custos.ts"), /"claude-haiku-5-5": \{ entrada: 0\.1, saida: 0\.5 \}/);
  });

  test("NIF e nome do titular pseudonimizados antes de qualquer gravação", () => {
    assert.match(servidor, /protegerExtracao\(leituraF\.bruto, chave\)/);
    assert.match(servidor, /protegerExtracao\(leituraC\.bruto, chave\)/);
  });

  test("a sessão anónima é verificada pelo segredo em todas as leituras", () => {
    assert.match(servidor, /\.eq\("token_hash", hashSegredo\(sessao\.segredo\)\)/);
    assert.ok(!/estadoDiagnostico\([^)]*\)\s*{\s*const admin[\s\S]{0,400}\.eq\("id", id\)\s*\.maybeSingle/.test(servidor));
  });

  test("interruptor e limite por IP nas acções", () => {
    assert.match(acoes, /if \(!diagnosticoAtivo\(\)\) return \{ ok: false, erro: "indisponivel" \}/);
    assert.match(acoes, /excedeuLimiteTaxa\(`diagnostico:\$\{await obterIp\(\)\}`\)/);
  });

  test("migration: RLS sem policies, funções só service_role, conservação", () => {
    const sql = fonte("../../../supabase/migrations/20261028090000_diagnostico_gratuito.sql");
    assert.match(sql, /alter table public\.diagnosticos_gratuitos enable row level security/);
    assert.ok(!/create policy/i.test(sql));
    for (const f of ["diagnostico_reservar", "diagnostico_associar", "diagnosticos_expirar"]) {
      assert.match(sql, new RegExp(`grant execute on function public\\.${f}\\([^)]*\\) to service_role`));
    }
    assert.match(sql, /interval '7 days'/);
    assert.match(sql, /interval '13 months'/);
  });
});

describe("homepage com a análise gratuita", () => {
  const pagina = fonte("../../app/[idioma]/page.tsx");
  const home = fonte("../../components/homepage-v2/HomepageDiagnostico.tsx");
  const botao = fonte("../../components/diagnostico/CarregarDocumento.tsx");
  const semComentarios = (s) => s.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");

  test("só substitui a homepage actual com a análise ligada", () => {
    assert.match(pagina, /diagnosticoAtivo\(\) \? \(\s*<HomepageDiagnostico[\s\S]*?\) : \(\s*<HomepageV2/);
  });

  test("entrada principal pelo carregamento; secundária para quem já tem um problema", () => {
    assert.match(home, /<CarregarDocumento local="homepage_hero"/);
    assert.match(home, /botaoProblema\("click_hero_reclamacao"\)/);
    assert.match(home, /\{t\.hero\.problema\}/);
  });

  test("o aviso (sem registo, IA, conservação) acompanha sempre o botão", () => {
    for (const chave of ["t.confianca", "t.formatos", "t.privacidade", 'href="/privacidade"']) assert.ok(botao.includes(chave), chave);
  });

  test("textos sem promessas de erros, irregularidades ou poupanças, nas duas línguas", async () => {
    const { inicio: pt } = await import("../../i18n/mensagens/pt-PT/inicio.ts");
    const { inicio: en } = await import("../../i18n/mensagens/en-GB/inicio.ts");
    const textoPt = JSON.stringify(pt.diagnostico).toLowerCase();
    for (const proibido of ["poupa", "indevid", "ilegal", "errad", "irregular", "tem direito", "garant"]) {
      assert.ok(!textoPt.includes(proibido), proibido);
    }
    const textoEn = JSON.stringify(en.diagnostico).toLowerCase();
    for (const proibido of ["save money", "unlawful", "illegal", "wrongly", "guarantee"]) assert.ok(!textoEn.includes(proibido), proibido);
    assert.equal(pt.diagnostico.perguntas.itens.length, en.diagnostico.perguntas.itens.length);
    assert.ok(!semComentarios(home).includes("Tratar do meu caso"), "textos só no dicionário");
  });
});
