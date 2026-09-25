"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

async function enviarEmailBrevo(destino: { email: string; nome: string }, assunto: string, html: string) {
  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "DoLado", email: process.env.BREVO_SENDER_EMAIL },
        to: [{ email: destino.email, name: destino.nome }],
        subject: assunto,
        htmlContent: html,
      }),
    });
  } catch (erro) {
    console.error("Falha ao enviar e-mail de decisão de elegibilidade:", erro);
  }
}

function htmlResultado(nome: string, elegivel: boolean, razao: string) {
  const cta = elegivel
    ? `<p style="margin:16px 0 0 0;"><a href="https://portal.dolado.pt/portal/casos/novo" style="display:inline-block;background-color:#0E6B5C;color:#FFFFFF;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Abrir reclamação agora</a></p>`
    : "";

  return `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#F7F6F2;font-family:'Inter',Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F6F2;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;border:1px solid #E4E2DB;overflow:hidden;">
<tr><td style="padding:32px 32px 0 32px;"><span style="font-size:20px;font-weight:600;color:#0E6B5C;">DoLado</span></td></tr>
<tr><td style="padding:24px 32px 24px 32px;color:#171A21;font-size:16px;line-height:1.6;">
<p style="margin:0 0 16px 0;">Olá ${nome},</p>
<p style="margin:0 0 16px 0;">Analisámos o seu caso — <strong>${elegivel ? "parece ser elegível para reclamação" : "não é elegível para reclamação neste momento"}</strong>.</p>
<p style="margin:0;">${razao}</p>
${cta}
</td></tr>
<tr><td style="padding:20px 32px;background-color:#EFEDE7;font-size:13px;color:#5B6270;"><a href="https://www.dolado.pt" style="color:#0E6B5C;text-decoration:none;">www.dolado.pt</a></td></tr>
</table></td></tr></table></body></html>`;
}

export async function reverElegibilidadeManualmente(id: string, formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const { data: caso } = await supabase
    .from("casos_elegibilidade_portal")
    .select("nome, email")
    .eq("id", id)
    .single();

  if (!caso) {
    redirect(`/backoffice/elegibilidade?erro=${encodeURIComponent("Caso não encontrado.")}`);
  }

  const estadoFinal = (formData.get("estado_final") as string) || "";
  const notasAdmin = ((formData.get("notas_admin") as string) || "").trim() || null;
  const razaoCliente = ((formData.get("razao_cliente") as string) || "").trim();

  if (!["elegivel", "nao_elegivel"].includes(estadoFinal)) {
    redirect(`/backoffice/elegibilidade/${id}?erro=${encodeURIComponent("Escolha a decisão final.")}`);
  }
  if (!razaoCliente) {
    redirect(
      `/backoffice/elegibilidade/${id}?erro=${encodeURIComponent("Escreva a razão que o cliente vai ler.")}`,
    );
  }

  const { error } = await supabase
    .from("casos_elegibilidade_portal")
    .update({
      estado_final: estadoFinal,
      estado_elegibilidade: "enviado_cliente",
      revisto_por_admin_id: user.id,
      revisto_em: new Date().toISOString(),
      notas_admin: notasAdmin,
    })
    .eq("id", id);

  if (error) {
    redirect(`/backoffice/elegibilidade/${id}?erro=${encodeURIComponent(error.message)}`);
  }

  await enviarEmailBrevo(
    { email: caso.email, nome: caso.nome },
    estadoFinal === "elegivel" ? "O seu caso parece elegível" : "Resultado da verificação de elegibilidade",
    htmlResultado(caso.nome, estadoFinal === "elegivel", razaoCliente),
  );

  revalidatePath("/backoffice/elegibilidade");
  redirect("/backoffice/elegibilidade?revisto=1");
}
