"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcularElegibilidade, type DuracaoContrato, type Setor } from "@/lib/elegibilidade/regras";
import { avaliarElegibilidadeComIA } from "@/lib/elegibilidade/avaliarComIA";

const MAPA_SUGESTAO_IA: Record<string, "elegivel" | "nao_elegivel" | "pouco_claro"> = {
  eligible: "elegivel",
  not_eligible: "nao_elegivel",
  unclear: "pouco_claro",
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "thiago.pereira@dolado.pt";
const SETORES_VALIDOS: Setor[] = ["Telecomunicações", "Energia", "Água"];
const DURACOES_VALIDAS: DuracaoContrato[] = ["menos_6m", "6_12m", "1_2anos", "mais_2anos"];

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
    console.error("Falha ao enviar e-mail do simulador de elegibilidade:", erro);
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

function htmlEmAnalise(nome: string) {
  return `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#F7F6F2;font-family:'Inter',Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F6F2;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;border:1px solid #E4E2DB;overflow:hidden;">
<tr><td style="padding:32px 32px 0 32px;"><span style="font-size:20px;font-weight:600;color:#0E6B5C;">DoLado</span></td></tr>
<tr><td style="padding:24px 32px 24px 32px;color:#171A21;font-size:16px;line-height:1.6;">
<p style="margin:0 0 16px 0;">Olá ${nome},</p>
<p style="margin:0;">Recebemos o seu caso — está em análise. Vamos responder no prazo máximo de 24 horas úteis.</p>
</td></tr>
<tr><td style="padding:20px 32px;background-color:#EFEDE7;font-size:13px;color:#5B6270;"><a href="https://www.dolado.pt" style="color:#0E6B5C;text-decoration:none;">www.dolado.pt</a></td></tr>
</table></td></tr></table></body></html>`;
}

const RAZAO_ELEGIVEL_PADRAO =
  "Com base nas condições do seu contrato, este caso enquadra-se nos critérios que costumamos usar para abrir uma reclamação.";
const RAZAO_NAO_ELEGIVEL_PADRAO =
  "Com base nas condições indicadas, não identificámos fundamento para reclamação neste momento.";

export async function criarVerificacaoElegibilidade(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("utilizadores")
    .select("nome")
    .eq("id", user.id)
    .single();

  const nome = perfil?.nome || user.email!;
  const setor = (formData.get("setor") as string) || "";
  const duracao = (formData.get("duracao_contrato") as string) || "";
  const empresaRespondeuBem = formData.get("empresa_respondeu_bem") === "sim";
  const descricao = ((formData.get("descricao_problema") as string) || "").trim();
  const consentimento = formData.get("consentimento") === "on";

  if (!SETORES_VALIDOS.includes(setor as Setor)) {
    redirect(`/portal/elegibilidade?erro=${encodeURIComponent("Escolha um setor válido.")}`);
  }
  if (!DURACOES_VALIDAS.includes(duracao as DuracaoContrato)) {
    redirect(`/portal/elegibilidade?erro=${encodeURIComponent("Indique a duração do contrato.")}`);
  }
  if (!descricao) {
    redirect(`/portal/elegibilidade?erro=${encodeURIComponent("Descreva o problema.")}`);
  }
  if (!consentimento) {
    redirect(
      `/portal/elegibilidade?erro=${encodeURIComponent("Tem de autorizar o tratamento dos dados para continuar.")}`,
    );
  }

  const { pontuacao, estado } = calcularElegibilidade(
    setor as Setor,
    duracao as DuracaoContrato,
    empresaRespondeuBem,
  );

  // ===== Fase 1: regra clara — vai directo ao cliente, sem IA =====
  if (estado !== "em_revisao") {
    const { error } = await supabase.from("casos_elegibilidade_portal").insert({
      utilizador_id: user.id,
      nome,
      email: user.email,
      setor,
      duracao_contrato: duracao,
      empresa_respondeu_bem: empresaRespondeuBem,
      descricao_problema: descricao,
      pontuacao_elegibilidade: pontuacao,
      estado_elegibilidade: "enviado_cliente",
      estado_final: estado,
      revisto_em: new Date().toISOString(),
    });

    if (error) {
      redirect(`/portal/elegibilidade?erro=${encodeURIComponent(error.message)}`);
    }

    await enviarEmailBrevo(
      { email: user.email!, nome },
      estado === "elegivel" ? "O seu caso parece elegível" : "Resultado da verificação de elegibilidade",
      htmlResultado(nome, estado === "elegivel", estado === "elegivel" ? RAZAO_ELEGIVEL_PADRAO : RAZAO_NAO_ELEGIVEL_PADRAO),
    );

    revalidatePath("/portal/elegibilidade");
    redirect("/portal/elegibilidade?guardado=1");
  }

  // ===== Fase 2: caso indeciso — sugestão da IA, nunca decide =====
  const avaliacao = await avaliarElegibilidadeComIA(
    setor as Setor,
    duracao as DuracaoContrato,
    empresaRespondeuBem,
    descricao,
  );

  const { error: erroInsert } = await supabase.from("casos_elegibilidade_portal").insert({
    utilizador_id: user.id,
    nome,
    email: user.email,
    setor,
    duracao_contrato: duracao,
    empresa_respondeu_bem: empresaRespondeuBem,
    descricao_problema: descricao,
    pontuacao_elegibilidade: pontuacao,
    estado_elegibilidade: "em_revisao",
    sugestao_ia_estado: avaliacao.ok ? MAPA_SUGESTAO_IA[avaliacao.sugestao.suggested_status] : null,
    sugestao_ia_razao: avaliacao.ok ? avaliacao.sugestao.reasoning : null,
    confianca_ia: avaliacao.ok ? avaliacao.sugestao.confidence : "unavailable",
    resposta_bruta_ia: avaliacao.ok ? avaliacao.bruta : null,
  });

  if (erroInsert) {
    redirect(`/portal/elegibilidade?erro=${encodeURIComponent(erroInsert.message)}`);
  }

  await enviarEmailBrevo({ email: user.email!, nome }, "Recebemos o seu caso", htmlEmAnalise(nome));

  await enviarEmailBrevo(
    { email: ADMIN_EMAIL, nome: "Thiago" },
    `[Elegibilidade] Novo caso indeciso — ${nome}`,
    `<p>Novo caso indeciso${avaliacao.ok ? " com sugestão da IA" : " (IA indisponível)"} — ${nome} (${user.email}).</p><p>Ver no backoffice: <a href="https://portal.dolado.pt/backoffice/elegibilidade">portal.dolado.pt/backoffice/elegibilidade</a></p>`,
  );

  revalidatePath("/portal/elegibilidade");
  redirect("/portal/elegibilidade?guardado=1");
}
