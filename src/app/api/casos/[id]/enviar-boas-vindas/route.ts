import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { montarHtmlBoasVindas } from "@/lib/email/boas-vindas";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: caso, error: erroCaso } = await supabase
    .from("casos")
    .select("nome, email")
    .eq("id", id)
    .single();

  if (erroCaso || !caso) {
    return NextResponse.json({ erro: "Caso não encontrado." }, { status: 404 });
  }

  if (!caso.email) {
    return NextResponse.json(
      { erro: "Este caso não tem e-mail associado." },
      { status: 400 },
    );
  }

  const resposta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Thiago - DoLado", email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: caso.email, name: caso.nome }],
      subject: "Recebemos a sua submissão — Vamos tratar pessoalmente ✓",
      htmlContent: montarHtmlBoasVindas(caso.nome),
    }),
  });

  if (!resposta.ok) {
    const corpoErro = await resposta.text();
    return NextResponse.json(
      { erro: `Falha ao enviar e-mail via Brevo: ${corpoErro}` },
      { status: 502 },
    );
  }

  const agora = new Date().toISOString();
  const { error: erroUpdate } = await supabase
    .from("casos")
    .update({ email_boas_vindas_enviado_em: agora })
    .eq("id", id);

  if (erroUpdate) {
    return NextResponse.json({ erro: erroUpdate.message }, { status: 500 });
  }

  return NextResponse.json({ enviado_em: agora });
}
