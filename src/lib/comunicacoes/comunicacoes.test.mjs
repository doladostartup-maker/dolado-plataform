// Receção de respostas por e-mail (Resend, "email.received") — `npm test`.
// Dependências falsas, com a mesma regra de idempotência e de transição da
// função SQL comunicacao_registar_recebida (testada a sério em
// supabase/tests/database/acompanhamento_pos_envio.test.sql e no teste de
// contrato inbound.contrato.test.mjs). A assinatura é verificada com a
// biblioteca oficial (svix), como na rota.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Webhook } from "svix";
import { ANEXO_MAX_BYTES, preVerificar, verificarConteudo, FORMATOS } from "./anexos.ts";
import { PADRAO_LOCAL_PART, gerarLocalPart, localPartDoCaso } from "./endereco.ts";
import { processarEventoResend, suspeitaSpam, verificarAssinatura } from "./inbound.ts";
import { cabecalhosRelevantes, corpoParaApresentacao, enderecoDeTexto, htmlParaTexto, normalizarNomeFicheiro, pareceAutomatica } from "./sanitizar.ts";

const DOMINIO = "respostas.dolado.test";
const A = "caso-abcdef-abcdefghijklmnopqrstuvwxyz";
const B = "caso-zzzzzz-zyxwvutsrqponmlkjihgfedcba";
const PDF = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n");
const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
const AGORA = new Date("2026-10-06T10:00:00Z");

/** E-mails "no Resend" (o que a API devolve) e as URLs dos anexos. */
function criar({ estadoA = "Aguardando operador", apiEmBaixo = false, anexosEmBaixo = false } = {}) {
  const estado = {
    casos: new Map([
      ["caso-a", { status: estadoA }],
      ["caso-b", { status: "Aguardando operador" }],
    ]),
    enderecos: new Map([
      [A, "caso-a"],
      [B, "caso-b"],
    ]),
    resend: new Map(), // email_id → e-mail da API
    anexosResend: new Map(), // email_id → lista com download_url
    ficheiros: { "https://cdn.test/pdf": PDF, "https://cdn.test/exe": EXE, "https://cdn.test/falso": new TextEncoder().encode("<html><script>x</script>"), "https://cdn.test/grande": new Uint8Array(ANEXO_MAX_BYTES + 1) },
    comunicacoes: [],
    anexos: [],
    quarentena: [],
    logs: [],
    avisos: [],
    analises: [],
    chamadasApi: 0,
  };
  /** @type {import("./inbound.ts").DepsInbound} */
  const deps = {
    dominio: DOMINIO,
    agora: () => AGORA,
    log: () => undefined,
    async obterEmail(id) {
      estado.chamadasApi += 1;
      if (apiEmBaixo) return { ok: false, motivo: "indisponivel" };
      const e = estado.resend.get(id);
      return e ? { ok: true, email: e } : { ok: false, motivo: "nao_encontrado" };
    },
    async listarAnexos(id) {
      if (anexosEmBaixo) throw new Error("resend_anexos_500");
      return estado.anexosResend.get(id) ?? [];
    },
    async transferirAnexo(url) {
      const f = estado.ficheiros[url];
      if (!f) throw new Error("rede");
      return f;
    },
    async casoDoEndereco(local) {
      return estado.enderecos.get(local) ?? null;
    },
    async registar(casoId, dados) {
      const caso = estado.casos.get(casoId);
      if (!caso) return { resultado: "caso_inexistente" };
      const dup = estado.comunicacoes.find(
        (c) => c.caso_id === casoId && (c.provider_message_id === dados.provider_message_id || (dados.message_id && c.message_id === dados.message_id)),
      );
      if (dup) return { resultado: "duplicada", comunicacao_id: dup.id };
      const transitou = caso.status === "Aguardando operador" && !dados.suspeita_spam;
      const c = { id: `com-${estado.comunicacoes.length + 1}`, caso_id: casoId, ...dados, estado_processamento: "recebida" };
      estado.comunicacoes.push(c);
      if (transitou) caso.status = "Resposta em análise";
      return { resultado: "registada", comunicacao_id: c.id, transitou, estado: caso.status };
    },
    async estadoProcessamento(id) {
      return estado.comunicacoes.find((c) => c.id === id)?.estado_processamento ?? null;
    },
    async marcarProcessamento(id, e, erro) {
      const c = estado.comunicacoes.find((x) => x.id === id);
      if (c.estado_processamento !== "processada") Object.assign(c, { estado_processamento: e, erro_processamento: erro ?? null });
    },
    async guardarAnexo(a) {
      if (!estado.anexos.some((x) => x.comunicacaoId === a.comunicacaoId && x.indice === a.indice)) estado.anexos.push({ ...a, estado: "guardado" });
    },
    async rejeitarAnexo(a) {
      if (!estado.anexos.some((x) => x.comunicacaoId === a.comunicacaoId && x.indice === a.indice)) estado.anexos.push({ ...a, estado: "rejeitado" });
    },
    async marcarAnexosProcessados() {},
    async quarentena(q) {
      if (!estado.quarentena.some((x) => x.providerMessageId === q.providerMessageId)) estado.quarentena.push(q);
    },
    async registarLog(r) {
      estado.logs.push(r);
    },
    async notificar(r) {
      estado.avisos.push(r);
    },
    agendarAnalise(id) {
      estado.analises.push(id);
    },
  };
  return { estado, deps };
}

