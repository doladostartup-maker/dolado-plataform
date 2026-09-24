"use server";

import { headers } from "next/headers";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";

async function obterIp() {
  const h = await headers();
  const encaminhado = h.get("x-forwarded-for");
  return encaminhado?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

function validEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function escaparHtml(v: string) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type EstadoContacto = { ok: boolean; erro?: string };

export async function enviarContacto(
  _estadoAnterior: EstadoContacto,
  formData: FormData,
): Promise<EstadoContacto> {
  // Honeypot — resposta de sucesso fingida, para não sinalizar a um robô
  // que foi detectado.
  if ((formData.get("website") as string)?.trim()) {
    return { ok: true };
  }

  const ip = await obterIp();
  if (excedeuLimiteTaxa(`contacto:${ip}`)) {
    return { ok: false, erro: "Demasiados pedidos. Tente novamente dentro de alguns minutos." };
  }

  const nome = ((formData.get("nome") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim();
  const assunto = ((formData.get("assunto") as string) || "").trim();
  const mensagem = ((formData.get("mensagem") as string) || "").trim();

  if (!nome) {
    return { ok: false, erro: "Indique o seu nome." };
  }
  if (!validEmail(email)) {
    return { ok: false, erro: "Insira um e-mail válido." };
  }
  if (!assunto) {
    return { ok: false, erro: "Indique o assunto." };
  }
  if (!mensagem) {
    return { ok: false, erro: "Escreva a sua mensagem." };
  }

  const resposta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Site DoLado", email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: process.env.BREVO_SENDER_EMAIL, name: "DoLado" }],
      replyTo: { email, name: nome },
      subject: `Contacto via site: ${assunto}`,
      htmlContent: `<div style="font-family: Arial, sans-serif; font-size: 15px; color: #171A21; line-height: 1.6;">
        <p><strong>Nome:</strong> ${escaparHtml(nome)}</p>
        <p><strong>E-mail:</strong> ${escaparHtml(email)}</p>
        <p><strong>Assunto:</strong> ${escaparHtml(assunto)}</p>
        <p><strong>Mensagem:</strong></p>
        <p>${escaparHtml(mensagem).replace(/\n/g, "<br>")}</p>
      </div>`,
    }),
  });

  if (!resposta.ok) {
    return { ok: false, erro: "Erro ao enviar. Por favor tente novamente." };
  }

  return { ok: true };
}
