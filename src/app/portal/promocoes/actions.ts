"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "contratos-promocao";
const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10 MB
const TIPOS_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif"];
const ORIGENS_VALIDAS = ["manual", "api_extraida", "api_extraida_editada"];

export type EstadoUploadContrato =
  | { ok: true; caminho: string; signedUrl: string; token: string }
  | { ok: false; erro: string };

export async function criarUploadAssinadoContrato(
  nomeFicheiro: string,
  tipoMime: string,
  tamanho: number,
): Promise<EstadoUploadContrato> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Sessão expirada — inicie sessão de novo." };
  }
  if (!TIPOS_PERMITIDOS.includes(tipoMime)) {
    return { ok: false, erro: "Tipo de ficheiro não suportado. Envie um PDF ou uma imagem." };
  }
  if (tamanho > TAMANHO_MAXIMO) {
    return { ok: false, erro: "O ficheiro excede o limite de 10 MB." };
  }

  const admin = createAdminClient();
  const caminho = `${user.id}/${crypto.randomUUID()}-${nomeFicheiro}`;

  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(caminho);

  if (error || !data) {
    return { ok: false, erro: "Não foi possível preparar o envio do ficheiro." };
  }

  return { ok: true, caminho, signedUrl: data.signedUrl, token: data.token };
}

function validarDataPromocao(dataFim: string) {
  const hoje = new Date().toISOString().slice(0, 10);
  if (!dataFim) return "Indique a data de fim da promoção.";
  if (dataFim <= hoje) return "A data de fim da promoção tem de ser no futuro.";
  return null;
}

async function enviarEmailConfirmacao(
  destino: { email: string; nome: string },
  operadora: string,
  descricao: string,
  dataFim: string,
) {
  const dataFormatada = new Date(`${dataFim}T00:00:00Z`).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

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
        subject: "Alerta de fim de promoção criado",
        htmlContent: `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#F7F6F2;font-family:'Inter',Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F6F2;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;border:1px solid #E4E2DB;overflow:hidden;">
<tr><td style="padding:32px 32px 0 32px;"><span style="font-size:20px;font-weight:600;color:#0E6B5C;">DoLado</span></td></tr>
<tr><td style="padding:24px 32px 24px 32px;color:#171A21;font-size:16px;line-height:1.6;">
<p style="margin:0 0 16px 0;">Olá ${destino.nome},</p>
<p style="margin:0 0 16px 0;">Criámos um alerta para a promoção com <strong>${operadora}</strong> (${descricao}), que termina a ${dataFormatada}.</p>
<p style="margin:0 0 16px 0;">Receberá avisos: 30 dias antes, 7 dias antes, 1 dia antes.</p>
<p style="margin:0;">Sem mais,<br><span style="font-weight:600;">DoLado</span></p>
</td></tr>
<tr><td style="padding:20px 32px;background-color:#EFEDE7;font-size:13px;color:#5B6270;"><a href="https://www.dolado.pt" style="color:#0E6B5C;text-decoration:none;">www.dolado.pt</a></td></tr>
</table></td></tr></table></body></html>`,
      }),
    });
  } catch (erro) {
    // O e-mail de confirmação nunca pode bloquear a criação do alerta.
    console.error("Falha ao enviar e-mail de confirmação de alerta de promoção:", erro);
  }
}

export async function criarAlertaPromocaoPortal(formData: FormData) {
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

  const operadora = ((formData.get("operadora") as string) || "").trim();
  const descricao = ((formData.get("descricao_promocao") as string) || "").trim();
  const dataFim = ((formData.get("data_fim_promocao") as string) || "").trim();
  const origemData = ((formData.get("origem_data") as string) || "manual").trim();
  const ficheiroCaminho = ((formData.get("ficheiro_contrato_caminho") as string) || "").trim() || null;
  const ficheiroNome = ((formData.get("ficheiro_contrato_nome") as string) || "").trim() || null;
  const extracaoBrutaTexto = (formData.get("extracao_api_bruta") as string) || "";
  const extracaoConfianca = ((formData.get("extracao_api_confianca") as string) || "").trim() || null;
  const consentimento = formData.get("consentimento") === "on";

  if (!operadora) {
    redirect(`/portal/promocoes?erro=${encodeURIComponent("Indique a operadora ou prestador.")}`);
  }
  if (!descricao) {
    redirect(`/portal/promocoes?erro=${encodeURIComponent("Descreva a promoção.")}`);
  }
  if (!consentimento) {
    redirect(
      `/portal/promocoes?erro=${encodeURIComponent("Tem de autorizar o tratamento dos dados para continuar.")}`,
    );
  }
  const erroData = validarDataPromocao(dataFim);
  if (erroData) {
    redirect(`/portal/promocoes?erro=${encodeURIComponent(erroData)}`);
  }

  let extracaoBruta: unknown = null;
  if (extracaoBrutaTexto) {
    try {
      extracaoBruta = JSON.parse(extracaoBrutaTexto);
    } catch {
      extracaoBruta = null;
    }
  }

  const { error } = await supabase.from("alertas_promocao_portal").insert({
    utilizador_id: user.id,
    nome: perfil?.nome || user.email,
    email: user.email,
    operadora,
    descricao_promocao: descricao,
    data_fim_promocao: dataFim,
    origem_data: ORIGENS_VALIDAS.includes(origemData) ? origemData : "manual",
    ficheiro_contrato_caminho: ficheiroCaminho,
    ficheiro_contrato_nome: ficheiroNome,
    extracao_api_bruta: extracaoBruta,
    extracao_api_confianca: extracaoConfianca,
  });

  if (error) {
    redirect(`/portal/promocoes?erro=${encodeURIComponent(error.message)}`);
  }

  await enviarEmailConfirmacao(
    { email: user.email!, nome: perfil?.nome || user.email! },
    operadora,
    descricao,
    dataFim,
  );

  revalidatePath("/portal/promocoes");
  redirect("/portal/promocoes?guardado=1");
}

export async function actualizarAlertaPromocaoPortal(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const operadora = ((formData.get("operadora") as string) || "").trim();
  const descricao = ((formData.get("descricao_promocao") as string) || "").trim();
  const dataFim = ((formData.get("data_fim_promocao") as string) || "").trim();

  if (!operadora || !descricao) {
    redirect(
      `/portal/promocoes/${id}?erro=${encodeURIComponent("Indique a operadora e a descrição da promoção.")}`,
    );
  }
  const erroData = validarDataPromocao(dataFim);
  if (erroData) {
    redirect(`/portal/promocoes/${id}?erro=${encodeURIComponent(erroData)}`);
  }

  const { error } = await supabase
    .from("alertas_promocao_portal")
    .update({
      operadora,
      descricao_promocao: descricao,
      data_fim_promocao: dataFim,
      origem_data: "manual",
      // Mudar a data à mão invalida os avisos já enviados — podem voltar a
      // disparar para a nova data.
      alerta_30d_enviado_em: null,
      alerta_7d_enviado_em: null,
      alerta_1d_enviado_em: null,
    })
    .eq("id", id);

  if (error) {
    redirect(`/portal/promocoes/${id}?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/portal/promocoes");
  redirect("/portal/promocoes?guardado=1");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- exigido pela assinatura de Server Action ligada a um form
export async function apagarAlertaPromocaoPortal(id: string, _formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("alertas_promocao_portal").delete().eq("id", id);

  if (error) {
    redirect(`/portal/promocoes?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/portal/promocoes");
  redirect("/portal/promocoes?apagado=1");
}
