"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type EstadoLead = { ok: boolean; erro?: string };

const SETOR_LABELS: Record<string, string> = {
  telecom: "Telecomunicações",
  energia: "Energia",
  agua: "Água",
};

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

// Insere um lead público (formulário da landing, sem sessão) directamente
// na tabela `casos` via service role — a RLS de insert exige utilizador_id,
// que aqui não existe.
export async function criarLeadPublico(
  _estadoAnterior: EstadoLead,
  formData: FormData,
): Promise<EstadoLead> {
  const nome = ((formData.get("nome") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim();
  const telefone = ((formData.get("telefone") as string) || "").trim();
  const setorValue = ((formData.get("setor") as string) || "").trim();
  const tipoProblema = ((formData.get("tipo_problema") as string) || "").trim();
  const descricao = ((formData.get("descricao") as string) || "").trim();
  const autorizacao = formData.get("autorizacao") === "on";

  if (!validNome(nome)) return { ok: false, erro: "Insira um nome válido." };
  if (!validEmail(email)) return { ok: false, erro: "E-mail inválido." };
  if (!validPhone(telefone)) return { ok: false, erro: "Telefone inválido." };
  if (!setorValue || !tipoProblema) {
    return { ok: false, erro: "Selecione o setor e o tipo de problema." };
  }
  if (!autorizacao) {
    return { ok: false, erro: "Deve aceitar a Política de Privacidade para continuar." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("casos").insert({
    nome,
    email,
    telefone: telefone || null,
    sector: SETOR_LABELS[setorValue] ?? setorValue,
    tipo_problema: tipoProblema,
    descricao: descricao || null,
    autorizacao,
    status: "Novo",
  });

  if (error) {
    return { ok: false, erro: "Erro ao enviar. Por favor tente novamente." };
  }

  return { ok: true };
}
