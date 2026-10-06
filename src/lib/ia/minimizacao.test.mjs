// DoLado — testes da camada comum de minimização dos dados enviados à
// Claude API (src/lib/ia/minimizacao.ts) e dos payloads reais de cada fluxo.

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, test } from "node:test";
import { ErroPayloadIA, documentoParaIA, mascararTextoLivre, prepararParaIA, selarMensagemIA } from "./minimizacao.ts";
import { construirContexto as contextoRascunho, construirSeguimento } from "../rascunhoIA/contexto.ts";
import { montarMensagem as mensagemRascunho } from "../rascunhoIA/prompt.ts";
import { construirContexto as contextoAnalise } from "../analiseResposta/contexto.ts";
import { montarMensagem as mensagemAnalise } from "../analiseResposta/prompt.ts";

// Dados reais de um cliente fictício: nada disto pode chegar à IA.
const CLIENTE = {
  nome: "Maria Antunes Costa",
  email: "maria.costa@exemplo.pt",
  telefone: "912 345 678",
  nif: "123456789",
  nifPontos: "123.456.789",
  morada: "Rua das Flores, n.º 25, 3.º Esq.",
  codigoPostal: "1000-100",
  iban: "PT50 0002 0123 1234 5678 9015 4",
  userId: "3f2a9c1e-1234-4abc-9def-0123456789ab",
  stripeCustomer: "cus_QxYz12345678AbCd",
  stripeSubscription: "sub_1ULUUeBtJL9VeDPfAbCdEf",
  numeroCliente: "7654321",
};
const PROIBIDOS = [
  "Maria", "Antunes", "Costa", CLIENTE.email, CLIENTE.telefone, "912345678", CLIENTE.nif, CLIENTE.nifPontos,
  "Rua das Flores", CLIENTE.codigoPostal, "PT50", "0002 0123", CLIENTE.userId, CLIENTE.stripeCustomer, CLIENTE.stripeSubscription,
  CLIENTE.numeroCliente,
];

function semProibidos(texto, extra = []) {
  for (const p of [...PROIBIDOS, ...extra]) assert.ok(!texto.includes(p), `não deve conter "${p}"`);
}

describe("texto livre", () => {
  test("exemplo do cliente que se identifica: nome, NIF e morada não passam", () => {
    const t = mascararTextoLivre("Chamo-me João Silva, o meu NIF é 123456789 e moro na Rua Exemplo, n.º 12, 3.º Esq., 1000-100 Lisboa.");
    for (const p of ["João", "Silva", "123456789", "Rua Exemplo", "1000-100"]) assert.ok(!t.includes(p), `não deve conter ${p}`);
    assert.match(t, /\[CLIENTE\]/);
    assert.match(t, /\[NIF\]/);
    assert.match(t, /\[MORADA\]/);
  });

  test("campos rotulados (bloco de identificação de uma reclamação já enviada)", () => {
    const t = mascararTextoLivre(
      `Nome: ${CLIENTE.nome}\nNIF: ${CLIENTE.nifPontos}\nMorada: ${CLIENTE.morada}, ${CLIENTE.codigoPostal} Lisboa\nN.º de cliente: ${CLIENTE.numeroCliente}\nContrato n.º C-2024-88123\nE-mail: ${CLIENTE.email}\nTelefone: ${CLIENTE.telefone}`,
    );
    semProibidos(t, ["C-2024-88123", "88123"]);
    assert.match(t, /Nome: \[CLIENTE\]/);
    assert.match(t, /NIF: \[NIF\]/);
    assert.match(t, /N\.º de cliente: \[NUMERO_CLIENTE\]/);
  });

  test("nome conhecido do caso, fórmulas de cortesia e n.º de conta na resposta da empresa", () => {
    const t = mascararTextoLivre("Exma. Senhora Maria Costa, relativamente à conta 98765432, a Sr.ª Costa tem razão.", { nomes: [CLIENTE.nome] });
    semProibidos(t, ["98765432"]);
    assert.match(t, /Exma\. Senhora \[CLIENTE\]/);
  });

  test("pagamentos, documentos de identificação, data de nascimento, IP e IDs técnicos", () => {
    const t = mascararTextoLivre(
      `IBAN ${CLIENTE.iban}; referência MB 123 456 789, entidade 21312; cartão 4111 1111 1111 1111; CC n.º 12345678; nasci a 12/03/1980; IP 192.168.1.20; ${CLIENTE.userId} ${CLIENTE.stripeCustomer} ${CLIENTE.stripeSubscription}`,
    );
    semProibidos(t, ["21312", "4111", "12345678", "12/03/1980", "192.168.1.20"]);
  });

  test("factos preservados: datas, montantes, prazos, empresas e legislação", () => {
    const original =
      "A MEO cobrou 39,99 € em 05/09/2026 e o tarifário subiu para 44,99 € a 2026-10-01. Fidelização de 24 meses desde 01/01/2025, contrato de 2024-01-01. Decreto-Lei n.º 24/2014, artigo 10.º; Lei n.º 16/2022. Caro Cliente, a Vodafone e a NOS. Exmos. Senhores";
    assert.equal(mascararTextoLivre(original), original);
  });

  test("URL de fontes jurídicas não são alterados", () => {
    const url = "https://diariodarepublica.pt/dr/detalhe/lei/16-2022-187519012";
    assert.equal(mascararTextoLivre(`Fonte: ${url}`), `Fonte: ${url}`);
  });

  test("idempotente", () => {
    const uma = mascararTextoLivre(`Sou a ${CLIENTE.nome}, NIF ${CLIENTE.nif}, ${CLIENTE.morada}`, { nomes: [CLIENTE.nome] });
    assert.equal(mascararTextoLivre(uma, { nomes: [CLIENTE.nome] }), uma);
  });
});

