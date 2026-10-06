// Preenchimento dos dados de identificação do texto da reclamação a partir
// de uma fatura ou contrato (sem IA). `npm test`.
//
// Cobre: leitura real de um PDF com texto e OCR real de uma imagem e de um
// PDF digitalizado (fixtures fictícias), as regras de extração e de dúvida,
// a substituição dos marcadores, e as garantias de privacidade (o módulo não
// grava, não regista e não chama a Claude; o texto já preenchido volta
// mascarado quando segue para a IA na análise da resposta e na nova
// comunicação).
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, test } from "node:test";
import {
  extrairCampos,
  inserirValores,
  marcadoresPorPreencher,
  marcadoresPresentes,
  nifValido,
  preSelecionado,
} from "./campos.ts";
import { lerTextoDocumento, linhasDeFragmentos } from "./textoDocumento.ts";
import { LINHAS_FATURA, pdfComTexto } from "./fixtures/pdfTexto.mjs";
import { construirSeguimento } from "../rascunhoIA/contexto.ts";
import { MARCADORES } from "../rascunhoIA/prompt.ts";
import { construirContexto as contextoAnalise } from "../analiseResposta/contexto.ts";

const fixture = (nome) => new Uint8Array(readFileSync(new URL(`./fixtures/${nome}`, import.meta.url)));
const campo = (campos, nome) => campos.find((c) => c.campo === nome);

function esperarFaturaFicticia(campos) {
  assert.equal(campo(campos, "nome").valor, "Maria José da Silva");
  assert.equal(campo(campos, "nome").confianca, "confirmado");
  assert.equal(campo(campos, "nif").valor, "123456789");
  assert.equal(campo(campos, "morada").valor, "Rua das Flores 12 2 Esq, 4000-123 Porto");
  assert.equal(campo(campos, "numero").valor, "1234567");
  // O NIPC da empresa e a morada da sede nunca são propostos.
  assert.ok(!JSON.stringify(campos).includes("503504564"));
  assert.ok(!JSON.stringify(campos).includes("Liberdade"));
  assert.ok(campos.every(preSelecionado));
}

describe("leitura do documento", () => {
  test("PDF com camada de texto: lê o texto do PDF, sem OCR", async () => {
    const r = await lerTextoDocumento(pdfComTexto(LINHAS_FATURA), "application/pdf");
    assert.equal(r.metodo, "texto");
    // Colunas afastadas ficam separadas por tabulação (um valor não passa para a coluna do lado).
    assert.match(r.paginas[0], /N\.º Cliente: 1234567\tN\.º Contrato: C-778899/);
    esperarFaturaFicticia(extrairCampos(r.paginas, { nomeCaso: "Maria Silva" }));
  });

  test("imagem: OCR local", { timeout: 60_000 }, async () => {
    const r = await lerTextoDocumento(fixture("fatura-ficticia.jpg"), "image/jpeg");
    assert.equal(r.metodo, "ocr");
    esperarFaturaFicticia(extrairCampos(r.paginas, { nomeCaso: "Maria Silva" }));
  });

  test("PDF digitalizado (sem texto): OCR da imagem da página", { timeout: 60_000 }, async () => {
    const r = await lerTextoDocumento(fixture("fatura-ficticia-digitalizada.pdf"), "application/pdf");
    assert.equal(r.metodo, "ocr");
    esperarFaturaFicticia(extrairCampos(r.paginas, { nomeCaso: "Maria Silva" }));
  });

  test("formato não suportado e ficheiro inválido", async () => {
    await assert.rejects(lerTextoDocumento(new Uint8Array([1, 2, 3]), "image/heic"), { motivo: "formato" });
    await assert.rejects(lerTextoDocumento(new Uint8Array([1, 2, 3]), "application/pdf"), { motivo: "ilegivel" });
  });

  test("linhas reconstruídas pela posição dos fragmentos", () => {
    const t = linhasDeFragmentos([
      { str: "123456789", x: 80, y: 700, width: 50, fontSize: 10 },
      { str: "NIF:", x: 40, y: 700.5, width: 20, fontSize: 10 },
      { str: "Total", x: 400, y: 700, width: 25, fontSize: 10 },
      { str: "Linha de cima", x: 40, y: 720, width: 60, fontSize: 10 },
    ]);
    assert.equal(t, "Linha de cima\nNIF: 123456789\tTotal");
  });
});

