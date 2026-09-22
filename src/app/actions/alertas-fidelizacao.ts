"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";

const MESES_FIDELIZACAO_HABITUAL = 24;

async function obterIp() {
  const h = await headers();
  const encaminhado = h.get("x-forwarded-for");
  return encaminhado?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

function validEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function estimarFimFidelizacao(dataInicio: string): string {
  // Construído inteiramente em UTC (Date.UTC), sem passar por conversões de
  // fuso horário local — evita que o resultado "deslize" um dia consoante o
  // fuso do servidor.
  const [ano, mes, dia] = dataInicio.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1 + MESES_FIDELIZACAO_HABITUAL, dia));
  return d.toISOString().slice(0, 10);
}

export type EstadoAlertaFidelizacao = { ok: boolean; erro?: string };

export async function criarAlertaFidelizacao(
  _estadoAnterior: EstadoAlertaFidelizacao,
  formData: FormData,
): Promise<EstadoAlertaFidelizacao> {
  // Honeypot — resposta de sucesso fingida, para não sinalizar a um robô
  // que foi detectado.
  if ((formData.get("website") as string)?.trim()) {
    return { ok: true };
  }

  const ip = await obterIp();
  if (excedeuLimiteTaxa(`alerta-fidelizacao:${ip}`)) {
    return { ok: false, erro: "Demasiados pedidos. Tente novamente dentro de alguns minutos." };
  }

  const email = ((formData.get("email") as string) || "").trim();
  const operadora = ((formData.get("operadora") as string) || "").trim();
  const dataFimIndicada = ((formData.get("data_fim_fidelizacao") as string) || "").trim();
  const dataInicio = ((formData.get("data_inicio_contrato") as string) || "").trim();
  const consentimento = formData.get("consentimento") === "on";

  if (!validEmail(email)) {
    return { ok: false, erro: "Insira um e-mail válido." };
  }
  if (!operadora) {
    return { ok: false, erro: "Indique a operadora ou prestador." };
  }
  if (!consentimento) {
    return { ok: false, erro: "Tem de autorizar o tratamento dos dados para continuar." };
  }

  let dataFimFidelizacao: string | null = dataFimIndicada || null;
  let dataEstimada = false;

  if (!dataFimFidelizacao && dataInicio) {
    dataFimFidelizacao = estimarFimFidelizacao(dataInicio);
    dataEstimada = true;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("alertas_fidelizacao").insert({
    email,
    operadora,
    data_fim_fidelizacao: dataFimFidelizacao,
    data_inicio_contrato: dataInicio || null,
    data_estimada: dataEstimada,
  });

  if (error) {
    return { ok: false, erro: "Erro ao enviar. Por favor tente novamente." };
  }

  return { ok: true };
}