describe("prepararParaIA: objetos", () => {
  for (const chave of ["nome", "email", "telefone", "nif", "morada", "iban", "user_id", "utilizador_id", "caso_id", "id", "stripe_customer_id", "stripe_subscription_id", "customer", "subscription", "ip"]) {
    test(`recusa a chave "${chave}"`, () => {
      assert.throws(() => prepararParaIA({ pedido: { setor: "Telecomunicações", [chave]: "x" } }), ErroPayloadIA);
    });
  }

  test("recusa objetos completos de utilizador (Supabase) e do Stripe", () => {
    assert.throws(() => prepararParaIA({ conta: { aud: "authenticated", app_metadata: {}, role: "authenticated" } }), ErroPayloadIA);
    assert.throws(() => prepararParaIA({ pagamento: { object: "customer", livemode: true } }), ErroPayloadIA);
    assert.throws(() => prepararParaIA({ pagamento: { object: "subscription" } }), ErroPayloadIA);
  });

  test("recusa números inteiros com forma de identificador", () => {
    assert.throws(() => prepararParaIA({ valor: 123456789 }), ErroPayloadIA);
  });

  test("aceita rule_id e mantém números, datas e booleanos", () => {
    const p = prepararParaIA({ rule_id: "TEL-01", valor_eur: 44.99, duracao_meses: 24, data: "2026-10-01", recorrente: true, nada: null });
    assert.deepEqual(p, { rule_id: "TEL-01", valor_eur: 44.99, duracao_meses: 24, data: "2026-10-01", recorrente: true, nada: null });
  });

  test("mascara texto livre em qualquer nível", () => {
    const p = prepararParaIA({ a: [{ b: `contacto ${CLIENTE.email}` }] });
    assert.equal(p.a[0].b, "contacto [EMAIL]");
  });
});

describe("selarMensagemIA e documentos", () => {
  test("a mensagem final não deixa passar identificadores técnicos nem contactos", () => {
    const m = selarMensagemIA(`x ${CLIENTE.userId} ${CLIENTE.stripeCustomer} ${CLIENTE.stripeSubscription} ${CLIENTE.email} ${CLIENTE.iban} 123456789`);
    semProibidos(m);
  });

  test("documentos: só URL assinadas do bucket do Monitor", () => {
    const ok = "https://eqsmzczjyrcrsbfqioxt.supabase.co/storage/v1/object/sign/documentos-monitor/u/abc.pdf?token=eyJh.eyJ1.sig-_";
    assert.equal(documentoParaIA(ok), ok);
    for (const mau of [
      "https://eqsmzczjyrcrsbfqioxt.supabase.co/storage/v1/object/sign/comunicacoes-casos/a.pdf?token=x",
      "https://eqsmzczjyrcrsbfqioxt.supabase.co/storage/v1/object/sign/anexos-casos/a.pdf?token=x",
      "https://exemplo.pt/fatura.pdf",
    ]) {
      assert.throws(() => documentoParaIA(mau), ErroPayloadIA);
    }
  });
});

// ---------------------------------------------------------------------------
// Payloads reais de cada fluxo

const DESCRICAO_COM_IDENTIDADE = `Chamo-me ${CLIENTE.nome}, o meu NIF é ${CLIENTE.nif} e moro na ${CLIENTE.morada}, ${CLIENTE.codigoPostal} Lisboa. Telemóvel ${CLIENTE.telefone}, e-mail ${CLIENTE.email}, IBAN ${CLIENTE.iban}. O n.º de cliente é ${CLIENTE.numeroCliente}. A mensalidade subiu de 39,99 € para 44,99 € em 05/09/2026.`;

