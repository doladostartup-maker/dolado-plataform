// Dossiê do caso (encerramento com encaminhamento externo) — `npm test`.
// Conteúdo (modelo.ts), PDF real (pdf.ts, lido de volta com unpdf) e textos
// do portal (encerramentoExterno.ts).
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { extractText, getDocumentProxy } from "unpdf";
import { montarDossie, nomeFicheiroDossie, recebidaEntraNoDossie, referenciaCaso, DOSSIE_MODELO_VERSAO } from "./modelo.ts";
import { gerarPdfDossie, normalizarTexto, quebrarLinhas } from "./pdf.ts";
import {
  CENTROS_RAL_GERAIS,
  ENTIDADES_RAL_SETORIAIS,
  LISTA_OFICIAL_RAL_URL,
  MENSAGEM_ENCERRADO_EXTERNO,
  OPCOES_CONFLITO,
  SECCAO_ENTIDADES,
} from "../encerramentoExterno.ts";

const TEXTO_ENVIADO = "Exmos. Senhores,\n\nEu, Maria Teste, titular do contrato n.º 123456, venho reclamar da cobrança em duplicado de agosto.\n\nCom os melhores cumprimentos.";

function dados(extra = {}) {
  return {
    caso: {
      id: "3f2a9c10-1111-2222-3333-444455556666",
      nome: "Maria Teste",
      empresa: "Operadora X",
      sector: "Telecomunicações",
      tipo_problema: "Faturação",
      problema_tipo: null,
      descricao: "Cobraram-me duas vezes a mensalidade de agosto.",
      created_at: "2026-09-01T10:00:00Z",
    },
    eventos: [
      { tipo: "texto_autorizado", created_at: "2026-09-02T10:00:00Z", texto_id: "t1" },
      { tipo: "comunicacao_enviada", created_at: "2026-09-03T10:00:00Z", texto_id: "t1" },
      { tipo: "comunicacao_recebida", created_at: "2026-09-10T10:00:00Z" },
      { tipo: "caso_encerrado", created_at: "2026-10-06T10:00:00Z", dados: { modo: "encaminhamento_externo" } },
    ],
    envios: [
      {
        id: "e1",
        texto_id: "t1",
        enviado_em: "2026-09-03T10:00:00Z",
        canal: "livro_reclamacoes_eletronico",
        destinatario: "Operadora X",
        referencia: "LRE-2026-0001",
        versao: 2,
        conteudo: TEXTO_ENVIADO,
      },
    ],
    comprovativos: [{ envio_id: "e1", tipo: "ficheiro", nome: "comprovativo-lre.pdf", identificador_externo: null, created_at: "2026-09-03T11:00:00Z" }],
    recebidas: [
      {
        recebida_em: "2026-09-10T10:00:00Z",
        data_mensagem: null,
        canal: "email",
        remetente_nome: "Apoio ao Cliente",
        remetente_email: "apoio@operadora.example",
        assunto: "Re: reclamação",
        corpo_apresentacao: "Lamentamos, mas não há lugar a devolução.",
        estado_analise: "analisada",
        classificacao: "resposta_negativa",
        suspeita_spam: false,
        anexos: ["carta-resposta.pdf"],
      },
      {
        recebida_em: "2026-09-11T10:00:00Z",
        data_mensagem: null,
        canal: "email",
        remetente_nome: "Desconhecido",
        remetente_email: null,
        assunto: "MENSAGEM_SPAM",
        corpo_apresentacao: "spam",
        estado_analise: "analisada",
        classificacao: null,
        suspeita_spam: true,
        anexos: [],
      },
      {
        recebida_em: "2026-09-12T10:00:00Z",
        data_mensagem: null,
        canal: "email",
        remetente_nome: null,
        remetente_email: null,
        assunto: "POR_ANALISAR",
        corpo_apresentacao: "x",
        estado_analise: "por_analisar",
        classificacao: null,
        suspeita_spam: false,
        anexos: [],
      },
      {
        recebida_em: "2026-09-13T10:00:00Z",
        data_mensagem: null,
        canal: "email",
        remetente_nome: null,
        remetente_email: null,
        assunto: "IRRELEVANTE",
        corpo_apresentacao: "x",
        estado_analise: "sem_acao",
        classificacao: "mensagem_irrelevante",
        suspeita_spam: false,
        anexos: [],
      },
    ],
    mensagensCliente: [{ decisao: "encaminhar", mensagem_cliente: "Indicámos-lhe o próximo passo possível.", created_at: "2026-09-20T10:00:00Z" }],
    pedidosCliente: [
      {
        pedido: "Envie-nos a fatura de agosto.",
        created_at: "2026-09-12T10:00:00Z",
        estado: "respondido",
        respondido_em: "2026-09-13T10:00:00Z",
        resposta_texto: "Junto a fatura.",
        resposta_anexos: [{ nome: "fatura-agosto.pdf", tamanho_bytes: 1000 }],
      },
    ],
    documentos: [{ nome_ficheiro: "contrato.pdf", created_at: "2026-09-01T10:00:00Z" }],
    encerradoEm: "2026-10-06T10:00:00Z",
    geradoEm: "2026-10-06T10:01:00Z",
    versao: 1,
    ...extra,
  };
}