/** Evento do webhook (só metadados) e o e-mail correspondente na API do Resend. */
function receber(estado, id, { para = `${A}@${DOMINIO}`, email = {}, anexos = [] } = {}) {
  estado.resend.set(id, {
    id,
    from: "Apoio Operadora <Apoio@Operadora.test>",
    to: [para],
    cc: [],
    bcc: [],
    reply_to: ["respostas@operadora.test"],
    received_for: [],
    subject: "Re: Reclamação",
    text: "Lamentamos o sucedido.",
    html: null,
    headers: { from: "Apoio Operadora <apoio@operadora.test>", "in-reply-to": "<env1@dolado.pt>", references: "<env1@dolado.pt>" },
    message_id: `<${id}@operadora.test>`,
    created_at: "2026-10-06T09:00:00Z",
    authentication: { spf: "pass", dkim: "pass", dmarc: "pass" },
    attachments: anexos.map((a, i) => ({ id: `ax-${i}`, filename: a.filename, content_type: a.content_type, size: a.size })),
    ...email,
  });
  estado.anexosResend.set(id, anexos);
  return {
    type: "email.received",
    created_at: "2026-10-06T09:00:01Z",
    data: { email_id: id, created_at: "2026-10-06T09:00:00Z", from: "apoio@operadora.test", to: [para], cc: [], bcc: [], received_for: [], subject: "Re: Reclamação", message_id: `<${id}@operadora.test>` },
  };
}

describe("assinatura do webhook (Svix)", () => {
  const segredo = "whsec_" + Buffer.from("segredo-de-teste-com-tamanho-suficiente").toString("base64");
  const corpo = JSON.stringify({ type: "email.received", data: { email_id: "email-0001" } });
  function assinar(c = corpo, quando = new Date()) {
    const id = "msg_teste";
    const signature = new Webhook(segredo).sign(id, quando, c);
    return { id, timestamp: String(Math.floor(quando.getTime() / 1000)), signature };
  }

  test("1. webhook válido: aceite", () => {
    assert.equal(verificarAssinatura(corpo, assinar(), segredo)?.data?.email_id, "email-0001");
  });
  test("2. assinatura inválida, corpo alterado, sem cabeçalhos ou sem segredo: recusado", () => {
    assert.equal(verificarAssinatura(corpo, { ...assinar(), signature: "v1,AAAA" }, segredo), null);
    assert.equal(verificarAssinatura(corpo.replace("0001", "0002"), assinar(), segredo), null);
    assert.equal(verificarAssinatura(corpo, { id: null, timestamp: null, signature: null }, segredo), null);
    assert.equal(verificarAssinatura(corpo, assinar(), undefined), null);
    assert.equal(verificarAssinatura(corpo, assinar(), "segredo-sem-prefixo"), null);
  });
  test("repetição antiga (replay) fora da janela de 5 minutos: recusada", () => {
    assert.equal(verificarAssinatura(corpo, assinar(corpo, new Date(Date.now() - 10 * 60 * 1000)), segredo), null);
  });
});

