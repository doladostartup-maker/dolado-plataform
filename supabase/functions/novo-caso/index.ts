// DoLado — Edge Function "novo-caso"
//
// Disparada pelo trigger `notificar_novo_caso` (migração
// 20260930150000_webhook_novo_caso_com_vault.sql) em INSERT na tabela
// `casos`. Envia dois e-mails via Brevo: confirmação ao cliente e
// notificação ao Thiago.
//
// Autorização: verify_jwt = false (config.toml) — o trigger não envia JWT;
// envia o cabeçalho x-webhook-secret, comparado com NOVO_CASO_WEBHOOK_SECRET.
//
// Secrets necessários (configurar com `supabase secrets set`):
//   NOVO_CASO_WEBHOOK_SECRET — segredo partilhado com o Vault (ver a migração)
//   BREVO_API_KEY       — API key da Brevo
//   BREVO_SENDER_EMAIL  — remetente autorizado na Brevo (contacto@dolado.pt)
//   ADMIN_EMAIL         — opcional, por omissão thiago.pereira@dolado.pt
//   SITE_URL            — opcional, por omissão https://portal.dolado.pt
//
// Os campos do caso são texto do cliente: o HTML e o assunto são montados
// em ../_shared/emailNovoCaso.ts, com escape de HTML e assunto saneado.

import {
  assuntoConfirmacaoCliente,
  assuntoNotificacaoAdmin,
  type CasoNovo,
  htmlConfirmacaoCliente,
  htmlNotificacaoAdmin,
} from "../_shared/emailNovoCaso.ts";
import { idiomaDosMetadados } from "../_shared/idiomaConta.ts";
import type { IdiomaEmail } from "../_shared/molduraEmail.ts";
import { textoParaAssunto } from "../_shared/textoSeguro.ts";

interface WebhookPayload {
  type: string;
  table: string;
  record: CasoNovo;
}

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL");
// Respostas dos clientes vão para o contacto institucional, não para o remetente.
const CONTACTO_EMAIL = "contacto@dolado.pt";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "thiago.pereira@dolado.pt";
const WEBHOOK_SECRET = Deno.env.get("NOVO_CASO_WEBHOOK_SECRET");
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://portal.dolado.pt";
// Variáveis postas pela própria Supabase em todas as Edge Functions.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

/**
 * Idioma da conta do cliente (user_metadata.idioma), só para o e-mail de
 * confirmação. Sem conta, sem idioma ou qualquer erro → português.
 */
async function idiomaDaConta(utilizadorId: string | null | undefined): Promise<IdiomaEmail> {
  if (!utilizadorId || !SUPABASE_URL || !SERVICE_ROLE_KEY) return "pt-PT";
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(utilizadorId)}`, {
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      signal: AbortSignal.timeout(5_000),
    });
    if (!r.ok) return "pt-PT";
    const u = await r.json();
    return idiomaDosMetadados(u?.user_metadata);
  } catch {
    return "pt-PT";
  }
}

async function enviarEmailBrevo(destino: { email: string; nome?: string }, assunto: string, html: string) {
  const resposta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Thiago - DoLado", email: BREVO_SENDER_EMAIL },
      replyTo: { email: CONTACTO_EMAIL, name: "DoLado" },
      to: [{ email: destino.email, name: destino.nome }],
      subject: assunto,
      htmlContent: html,
    }),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(`Brevo respondeu ${resposta.status}: ${corpo}`);
  }
}

Deno.serve(async (req: Request) => {
  // Sem segredo configurado, recusa sempre — nunca fica aberta por omissão.
  if (!WEBHOOK_SECRET || req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const payload: WebhookPayload = await req.json();

    if (payload.type !== "INSERT" || payload.table !== "casos") {
      return new Response("ignorado", { status: 200 });
    }

    const caso = payload.record;

    const idioma = await idiomaDaConta(caso.utilizador_id);
    await enviarEmailBrevo(
      { email: caso.email, nome: textoParaAssunto(caso.nome ?? "", 70) },
      assuntoConfirmacaoCliente(idioma),
      htmlConfirmacaoCliente(caso.nome, idioma),
    );

    await enviarEmailBrevo(
      { email: ADMIN_EMAIL },
      assuntoNotificacaoAdmin(caso),
      htmlNotificacaoAdmin(caso, SITE_URL),
    );

    return new Response("ok", { status: 200 });
  } catch (erro) {
    // Nunca bloquear por causa de uma falha de envio — o caso já está
    // gravado na base de dados antes deste webhook disparar.
    console.error("Falha ao processar webhook novo-caso:", erro);
    return new Response("erro registado em log", { status: 200 });
  }
});
