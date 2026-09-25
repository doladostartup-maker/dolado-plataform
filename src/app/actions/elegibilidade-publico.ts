"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";
import { calcularElegibilidade, type DuracaoContrato, type Setor } from "@/lib/elegibilidade/regras";
import { avaliarElegibilidadeComIA } from "@/lib/elegibilidade/avaliarComIA";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "thiago.pereira@dolado.pt";
const SETORES_VALIDOS: Setor[] = ["Telecomunicações", "Energia", "Água"];
const DURACOES_VALIDAS: DuracaoContrato[] = ["menos_6m", "6_12m", "1_2anos", "mais_2anos"];

// Domínios de e-mail descartável — só filtrados na via pública; a via
// dashboard já exige conta (Google OAuth ou e-mail/senha verificado).
const DOMINIOS_EMAIL_DESCARTAVEL = [
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "yopmail.com",
  "fakeinbox.com",
  "trashmail.com",
  "getnada.com",
  "maildrop.cc",
  "mintemail.com",
  "sharklasers.com",
  "dispostable.com",
];

function emailPublicoValido(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) return false;
  const dominio = email.split("@")[1]?.toLowerCase();
  return !DOMINIOS_EMAIL_DESCARTAVEL.includes(dominio);
}

async function obterIp() {
  const h = await headers();
  const encaminhado = h.get("x-forwarded-for");
  return encaminhado?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

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
    console.error("Falha ao enviar e-mail do simulador de elegibilidade (público):", erro);
  }
}

function htmlResultado(nomeOuEmail: string, elegivel: boolean, razao: string) {
  const cta = elegivel
    ? `<p style="margin:16px 0 0 0;"><a href="https://portal.dolado.pt/registo" style="display:inline-block;background-color:#0E6B5C;color:#FFFFFF;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Abrir reclamação agora</a></p>`
    : "";

  return `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#F7F6F2;font-family:'Inter',Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F6F2;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;border:1px solid #E4E2DB;overflow:hidden;">
<tr><td style="padding:32px 32px 0 32px;"><span style="font-size:20px;font-weight:600;color:#0E6B5C;">DoLado</span></td></tr>
<tr><td style="padding:24px 32px 24px 32px;color:#171A21;font-size:16px;line-height:1.6;">
<p style="margin:0 0 16px 0;">Olá ${nomeOuEmail},</p>
<p style="margin:0 0 16px 0;">Analisámos o seu caso — <strong>${elegivel ? "parece ser elegível para reclamação" : "não é elegível para reclamação neste momento"}</strong>.</p>
<p style="margin:0;">${razao}</p>
${cta}
</td></tr>
<tr><td style="padding:20px 32px;background-color:#EFEDE7;font-size:13px;color:#5B6270;"><a href="https://www.dolado.pt" style="color:#0E6B5C;text-decoration:none;">www.dolado.pt</a></td></tr>
</table></td></tr></table></body></html>`;
}

function htmlEmAnalise(nomeOuEmail: string) {
  return `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#F7F6F2;font-family:'Inter',Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F6F2;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;border:1px solid #E4E2DB;overflow:hidden;">
<tr><td style="padding:32px 32px 0 32px;"><span style="font-size:20px;font-weight:600;color:#0E6B5C;">DoLado</span></td></tr>
<tr><td style="padding:24px 32px 24px 32px;color:#171A21;font-size:16px;line-height:1.6;">
<p style="margin:0 0 16px 0;">Olá ${nomeOuEmail},</p>
<p style="margin:0;">Recebemos o seu caso — está em análise. Vamos responder no prazo máximo de 24 horas úteis.</p>
</td></tr>
<tr><td style="padding:20px 32px;background-color:#EFEDE7;font-size:13px;color:#5B6270;"><a href="https://www.dolado.pt" style="color:#0E6B5C;text-decoration:none;">www.dolado.pt</a></td></tr>
</table></td></tr></table></body></html>`;
}

const RAZAO_ELEGIVEL_PADRAO =
  "Com base nas condições do seu contrato, este caso enquadra-se nos critérios que costumamos usar para abrir uma reclamação.";
const RAZAO_NAO_ELEGIVEL_PADRAO =
  "Com base nas condições indicadas, não identificámos fundamento para reclamação neste momento.";

