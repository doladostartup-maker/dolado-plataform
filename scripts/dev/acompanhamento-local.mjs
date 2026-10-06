// Simulação local do acompanhamento depois do envio — SÓ contra a Supabase
// local (Docker). Recusa qualquer outro endereço: nunca produção.
//
//   node scripts/dev/acompanhamento-local.mjs seed
//     → contas de teste (admin e cliente) e um caso com a reclamação já
//       autorizada e enviada ("A aguardar resposta da empresa"); mostra o
//       endereço único de respostas do caso.
//   node scripts/dev/acompanhamento-local.mjs resposta <endereço> [automatica]
//     → como se a empresa tivesse respondido para esse endereço: serve uma
//       API do Resend falsa em localhost:4010 (o servidor local usa-a via
//       RESEND_API_URL, só fora de produção) e envia ao servidor local
//       (configuração "dolado-local" de .claude/launch.json) o evento
//       "email.received" assinado com Svix — a verificação da assinatura
//       nunca é desligada.
//
// Contas de teste (só existem na base local):
//   admin@dolado.test   / Local-Admin-2026!
//   cliente@dolado.test / Local-Cliente-2026!
import { execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { Webhook } from "svix";

const SITE = "http://localhost:3000";
// Segredo local do webhook (igual ao de .claude/launch.json "dolado-local"). Nunca o de produção.
const SEGREDO_WEBHOOK = "whsec_" + Buffer.from("segredo-local-do-webhook-resend-dolado").toString("base64");
const PORTA_RESEND_FALSO = 4010;
const DOMINIO = "respostas.dolado.test";
const CONTAS = {
  admin: { email: "admin@dolado.test", password: "Local-Admin-2026!" },
  cliente: { email: "cliente@dolado.test", password: "Local-Cliente-2026!" },
};

function ambienteLocal() {
  const saida = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const env = Object.fromEntries(saida.split("\n").map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]));
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(env.API_URL ?? "")) throw new Error(`Recusado: só a Supabase local (recebido ${env.API_URL}).`);
  return env;
}

const h = (t) => createHash("sha256").update(t, "utf8").digest("hex");

async function conta(admin, { email, password }, role) {
  const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let user = lista.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nome: role === "admin" ? "Admin Local" : "Cliente Local" } });
    if (error) throw error;
    user = data.user;
  }
  if (role === "admin") await admin.from("utilizadores").update({ role: "admin" }).eq("id", user.id);
  return user.id;
}

async function rpc(admin, nome, args) {
  const { data, error } = await admin.rpc(nome, args);
  if (error) throw new Error(`${nome}: ${error.message}`);
  return data;
}

async function seed() {
  const env = ambienteLocal();
  const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const adminId = await conta(admin, CONTAS.admin, "admin");
  const clienteId = await conta(admin, CONTAS.cliente, "cliente");

  const { data: caso, error } = await admin
    .from("casos")
    .insert({
      utilizador_id: clienteId,
      nome: "Cliente Local",
      email: CONTAS.cliente.email,
      sector: "Telecomunicações",
      empresa: "Operadora Exemplo",
      problema_tipo: "Aumento de mensalidade",
      descricao: "A mensalidade subiu de 30 € para 36 € em setembro sem aviso prévio.",
      status: "Em investigação",
    })
    .select("id")
    .single();
  if (error) throw error;

  const conteudo = "Exmos. Senhores,\n\nVenho apresentar reclamação pelo aumento da mensalidade de 30 € para 36 € a partir de setembro de 2026.\n\nSolicito a reposição do valor anterior.\n\nCom os melhores cumprimentos,\nCliente Local";
  const textoId = await rpc(admin, "texto_guardar", { p_caso_id: caso.id, p_conteudo: conteudo, p_admin: adminId });
  const rever = randomBytes(32).toString("base64url");
  await rpc(admin, "texto_emitir_links", {
    p_texto_id: textoId, p_hash_rever: h(rever), p_hash_alterar: h(randomUUID()), p_expira_em: new Date(Date.now() + 14 * 864e5).toISOString(),
  });
  await rpc(admin, "texto_autorizar_no_portal", { p_texto_id: textoId, p_utilizador: clienteId });
  await rpc(admin, "texto_registar_envio", {
    p_texto_id: textoId, p_conteudo_sha256: h(conteudo), p_destinatario: "Operadora Exemplo — Livro de Reclamações", p_canal: "livro_reclamacoes_eletronico",
    p_resultado: null, p_admin: adminId, p_referencia: "LRE-2026-0001",
  });

  const alfabeto = "abcdefghijklmnopqrstuvwxyz234567";
  const b32 = (n) => Array.from(randomBytes(n), (b) => alfabeto[b & 31]).join("");
  const local = `caso-${b32(6)}-${b32(26)}`;
  await admin.from("casos_enderecos_resposta").insert({ caso_id: caso.id, local_part: local });

  console.log(`Caso: ${caso.id}`);
  console.log(`Backoffice: ${SITE}/backoffice/casos/${caso.id}  (${CONTAS.admin.email})`);
  console.log(`Portal:     ${SITE}/portal/casos/${caso.id}  (${CONTAS.cliente.email})`);
  console.log(`Endereço de respostas: ${local}@${DOMINIO}`);
}

