"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

function htmlAvisoSetorial(nome: string, setor: string, titulo: string, descricao: string) {
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
              <p style="margin:0 0 16px 0;">Publicámos um aviso sobre ${setor}:</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 32px 8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EFEDE7; border-left:3px solid #0E6B5C; border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:14px; line-height:1.6;">
                    <p style="margin:0 0 8px 0; font-weight:600;">${titulo}</p>
                    <p style="margin:0;">${descricao.replace(/\n/g, "<br>")}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 24px 32px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:16px; line-height:1.6;">
              <p style="margin:0;">Se tiver perguntas, responda a este e-mail ou visite <a href="https://www.dolado.pt/contacto" style="color:#0E6B5C;">dolado.pt/contacto</a>.</p>
              <p style="margin:16px 0 0 0;">Sem mais,<br><span style="font-weight:600;">DoLado</span></p>
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

const SETORES_VALIDOS = ["Telecomunicações", "Energia", "Água"];

export async function enviarAvisoSectorial(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const setor = (formData.get("setor") as string) || "";
  const titulo = ((formData.get("titulo") as string) || "").trim();
  const descricao = ((formData.get("descricao") as string) || "").trim();

  if (!SETORES_VALIDOS.includes(setor)) {
    redirect(`/backoffice/avisos?erro=${encodeURIComponent("Escolha um setor válido.")}`);
  }
  if (!titulo || !descricao) {
    redirect(`/backoffice/avisos?erro=${encodeURIComponent("Preencha o título e a descrição.")}`);
  }

  const { data: aviso, error: erroInsert } = await supabase
    .from("avisos_setoriais")
    .insert({ setor, titulo, descricao, criado_por_admin_id: user.id })
    .select("id")
    .single();

  if (erroInsert || !aviso) {
    redirect(
      `/backoffice/avisos?erro=${encodeURIComponent(erroInsert?.message || "Erro ao criar o aviso.")}`,
    );
  }

  const { data: subscritores } = await supabase
    .from("preferencias_setor")
    .select("utilizadores(nome, email)")
    .eq("setor", setor);

  let enviados = 0;
  for (const linha of subscritores ?? []) {
    const destinatario = linha.utilizadores as unknown as { nome: string | null; email: string } | null;
    if (!destinatario?.email) continue;

    try {
      await enviarEmailBrevo(
        { email: destinatario.email, nome: destinatario.nome || destinatario.email },
        `[Aviso DoLado] Novidade no setor de ${setor}`,
        htmlAvisoSetorial(destinatario.nome || "Olá", setor, titulo, descricao),
      );
      enviados += 1;
    } catch (erro) {
      // Uma falha de envio individual não pode travar os restantes.
      console.error(`Falha ao enviar aviso setorial a ${destinatario.email}:`, erro);
    }
  }

  await supabase
    .from("avisos_setoriais")
    .update({ destinatarios_count: enviados })
    .eq("id", aviso.id);

  revalidatePath("/backoffice/avisos");
  redirect(`/backoffice/avisos?enviado=${enviados}`);
}
