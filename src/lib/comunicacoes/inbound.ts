// Receção de respostas por e-mail (Resend, evento "email.received") — fluxo,
// sem I/O próprio: tudo o que lê/escreve vem de `deps` (implementação real
// em src/lib/comunicacoes/servidor.ts; falsa nos testes). `npm test`.
//
//   empresa responde → caso-…@respostas.dolado.pt (MX → Resend) → Resend
//   envia "email.received" (só metadados, assinado com Svix) → aqui:
//     0. a assinatura já foi verificada (verificarAssinatura, na rota);
//     1. o webhook não traz o corpo: o e-mail é obtido na API do Resend com a
//        chave da DoLado (GET /emails/receiving/{id}) — essa resposta é a
//        fonte, e os anexos vêm de GET /emails/receiving/{id}/attachments;
//     2. o caso vem SEMPRE de um endereço de caso válido (código + token de
//        130 bits, guardado na base de dados), nunca de IDs, assuntos ou
//        referências escritos no e-mail. Sem caso → quarentena (nunca
//        descartado nem associado a outro caso);
//     3. a mensagem é guardada (idempotente: o mesmo e-mail ou Message-ID dá
//        um só registo) e, se o caso estava "A aguardar resposta da empresa",
//        passa a "Resposta em análise" (nunca "respondido" nem "resolvido");
//     4. processamento separado do registo (recebida → processada | falhou):
//        anexos (só tipos permitidos e verificados, até 15 MB), avisos e
//        análise pela IA em segundo plano. Uma falha posterior não perde a
//        mensagem: fica "falhou" e o próximo envio do webhook retoma;
//        avisos e análise só uma vez.
// Cada evento fica em comunicacoes_inbound_registos (sem dados pessoais).

import { createHash } from "node:crypto";
import { Webhook } from "svix";
import { ANEXOS_MAX_POR_MENSAGEM, preVerificar, verificarConteudo } from "./anexos.ts";
import { enderecoCompleto, localPartDoCaso } from "./endereco.ts";
import {
  LIMITES,
  cabecalhosRelevantes,
  corpoParaApresentacao,
  enderecoDeTexto,
  idsDeMensagem,
  limparTexto,
  listaEnderecos,
  normalizarNomeFicheiro,
  pareceAutomatica,
} from "./sanitizar.ts";

/** Repetições muito tardias são recusadas (a assinatura Svix já limita a 5 min; isto cobre o e-mail em si). */
export const MAX_IDADE_EMAIL_DIAS = 30;
const ID_RESEND = /^[A-Za-z0-9-]{8,100}$/;

/** Evento do webhook (só metadados). */
export type EventoResend = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    from?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    received_for?: string[];
    message_id?: string;
    subject?: string;
  };
};

/** E-mail recebido, como a API do Resend o devolve (GET /emails/receiving/{id}). */
export type EmailResend = {
  id: string;
  from?: string | null;
  to?: string[] | null;
  cc?: string[] | null;
  bcc?: string[] | null;
  reply_to?: string[] | null;
  received_for?: string[] | null;
  subject?: string | null;
  html?: string | null;
  text?: string | null;
  headers?: Record<string, string | string[]> | null;
  message_id?: string | null;
  created_at?: string | null;
  authentication?: { spf?: string; dkim?: string; dmarc?: string } | null;
  attachments?: { id?: string }[] | null;
};

/** Anexo com URL de descarga (GET /emails/receiving/{id}/attachments). */
export type AnexoResend = {
  id?: string;
  filename?: string | null;
  content_type?: string | null;
  size?: number | null;
  download_url?: string | null;
};

export type ResultadoRegisto = {
  resultado: "registada" | "duplicada" | "caso_inexistente" | "invalido";
  comunicacao_id?: string;
  transitou?: boolean;
  estado?: string;
};

export type MotivoQuarentena = "sem_endereco_de_caso" | "endereco_inexistente" | "caso_inexistente";
export type ResultadoEvento = "aceite" | "duplicado" | "rejeitado" | "quarentena" | "erro";

export type RegistoLog = {
  providerEventId: string | null;
  providerMessageId: string | null;
  resultado: ResultadoEvento;
  motivo: string | null;
  casoId?: string | null;
  comunicacaoId?: string | null;
};

