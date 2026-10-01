"use server";

// Upload do anexo do formulário "Tratar o meu caso" (antes de haver conta):
// URL assinada para a pasta "pendentes/", com o caminho decidido aqui. O
// anexo só fica ligado a um caso quando o pedido é pago e convertido.

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