const textoDoModelo = (m) =>
  [m.titulo, m.aviso, ...m.cabecalho.flat(), ...m.seccoes.flatMap((s) => [s.titulo, ...s.blocos.flatMap((b) => (b.tipo === "campos" ? b.campos.flat() : b.tipo === "lista" ? b.itens : [b.texto]))])].join("\n");

describe("conteúdo do dossiê", () => {
  test("referência e nome do ficheiro estáveis, sem dados pessoais", () => {
    assert.equal(referenciaCaso("3f2a9c10-1111-2222-3333-444455556666"), "DL-3F2A9C10");
    assert.equal(nomeFicheiroDossie("3f2a9c10-1111-2222-3333-444455556666", 2), "dossie-caso-dolado-dl-3f2a9c10-v2.pdf");
    assert.match(DOSSIE_MODELO_VERSAO, /^dossie_v\d+$/);
  });

  test("inclui os dados pedidos: empresa, setor, categoria, descrição, envio, referência LRE, comprovativo, estado final, encerramento", () => {
    const m = montarDossie(dados());
    const t = textoDoModelo(m);
    assert.equal(m.titulo, "Dossiê do Caso DoLado");
    for (const esperado of [
      "DL-3F2A9C10",
      "Operadora X",
      "Telecomunicações",
      "Faturação",
      "Cobraram-me duas vezes a mensalidade de agosto.",
      "N.º da reclamação no Livro de Reclamações",
      "LRE-2026-0001",
      "comprovativo-lre.pdf",
      "Livro de Reclamações Eletrónico",
      "Lamentamos, mas não há lugar a devolução.",
      "carta-resposta.pdf",
      "Envie-nos a fatura de agosto.",
      "fatura-agosto.pdf",
      "contrato.pdf",
      "Indicámos-lhe o próximo passo possível.",
      "Encerrado na DoLado",
      "Data de encerramento",
      OPCOES_CONFLITO.titulo,
      ...OPCOES_CONFLITO.paragrafos,
      LISTA_OFICIAL_RAL_URL,
    ]) {
      assert.ok(t.includes(esperado), `falta: ${esperado}`);
    }
  });

  test("texto enviado reproduzido exatamente (versão apontada pelo envio)", () => {
    const m = montarDossie(dados());
    const blocos = m.seccoes.find((s) => s.titulo === "Reclamação e comunicações enviadas").blocos;
    assert.ok(blocos.some((b) => b.tipo === "paragrafo" && b.texto === TEXTO_ENVIADO));
  });

  test("comunicações recebidas: só as analisadas, relevantes e sem suspeita de spam", () => {
    const t = textoDoModelo(montarDossie(dados()));
    assert.doesNotMatch(t, /MENSAGEM_SPAM|POR_ANALISAR|IRRELEVANTE/);
    assert.equal(recebidaEntraNoDossie({ estado_analise: "analisada", classificacao: "resposta_negativa", suspeita_spam: false }), true);
    assert.equal(recebidaEntraNoDossie({ estado_analise: "por_analisar", classificacao: null, suspeita_spam: false }), false);
  });

  test("comunicação muito longa fica em excerto, com aviso", () => {
    const longa = dados();
    longa.recebidas[0].corpo_apresentacao = "a ".repeat(40000);
    const t = textoDoModelo(montarDossie(longa));
    assert.match(t, /Excerto: o texto completo desta comunicação fica guardado na DoLado/);
  });

  test("sem envios nem respostas: diz que não há registo, sem secções vazias", () => {
    const t = textoDoModelo(montarDossie(dados({ envios: [], comprovativos: [], recebidas: [], mensagensCliente: [], pedidosCliente: [], documentos: [] })));
    assert.match(t, /Não há registo de comunicações enviadas à empresa/);
    assert.match(t, /Não há registo de respostas da empresa/);
    assert.match(t, /Não há documentos registados/);
  });

  test("cronologia com o encerramento em linguagem do cliente", () => {
    const t = textoDoModelo(montarDossie(dados()));
    assert.match(t, /Caso recebido pela DoLado/);
    assert.match(t, /Reclamação enviada \(Referência: LRE-2026-0001\)/);
    assert.match(t, /Encerrado na DoLado/);
  });

  test("é um registo do caso, não uma peça jurídica: sem conclusões nem indicação da entidade competente", () => {
    const t = textoDoModelo(montarDossie(dados()));
    assert.match(t, /não é um parecer jurídico nem uma peça processual/);
    assert.doesNotMatch(t, /centro competente é|entidade competente é|tem direito|violou a lei|vai ganhar|petição|requerimento de arbitragem/i);
    assert.doesNotMatch(t, /\bemail\b|você|\barquivo\b|\bfactura|\bacção/i);
  });
});

