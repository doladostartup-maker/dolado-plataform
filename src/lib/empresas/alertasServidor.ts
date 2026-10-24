// DoLado Empresas — envio dos alertas do Monitor e do resumo mensal
// (servidor). Fase 8. Chamado pela rota interna das empresas
// (/api/internal/empresas-avisos, pg_cron de hora a hora): nunca pela Edge
// Function verificar-monitor-datas dos particulares.
//
// Cada envio é reservado na base de dados antes de sair (nunca em
// duplicado); uma falha antes do envio liberta a reserva para a execução
// seguinte. Destinatário: sempre o e-mail actual e confirmado da conta.

import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmailBrevo } from "@/lib/email/brevo";
import {
  montarHtmlFacturaEmFalta,
  montarHtmlPrazoEmpresa,
  montarHtmlResumoEmpresa,
  textoResumoEmpresa,
} from "@/lib/email/empresas";
import { emailDaConta } from "./contaServidor.ts";
import { dataPorExtenso } from "./ciclo.ts";
import { nomeServico } from "./painel.ts";
import { carregarDadosPortal } from "./portalServidor.ts";
import {
  ASSUNTO_FACTURA_EM_FALTA,
  RESUMO_EMPRESA_MODELO,
  assuntoPrazo,
  assuntoResumo,
  fraseQuando,
  montarResumoEmpresa,
  notaPreaviso,
  seccoesResumo,
  type RegraPrazo,
} from "./alertas.ts";

type Contagem = { enviados: number; falhados: number };

function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
}

const PORTAL = "https://portal.dolado.pt";

async function contaDaOrganizacao(organizacaoId: string): Promise<{ email: string; nome: string; utilizadorId: string } | null> {
  const admin = createAdminClient();
  const [{ data: org }, { data: membro }] = await Promise.all([
    admin.from("organizacoes").select("nome").eq("id", organizacaoId).maybeSingle(),
    admin.from("organizacoes_membros").select("utilizador_id").eq("organizacao_id", organizacaoId).is("removido_em", null).maybeSingle(),
  ]);
  if (!org || !membro) return null;
  const email = await emailDaConta(membro.utilizador_id as string);
  return email ? { email, nome: org.nome as string, utilizadorId: membro.utilizador_id as string } : null;
}

type PrazoPendente = {
  organizacao_id: string;
  contrato_id: string;
  regra: RegraPrazo;
  data_alvo: string;
  fornecedor: string | null;
  setor: string | null;
  instalacao: string | null;
  descricao_promocao: string | null;
  preaviso_dias: number | null;
};

/** Alertas de prazo (60/30 dias ou pré-aviso + 30, e na data). */
export async function enviarPrazosEmpresas(hoje: string): Promise<Contagem> {
  const admin = createAdminClient();
  const r: Contagem = { enviados: 0, falhados: 0 };
  const { data, error } = await admin.rpc("empresa_alertas_pendentes", { p_hoje: hoje });
  if (error) throw new Error(`empresa_alertas_pendentes: ${error.message}`);

  for (const a of (data ?? []) as PrazoPendente[]) {
    const chave = { p_contrato: a.contrato_id, p_regra: a.regra, p_data_alvo: a.data_alvo };
    const { data: reservado } = await admin.rpc("monitor_reservar_alerta", chave);
    if (!reservado) continue;
    try {
      const conta = await contaDaOrganizacao(a.organizacao_id);
      if (!conta) throw new Error("sem_destinatario");
      const dias = diasEntre(hoje, a.data_alvo);
      const assunto = assuntoPrazo(a.regra, dias);
      await enviarEmailBrevo(
        conta.email,
        assunto,
        montarHtmlPrazoEmpresa({
          organizacao: conta.nome,
          fidelizacao: a.regra.startsWith("fidelizacao"),
          servico: nomeServico(a),
          instalacao: a.instalacao,
          quando: fraseQuando(dias, dataPorExtenso(a.data_alvo)),
          descricaoPromocao: a.descricao_promocao,
          notaPreaviso: notaPreaviso(a.regra, a.preaviso_dias, dias),
          assunto,
        }),
      );
      r.enviados++;
    } catch (e) {
      await admin.rpc("monitor_libertar_alerta", chave);
      console.error(`[empresas] alerta ${a.regra}:`, (e as { code?: string; message?: string }).code ?? "erro");
      r.falhados++;
    }
  }
  return r;
}

