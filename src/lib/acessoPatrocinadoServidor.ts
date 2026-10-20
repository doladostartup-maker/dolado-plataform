import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmailBrevo } from "@/lib/email/brevo";
import { idiomaDaConta } from "@/lib/idiomaContaServidor";
import type { Acesso } from "@/lib/acesso";
import { inicioCobrancaAdesao } from "@/lib/protecaoGratuita";
import type { AvisoAcessoPendente, DependenciasAcessoPatrocinado } from "@/lib/acessoPatrocinadoAvisos";
import {
  acessosPatrocinadosLigados,
  gerarCodigoAcesso,
  lerMotivoAtivacao,
  normalizarCodigoAcesso,
  periodoSemCusto,
  type MotivoAtivacao,
  type RelatorioDistribuicao,
} from "@/lib/acessoPatrocinado";

// Protecção oferecida por um parceiro — servidor. Tudo com a service role,
// por isso cada função recebe a conta já validada pela sessão (nunca um id
// do browser) ou é chamada por uma acção que já verificou o admin. As regras
// ficam na base de dados (acesso_patrocinado_ativar, atómica, idempotente e
// com limite de tentativas) e em acessoPatrocinado.ts.

/** A activação está ligada (ACESSOS_PATROCINADOS_ATIVO=1). */
export function acessosPatrocinadosDisponiveis() {
  return acessosPatrocinadosLigados({ ACESSOS_PATROCINADOS_ATIVO: process.env.ACESSOS_PATROCINADOS_ATIVO });
}

const falha = (nome: string, error: { code?: string }) =>
  Object.assign(new Error(`${nome} falhou`), { code: error.code ?? "erro" });

export type ResultadoAtivacaoCodigo =
  | { resultado: "ativado" | "ja_ativado"; id: string; inicio: string; fim: string }
  | { resultado: Exclude<MotivoAtivacao, "ativado" | "ja_ativado"> };

/** Activação (atómica e idempotente na base de dados). */
export async function ativarCodigoParaConta(dados: {
  userId: string;
  codigo: string;
  termosVersao: string;
  textoAceite: string;
}): Promise<ResultadoAtivacaoCodigo> {
  const codigo = normalizarCodigoAcesso(dados.codigo);
  // Formato impossível: a base de dados conta a tentativa na mesma (limite),
  // por isso vai sempre lá — nunca há resposta mais rápida para códigos falsos.
  const { data, error } = await createAdminClient().rpc("acesso_patrocinado_ativar", {
    p_user: dados.userId,
    p_codigo: codigo ?? dados.codigo.slice(0, 40),
    p_termos_versao: dados.termosVersao,
    p_texto_aceite: dados.textoAceite,
  });
  if (error) throw falha("acesso_patrocinado_ativar", error);
  const r = (data ?? {}) as { resultado?: string; id?: string; inicio_em?: string; termina_em?: string };
  const motivo = lerMotivoAtivacao(r.resultado);
  if ((motivo === "ativado" || motivo === "ja_ativado") && r.id && r.inicio_em && r.termina_em) {
    return { resultado: motivo, id: r.id, inicio: r.inicio_em, fim: r.termina_em };
  }
  return { resultado: motivo === "ativado" || motivo === "ja_ativado" ? "codigo_invalido" : motivo };
}

// ---------------------------------------------------------------------------
// Portal

export type EstadoAcessoPatrocinadoPortal = {
  inicio: string;
  fim: string;
  diasRestantes: number;
  /** Nome comercial do parceiro (o cliente não lê a tabela parceiros). */
  parceiro: string | null;
  /** 1.ª cobrança de uma adesão à Protecção feita agora (fim da oferta; null = no dia). */
  primeiraCobranca: string | null;
};