describe("PDF", () => {
  test("PDF válido, com o texto pesquisável, acentos e paginação", async () => {
    const bytes = await gerarPdfDossie(montarDossie(dados()));
    assert.equal(Buffer.from(bytes.slice(0, 5)).toString(), "%PDF-");
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    assert.ok(totalPages >= 1);
    for (const esperado of ["Dossiê do Caso DoLado", "Operadora X", "LRE-2026-0001", "venho reclamar da cobrança em duplicado de agosto", "Opções para continuar a tratar o conflito", `Página 1 de ${totalPages}`]) {
      assert.ok(text.includes(esperado), `falta no PDF: ${esperado}`);
    }
  });

  test("texto longo e caracteres fora da fonte não fazem falhar a geração", async () => {
    const d = dados();
    d.envios[0].conteudo = `${"Parágrafo com → seta, emoji 😀 e ligação https://exemplo.pt/".repeat(200)}${"x".repeat(500)}`;
    const bytes = await gerarPdfDossie(montarDossie(d));
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { totalPages } = await extractText(pdf, { mergePages: true });
    assert.ok(totalPages > 2);
  });

  test("normalizarTexto: troca o que a fonte não desenha, sem caracteres de controlo", () => {
    const suportado = (c) => c < 0x250 || [0x2014, 0x201c, 0x201d, 0x20ac, 0x2026].includes(c);
    assert.equal(normalizarTexto("a\u0007b\tc → d 😀 — “€”", suportado), "ab    c -> d  — “€”");
    assert.equal(normalizarTexto("ação\r\nlinha", suportado), "ação\nlinha");
  });

  test("quebrarLinhas: respeita a largura e parte palavras longas", () => {
    const medir = (t) => t.length;
    assert.deepEqual(quebrarLinhas("um dois três", 7, medir), ["um dois", "três"]);
    assert.deepEqual(quebrarLinhas("abcdefghij", 4, medir), ["abcd", "efgh", "ij"]);
    assert.deepEqual(quebrarLinhas("a\n\nb", 10, medir), ["a", "", "b"]);
  });
});

describe("textos do portal (encerramento)", () => {
  const todos = [...MENSAGEM_ENCERRADO_EXTERNO, ...Object.values(SECCAO_ENTIDADES), ...OPCOES_CONFLITO.paragrafos].join(" ");

  test("mensagem pedida: o acompanhamento terminou, não necessariamente resolvido", () => {
    assert.match(todos, /A DoLado terminou o acompanhamento deste caso\. Isto não significa necessariamente que o problema esteja resolvido\./);
    assert.match(todos, /Resolução Alternativa de Litígios de Consumo/);
  });

  test("linguagem prudente: centros a consultar, nunca o centro competente; sem representação", () => {
    assert.equal(SECCAO_ENTIDADES.rotuloLista, "Centros a consultar");
    assert.doesNotMatch(todos, /centro competente é|entidade competente é|escolhemos|representamos/i);
    assert.match(todos, /não representa o consumidor/);
    assert.match(todos, /não determina nem indica qual é a entidade competente para este caso/);
    assert.match(todos, /Confirme diretamente junto da entidade se pode apreciar o conflito/);
  });

  test("lista oficial da Direção-Geral do Consumidor e entidades com site", () => {
    assert.match(LISTA_OFICIAL_RAL_URL, /^https:\/\/www\.consumidor\.gov\.pt\//);
    assert.ok(CENTROS_RAL_GERAIS.length > 0);
    for (const e of [...CENTROS_RAL_GERAIS, ...ENTIDADES_RAL_SETORIAIS]) assert.match(e.site, /^https:\/\//);
  });

  test("lista DGC (08/10/2026): 10 centros gerais e 2 entidades setoriais, em secções separadas", () => {
    assert.equal(CENTROS_RAL_GERAIS.length, 10);
    assert.deepEqual(
      ENTIDADES_RAL_SETORIAIS.map((e) => e.nome),
      [
        "Centro de Informação, Mediação e Arbitragem de Seguros (CIMPAS)",
        "Provedor do Cliente das Agências de Viagens e Turismo (Provedor da APAVT)",
      ],
    );
    assert.ok(CENTROS_RAL_GERAIS.every((e) => e.tipo === "geral"));
    assert.ok(CENTROS_RAL_GERAIS.some((e) => e.nome.includes("(CNIACC)")));
    // "Centros a consultar" só lista os gerais; as setoriais têm subtítulo próprio.
    const d = montarDossie(dados());
    const linhas = JSON.stringify(d);
    const iCentros = linhas.indexOf("Centros a consultar (informação pública)");
    const iSetoriais = linhas.indexOf("Entidades setoriais a consultar (informação pública)");
    assert.ok(iCentros >= 0 && iSetoriais > iCentros);
    assert.ok(linhas.indexOf("CIMPAS") > iSetoriais, "CIMPAS só depois do subtítulo das entidades setoriais");
    assert.ok(linhas.indexOf("CNIACC") > iCentros && linhas.indexOf("CNIACC") < iSetoriais);
    assert.match(SECCAO_ENTIDADES.notaLista, /não constitui indicação da entidade competente/i);
  });

  test("português europeu: e-mail com hífen, terceira pessoa, sem termos do Brasil", () => {
    assert.doesNotMatch(todos, /\bemail\b|você|\bteu\b|\btua\b|\barquivo\b|\btela\b|\bcadastro\b/i);
  });
});
