import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmailBrevo } from "@/lib/email/brevo";
import { montarEmailConfirmacao, type EmailMontado } from "@/lib/email/comunicacoesComerciais";
import { normalizarIdioma, type Idioma } from "@/i18n/config";
import { comunicacoesDisponiveis, type TipoAutorizacao } from "./ligacoes";

// Comunicações comerciais no servidor (service_role; funções comunicacoes_*
// de 20261024090000_comunicacoes_dupla_confirmacao.sql). Nunca registar o
// e-mail em logs.

const erro = (origem: string, e: unknown) =>
  console.error(JSON.stringify({ origem, erro_codigo: (e as { code?: string })?.code ?? "erro" }));

/**
 * Envia o e-mail de confirmação da autorização sem conta deste e-mail, se
 * houver uma por confirmar e não tiver saído nas últimas 24 h. Nunca lança:
 * corre depois da resposta (after) e não pode afectar o pedido do guia.
 */
export async function enviarConfirmacaoSePreciso(email: string, idioma: Idioma): Promise<void> {
  // Sem chave, não há ligação: nada é reservado.
  if (!comunicacoesDisponiveis()) return;
  const admin = createAdminClient();
  let id: string | null = null;
  try {
    const { data, error } = await admin.rpc("comunicacoes_reservar_confirmacao", { p_email: email });
    if (error) throw error;
    id = (data as string | null) ?? null;
    if (!id) return;
    const m = montarEmailConfirmacao(id, idioma) as EmailMontado;
    await enviarEmailBrevo(email, m.assunto, m.html, m.texto);
  } catch (e) {
    erro("comunicacoes_confirmacao", e);
    if (id) await admin.rpc("comunicacoes_libertar_confirmacao", { p_id: id }).then(() => undefined, () => undefined);
  }
}

export type ResultadoConfirmar = "confirmado" | "ja_confirmado" | "retirado" | "expirado" | "inexistente";
export type ResultadoRetirar = "retirado" | "ja_retirado" | "inexistente";

export async function confirmarEndereco(id: string): Promise<ResultadoConfirmar> {
  const { data, error } = await createAdminClient().rpc("comunicacoes_confirmar", { p_id: id });
  if (error) throw Object.assign(new Error("comunicacoes_confirmar falhou"), { code: error.code });
  return data as ResultadoConfirmar;
}

export async function retirarAutorizacao(tipo: TipoAutorizacao, id: string): Promise<ResultadoRetirar> {
  const { data, error } = await createAdminClient().rpc("comunicacoes_retirar", { p_tipo: tipo, p_id: id });
  if (error) throw Object.assign(new Error("comunicacoes_retirar falhou"), { code: error.code });
  return data as ResultadoRetirar;
}

/** Destinatário de um envio comercial: só vem de comunicacoes_destinatarios(). */
export type DestinatarioComercial = { tipo: TipoAutorizacao; consentimentoId: string; email: string; idioma: Idioma };

/** Única fonte de destinatários: autorizações activas e confirmadas, um por endereço. */
export async function destinatariosComerciais(): Promise<DestinatarioComercial[]> {
  const { data, error } = await createAdminClient().rpc("comunicacoes_destinatarios");
  if (error) throw Object.assign(new Error("comunicacoes_destinatarios falhou"), { code: error.code });
  return ((data ?? []) as { tipo: TipoAutorizacao; consentimento_id: string; email: string; idioma: string }[]).map((d) => ({
    tipo: d.tipo,
    consentimentoId: d.consentimento_id,
    email: d.email,
    idioma: normalizarIdioma(d.idioma),
  }));
}

/** Envia um e-mail montado por montarEmailComercial (com a ligação e os cabeçalhos para deixar de receber). */
export async function enviarEmailComercial(destinatario: DestinatarioComercial, email: EmailMontado): Promise<void> {
  if (!email.cabecalhos?.["List-Unsubscribe"]) throw Object.assign(new Error("e-mail comercial sem ligação para deixar de receber"), { code: "sem_ligacao" });
  await enviarEmailBrevo(destinatario.email, email.assunto, email.html, email.texto, email.cabecalhos);
}