export type DepsInbound = {
  obterEmail(id: string): Promise<{ ok: true; email: EmailResend } | { ok: false; motivo: "nao_encontrado" | "indisponivel" }>;
  /** Lança se não for possível listar (o processamento fica "falhou" e é retomado). */
  listarAnexos(id: string): Promise<AnexoResend[]>;
  transferirAnexo(url: string): Promise<Uint8Array>;
  casoDoEndereco(localPart: string): Promise<string | null>;
  registar(casoId: string, dados: Record<string, unknown>): Promise<ResultadoRegisto>;
  estadoProcessamento(comunicacaoId: string): Promise<"recebida" | "processada" | "falhou" | null>;
  marcarProcessamento(comunicacaoId: string, estado: "processada" | "falhou", erro?: string): Promise<void>;
  guardarAnexo(a: { comunicacaoId: string; indice: number; nome: string; mime: string; bytes: Uint8Array; sha256: string }): Promise<void>;
  rejeitarAnexo(a: { comunicacaoId: string; indice: number; nome: string; mime: string | null; tamanho: number | null; motivo: string }): Promise<void>;
  marcarAnexosProcessados(comunicacaoId: string): Promise<void>;
  quarentena(q: { providerMessageId: string; destinatarios: string[]; remetente: string | null; assunto: string | null; recebidaEm: string | null; motivo: MotivoQuarentena }): Promise<void>;
  registarLog(r: RegistoLog): Promise<void>;
  notificar(r: { casoId: string; comunicacaoId: string; transitou: boolean }): Promise<void>;
  agendarAnalise(comunicacaoId: string): void;
  log(evento: Record<string, unknown>): void;
  agora(): Date;
  dominio: string;
};

export type ResultadoWebhook = {
  /** 200: tratado (incluindo rejeições definitivas e quarentena). 503: tentar de novo (idempotente). 400: formato. */
  status: 200 | 400 | 503;
  resultados: RegistoLog[];
};

// ---------------------------------------------------------------------------
// Assinatura (Svix, o mecanismo oficial do Resend)

export type CabecalhosSvix = { id: string | null; timestamp: string | null; signature: string | null };

/**
 * Verifica a assinatura do webhook sobre o corpo em bruto (svix-id,
 * svix-timestamp, svix-signature; janela de 5 minutos contra repetições).
 * Devolve o evento ou null. Sem segredo configurado, nunca aceita.
 */