const MAPA_SUGESTAO_IA: Record<string, "elegivel" | "nao_elegivel" | "pouco_claro"> = {
  eligible: "elegivel",
  not_eligible: "nao_elegivel",
  unclear: "pouco_claro",
};

export type EstadoElegibilidadePublica =
  | { fase: "formulario"; erro?: string }
  | { fase: "resultado"; emAnalise: true }
  | { fase: "resultado"; emAnalise: false; elegivel: boolean };

export async function criarVerificacaoElegibilidadePublica(
  _estadoAnterior: EstadoElegibilidadePublica,
  formData: FormData,
): Promise<EstadoElegibilidadePublica> {
  // Honeypot — resposta de sucesso fingida, para não sinalizar a um robô
  // que foi detectado.
  if ((formData.get("website") as string)?.trim()) {
    return { fase: "resultado", emAnalise: false, elegivel: false };
  }

  const ip = await obterIp();
  if (excedeuLimiteTaxa(`elegibilidade-publico:${ip}`)) {
    return { fase: "formulario", erro: "Demasiados pedidos. Tente novamente dentro de alguns minutos." };
  }

  const email = ((formData.get("email") as string) || "").trim();
  const setor = (formData.get("setor") as string) || "";
  const duracao = (formData.get("duracao_contrato") as string) || "";
  const empresaRespondeuBem = formData.get("empresa_respondeu_bem") === "sim";
  const descricao = ((formData.get("descricao_problema") as string) || "").trim();
  const consentimento = formData.get("consentimento") === "on";

  if (!emailPublicoValido(email)) {
    return { fase: "formulario", erro: "Por favor, insira um e-mail válido." };
  }
  if (!SETORES_VALIDOS.includes(setor as Setor)) {
    return { fase: "formulario", erro: "Escolha um setor válido." };
  }
  if (!DURACOES_VALIDAS.includes(duracao as DuracaoContrato)) {
    return { fase: "formulario", erro: "Indique a duração do contrato." };
  }
  if (!descricao) {
    return { fase: "formulario", erro: "Descreva o problema." };
  }
  if (!consentimento) {
    return { fase: "formulario", erro: "Tem de autorizar o tratamento dos dados para continuar." };
  }

  const admin = createAdminClient();
  const { pontuacao, estado } = calcularElegibilidade(
    setor as Setor,
    duracao as DuracaoContrato,
    empresaRespondeuBem,
  );

  // ===== Fase 1: regra clara — vai directo ao cliente, sem IA =====
  if (estado !== "em_revisao") {
    const { error } = await admin.from("casos_elegibilidade_portal").insert({
      utilizador_id: null,
      origem: "publico",
      nome: null,
      email,
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
      return { fase: "formulario", erro: "Erro ao enviar. Por favor tente novamente." };
    }

    await enviarEmailBrevo(
      { email, nome: email },
      estado === "elegivel" ? "O seu caso parece elegível" : "Resultado da verificação de elegibilidade",
      htmlResultado(email, estado === "elegivel", estado === "elegivel" ? RAZAO_ELEGIVEL_PADRAO : RAZAO_NAO_ELEGIVEL_PADRAO),
    );

    return { fase: "resultado", emAnalise: false, elegivel: estado === "elegivel" };
  }

  // ===== Fase 2: caso indeciso — sugestão da IA, nunca decide =====
  const avaliacao = await avaliarElegibilidadeComIA(
    setor as Setor,
    duracao as DuracaoContrato,
    empresaRespondeuBem,
    descricao,
  );

  const { error: erroInsert } = await admin.from("casos_elegibilidade_portal").insert({
    utilizador_id: null,
    origem: "publico",
    nome: null,
    email,
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
    return { fase: "formulario", erro: "Erro ao enviar. Por favor tente novamente." };
  }

  await enviarEmailBrevo({ email, nome: email }, "Recebemos o seu caso", htmlEmAnalise(email));

  await enviarEmailBrevo(
    { email: ADMIN_EMAIL, nome: "Thiago" },
    `[Elegibilidade · Público] Novo caso indeciso — ${email}`,
    `<p>Novo caso indeciso (via pública, sem login)${avaliacao.ok ? " com sugestão da IA" : " (IA indisponível)"} — ${email}.</p><p>Ver no backoffice: <a href="https://portal.dolado.pt/backoffice/elegibilidade">portal.dolado.pt/backoffice/elegibilidade</a></p>`,
  );

  return { fase: "resultado", emAnalise: true };
}