describe("regras de extração", () => {
  test("NIF: dígito de controlo e só pessoa singular", () => {
    assert.ok(nifValido("123456789"));
    assert.ok(!nifValido("123456788"));
    const empresa = extrairCampos(["NIF: 503504564"]);
    assert.equal(campo(empresa, "nif").confianca, null);
    const invalido = extrairCampos(["NIF: 123456788"]);
    assert.equal(campo(invalido, "nif").valor, null);
    assert.match(campo(invalido, "nif").avisos[0], /não é um NIF válido/);
  });

  test("rótulos comuns do NIF", () => {
    for (const rotulo of ["NIF", "N.º Contribuinte", "Número de contribuinte", "Contribuinte n.º", "NIF do cliente"]) {
      assert.equal(campo(extrairCampos([`${rotulo}: 123 456 789`]), "nif").valor, "123456789", rotulo);
    }
  });

  test("dois NIF de pessoa singular: dúvida, nada proposto", () => {
    const c = campo(extrairCampos(["NIF: 123456789\nNIF do titular: 234567899"]), "nif");
    assert.equal(c.valor, null);
    assert.equal(c.confianca, "duvida");
    assert.deepEqual(c.candidatos, ["123456789", "234567899"]);
    assert.ok(!preSelecionado(c));
  });

  test("NIF que não confere com o serviço acompanhado: dúvida", () => {
    const diferente = campo(extrairCampos(["NIF: 123456789"], { verificarNif: () => "diferente" }), "nif");
    assert.equal(diferente.valor, null);
    assert.equal(diferente.confianca, "duvida");
    const igual = campo(extrairCampos(["NIF: 123456789"], { verificarNif: () => "igual" }), "nif");
    assert.equal(igual.confianca, "confirmado");
  });

  test("nome: rótulo; nome diferente do caso fica em dúvida", () => {
    assert.equal(campo(extrairCampos(["Titular: ANA RITA COSTA"]), "nome").valor, "Ana Rita Costa");
    const outro = campo(extrairCampos(["Titular: ANA RITA COSTA"], { nomeCaso: "João Pereira" }), "nome");
    assert.equal(outro.valor, null);
    assert.equal(outro.confianca, "duvida");
    assert.deepEqual(outro.candidatos, ["Ana Rita Costa"]);
    // "Tipo de cliente: Particular" e nomes de empresas não são nomes.
    assert.equal(campo(extrairCampos(["Tipo de cliente: Particular Residencial\nCliente: Operadora Exemplo S.A."]), "nome").confianca, null);
  });

  test("morada com rótulo, em várias linhas", () => {
    const c = campo(extrairCampos(["Morada:\nAvenida da República 25, 3.º Dto\n1050-185 LISBOA"]), "morada");
    assert.equal(c.valor, "Avenida da República 25, 3.º Dto, 1050-185 Lisboa");
    assert.equal(c.confianca, "provavel");
  });

  test("só morada de instalação: dúvida", () => {
    const c = campo(extrairCampos(["Morada de instalação: Rua Nova 3, 2000-001 Santarém"]), "morada");
    assert.equal(c.valor, null);
    assert.equal(c.confianca, "duvida");
    assert.match(c.avisos[0], /instalação/);
  });

  test("duas moradas diferentes: dúvida", () => {
    const c = campo(extrairCampos(["Morada: Rua A 1, 1000-001 Lisboa", "Morada: Rua B 2, 4000-002 Porto"]), "morada");
    assert.equal(c.confianca, "duvida");
    assert.equal(c.candidatos.length, 2);
  });

  test("n.º de cliente ou contrato: preferência, dúvida e datas", () => {
    assert.equal(campo(extrairCampos(["Contrato n.º 55-12345"]), "numero").valor, "55-12345");
    const dois = campo(extrairCampos(["N.º Cliente: 1111111", "N.º Cliente: 2222222"]), "numero");
    assert.equal(dois.valor, null);
    assert.equal(dois.confianca, "duvida");
    assert.equal(campo(extrairCampos(["Cliente: 01/09/2026"]), "numero").confianca, null);
    const confere = campo(extrairCampos(["N.º Cliente: 1234567"], { verificarNumero: () => "igual" }), "numero");
    assert.equal(confere.confianca, "confirmado");
  });

  test("documento sem dados: nada encontrado", () => {
    const campos = extrairCampos(["Mensalidade 45,99 EUR"]);
    assert.ok(campos.every((c) => c.confianca === null && c.valor === null));
  });
});

