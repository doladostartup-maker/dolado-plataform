"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";

const BUCKET = "anexos-casos";
const TAMANHO_MAXIMO_ANEXO = 10 * 1024 * 1024; // 10 MB
const TIPOS_ANEXO_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif"];

async function obterIp() {
  const h = await headers();
  const encaminhado = h.get("x-forwarded-for");
  return encaminhado?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

function validNome(v: string) {
  return v.trim().length >= 3 && !/\d/.test(v);
}
function validEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function validPhone(v: string) {
  if (v.trim() === "") return true;
  let n = v.replace(/[^\d+]/g, "");
  if (n.indexOf("+351") === 0) n = n.slice(4);
  else if (n.indexOf("351") === 0 && n.length > 9) n = n.slice(3);
  return /^9\d{8}$/.test(n);
}

export type EstadoUpload =
  | { ok: true; caminho: string; signedUrl: string; token: string }
  | { ok: false; erro: string };

export async function criarUploadAssinado(
  nomeFicheiro: string,
  tipoMime: string,
  tamanho: number,
): Promise<EstadoUpload> {
  const ip = await obterIp();
  if (excedeuLimiteTaxa(`upload:${ip}`)) {
    return { ok: false, erro: "Demasiados pedidos. Tente novamente dentro de alguns minutos." };
  }

  if (!TIPOS_ANEXO_PERMITIDOS.includes(tipoMime)) {
    return { ok: false, erro: "Tipo de ficheiro não suportado. Envie um PDF ou uma imagem." };
  }
  if (tamanho > TAMANHO_MAXIMO_ANEXO) {
    return { ok: false, erro: "O ficheiro excede o limite de 10 MB." };
  }

  const admin = createAdminClient();
  const caminho = `pendentes/${crypto.randomUUID()}-${nomeFicheiro}`;

  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(caminho);

  if (error || !data) {
    return { ok: false, erro: "Não foi possível preparar o envio do ficheiro." };
  }

  return { ok: true, caminho, signedUrl: data.signedUrl, token: data.token };
}

export type EstadoLeadGuiado = { ok: boolean; erro?: string };

export async function criarLeadGuiado(
  _estadoAnterior: EstadoLeadGuiado,
  formData: FormData,
): Promise<EstadoLeadGuiado> {
  // Honeypot — campo invisível que só um robô preenche. Resposta de
  // sucesso fingida, para não sinalizar ao robô que foi detectado.
  if ((formData.get("website") as string)?.trim()) {
    return { ok: true };
  }

  const ip = await obterIp();
  if (excedeuLimiteTaxa(`lead:${ip}`)) {
    return { ok: false, erro: "Demasiados pedidos. Tente novamente dentro de alguns minutos." };
  }

  const sector = ((formData.get("sector") as string) || "").trim();
  const empresa = ((formData.get("empresa") as string) || "").trim();
  const problemaTipo = ((formData.get("problema_tipo") as string) || "").trim();
  const descricao = ((formData.get("descricao") as string) || "").trim();
  const momentoCliente = ((formData.get("momento_cliente") as string) || "").trim();
  const anexoCaminho = ((formData.get("anexo_caminho") as string) || "").trim();
  const anexoNome = ((formData.get("anexo_nome") as string) || "").trim();
  const anexoTipo = ((formData.get("anexo_tipo") as string) || "").trim();
  const anexoTamanho = Number(formData.get("anexo_tamanho") || 0);
  const nome = ((formData.get("nome") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim();
  const telefone = ((formData.get("telefone") as string) || "").trim();
  const origem = ((formData.get("origem") as string) || "/").trim();
  const autorizacao = formData.get("autorizacao") === "on";
  const consentimentoAlertas = formData.get("consentimento_alertas") === "on";

  if (!sector || !empresa) {
    return { ok: false, erro: "Indique o setor e a empresa." };
  }
  if (!problemaTipo) {
    return { ok: false, erro: "Selecione o que aconteceu." };
  }
  if (!momentoCliente) {
    return { ok: false, erro: "Indique se já reclamou junto da empresa." };
  }
  if (!validNome(nome)) {
    return { ok: false, erro: "Insira um nome válido." };
  }
  if (!validEmail(email)) {
    return { ok: false, erro: "E-mail inválido." };
  }
  if (!validPhone(telefone)) {
    return { ok: false, erro: "Telefone inválido." };
  }
  if (!autorizacao) {
    return { ok: false, erro: "Tem de autorizar o tratamento dos dados para avançar." };
  }

  const admin = createAdminClient();
  const agora = new Date().toISOString();

  const { data: caso, error } = await admin
    .from("casos")
    .insert({
      nome,
      email,
      telefone: telefone || null,
      sector,
      empresa,
      problema_tipo: problemaTipo,
      descricao: descricao || null,
      momento_cliente: momentoCliente,
      origem,
      autorizacao,
      consentimento_tratamento_em: agora,
      consentimento_alertas: consentimentoAlertas,
      consentimento_alertas_em: consentimentoAlertas ? agora : null,
      status: "Novo",
    })
    .select("id")
    .single();

  if (error || !caso) {
    return { ok: false, erro: "Erro ao enviar. Por favor tente novamente." };
  }

  if (anexoCaminho) {
    await admin.from("anexos").insert({
      caso_id: caso.id,
      nome_ficheiro: anexoNome || anexoCaminho,
      caminho_storage: anexoCaminho,
      tipo_mime: anexoTipo || null,
      tamanho_bytes: anexoTamanho || null,
    });
  }

  return { ok: true };
}