describe("webhook: identificação do caso", () => {
  test("3. e-mail para o endereço do caso: guardado, em análise, aviso e análise uma vez", async () => {
    const { estado, deps } = criar();
    const r = await processarEventoResend(receber(estado, "email-0001"), "evt_1", deps);
    assert.equal(r.status, 200);
    assert.equal(r.resultados[0].resultado, "aceite");
    const c = estado.comunicacoes[0];
    assert.equal(c.caso_id, "caso-a");
    assert.equal(c.provider, "resend");
    assert.equal(c.provider_message_id, "email-0001");
    assert.equal(c.provider_event_id, "evt_1");
    assert.equal(c.remetente_email, "apoio@operadora.test");
    assert.equal(c.remetente_nome, "Apoio Operadora");
    assert.deepEqual(c.responder_para, [{ email: "respostas@operadora.test", nome: null }]);
    assert.equal(c.in_reply_to, "<env1@dolado.pt>");
    assert.equal(c.message_id, "<email-0001@operadora.test>");
    assert.equal(c.estado_processamento, "processada");
    assert.equal(estado.casos.get("caso-a").status, "Resposta em análise");
    assert.deepEqual(estado.avisos, [{ casoId: "caso-a", comunicacaoId: "com-1", transitou: true }]);
    assert.deepEqual(estado.analises, ["com-1"]);
  });

  test("4. destinatário inexistente (token inválido): quarentena, nunca associado, sem chamar a API", async () => {
    const { estado, deps } = criar();
    const falso = `caso-abcdef-aaaaaaaaaaaaaaaaaaaaaaaaaa@${DOMINIO}`;
    const r = await processarEventoResend(receber(estado, "email-0002", { para: falso }), "evt_2", deps);
    assert.equal(r.status, 200);
    assert.equal(estado.comunicacoes.length, 0);
    assert.equal(estado.quarentena[0].motivo, "endereco_inexistente");
    assert.deepEqual(estado.quarentena[0].destinatarios, [falso]);
    assert.equal(estado.chamadasApi, 0);
  });

  test("endereço sem formato de caso (ex.: caso-1042@, contacto@): quarentena", async () => {
    const { estado, deps } = criar();
    for (const [id, para] of [
      ["email-0003", `caso-1042@${DOMINIO}`],
      ["email-0004", `contacto@${DOMINIO}`],
    ]) {
      await processarEventoResend(receber(estado, id, { para }), null, deps);
    }
    assert.deepEqual(estado.quarentena.map((q) => q.motivo), ["sem_endereco_de_caso", "sem_endereco_de_caso"]);
    assert.equal(estado.comunicacoes.length, 0);
  });

  test("o caso vem do endereço, nunca do assunto ou do corpo; endereço não confirmado na API é ignorado", async () => {
    const { estado, deps } = criar();
    const evento = receber(estado, "email-0005", { para: `${B}@${DOMINIO}`, email: { subject: "caso-a 30000000-…", text: `Responder para ${A}@${DOMINIO}` } });
    evento.data.cc = [`${A}@${DOMINIO}`]; // metadados dizem também A; o e-mail na API não
    await processarEventoResend(evento, null, deps);
    assert.deepEqual(estado.comunicacoes.map((c) => c.caso_id), ["caso-b"]);
    assert.equal(estado.casos.get("caso-a").status, "Aguardando operador");
  });

  test("10. falha ao obter a mensagem no Resend: 503 (reenvio), nada registado; 404: sem novas tentativas", async () => {
    const { estado, deps } = criar({ apiEmBaixo: true });
    const r = await processarEventoResend(receber(estado, "email-0006"), null, deps);
    assert.equal(r.status, 503);
    assert.equal(estado.comunicacoes.length, 0);
    const outro = criar();
    const ev = receber(outro.estado, "email-0007");
    outro.estado.resend.delete("email-0007");
    assert.equal((await processarEventoResend(ev, null, outro.deps)).status, 200);
    assert.equal(outro.estado.logs[0].motivo, "email_nao_encontrado");
  });

  test("evento de outro tipo: ignorado; formato inválido: 400", async () => {
    const { estado, deps } = criar();
    assert.equal((await processarEventoResend({ type: "email.sent", data: {} }, null, deps)).status, 200);
    assert.equal((await processarEventoResend({ type: "email.received", data: { email_id: "../x" } }, null, deps)).status, 400);
    assert.equal(estado.comunicacoes.length, 0);
  });

  test("e-mail muito antigo (repetição tardia): recusado", async () => {
    const { estado, deps } = criar();
    await processarEventoResend(receber(estado, "email-0008", { email: { created_at: "2026-08-01T00:00:00Z" } }), null, deps);
    assert.equal(estado.logs[0].motivo, "email_antigo");
  });
});

