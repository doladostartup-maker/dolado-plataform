import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmailBrevo } from "@/lib/email/brevo";
import { carregarEntradasServicos } from "@/lib/monitor/protecaoCliente";
import { idiomaDaConta } from "@/lib/idiomaContaServidor";
import type { DependenciasResumoMensal, DestinatarioResumo } from "./envio";

// Dependências reais do resumo mensal (service_role + Brevo). Só código de
// servidor, chamado pela rota interna protegida pelo segredo do cron. O
// destinatário vem sempre de protecao_resumo_destinatarios (e-mail
// confirmado da conta em auth.users); os dados de cada conta são lidos com
// filtro explícito pelo dono (carregarEntradasServicos).

const falha = (nome: string, error: { code?: string }) => Object.assign(new Error(`${nome} falhou`), { code: error.code ?? "erro" });

export function dependenciasResumoMensal(
  opcoes: { enviarEmail?: DependenciasResumoMensal["enviarEmail"] } = {},
): DependenciasResumoMensal {
  const admin = createAdminClient();
  return {
    async destinatarios(mesData) {
      const { data, error } = await admin.rpc("protecao_resumo_destinatarios", { p_mes: mesData });
      if (error) throw falha("protecao_resumo_destinatarios", error);
      return (data ?? []) as DestinatarioResumo[];
    },
    async reservar(utilizadorId, mesData) {
      const { data, error } = await admin.rpc("protecao_resumo_reservar", { p_utilizador: utilizadorId, p_mes: mesData });
      if (error) throw falha("protecao_resumo_reservar", error);
      return (data as string | null) ?? null;
    },
    carregarServicos: (utilizadorId) => carregarEntradasServicos(admin, utilizadorId),
    idiomaDaConta,
    enviarEmail: opcoes.enviarEmail ?? ((destinatario, assunto, html, texto) => enviarEmailBrevo(destinatario, assunto, html, texto)),
    async concluir(reservaId, c) {
      const { error } = await admin.rpc(
        "protecao_resumo_concluir",
        c.enviado
          ? { p_id: reservaId, p_enviado: true, p_conteudo: c.conteudo, p_modelo_versao: c.modeloVersao }
          : { p_id: reservaId, p_enviado: false, p_erro: c.erro, p_repetir: c.repetir },
      );
      if (error) throw falha("protecao_resumo_concluir", error);
    },
  };
}