async function resposta(endereco, variante) {
  ambienteLocal();
  if (!endereco?.endsWith(`@${DOMINIO}`)) throw new Error(`Indique o endereço do caso (…@${DOMINIO}).`);
  const id = randomUUID();
  const automatica = variante === "automatica";
  const email = {
    object: "email",
    id,
    from: "Apoio ao Cliente — Operadora Exemplo <apoio@operadora-exemplo.test>",
    to: [endereco],
    cc: [],
    bcc: [],
    reply_to: [],
    received_for: [],
    subject: automatica ? "Resposta automática: recebemos a sua mensagem" : "Re: Reclamação LRE-2026-0001",
    created_at: new Date().toISOString(),
    message_id: `<${id}@operadora-exemplo.test>`,
    headers: automatica ? { "auto-submitted": "auto-replied" } : {},
    authentication: { spf: "pass", dkim: "pass", dmarc: "pass" },
    text: automatica
      ? "Recebemos a sua mensagem. Responderemos no prazo de 10 dias úteis."
      : "Exma. Senhora,\n\nAnalisámos a sua reclamação. O aumento resulta da atualização anual de preços prevista no contrato, comunicada na fatura de julho.\n\nNão é possível repor o valor anterior.\n\nCom os melhores cumprimentos,\nApoio ao Cliente",
    html: "<p>Analisámos a sua reclamação.</p><script>alert('x')</script><img src=\"https://rastreio.example/p.gif\">",
    attachments: [],
  };

  // API do Resend falsa (só os dois pedidos que a DoLado faz).
  const servidor = createServer((req, res) => {
    const url = req.url ?? "";
    res.setHeader("Content-Type", "application/json");
    if (url.startsWith(`/emails/receiving/${id}/attachments`)) return res.end(JSON.stringify({ object: "list", has_more: false, data: [] }));
    if (url.startsWith(`/emails/receiving/${id}`)) return res.end(JSON.stringify(email));
    res.statusCode = 404;
    res.end("{}");
  });
  await new Promise((ok) => servidor.listen(PORTA_RESEND_FALSO, ok));

  const corpo = JSON.stringify({
    type: "email.received",
    created_at: new Date().toISOString(),
    data: { email_id: id, created_at: email.created_at, from: email.from, to: email.to, cc: [], bcc: [], received_for: [], subject: email.subject, message_id: email.message_id },
  });
  const eventoId = `msg_${randomUUID()}`;
  const agora = new Date();
  try {
    const r = await fetch(`${SITE}/api/webhooks/resend/inbound`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "svix-id": eventoId,
        "svix-timestamp": String(Math.floor(agora.getTime() / 1000)),
        "svix-signature": new Webhook(SEGREDO_WEBHOOK).sign(eventoId, agora, corpo),
      },
      body: corpo,
    });
    console.log(r.status, await r.text());
  } finally {
    servidor.close();
  }
}

const [comando, ...args] = process.argv.slice(2);
if (comando === "seed") await seed();
else if (comando === "resposta") await resposta(args[0], args[1]);
else console.log("Uso: seed | resposta <endereço> [automatica]");
