import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmailBrevo } from "@/lib/email/brevo";
import { idiomaDaConta } from "@/lib/idiomaContaServidor";
import type { AvisoPendente, DependenciasProtecaoGratuita } from "@/lib/protecaoGratuitaAvisos";
import type { Acesso } from "@/lib/acesso";
import {
  estadoPortal,
  type EstadoProtecaoGratuitaPortal,
  lerMotivo,
  lerOrigem,
  normalizarEmail,
  ofertaLigada,
  type MotivoElegibilidade,
  type OrigemProtecaoGratuita,
} from "@/lib/protecaoGratuita";

// Proteção gratuita — servidor. Tudo com a service role, por isso cada
// função recebe a conta já validada pela sessão (nunca um id do browser).
// As regras ficam na base de dados (protecao_gratuita_elegibilidade /
// protecao_gratuita_ativar, atómica e idempotente) e em protecaoGratuita.ts.

/** A oferta está ligada (interruptor + chave do pseudónimo configurada). */
export function protecaoGratuitaDisponivel() {
  return ofertaLigada({
    PROTECAO_GRATUITA_ATIVA: process.env.PROTECAO_GRATUITA_ATIVA,
    PROTECAO_GRATUITA_CHAVE: process.env.PROTECAO_GRATUITA_CHAVE,
  });
}

function chave() {
  const k = process.env.PROTECAO_GRATUITA_CHAVE ?? "";
  if (k.length < 32) throw new Error("PROTECAO_GRATUITA_CHAVE em falta ou curta");
  return k;
}

/**
 * Pseudónimo do e-mail normalizado (HMAC-SHA256). É o que impede uma
 * segunda utilização com o mesmo endereço, mesmo depois de a conta ser
 * apagada — o e-mail nunca é guardado para isto.
 */
export function pseudonimoEmail(email: string): string | null {
  const normalizado = normalizarEmail(email);
  if (!normalizado) return null;
  return `hmac:${createHmac("sha256", chave()).update(`protecao_gratuita:email:${normalizado}`).digest("hex")}`;
}

/** Elegibilidade da conta da sessão (só leitura). */
export async function elegibilidadeDaConta(userId: string, email: string | null): Promise<MotivoElegibilidade> {
  if (!protecaoGratuitaDisponivel() || !email) return "conta_invalida";
  const hash = pseudonimoEmail(email);
  if (!hash) return "conta_invalida";
  const { data, error } = await createAdminClient().rpc("protecao_gratuita_elegibilidade", {
    p_user: userId,
    p_email_hash: hash,
  });
  if (error) throw Object.assign(new Error("protecao_gratuita_elegibilidade falhou"), { code: error.code });
  return lerMotivo(data);
}

export type ResultadoAtivacao =
  | { resultado: "ativada" | "ativa"; id: string; inicio: string; fim: string }
  | { resultado: Exclude<MotivoElegibilidade, "elegivel" | "ativa"> };

/** Ativação (atómica e idempotente na base de dados). */
export async function ativarParaConta(dados: {
  userId: string;
  email: string;
  origem: OrigemProtecaoGratuita | string;
  termosVersao: string;
  textoAceite: string;
}): Promise<ResultadoAtivacao> {
  const hash = pseudonimoEmail(dados.email);
  if (!hash) return { resultado: "conta_invalida" };
  const { data, error } = await createAdminClient().rpc("protecao_gratuita_ativar", {
    p_user: dados.userId,
    p_email_hash: hash,
    p_origem: lerOrigem(dados.origem),
    p_termos_versao: dados.termosVersao,
    p_texto_aceite: dados.textoAceite,
  });
  if (error) throw Object.assign(new Error("protecao_gratuita_ativar falhou"), { code: error.code });
  const r = (data ?? {}) as { resultado?: string; id?: string; inicio_em?: string; termina_em?: string };
  if ((r.resultado === "ativada" || r.resultado === "ativa") && r.id && r.inicio_em && r.termina_em) {
    return { resultado: r.resultado, id: r.id, inicio: r.inicio_em, fim: r.termina_em };
  }
  const motivo = lerMotivo(r.resultado);
  return { resultado: motivo === "elegivel" || motivo === "ativa" ? "conta_invalida" : motivo };
}