type FacturaEmFalta = {
  organizacao_id: string;
  contrato_id: string;
  fornecedor: string | null;
  setor: string | null;
  instalacao: string | null;
  ultima_emissao: string;
  referencia: string;
};

/** Factura esperada em falta: um lembrete por serviço e por mês. */
export async function enviarFacturasEmFalta(hoje: string): Promise<Contagem> {
  const admin = createAdminClient();
  const r: Contagem = { enviados: 0, falhados: 0 };
  const { data, error } = await admin.rpc("empresa_facturas_em_falta", { p_hoje: hoje });
  if (error) throw new Error(`empresa_facturas_em_falta: ${error.message}`);

  for (const f of (data ?? []) as FacturaEmFalta[]) {
    const { data: id } = await admin.rpc("empresa_alerta_reservar", {
      p_organizacao: f.organizacao_id,
      p_contrato: f.contrato_id,
      p_tipo: "factura_em_falta",
      p_referencia: f.referencia,
    });
    if (!id) continue;
    try {
      const conta = await contaDaOrganizacao(f.organizacao_id);
      if (!conta) throw new Error("sem_destinatario");
      await enviarEmailBrevo(
        conta.email,
        ASSUNTO_FACTURA_EM_FALTA,
        montarHtmlFacturaEmFalta({ organizacao: conta.nome, servico: nomeServico(f), instalacao: f.instalacao, ultima: dataPorExtenso(f.ultima_emissao) }),
      );
      await admin.rpc("empresa_alerta_concluir", { p_id: id, p_enviado: true });
      r.enviados++;
    } catch (e) {
      await admin.rpc("empresa_alerta_concluir", { p_id: id, p_enviado: false });
      console.error("[empresas] factura em falta:", (e as { code?: string }).code ?? "erro");
      r.falhados++;
    }
  }
  return r;
}

/** Resumo mensal do mês `mesReferencia` (AAAA-MM-01). */
export async function enviarResumosEmpresas(mesReferencia: string, hoje: string): Promise<Contagem> {
  const admin = createAdminClient();
  const r: Contagem = { enviados: 0, falhados: 0 };
  const { data, error } = await admin.rpc("empresa_resumo_destinatarios", { p_mes: mesReferencia });
  if (error) throw new Error(`empresa_resumo_destinatarios: ${error.message}`);
  const mes = mesReferencia.slice(0, 7);

  for (const d of (data ?? []) as { organizacao_id: string; utilizador_id: string; nome_organizacao: string }[]) {
    const { data: id } = await admin.rpc("empresa_resumo_reservar", { p_organizacao: d.organizacao_id, p_mes: mesReferencia });
    if (!id) continue;
    let enviado = false;
    try {
      const email = await emailDaConta(d.utilizador_id);
      if (!email) throw new Error("sem_destinatario");
      // Os mesmos dados e as mesmas funções do painel (filtro pelo
      // utilizador da organização, explícito também com a service role).
      const dados = await carregarDadosPortal(admin, d.organizacao_id, d.utilizador_id);
      const conteudo = montarResumoEmpresa({ organizacao: d.nome_organizacao, ...dados }, mes, hoje);
      const seccoes = seccoesResumo(conteudo, dataPorExtenso);
      const href = `${PORTAL}/empresa/resumos/${mes}`;
      const assunto = assuntoResumo(mes);
      await enviarEmailBrevo(
        email,
        assunto,
        montarHtmlResumoEmpresa({ assunto, organizacao: d.nome_organizacao, seccoes, href }),
        textoResumoEmpresa({ organizacao: d.nome_organizacao, seccoes, href }),
      );
      enviado = true;
      await admin.rpc("empresa_resumo_concluir", { p_id: id, p_enviado: true, p_conteudo: conteudo, p_modelo_versao: RESUMO_EMPRESA_MODELO });
      r.enviados++;
    } catch (e) {
      // Depois de o e-mail sair, nunca repetir (resultado incerto).
      await admin.rpc("empresa_resumo_concluir", { p_id: id, p_enviado: false, p_erro: enviado ? "conclusao" : "envio", p_repetir: !enviado });
      console.error("[empresas] resumo mensal:", (e as { code?: string }).code ?? "erro");
      r.falhados++;
    }
  }
  return r;
}
