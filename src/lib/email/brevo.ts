// Envio transacional pela Brevo (mesma configuração usada no resto do
// projeto: BREVO_API_KEY, BREVO_SENDER_EMAIL, Reply-To institucional).
import { CONTACTO_EMAIL } from "@/lib/site";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "thiago.pereira@dolado.pt";

/** Lança se a Brevo recusar — quem chama decide se isso bloqueia ou não. */
export async function enviarEmailBrevo(destinatario: string, assunto: string, html: string) {
  const resposta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: "DoLado", email: process.env.BREVO_SENDER_EMAIL },
      replyTo: { email: CONTACTO_EMAIL, name: "DoLado" },
      to: [{ email: destinatario }],
      subject: assunto,
      htmlContent: html,
    }),
  });
  if (!resposta.ok) {
    throw Object.assign(new Error("Brevo recusou o envio"), { code: `brevo_${resposta.status}` });
  }
}
