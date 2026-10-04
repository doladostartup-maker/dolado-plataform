"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTACTO_EMAIL } from "@/lib/site";
import { montarHtmlAvisoSetorial } from "@/lib/email/avisoSetorial";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

async function enviarEmailBrevo(destino: { email: string; nome: string }, assunto: string, html: string) {
  const resposta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "DoLado", email: BREVO_SENDER_EMAIL },
      replyTo: { email: CONTACTO_EMAIL, name: "DoLado" },
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

  // Só setores ativos de contas com Proteção ativa, para o e-mail atual e
  // confirmado da conta: no fim da subscrição os setores ficam desativados
  // (migração 20261002180000_alertas_desativados_fim_subscricao.sql).
  // Função só para service_role (20261003140000_…): o papel admin já foi
  // validado acima por requireAdmin().
  const { data: destinatarios } = await createAdminClient().rpc("avisos_setor_destinatarios", {
    p_setor: setor,
  });

  let enviados = 0;
  for (const destinatario of (destinatarios ?? []) as { nome: string | null; email: string | null }[]) {
    if (!destinatario.email) continue;

    const nomeExibido = destinatario.nome || destinatario.email;
    try {
      await enviarEmailBrevo(
        { email: destinatario.email, nome: nomeExibido },
        `[Aviso DoLado] Novidade no setor de ${setor}`,
        montarHtmlAvisoSetorial(nomeExibido, setor, titulo, descricao),
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
