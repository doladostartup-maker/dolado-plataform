// DoLado — Edge Function "novo-caso"
//
// Disparada por um Database Webhook em INSERT na tabela `casos`. Envia dois
// e-mails via Brevo: confirmação ao cliente e notificação ao Thiago.
//
// Secrets necessários (configurar com `supabase secrets set`):
//   BREVO_API_KEY       — API key da Brevo
//   BREVO_SENDER_EMAIL  — remetente autorizado na Brevo (ex.: thiago.pereira@dolado.pt)
//   ADMIN_EMAIL         — opcional, por omissão thiago.pereira@dolado.pt
//   SITE_URL            — opcional, por omissão https://portal.dolado.pt

interface CasoRecord {
  id: string;
  nome: string;
  email: string;
  sector: string | null;
  tipo_problema: string | null;
  descricao: string | null;
  telefone: string | null;
  empresa_parceira: string | null;
}

interface WebhookPayload {
  type: string;
  table: string;
  record: CasoRecord;
}

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL");
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "thiago.pereira@dolado.pt";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://portal.dolado.pt";

async function enviarEmailBrevo(destino: { email: string; nome?: string }, assunto: string, html: string) {
  const resposta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Thiago - DoLado", email: BREVO_SENDER_EMAIL },
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

function htmlConfirmacaoCliente(nome: string): string {
  return `<!DOCTYPE html>
<html lang="pt-PT">
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background-color:#F7F6F2; font-family: 'Inter', Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F6F2; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#FFFFFF; border-radius:12px; border:1px solid #E4E2DB; overflow:hidden;">
          <tr>
            <td style="padding: 32px 32px 0 32px;">
              <span style="font-family:'Inter', Arial, Helvetica, sans-serif; font-size:20px; font-weight:600; color:#0E6B5C;">DoLado</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 24px 32px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:16px; line-height:1.6;">
              <p style="margin:0 0 16px 0;">Olá ${nome},</p>
              <p style="margin:0 0 16px 0;">Recebemos o seu pedido. Já está com o Thiago para ser analisado pessoalmente.</p>
              <p style="margin:0 0 16px 0;">Respondemos-lhe no prazo máximo de 24 horas úteis, para confirmar os factos consigo antes de qualquer envio à empresa.</p>
              <p style="margin:0 0 4px 0;">Obrigado por confiar na DoLado.</p>
              <p style="margin:0; font-weight:600;">Thiago<br><span style="font-weight:400; color:#5B6270; font-size:14px;">DoLado</span></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color:#EFEDE7; font-family:'Inter', Arial, Helvetica, sans-serif; font-size:13px; color:#5B6270;">
              <a href="https://www.dolado.pt" style="color:#0E6B5C; text-decoration:none;">www.dolado.pt</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function htmlNotificacaoAdmin(caso: CasoRecord): string {
  const linha = (label: string, valor: string | null) =>
    `<p style="margin:0 0 4px 0;"><strong>${label}:</strong> ${valor ?? "—"}</p>`;

  return `<!DOCTYPE html>
<html lang="pt-PT">
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; font-family: 'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:15px; line-height:1.6;">
  <p style="margin:0 0 16px 0; font-weight:600;">Novo caso recebido.</p>
  ${linha("Nome", caso.nome)}
  ${linha("E-mail", caso.email)}
  ${linha("Telefone", caso.telefone)}
  ${linha("Setor", caso.sector)}
  ${linha("Tipo de problema", caso.tipo_problema)}
  ${linha("Empresa parceira", caso.empresa_parceira)}
  <p style="margin:16px 0 0 0;"><strong>Descrição:</strong><br>${caso.descricao ?? "—"}</p>
  <p style="margin:20px 0 0 0;">
    <a href="${SITE_URL}/backoffice/casos/${caso.id}" style="color:#0E6B5C;">Ver caso no backoffice</a>
  </p>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  try {
    const payload: WebhookPayload = await req.json();

    if (payload.type !== "INSERT" || payload.table !== "casos") {
      return new Response("ignorado", { status: 200 });
    }

    const caso = payload.record;

    await enviarEmailBrevo(
      { email: caso.email, nome: caso.nome },
      "Recebemos o seu pedido",
      htmlConfirmacaoCliente(caso.nome),
    );

    await enviarEmailBrevo(
      { email: ADMIN_EMAIL },
      `[NOVO CASO] ${caso.sector ?? "Sem setor"} – ${caso.nome}`,
      htmlNotificacaoAdmin(caso),
    );

    return new Response("ok", { status: 200 });
  } catch (erro) {
    // Nunca bloquear por causa de uma falha de envio — o caso já está
    // gravado na base de dados antes deste webhook disparar.
    console.error("Falha ao processar webhook novo-caso:", erro);
    return new Response("erro registado em log", { status: 200 });
  }
});