const TEXTO_ENVIADO = `Nome: ${CLIENTE.nome}\nNIF: ${CLIENTE.nifPontos}\nMorada: ${CLIENTE.morada}, ${CLIENTE.codigoPostal} Lisboa\nN.º de cliente: ${CLIENTE.numeroCliente}\n\nAssunto: Aumento da mensalidade\nA mensalidade subiu de 39,99 € para 44,99 €. Peço a reposição do valor.`;

const RESPOSTA_EMPRESA = `Exma. Senhora ${CLIENTE.nome},\nRelativamente à conta ${CLIENTE.numeroCliente}, informamos que o aumento de 44,99 € resulta da atualização anual. Contacte-nos para ${CLIENTE.telefone}.`;

function casoRascunho() {
  return {
    id: CLIENTE.userId,
    utilizador_id: CLIENTE.userId,
    nome: CLIENTE.nome,
    sector: "Telecomunicações",
    empresa: "MEO",
    problema_tipo: "Faturação",
    tipo_problema: "Aumento de preço",
    descricao: DESCRICAO_COM_IDENTIDADE,
    momento_cliente: "Já reclamei",
    data_fim_fidelidade: "2027-01-10",
    created_at: "2026-10-01T10:00:00Z",
  };
}

describe("payload do rascunho da reclamação", () => {
  test("primeira reclamação: factos ficam, identidade e IDs não", () => {
    const m = mensagemRascunho(contextoRascunho(casoRascunho(), []), []);
    semProibidos(m);
    assert.match(m, /39,99 €/);
    assert.match(m, /44,99 €/);
    assert.match(m, /05\/09\/2026/);
    assert.match(m, /MEO/);
  });

  test("nova comunicação: texto enviado (já com a identidade preenchida) e resposta da empresa minimizados", () => {
    const caso = casoRascunho();
    const base = contextoRascunho(caso, []);
    const seguimento = construirSeguimento(
      {
        enviadas: [{ conteudo: TEXTO_ENVIADO, enviado_em: "2026-10-02T09:00:00Z" }],
        ultimaResposta: { texto: RESPOSTA_EMPRESA, data: "2026-10-05T09:00:00Z" },
        analise: `A empresa não respondeu ao pedido da Sr.ª ${CLIENTE.nome.split(" ")[2]}.`,
      },
      caso.nome,
    );
    const m = mensagemRascunho({ ...base, seguimento }, [], "nova_comunicacao");
    semProibidos(m);
    assert.match(m, /atualização anual/);
  });
});

describe("payload da análise da resposta da empresa", () => {
  test("texto enviado, resposta e remetente minimizados", () => {
    const m = mensagemAnalise(
      contextoAnalise({
        caso: { nome: CLIENTE.nome, sector: "Telecomunicações", empresa: "MEO", problema_tipo: "Faturação", tipo_problema: null, descricao: DESCRICAO_COM_IDENTIDADE, created_at: "2026-10-01T10:00:00Z" },
        comunicacao: {
          id: CLIENTE.userId,
          canal: "email",
          remetente_email: "apoio@meo.pt",
          assunto: `Reclamação de ${CLIENTE.nome} — NIF ${CLIENTE.nif}`,
          corpo_apresentacao: RESPOSTA_EMPRESA,
          corpo_texto: null,
          data_mensagem: "2026-10-05T09:00:00Z",
          recebida_em: "2026-10-05T09:00:00Z",
          automatica: false,
          anexos: [{ tipo_mime: "application/pdf", estado: "guardado" }],
        },
        enviadas: [{ conteudo: TEXTO_ENVIADO, enviado_em: "2026-10-02T09:00:00Z", canal: "email", referencia: "REC-2026-1" }],
        anteriores: [],
      }),
    );
    semProibidos(m, ["apoio@meo.pt", "REC-2026-1"]);
    assert.match(m, /"dominio_do_remetente": "meo\.pt"/);
    assert.match(m, /atualização anual/);
  });
});

// ---------------------------------------------------------------------------
// Arquitetura: nenhuma chamada à Anthropic fora da camada comum

function ficheiros(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? ficheiros(p) : /\.(ts|tsx|js|mjs)$/.test(n) && !/\.test\.mjs$/.test(n) ? [p] : [];
  });
}

describe("arquitetura", () => {
  test("só claudeJson.ts e claudeDocumentos.ts usam o SDK ou a API da Anthropic", () => {
    const raiz = new URL("../../..", import.meta.url).pathname;
    const usam = [...ficheiros(join(raiz, "src")), ...ficheiros(join(raiz, "supabase/functions"))]
      .filter((f) => /@anthropic-ai\/sdk|api\.anthropic\.com/.test(readFileSync(f, "utf8")))
      .map((f) => relative(raiz, f))
      .sort();
    assert.deepEqual(usam, ["src/lib/claudeJson.ts", "src/lib/monitor/claudeDocumentos.ts"]);
  });
});
