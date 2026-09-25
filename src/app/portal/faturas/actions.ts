"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extrairValoresFatura, gerarAnalise } from "@/lib/facturas/extrairFatura";

const BUCKET = "faturas-comparador";
const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10 MB
const TIPOS_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif"];
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "thiago.pereira@dolado.pt";

export type EstadoUploadFatura =
  | { ok: true; caminho: string; signedUrl: string; token: string }
  | { ok: false; erro: string };

export async function criarUploadAssinadoFatura(
  nomeFicheiro: string,
  tipoMime: string,
  tamanho: number,
): Promise<EstadoUploadFatura> {
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
    // O e-mail nunca pode bloquear o fluxo — a comparação já está gravada.
    console.error("Falha ao enviar e-mail do comparador de faturas:", erro);
  }
}

function htmlResultadoCliente(
  nome: string,
  operadora: string,
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
<p style="margin:0;">Se encontrar erros na leitura automática, responda a este e-mail.</p>
</td></tr>
<tr><td style="padding:20px 32px;background-color:#EFEDE7;font-size:13px;color:#5B6270;"><a href="https://www.dolado.pt" style="color:#0E6B5C;text-decoration:none;">www.dolado.pt</a></td></tr>
</table></td></tr></table></body></html>`;
}

export async function criarComparacaoFaturaPortal(formData: FormData) {
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
  const operadora = ((formData.get("operadora") as string) || "").trim();
  const ficheiroCaminho = ((formData.get("ficheiro_caminho") as string) || "").trim();
  const ficheiroNome = ((formData.get("ficheiro_nome") as string) || "").trim();

  if (!ficheiroCaminho) {
    redirect(`/portal/faturas?erro=${encodeURIComponent("Envie a fatura antes de submeter.")}`);
  }

  const admin = createAdminClient();

  async function marcarParaRevisaoManual() {
    const { error } = await supabase.from("comparacoes_fatura_portal").insert({
      utilizador_id: user!.id,
      nome,
      email: user!.email,
      operadora: operadora || null,
      ficheiro_caminho: ficheiroCaminho,
      ficheiro_nome: ficheiroNome || null,
      status: "needs_manual_review",
    });

    if (error) {
      redirect(`/portal/faturas?erro=${encodeURIComponent(error.message)}`);
    }

    await enviarEmailBrevo(
      { email: ADMIN_EMAIL, nome: "Thiago" },
      `[Fatura para rever] ${nome}`,
      `<p>Nova fatura para rever de ${nome} (${user!.email}).</p><p>Ver no backoffice: <a href="https://portal.dolado.pt/backoffice/faturas">portal.dolado.pt/backoffice/faturas</a></p>`,
    );
  }

  const { data: ficheiro, error: erroDownload } = await admin.storage
    .from(BUCKET)
    .download(ficheiroCaminho);

  if (erroDownload || !ficheiro) {
    await marcarParaRevisaoManual();
    revalidatePath("/portal/faturas");
    redirect("/portal/faturas?guardado=1");
  }

  const tipoMime = ficheiro.type || "application/pdf";
  const buffer = Buffer.from(await ficheiro.arrayBuffer());
  const resultado = await extrairValoresFatura(buffer, tipoMime);

  if (!resultado.ok || resultado.extracao.confidence === "low" || resultado.extracao.total_value === null) {
    await marcarParaRevisaoManual();
    revalidatePath("/portal/faturas");
    redirect("/portal/faturas?guardado=1");
  }

  const { extracao, bruta } = resultado as Extract<typeof resultado, { ok: true }>;
  const valorAtual = extracao.total_value as number;

  let consultaAnterior = supabase
    .from("comparacoes_fatura_portal")
    .select("valor_mes_atual")
    .eq("utilizador_id", user.id)
    .eq("status", "sent_to_client")
    .not("valor_mes_atual", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  // Só compara com a fatura anterior da mesma operadora — sem isto, uma
  // fatura de água a seguir a uma de telecom seria (erradamente) comparada
  // entre si.
  if (operadora) {
    consultaAnterior = consultaAnterior.eq("operadora", operadora);
  }

  const { data: anterior } = await consultaAnterior.maybeSingle();

  const valorAnterior = anterior?.valor_mes_atual ?? null;
  const diferencaPct = valorAnterior ? ((valorAtual - valorAnterior) / valorAnterior) * 100 : null;
  const analise = gerarAnalise(valorAtual, valorAnterior);

  const { error: erroInsert } = await supabase.from("comparacoes_fatura_portal").insert({
    utilizador_id: user.id,
    nome,
    email: user.email,
    operadora: operadora || null,
    ficheiro_caminho: ficheiroCaminho,
    ficheiro_nome: ficheiroNome || null,
    valor_mes_atual: valorAtual,
    detalhe_mes_atual: extracao.breakdown ?? null,
    confianca_extracao: extracao.confidence,
    extracao_bruta: bruta,
    valor_mes_anterior: valorAnterior,
    diferenca_pct: diferencaPct !== null ? Number(diferencaPct.toFixed(2)) : null,
    analise,
    status: "sent_to_client",
  });

  if (erroInsert) {
    redirect(`/portal/faturas?erro=${encodeURIComponent(erroInsert.message)}`);
  }

  await enviarEmailBrevo(
    { email: user.email!, nome },
    "A comparação da sua fatura",
    htmlResultadoCliente(nome, operadora, valorAtual, valorAnterior, analise),
  );

  revalidatePath("/portal/faturas");
  redirect("/portal/faturas?guardado=1");
}