/** Estado para o portal; só quando o acesso da sessão está em curso. */
export async function estadoAcessoPatrocinadoDaConta(acesso: Acesso, userId: string): Promise<EstadoAcessoPatrocinadoPortal | null> {
  const a = acesso.acessoPatrocinado;
  if (!a?.emCurso) return null;
  const { data } = await createAdminClient()
    .from("acessos_patrocinados")
    .select("parceiros(nome)")
    .eq("user_id", userId)
    .eq("estado", "ativo")
    .order("termina_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  const relacao = (data as { parceiros?: { nome?: string } | { nome?: string }[] | null } | null)?.parceiros;
  const nome = Array.isArray(relacao) ? relacao[0]?.nome : relacao?.nome;
  const cobranca = inicioCobrancaAdesao(periodoSemCusto(acesso.protecaoGratuita, a), "protecao");
  return {
    inicio: a.inicio,
    fim: a.fim,
    diasRestantes: a.diasRestantes,
    parceiro: nome ?? null,
    primeiraCobranca: acesso.temSubscricao ? null : cobranca?.toISOString() ?? null,
  };
}

// ---------------------------------------------------------------------------
// Avisos (job) — dependências reais (service_role + Brevo).

export function dependenciasAcessoPatrocinado(): DependenciasAcessoPatrocinado {
  const admin = createAdminClient();
  return {
    async pendentes() {
      const { data, error } = await admin.rpc("acesso_patrocinado_avisos_pendentes", {});
      if (error) throw falha("acesso_patrocinado_avisos_pendentes", error);
      return (data ?? []) as AvisoAcessoPendente[];
    },
    async reservar(acessoId, marco) {
      const { data, error } = await admin.rpc("acesso_patrocinado_aviso_reservar", { p_id: acessoId, p_marco: marco });
      if (error) throw falha("acesso_patrocinado_aviso_reservar", error);
      return (data as string | null) ?? null;
    },
    idiomaDaConta,
    enviarEmail: (destinatario, assunto, html, texto) => enviarEmailBrevo(destinatario, assunto, html, texto),
    async concluir(avisoId, enviado, erro, repetir = true) {
      const { error } = await admin.rpc("acesso_patrocinado_aviso_concluir", {
        p_aviso: avisoId,
        p_enviado: enviado,
        p_erro: erro ?? null,
        p_repetir: repetir,
      });
      if (error) throw falha("acesso_patrocinado_aviso_concluir", error);
    },
  };
}

// ---------------------------------------------------------------------------
// Backoffice (só chamadas por acções que já verificaram o admin)

/**
 * Emite N códigos de um pacote. Os códigos em claro só existem na resposta
 * desta função (para a exportação única); a base de dados guarda o hash.
 */
export type ResultadoEmissao =
  | { resultado: "emitidos"; codigos: string[] }
  | { resultado: string; disponiveis: number | null };

export async function emitirCodigosDoPacote(pacoteId: string, quantidade: number, adminId: string): Promise<ResultadoEmissao> {
  const codigos = new Set<string>();
  while (codigos.size < quantidade) codigos.add(gerarCodigoAcesso(randomBytes(16)));
  const lista = [...codigos];
  const { data, error } = await createAdminClient().rpc("parceiro_pacote_emitir_codigos", {
    p_pacote: pacoteId,
    p_codigos: lista,
    p_admin: adminId,
  });
  if (error) throw falha("parceiro_pacote_emitir_codigos", error);
  const r = (data ?? {}) as { resultado?: string; disponiveis?: number };
  if (r.resultado === "emitidos") return { resultado: "emitidos", codigos: lista };
  return { resultado: r.resultado ?? "erro", disponiveis: r.disponiveis ?? null };
}

export async function relatorioDistribuicao(parceiroId: string): Promise<RelatorioDistribuicao> {
  const { data, error } = await createAdminClient().rpc("parceiro_relatorio_distribuicao", { p_parceiro: parceiroId });
  if (error) throw falha("parceiro_relatorio_distribuicao", error);
  const r = (data ?? {}) as Partial<RelatorioDistribuicao>;
  return {
    adquiridos: Number(r.adquiridos ?? 0),
    emitidos: Number(r.emitidos ?? 0),
    ativados: Number(r.ativados ?? 0),
    disponiveis: Number(r.disponiveis ?? 0),
    expirados: Number(r.expirados ?? 0),
    anulados: Number(r.anulados ?? 0),
    ativos_agora: Number(r.ativos_agora ?? 0),
  };
}