describe("webhook: idempotência e estados", () => {
  test("5. webhook duplicado (mesmo evento): um registo, sem segundo aviso nem segunda análise", async () => {
    const { estado, deps } = criar();
    const ev = receber(estado, "email-0010");
    await processarEventoResend(ev, "evt_10", deps);
    const r = await processarEventoResend(ev, "evt_10", deps);
    assert.equal(r.resultados[0].resultado, "duplicado");
    assert.equal(estado.comunicacoes.length, 1);
    assert.equal(estado.avisos.length, 1);
    assert.equal(estado.analises.length, 1);
    assert.equal(estado.casos.get("caso-a").status, "Resposta em análise");
  });

  test("6. e-mail duplicado (outro evento, ou mesmo Message-ID): um só registo", async () => {
    const { estado, deps } = criar();
    await processarEventoResend(receber(estado, "email-0011"), "evt_a", deps);
    await processarEventoResend(receber(estado, "email-0011"), "evt_b", deps);
    await processarEventoResend(receber(estado, "email-0012", { email: { message_id: "<email-0011@operadora.test>" } }), "evt_c", deps);
    assert.equal(estado.comunicacoes.length, 1);
  });

  test("mensagem com o caso noutro estado: guardada, sem transição", async () => {
    const { estado, deps } = criar({ estadoA: "Aguardando cliente" });
    await processarEventoResend(receber(estado, "email-0013"), null, deps);
    assert.equal(estado.casos.get("caso-a").status, "Aguardando cliente");
    assert.equal(estado.avisos[0].transitou, false);
  });

  test("spam provável (SPF, DKIM e DMARC falham): guardado, sem transição nem IA", async () => {
    const { estado, deps } = criar();
    await processarEventoResend(receber(estado, "email-0014", { email: { authentication: { spf: "fail", dkim: "fail", dmarc: "fail" } } }), null, deps);
    assert.equal(estado.comunicacoes[0].suspeita_spam, true);
    assert.equal(estado.casos.get("caso-a").status, "Aguardando operador");
    assert.deepEqual(estado.analises, []);
    assert.equal(suspeitaSpam({ spf: "pass", dkim: "fail", dmarc: "fail" }), false, "remetente diferente mas autenticado não é spam");
  });

  test("mensagem automática é assinalada (a decisão é humana)", async () => {
    const { estado, deps } = criar();
    await processarEventoResend(receber(estado, "email-0015", { email: { headers: { "auto-submitted": "auto-replied" }, subject: "Resposta automática" } }), null, deps);
    assert.equal(estado.comunicacoes[0].automatica, true);
  });

  test("11. falha da IA ou do e-mail de aviso não impede o registo nem devolve erro", async () => {
    const { estado, deps } = criar();
    deps.agendarAnalise = () => {
      throw new Error("IA em baixo");
    };
    deps.notificar = async () => {
      throw new Error("Brevo em baixo");
    };
    const r = await processarEventoResend(receber(estado, "email-0016"), null, deps);
    assert.equal(r.status, 200);
    assert.equal(estado.comunicacoes[0].estado_processamento, "processada");
  });

  test("erro de armazenamento: 503 (o Resend repete)", async () => {
    const { estado, deps } = criar();
    deps.registar = async () => {
      throw new Error("base de dados indisponível");
    };
    const r = await processarEventoResend(receber(estado, "email-0017"), null, deps);
    assert.equal(r.status, 503);
    assert.equal(estado.logs[0].motivo, "erro_armazenamento");
  });
});