describe("texto da reclamação", () => {
  const RASCUNHO =
    "Eu, [NOME DO CLIENTE], titular do NIF [NIF], residente em [MORADA], cliente n.º [N.º DE CLIENTE OU CONTRATO], venho apresentar reclamação. Em [DATA]…\n[NOME DO CLIENTE]";

  test("os marcadores da IA são os mesmos que a plataforma preenche", () => {
    for (const m of ["[NOME DO CLIENTE]", "[NIF]", "[MORADA]", "[N.º DE CLIENTE OU CONTRATO]"]) assert.ok(MARCADORES.includes(m), m);
    assert.deepEqual(marcadoresPresentes(RASCUNHO), ["nome", "nif", "morada", "numero"]);
  });

  test("insere só os valores escolhidos; os outros marcadores ficam", () => {
    const { texto, insercoes } = inserirValores(RASCUNHO, { nome: "Maria José da Silva", nif: "123456789", morada: "" });
    assert.ok(texto.startsWith("Eu, Maria José da Silva, titular do NIF 123456789, residente em [MORADA]"));
    assert.ok(texto.endsWith("\nMaria José da Silva"));
    assert.deepEqual(
      insercoes.map((i) => [i.campo, i.ocorrencias]),
      [
        ["nome", 2],
        ["nif", 1],
      ],
    );
    assert.deepEqual(marcadoresPorPreencher(texto), ["[MORADA]", "[N.º DE CLIENTE OU CONTRATO]", "[DATA]"]);
  });

  test("variantes escritas à mão", () => {
    assert.equal(inserirValores("Cliente [n.º de cliente]", { numero: "1234567" }).texto, "Cliente 1234567");
  });
});

describe("privacidade", () => {
  const dir = new URL("./", import.meta.url);
  const fontes = [
    ...readdirSync(dir).filter((f) => f.endsWith(".ts")).map((f) => [f, readFileSync(new URL(f, dir), "utf8")]),
    ["preenchimento-actions.ts", readFileSync(new URL("../../app/backoffice/casos/preenchimento-actions.ts", import.meta.url), "utf8")],
    ["PreencherMarcadores.tsx", readFileSync(new URL("../../app/backoffice/casos/_components/PreencherMarcadores.tsx", import.meta.url), "utf8")],
  ];

  test("sem escrita na base de dados, sem registos com conteúdo, sem IA, sem medição", () => {
    for (const [nome, codigo] of fontes) {
      const semComentarios = codigo.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const proibido of [".insert(", ".update(", ".upsert(", ".rpc(", ".delete(", ".upload(", "console.log", "console.info", "gtag", "dataLayer", "localStorage", "sessionStorage", "writeFile", "anthropic", "claudeJson", "chamarClaude"]) {
        assert.ok(!semComentarios.includes(proibido), `${nome} não pode usar ${proibido}`);
      }
    }
  });

  test("o único registo de erro não inclui o conteúdo nem os valores", () => {
    const servidor = fontes.find(([n]) => n === "servidor.ts")[1];
    const erros = servidor.match(/console\.error\([^;]*\);/g) ?? [];
    assert.equal(erros.length, 1);
    assert.match(erros[0], /erro\.name/);
  });

  const TEXTO_ENVIADO =
    "Exmos. Senhores,\n\nEu, Maria José da Silva, titular do NIF 123456789, residente em Rua das Flores 12 2 Esq, 4000-123 Porto, cliente n.º 1234567, venho apresentar reclamação sobre a fatura de setembro.\n\nCom os melhores cumprimentos,\nMaria José da Silva";
  const DADOS = ["Maria", "Silva", "123456789", "Flores", "4000-123", "1234567"];

  test("texto já preenchido: mascarado quando segue para a IA (nova comunicação)", () => {
    const seg = JSON.stringify(
      construirSeguimento({ enviadas: [{ conteudo: TEXTO_ENVIADO, enviado_em: "2026-09-10T10:00:00Z" }], ultimaResposta: null, analise: null }, null),
    );
    for (const d of DADOS) assert.ok(!seg.includes(d), `${d} não pode seguir para a IA`);
    assert.match(seg, /Eu, \[CLIENTE\], titular do NIF \[NIF\]/);
    assert.match(seg, /cumprimentos,\\n\[CLIENTE\]/);
  });

  test("texto já preenchido: mascarado quando segue para a IA (análise da resposta)", () => {
    const ctx = JSON.stringify(
      contextoAnalise({
        caso: { nome: null, sector: "Telecomunicações", empresa: "Operadora Exemplo", problema_tipo: null, tipo_problema: null, descricao: null, created_at: "2026-09-01T00:00:00Z" },
        comunicacao: { id: "c1", canal: "email", remetente_email: "apoio@exemplo.pt", assunto: "Resposta", corpo_apresentacao: "Lamentamos.", corpo_texto: null, data_mensagem: null, recebida_em: "2026-09-12T00:00:00Z", automatica: false, anexos: [] },
        enviadas: [{ conteudo: TEXTO_ENVIADO, enviado_em: "2026-09-10T10:00:00Z", canal: "email", referencia: null }],
        anteriores: [],
      }),
    );
    for (const d of DADOS) assert.ok(!ctx.includes(d), `${d} não pode seguir para a IA`);
  });
});
