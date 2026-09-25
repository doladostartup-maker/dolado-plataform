"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { gerarAnalise } from "@/lib/facturas/extrairFatura";

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
    console.error("Falha ao enviar e-mail de revisão manual de fatura:", erro);
  }
}

function htmlResultadoCliente(
  nome: string,
  operadora: string | null,
  valorAtual: number,
  valorAnterior: number | null,
  analise: string,
) {
  const linhaAnterior =
    valorAnterior !== null
      ? `<p style="margin:0 0 4px 0;">📊 Mês anterior: €${valorAnterior.toFixed(2)}</p>
         <p style="margin:0 0 16px 0;">📈 Diferença: ${(valorAtual - valorAnterior) >= 0 ? "+" : "-"}€${Math.abs(valorAtual - valorAnterior).toFixed(2)}</p>`
      : "";

  return `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#F7F6F2;font-family:'Inter',Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F6F2;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;border:1px solid #E4E2DB;overflow:hidden;">
<tr><td style="padding:32px 32px 0 32px;"><span style="font-size:20px;font-weight:600;color:#0E6B5C;">DoLado</span></td></tr>
<tr><td style="padding:24px 32px 24px 32px;color:#171A21;font-size:16px;line-height:1.6;">
<p style="margin:0 0 16px 0;">Olá ${nome},</p>
<p style="margin:0 0 16px 0;">Comparámos a sua fatura${operadora ? ` de ${operadora}` : ""}:</p>
<p style="margin:0 0 4px 0;">📊 Este mês: €${valorAtual.toFixed(2)}</p>
${linhaAnterior}
<p style="margin:16px 0 16px 0;">${analise}</p>
<p style="margin:0;">Se encontrar erros na leitura, responda a este e-mail.</p>
</td></tr>
<tr><td style="padding:20px 32px;background-color:#EFEDE7;font-size:13px;color:#5B6270;"><a href="https://www.dolado.pt" style="color:#0E6B5C;text-decoration:none;">www.dolado.pt</a></td></tr>
</table></td></tr></table></body></html>`;
}

export async function rewerFaturaManualmente(id: string, formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const { data: fatura } = await supabase
    .from("comparacoes_fatura_portal")
    .select("utilizador_id, nome, email, operadora")
    .eq("id", id)
    .single();

  if (!fatura) {
    redirect(`/backoffice/faturas?erro=${encodeURIComponent("Fatura não encontrada.")}`);
  }

  const operadora = ((formData.get("operadora") as string) || fatura.operadora || "").trim() || null;
  const valorTexto = (formData.get("valor_mes_atual") as string) || "";
  const valorAtual = Number(valorTexto.replace(",", "."));

  if (!valorTexto || Number.isNaN(valorAtual)) {
    redirect(`/backoffice/faturas/${id}?erro=${encodeURIComponent("Indique o valor da fatura.")}`);
  }

  let consultaAnterior = supabase
    .from("comparacoes_fatura_portal")
    .select("valor_mes_atual")
    .eq("utilizador_id", fatura.utilizador_id)
    .eq("status", "sent_to_client")
    .not("valor_mes_atual", "is", null)
    .neq("id", id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (operadora) {
    consultaAnterior = consultaAnterior.eq("operadora", operadora);
  }

  const { data: anterior } = await consultaAnterior.maybeSingle();

  const valorAnterior = anterior?.valor_mes_atual ?? null;
  const diferencaPct = valorAnterior ? ((valorAtual - valorAnterior) / valorAnterior) * 100 : null;
  const analise = gerarAnalise(valorAtual, valorAnterior);

  const { error } = await supabase
    .from("comparacoes_fatura_portal")
    .update({
      operadora,
      valor_mes_atual: valorAtual,
      valor_mes_anterior: valorAnterior,
      diferenca_pct: diferencaPct !== null ? Number(diferencaPct.toFixed(2)) : null,
      analise,
      status: "sent_to_client",
      revisto_por_admin_id: user.id,
      revisto_em: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect(`/backoffice/faturas/${id}?erro=${encodeURIComponent(error.message)}`);
  }

  await enviarEmailBrevo(
    { email: fatura.email, nome: fatura.nome },
    "A comparação da sua fatura",
    htmlResultadoCliente(fatura.nome, operadora, valorAtual, valorAnterior, analise),
  );

  revalidatePath("/backoffice/faturas");
  redirect("/backoffice/faturas?revisto=1");
}