describe("webhook: conteúdo e anexos", () => {
  test("7/8. corpo em texto e em HTML: texto para apresentar, HTML original guardado", async () => {
    const { estado, deps } = criar();
    await processarEventoResend(receber(estado, "email-0020", { email: { text: "Olá.\nResposta." } }), null, deps);
    assert.equal(estado.comunicacoes[0].corpo_apresentacao, "Olá.\nResposta.");
    const html = "<p>Linha 1</p><p>Linha 2</p>";
    await processarEventoResend(receber(estado, "email-0021", { para: `${B}@${DOMINIO}`, email: { text: null, html } }), null, deps);
    assert.equal(estado.comunicacoes[1].corpo_html, html);
    assert.equal(estado.comunicacoes[1].corpo_apresentacao, "Linha 1\nLinha 2");
  });

  test("9. anexos: só tipos permitidos e verificados pelo conteúdo; o resto registado sem ficheiro", async () => {
    const { estado, deps } = criar();
    const anexos = [
      { id: "1", filename: "fatura.pdf", content_type: "application/pdf", size: PDF.length, download_url: "https://cdn.test/pdf" },
      { id: "2", filename: "virus.exe", content_type: "application/x-msdownload", size: 4, download_url: "https://cdn.test/exe" },
      { id: "3", filename: "falso.pdf", content_type: "application/pdf", size: 30, download_url: "https://cdn.test/falso" },
      { id: "4", filename: "enorme.pdf", content_type: "application/pdf", size: 100, download_url: "https://cdn.test/grande" },
      { id: "5", filename: "pagina.html", content_type: "text/html", size: 10, download_url: "https://cdn.test/falso" },
      { id: "6", filename: "imagem.svg", content_type: "image/svg+xml", size: 10, download_url: "https://cdn.test/falso" },
      { id: "7", filename: "sem-url.pdf", content_type: "application/pdf", size: 10, download_url: "http://cdn.test/pdf" },
    ];
    await processarEventoResend(receber(estado, "email-0022", { anexos }), null, deps);
    assert.deepEqual(
      estado.anexos.map((a) => [a.estado, a.motivo ?? a.mime]),
      [
        ["guardado", "application/pdf"],
        ["rejeitado", "tipo_nao_permitido"],
        ["rejeitado", "conteudo_invalido"],
        ["rejeitado", "demasiado_grande"],
        ["rejeitado", "tipo_nao_permitido"],
        ["rejeitado", "tipo_nao_permitido"],
        ["rejeitado", "falha_transferencia"],
      ],
    );
    assert.match(estado.anexos[0].sha256, /^[0-9a-f]{64}$/);
  });

  test("falha a listar anexos: mensagem guardada como 'falhou', 503; o reenvio retoma sem duplicar avisos", async () => {
    const em = criar({ anexosEmBaixo: true });
    const anexos = [{ id: "1", filename: "a.pdf", content_type: "application/pdf", size: 10, download_url: "https://cdn.test/pdf" }];
    const ev = receber(em.estado, "email-0023", { anexos });
    const r = await processarEventoResend(ev, "evt_23", em.deps);
    assert.equal(r.status, 503);
    assert.equal(em.estado.comunicacoes[0].estado_processamento, "falhou");
    assert.equal(em.estado.avisos.length, 0);
    // Reenvio, com o Resend já a responder.
    em.deps.listarAnexos = async (id) => em.estado.anexosResend.get(id);
    const r2 = await processarEventoResend(ev, "evt_23", em.deps);
    assert.equal(r2.status, 200);
    assert.equal(em.estado.comunicacoes.length, 1);
    assert.equal(em.estado.comunicacoes[0].estado_processamento, "processada");
    assert.equal(em.estado.anexos[0].estado, "guardado");
    assert.equal(em.estado.avisos.length, 1);
  });

  test("15. HTML malicioso (XSS): só texto, sem marcação; original guardado", async () => {
    const { estado, deps } = criar();
    const html = `<html><head><style>body{}</style><script>alert('x')</script></head><body><p>Olá &amp; bom dia</p><img src="https://rastreio.test/p.gif" onerror="alert(1)"><iframe src="javascript:alert(1)"></iframe><a href="javascript:alert(2)">clique</a></body></html>`;
    await processarEventoResend(receber(estado, "email-0024", { email: { text: null, html, subject: "<script>alert(3)</script>" } }), null, deps);
    const c = estado.comunicacoes[0];
    assert.equal(c.corpo_html, html);
    assert.doesNotMatch(c.corpo_apresentacao, /<|>|script|alert|iframe|rastreio/);
    assert.match(c.corpo_apresentacao, /Olá & bom dia/);
  });

  test("endereços em texto ('Nome <email>') como o Resend os devolve", () => {
    assert.deepEqual(enderecoDeTexto('"Apoio, Lda" <Apoio@X.test>'), { email: "apoio@x.test", nome: "Apoio, Lda" });
    assert.deepEqual(enderecoDeTexto("a@b.test"), { email: "a@b.test", nome: null });
    assert.equal(enderecoDeTexto("sem arroba"), null);
  });
});