export function verificarAssinatura(corpoBruto: string, cab: CabecalhosSvix, segredo: string | undefined): EventoResend | null {
  if (!segredo || !segredo.startsWith("whsec_") || !cab.id || !cab.timestamp || !cab.signature) return null;
  try {
    return new Webhook(segredo).verify(corpoBruto, {
      "svix-id": cab.id,
      "svix-timestamp": cab.timestamp,
      "svix-signature": cab.signature,
    }) as EventoResend;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Dados da mensagem

function dataIso(valor: string | null | undefined): string | null {
  if (typeof valor !== "string") return null;
  const t = Date.parse(valor);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** Cabeçalhos com nomes em minúsculas (o Resend devolve-os assim, mas não se assume). */
function cabecalhosMinusculos(h: EmailResend["headers"]) {
  const r: Record<string, string | string[]> = {};
  if (h && typeof h === "object") for (const [k, v] of Object.entries(h)) r[k.toLowerCase()] = v;
  return r;
}

/** Spam provável: o servidor do Resend calculou SPF, DKIM e DMARC na receção e nenhum passou, com DMARC a falhar. */
export function suspeitaSpam(auth: EmailResend["authentication"]): boolean {
  if (!auth) return false;
  return auth.dmarc === "fail" && auth.spf !== "pass" && auth.dkim !== "pass";
}

/** Todos os destinatários conhecidos do e-mail (para encontrar endereços de caso). */
function destinatarios(e: Pick<EmailResend, "to" | "cc" | "bcc" | "received_for">): string[] {
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, LIMITES.destinatarios) : []);
  return [...new Set([...arr(e.to), ...arr(e.cc), ...arr(e.bcc), ...arr(e.received_for)])];
}

function enderecosDeCaso(lista: string[], dominio: string) {
  return [...new Set(lista.map((d) => localPartDoCaso(enderecoDeTexto(d)?.email ?? d, dominio)).filter((l): l is string => !!l))];
}

/** Dados para comunicacao_registar_recebida (já tratados). */
export function dadosDaMensagem(email: EmailResend, eventoId: string | null, localPart: string, dominio: string) {
  const cabBrutos = cabecalhosMinusculos(email.headers);
  const cab = cabecalhosRelevantes(cabBrutos);
  if (email.authentication) {
    const a = email.authentication;
    cab["autenticacao"] = `spf=${a.spf ?? "?"} dkim=${a.dkim ?? "?"} dmarc=${a.dmarc ?? "?"}`.slice(0, 200);
  }
  const assunto = limparTexto(email.subject, LIMITES.assunto).texto;
  const texto = limparTexto(email.text, LIMITES.corpoTexto);
  const html = limparTexto(email.html, LIMITES.corpoHtml);
  const apresentacao = corpoParaApresentacao({ texto: texto.texto, html: html.texto });
  const remetente = enderecoDeTexto(typeof cabBrutos["from"] === "string" ? cabBrutos["from"] : email.from) ?? enderecoDeTexto(email.from);
  const messageId = limparTexto(email.message_id ?? (typeof cabBrutos["message-id"] === "string" ? cabBrutos["message-id"] : null), LIMITES.messageId).texto;
  const anexos = Array.isArray(email.attachments) ? email.attachments : [];
  return {
    origem: "email",
    canal: "email",
    provider: "resend",
    provider_message_id: email.id,
    provider_event_id: eventoId,
    message_id: messageId,
    in_reply_to: limparTexto(cab["in-reply-to"], LIMITES.messageId).texto,
    referencias: idsDeMensagem(cab["references"]),
    remetente_email: remetente?.email ?? null,
    remetente_nome: remetente?.nome ?? null,
    destinatario: enderecoCompleto(localPart, dominio),
    para: listaEnderecos(email.to),
    cc: listaEnderecos(email.cc),
    responder_para: listaEnderecos(email.reply_to),
    assunto,
    corpo_texto: texto.texto,
    corpo_html: html.texto,
    corpo_apresentacao: apresentacao.texto,
    truncado: texto.truncado || html.truncado || apresentacao.truncado,
    cabecalhos: cab,
    data_mensagem: dataIso(cab["date"]) ?? dataIso(email.created_at),
    automatica: pareceAutomatica(cab, assunto),
    suspeita_spam: suspeitaSpam(email.authentication),
    tamanho_bytes: Buffer.byteLength(email.text ?? "", "utf8") + Buffer.byteLength(email.html ?? "", "utf8"),
    sem_anexos: anexos.length === 0,
  };
}

// ---------------------------------------------------------------------------
// Anexos

function extensaoOriginal(nome: string | null | undefined) {
  const m = (nome ?? "").match(/\.([A-Za-z0-9]{1,10})$/);
  return m ? m[1].toLowerCase() : "bin";
}

/** Anexos de uma comunicação. Idempotente por (comunicação, índice). Lança só se não for possível guardar. */
export async function processarAnexos(comunicacaoId: string, anexos: AnexoResend[], deps: DepsInbound) {
  for (const [indice, a] of anexos.entries()) {
    const declarado = typeof a.content_type === "string" ? a.content_type.slice(0, 200) : null;
    const tamanho = typeof a.size === "number" ? a.size : null;
    const rejeitar = (motivo: string) =>
      deps.rejeitarAnexo({ comunicacaoId, indice, nome: normalizarNomeFicheiro(a.filename, extensaoOriginal(a.filename)), mime: declarado, tamanho, motivo });

    if (indice >= ANEXOS_MAX_POR_MENSAGEM) {
      await rejeitar("limite_anexos");
      continue;
    }
    const pre = preVerificar(a.content_type, tamanho);
    if (!pre.ok) {
      await rejeitar(pre.motivo);
      continue;
    }
    if (typeof a.download_url !== "string" || !a.download_url.startsWith("https://") || a.download_url.length > 4000) {
      await rejeitar("falha_transferencia");
      continue;
    }
    let bytes: Uint8Array;
    try {
      bytes = await deps.transferirAnexo(a.download_url);
    } catch {
      await rejeitar("falha_transferencia");
      continue;
    }
    // Nunca se confia no nome, na extensão nem no tipo declarado: o conteúdo
    // tem de ter a assinatura do formato.
    const conteudo = verificarConteudo(pre.formato, bytes);
    if (!conteudo.ok) {
      await rejeitar(conteudo.motivo);
      continue;
    }
    await deps.guardarAnexo({
      comunicacaoId,
      indice,
      nome: normalizarNomeFicheiro(a.filename, pre.formato.extensao),
      mime: pre.formato.mime,
      bytes,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  await deps.marcarAnexosProcessados(comunicacaoId);
}

// ---------------------------------------------------------------------------
// Fluxo

/** Processamento depois do registo: anexos → "processada" → avisos e análise (uma vez). */
async function processar(email: EmailResend, casoId: string, comunicacaoId: string, transitou: boolean, suspeito: boolean, deps: DepsInbound) {
  try {
    if (Array.isArray(email.attachments) && email.attachments.length > 0) {
      await processarAnexos(comunicacaoId, await deps.listarAnexos(email.id), deps);
    }
  } catch (e) {
    const erro = e instanceof Error ? e.message.slice(0, 160) : "erro";
    deps.log({ fase: "anexos", resultado: "erro", detalhe: erro });
    await deps.marcarProcessamento(comunicacaoId, "falhou", erro).catch(() => undefined);
    return false;
  }
  await deps.marcarProcessamento(comunicacaoId, "processada");
  await deps.notificar({ casoId, comunicacaoId, transitou }).catch((e) =>
    deps.log({ fase: "notificar", resultado: "erro", detalhe: e instanceof Error ? e.message.slice(0, 120) : "erro" }),
  );
  // Sem IA para spam provável (custo); a análise manual continua possível.
  if (!suspeito) {
    try {
      deps.agendarAnalise(comunicacaoId);
    } catch {
      deps.log({ fase: "analise_ia", resultado: "erro_agendar" });
    }
  }
  return true;
}

/**
 * Evento já verificado. Nunca lança. `eventoId` é o svix-id (o mesmo evento
 * reenviado traz o mesmo id; o e-mail é deduplicado pelo email_id).
 */
export async function processarEventoResend(evento: EventoResend, eventoId: string | null, deps: DepsInbound): Promise<ResultadoWebhook> {
  const resultados: RegistoLog[] = [];
  const fim = async (status: ResultadoWebhook["status"]) => {
    for (const r of resultados) {
      deps.log({ fase: "evento", resultado: r.resultado, motivo: r.motivo, caso: r.casoId ?? null, comunicacao: r.comunicacaoId ?? null });
      await deps.registarLog(r).catch(() => undefined);
    }
    return { status, resultados };
  };

  if (evento?.type !== "email.received") {
    deps.log({ fase: "evento", resultado: "ignorado", tipo: typeof evento?.type === "string" ? evento.type.slice(0, 40) : null });
    return { status: 200, resultados };
  }
  const emailId = evento.data?.email_id;
  if (typeof emailId !== "string" || !ID_RESEND.test(emailId)) {
    deps.log({ fase: "parsing", resultado: "rejeitado", motivo: "formato_invalido" });
    return { status: 400, resultados };
  }
  const base = { providerEventId: eventoId, providerMessageId: emailId };

  try {
    // 1. Sem nenhum endereço de caso válido nos metadados: quarentena, sem ir
    //    buscar o conteúdo (spam para endereços inventados não custa nada).
    const meta = evento.data ?? {};
    const metaDestinatarios = destinatarios(meta);
    const quarentena = (motivo: MotivoQuarentena, lista: string[], remetente: string | null | undefined, assunto: string | null | undefined, data: string | null | undefined) =>
      deps.quarentena({
        providerMessageId: emailId,
        destinatarios: lista.map((d) => d.slice(0, 320)).slice(0, 20),
        remetente: limparTexto(remetente ?? null, 400).texto,
        assunto: limparTexto(assunto ?? null, LIMITES.assunto).texto,
        recebidaEm: dataIso(data ?? null),
        motivo,
      });

    const candidatos = enderecosDeCaso(metaDestinatarios, deps.dominio);
    if (candidatos.length === 0) {
      await quarentena("sem_endereco_de_caso", metaDestinatarios, meta.from, meta.subject, meta.created_at);
      resultados.push({ ...base, resultado: "quarentena", motivo: "sem_endereco_de_caso" });
      return fim(200);
    }
    const casos = new Map<string, string>();
    for (const l of candidatos) {
      const casoId = await deps.casoDoEndereco(l);
      if (casoId) casos.set(l, casoId);
    }
    if (casos.size === 0) {
      await quarentena("endereco_inexistente", metaDestinatarios, meta.from, meta.subject, meta.created_at);
      resultados.push({ ...base, resultado: "quarentena", motivo: "endereco_inexistente" });
      return fim(200);
    }

    // 2. Conteúdo pela API (a fonte): o webhook só traz metadados.
    const obtido = await deps.obterEmail(emailId);
    if (!obtido.ok) {
      resultados.push({ ...base, resultado: obtido.motivo === "indisponivel" ? "erro" : "rejeitado", motivo: `email_${obtido.motivo}` });
      return fim(obtido.motivo === "indisponivel" ? 503 : 200);
    }
    const email = { ...obtido.email, id: emailId };
    const idade = (deps.agora().getTime() - Date.parse(email.created_at ?? meta.created_at ?? "")) / 864e5;
    if (Number.isFinite(idade) && idade > MAX_IDADE_EMAIL_DIAS) {
      resultados.push({ ...base, resultado: "rejeitado", motivo: "email_antigo" });
      return fim(200);
    }

    // Só os endereços que também constam do e-mail obtido na API.
    const confirmados = new Set(enderecosDeCaso(destinatarios(email), deps.dominio));
    let erroTransitorio = false;
    for (const [localPart, casoId] of casos) {
      if (!confirmados.has(localPart)) {
        resultados.push({ ...base, resultado: "rejeitado", motivo: "destinatario_nao_confirmado", casoId });
        continue;
      }
      const dados = dadosDaMensagem(email, eventoId, localPart, deps.dominio);
      const r = await deps.registar(casoId, dados);
      if (r.resultado === "caso_inexistente" || r.resultado === "invalido" || !r.comunicacao_id) {
        await quarentena("caso_inexistente", [localPart], email.from, email.subject, email.created_at);
        resultados.push({ ...base, resultado: "quarentena", motivo: "caso_inexistente" });
        continue;
      }
      const comunicacaoId = r.comunicacao_id;
      if (r.resultado === "duplicada") {
        // Reenvio: um só registo. Só retoma o processamento que ficou a meio.
        const estado = await deps.estadoProcessamento(comunicacaoId);
        if (estado !== "processada" && !(await processar(email, casoId, comunicacaoId, false, dados.suspeita_spam, deps))) erroTransitorio = true;
        resultados.push({ ...base, resultado: "duplicado", motivo: estado === "processada" ? null : "retomado", casoId, comunicacaoId });
        continue;
      }
      const ok = await processar(email, casoId, comunicacaoId, !!r.transitou, dados.suspeita_spam, deps);
      if (!ok) erroTransitorio = true;
      resultados.push({ ...base, resultado: ok ? "aceite" : "erro", motivo: ok ? (r.transitou ? "em_analise" : "sem_transicao") : "processamento_falhou", casoId, comunicacaoId });
    }
    // A mensagem já está guardada; um erro no processamento pede ao Resend
    // para reenviar, e o reenvio retoma sem duplicar.
    return fim(erroTransitorio ? 503 : 200);
  } catch (e) {
    deps.log({ fase: "armazenamento", resultado: "erro", detalhe: e instanceof Error ? e.message.slice(0, 160) : "erro" });
    resultados.push({ ...base, resultado: "erro", motivo: "erro_armazenamento" });
    return fim(503);
  }
}