// ---------------------------------------------------------------------------
// Ligação "Não quero receber estes lembretes" (dias 7 e 25): token derivado
// do id do período com a mesma chave (nada guardado; sem sessão).

export function tokenLembretes(gratuitaId: string) {
  return createHmac("sha256", chave()).update(`protecao_gratuita:lembretes:${gratuitaId}`).digest("base64url");
}

export function tokenLembretesValido(gratuitaId: string, token: string) {
  try {
    const a = Buffer.from(tokenLembretes(gratuitaId));
    const b = Buffer.from(token);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function desativarLembretes(gratuitaId: string) {
  const { data, error } = await createAdminClient().rpc("protecao_gratuita_desativar_lembretes", { p_id: gratuitaId });
  if (error) throw Object.assign(new Error("protecao_gratuita_desativar_lembretes falhou"), { code: error.code });
  return data === true;
}

// ---------------------------------------------------------------------------
// Job (manutenção + e-mails) — dependências reais (service_role + Brevo).

export function dependenciasProtecaoGratuita(portalUrl: string): DependenciasProtecaoGratuita {
  const admin = createAdminClient();
  const falha = (nome: string, error: { code?: string }) =>
    Object.assign(new Error(`${nome} falhou`), { code: error.code ?? "erro" });
  return {
    async manutencao() {
      const { data, error } = await admin.rpc("protecao_gratuita_manutencao", {});
      if (error) throw falha("protecao_gratuita_manutencao", error);
      return (data ?? { terminadas: 0, pseudonimos_apagados: 0 }) as { terminadas: number; pseudonimos_apagados: number };
    },
    async pendentes() {
      const { data, error } = await admin.rpc("protecao_gratuita_avisos_pendentes", {});
      if (error) throw falha("protecao_gratuita_avisos_pendentes", error);
      return (data ?? []) as AvisoPendente[];
    },
    async reservar(gratuitaId, marco) {
      const { data, error } = await admin.rpc("protecao_gratuita_aviso_reservar", { p_id: gratuitaId, p_marco: marco });
      if (error) throw falha("protecao_gratuita_aviso_reservar", error);
      return (data as string | null) ?? null;
    },
    idiomaDaConta,
    async contarDocumentos(userId) {
      const { count, error } = await admin
        .from("documentos_monitor")
        .select("id", { count: "exact", head: true })
        .eq("utilizador_id", userId)
        .is("desativado_em", null);
      if (error) throw falha("documentos_monitor.count", error);
      return count ?? 0;
    },
    urlLembretes: (gratuitaId) =>
      `${portalUrl}/protecao-gratuita/lembretes?id=${encodeURIComponent(gratuitaId)}&t=${encodeURIComponent(tokenLembretes(gratuitaId))}`,
    enviarEmail: (destinatario, assunto, html, texto) => enviarEmailBrevo(destinatario, assunto, html, texto),
    async concluir(avisoId, enviado, erro, repetir = true) {
      const { error } = await admin.rpc("protecao_gratuita_aviso_concluir", {
        p_aviso: avisoId,
        p_enviado: enviado,
        p_erro: erro ?? null,
        p_repetir: repetir,
      });
      if (error) throw falha("protecao_gratuita_aviso_concluir", error);
    },
  };
}

/** Estado da Proteção gratuita para o portal (painel e Gestão de Subscrição). */
export async function estadoProtecaoGratuitaDaConta(
  acesso: Acesso,
  conta: { id: string; email?: string | null },
): Promise<EstadoProtecaoGratuitaPortal | null> {
  // Só pergunta à base de dados pela oferta quando pode fazer diferença.
  const procurarOferta = !acesso.protecaoGratuita && !acesso.temProtecao && protecaoGratuitaDisponivel() && !!conta.email;
  const elegivel = procurarOferta
    ? (await elegibilidadeDaConta(conta.id, conta.email ?? null).catch(() => "conta_invalida")) === "elegivel"
    : false;
  return estadoPortal({
    gratuita: acesso.protecaoGratuita,
    temSubscricao: acesso.temSubscricao,
    temProtecao: acesso.temProtecao,
    elegivel,
  });
}
