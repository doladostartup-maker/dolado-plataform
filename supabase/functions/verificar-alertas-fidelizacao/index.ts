// DoLado — Edge Function "verificar-alertas-fidelizacao"
//
// Disparada diariamente às 08:00 UTC por um agendamento pg_cron (ver
// migração 20260924110000_cron_alertas_fidelizacao.sql). Verifica a tabela
// `alertas_fidelizacao_portal` e envia, via Brevo, o aviso a 60 e a 30 dias
// do fim da fidelização, uma única vez por alerta.
//
// Secrets necessários (configurar com `supabase secrets set`):
//   BREVO_API_KEY        — API key da Brevo
//   BREVO_SENDER_EMAIL   — remetente autorizado na Brevo
//   CRON_SECRET          — segredo partilhado com o Vault (ver migração do cron)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — injectados automaticamente
//   pela Supabase em toda a Edge Function, não precisam de ser definidos.

interface AlertaFidelizacao {
  id: string;
  nome: string;
  email: string;
  operadora: string;
  data_fim_fidelizacao: string;
  alerta_60d_enviado_em: string | null;
  alerta_30d_enviado_em: string | null;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL");
const CRON_SECRET = Deno.env.get("CRON_SECRET");

// Data em UTC, formato YYYY-MM-DD — evita "deslizar" um dia consoante o
// fuso horário em que o runtime da função executa.
function dataUtcMaisDias(dias: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function hojeUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function pesquisarAlertasPendentes(
  campoEnviado: "alerta_60d_enviado_em" | "alerta_30d_enviado_em",
  limiteDias: number,
): Promise<AlertaFidelizacao[]> {
  const url =
    `${SUPABASE_URL}/rest/v1/alertas_fidelizacao_portal` +
    `?select=id,nome,email,operadora,data_fim_fidelizacao,alerta_60d_enviado_em,alerta_30d_enviado_em` +
    `&${campoEnviado}=is.null` +
    `&data_fim_fidelizacao=gt.${hojeUtc()}` +
    `&data_fim_fidelizacao=lte.${dataUtcMaisDias(limiteDias)}`;

  const resposta = await fetch(url, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });

  if (!resposta.ok) {
    throw new Error(`Falha ao pesquisar alertas (${campoEnviado}): ${await resposta.text()}`);
  }

  return await resposta.json();
}

async function marcarAlertaEnviado(
  id: string,
  campoEnviado: "alerta_60d_enviado_em" | "alerta_30d_enviado_em",
) {
  const resposta = await fetch(
    `${SUPABASE_URL}/rest/v1/alertas_fidelizacao_portal?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ [campoEnviado]: new Date().toISOString() }),
    },
  );

  if (!resposta.ok) {
    throw new Error(`Falha ao marcar alerta ${id} como enviado: ${await resposta.text()}`);
  }
}

function diasEntre(dataFim: string): number {
  const hoje = new Date(`${hojeUtc()}T00:00:00Z`);
  const fim = new Date(`${dataFim}T00:00:00Z`);
  return Math.round((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function htmlAviso(nome: string, operadora: string, dias: number, dataFim: string): string {
  const dataFormatada = new Date(`${dataFim}T00:00:00Z`).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

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
            <td style="padding: 24px 32px 8px 32px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:16px; line-height:1.6;">
              <p style="margin:0 0 16px 0;">Olá ${nome},</p>
              <p style="margin:0 0 16px 0;">A sua fidelização com <strong>${operadora}</strong> termina em ${dias} dias (em ${dataFormatada}).</p>
              <p style="margin:0 0 16px 0;">Isto significa que pode haver alterações no preço, velocidade ou serviço. Recomendamos que contacte a operadora para renegociar antes dessa data.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 32px 8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EFEDE7; border-left:3px solid #0E6B5C; border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:14px; line-height:1.6;">
                    <p style="margin:0 0 8px 0; font-weight:600;">Pode:</p>
                    <p style="margin:0 0 4px 0;">— Renegociar as condições</p>
                    <p style="margin:0 0 4px 0;">— Trocar de operadora</p>
                    <p style="margin:0;">— Apresentar uma reclamação se houver mudanças não autorizadas</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 24px 32px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:16px; line-height:1.6;">
              <p style="margin:0 0 16px 0;">Se precisar de ajuda a preparar uma reclamação, visite <a href="https://www.dolado.pt" style="color:#0E6B5C;">dolado.pt</a>.</p>
              <p style="margin:0;">Sem mais,<br><span style="font-weight:600;">DoLado</span></p>
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

async function enviarEmailBrevo(destino: { email: string; nome: string }, assunto: string, html: string) {
  const resposta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "DoLado", email: BREVO_SENDER_EMAIL },
      to: [{ email: destino.email, name: destino.nome }],
      subject: assunto,
      htmlContent: html,
    }),
  });

  if (!resposta.ok) {
    throw new Error(`Brevo respondeu ${resposta.status}: ${await resposta.text()}`);
  }
}

async function processarJanela(
  campoEnviado: "alerta_60d_enviado_em" | "alerta_30d_enviado_em",
  limiteDias: number,
): Promise<number> {
  const alertas = await pesquisarAlertasPendentes(campoEnviado, limiteDias);
  let enviados = 0;

  for (const alerta of alertas) {
    try {
      const dias = diasEntre(alerta.data_fim_fidelizacao);
      await enviarEmailBrevo(
        { email: alerta.email, nome: alerta.nome },
        `A sua fidelização com ${alerta.operadora} termina em ${dias} dias`,
        htmlAviso(alerta.nome, alerta.operadora, dias, alerta.data_fim_fidelizacao),
      );
      await marcarAlertaEnviado(alerta.id, campoEnviado);
      enviados += 1;
    } catch (erro) {
      // Uma falha num alerta não pode bloquear os restantes — fica em log
      // para investigação manual.
      console.error(`Falha ao processar alerta ${alerta.id}:`, erro);
    }
  }

  return enviados;
}

Deno.serve(async (req: Request) => {
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const enviados60d = await processarJanela("alerta_60d_enviado_em", 60);
    const enviados30d = await processarJanela("alerta_30d_enviado_em", 30);

    return new Response(JSON.stringify({ enviados_60d: enviados60d, enviados_30d: enviados30d }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (erro) {
    console.error("Falha geral em verificar-alertas-fidelizacao:", erro);
    return new Response(JSON.stringify({ error: "Erro ao processar alertas" }), { status: 500 });
  }
});