describe("endereço do caso", () => {
  test("gerado: formato fixo, aleatório, sem UUID nem dados pessoais", () => {
    const vistos = new Set();
    for (let i = 0; i < 200; i++) {
      const l = gerarLocalPart();
      assert.match(l, PADRAO_LOCAL_PART);
      vistos.add(l);
    }
    assert.equal(vistos.size, 200);
  });
  test("reconhece o endereço com nome, maiúsculas; recusa subendereços e formatos simples", () => {
    assert.equal(localPartDoCaso(`Apoio <${A.toUpperCase()}@${DOMINIO.toUpperCase()}>`, DOMINIO), A);
    assert.equal(localPartDoCaso(`caso-1042@${DOMINIO}`, DOMINIO), null);
    assert.equal(localPartDoCaso(`${A}+x@${DOMINIO}`, DOMINIO), null);
    assert.equal(localPartDoCaso(`${A}@${DOMINIO}.evil.test`, DOMINIO), null);
  });
});

describe("saneamento", () => {
  test("nomes de ficheiro: sem caminhos, controlo, bidi nem extensões duplas", () => {
    assert.equal(normalizarNomeFicheiro("../../etc/passwd.pdf", "pdf"), "passwd.pdf");
    assert.equal(normalizarNomeFicheiro("fatura‮fdp.exe", "pdf"), "faturafdp.pdf");
    assert.equal(normalizarNomeFicheiro("contrato.pdf.exe", "pdf"), "contrato_pdf.pdf");
    assert.equal(normalizarNomeFicheiro("", "jpg"), "anexo.jpg");
  });
  test("cabeçalhos: só os relevantes; resposta automática", () => {
    const c = cabecalhosRelevantes({ "Message-ID": "<a@b>", "X-Spam": "1", "Auto-Submitted": "auto-replied", Received: ["x", "y"] });
    assert.deepEqual(Object.keys(c).sort(), ["auto-submitted", "message-id"]);
    assert.equal(pareceAutomatica(c, null), true);
    assert.equal(pareceAutomatica({ "auto-submitted": "no" }, "Re: reclamação"), false);
    assert.equal(pareceAutomatica({}, "Out of office"), true);
  });
  test("HTML → texto: entidades, blocos, sem marcação", () => {
    // Entidades escritas como texto continuam texto (apresentado escapado pelo React).
    assert.equal(htmlParaTexto("<p>Linha 1</p><p>Linha&nbsp;2 &lt;b&gt;</p>"), "Linha 1\nLinha 2 <b>");
    assert.equal(corpoParaApresentacao({ texto: "a\u0000b" }).texto, "ab");
  });
  test("anexos: tipo declarado e assinatura do formato", () => {
    assert.equal(preVerificar("application/pdf; name=x", 10).ok, true);
    assert.equal(preVerificar("image/svg+xml", 10).ok, false);
    const pdf = FORMATOS.find((f) => f.mime === "application/pdf");
    assert.equal(verificarConteudo(pdf, PDF).ok, true);
    assert.equal(verificarConteudo(pdf, EXE).ok, false);
    const txt = FORMATOS.find((f) => f.mime === "text/plain");
    assert.equal(verificarConteudo(txt, new TextEncoder().encode("<html><script>")).ok, false);
  });
});
