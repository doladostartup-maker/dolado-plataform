// Associação de uma compra paga sem conta a uma conta EXISTENTE — sem
// efeitos diretos (tudo por `DependenciasAssociacao`), testável com
// `node --test`.
//
// Nunca por e-mail sozinho. Só associa se, ao mesmo tempo:
//   1. há sessão autenticada (lida no servidor);
//   2. o e-mail da conta está confirmado;
//   3. esse e-mail é o da Checkout Session (lida ao Stripe, no servidor);
//   4. a sessão está concluída e o pagamento confirmado;
//   5. a compra não está ligada a nenhuma conta e 6. nunca foi reclamada;
//   7. o Customer/subscrição da sessão são os gravados pelo webhook.
// 5–7 (e de novo 2–3) são validados na base de dados, de forma atómica, por
// reclamar_compra_sem_conta(): duas contas nunca reclamam a mesma compra e
// repetir é idempotente. Cada associação fica em associacoes_compra.
//
// Subscrição nova numa conta que já tem outra ativa: não se juntam nem se
// cancela/reembolsa nada — fica "duplicado_por_rever" e o admin é avisado.

import type Stripe from "stripe";
import {
  aplicarCompraConfirmadaNaConta,
  idDe,
  pagamentoDaSessaoConfirmado,
  type DependenciasWebhook,
} from "../stripe/webhook.ts";

export type ContaAutenticada = { id: string; email: string | null; emailConfirmado: boolean };

export type ResultadoReclamacao =
  | "associada"
  | "ja_associada"
  | "duplicado_por_rever"
  | "ja_em_revisao"
  | "outra_conta"
  | "sem_pagamento"
  | "pagamento_nao_confirmado"
  | "email_nao_confirmado"
  | "email_diferente"
  | "dados_diferentes";

export type ResultadoAssociacao =
  | ResultadoReclamacao
  | "sem_sessao"
  | "sessao_invalida"
  | "compra_com_conta";

export interface DependenciasAssociacao {
  contaAutenticada(): Promise<ContaAutenticada | null>;
  /** Checkout Session lida ao Stripe (nunca dados do browser); null se não existir. */
  lerSessaoStripe(sessionId: string): Promise<Stripe.Checkout.Session | null>;
  reclamar(dados: {
    sessionId: string;
    userId: string;
    customerId: string | null;
    subscriptionId: string | null;
    subscricaoExistente: string | null;
  }): Promise<ResultadoReclamacao>;
  /** Dependências do webhook: subscrição ativa da conta, aplicar a compra, avisar o admin. */
  webhook: DependenciasWebhook;
}

export function normalizarEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

/**
 * Validações que dependem só da Checkout Session e da conta (antes de ir à
 * base de dados). A sessão tem de ser do fluxo público (sem user_id nos
 * metadados — essas compras já pertencem a uma conta).
 */
export function avaliarSessaoParaAssociar(
  session: Pick<Stripe.Checkout.Session, "status" | "payment_status" | "metadata" | "customer_details">,
  conta: ContaAutenticada,
): "ok" | "sessao_invalida" | "compra_com_conta" | "pagamento_nao_confirmado" | "email_nao_confirmado" | "email_diferente" {
  if (session.status !== "complete" || !session.metadata?.plano || !session.customer_details?.email) {
    return "sessao_invalida";
  }
  if (session.metadata.user_id) return "compra_com_conta";
  if (!pagamentoDaSessaoConfirmado(session)) return "pagamento_nao_confirmado";
  if (!conta.emailConfirmado || !conta.email) return "email_nao_confirmado";
  if (normalizarEmail(conta.email) !== normalizarEmail(session.customer_details.email)) return "email_diferente";
  return "ok";
}

export async function associarCompraAConta(
  sessionId: string,
  deps: DependenciasAssociacao,
): Promise<ResultadoAssociacao> {
  const conta = await deps.contaAutenticada();
  if (!conta) return "sem_sessao";

  const session = await deps.lerSessaoStripe(sessionId);
  if (!session) return "sessao_invalida";
  const avaliacao = avaliarSessaoParaAssociar(session, conta);
  if (avaliacao !== "ok") return avaliacao;

  const subscriptionId = session.mode === "subscription" ? idDe(session.subscription) : null;
  const existente = subscriptionId ? await deps.webhook.subscricaoAtivaDaConta(conta.id) : null;

  const resultado = await deps.reclamar({
    sessionId: session.id,
    userId: conta.id,
    customerId: idDe(session.customer),
    subscriptionId,
    subscricaoExistente: existente && existente !== subscriptionId ? existente : null,
  });

  if (resultado === "associada" || resultado === "ja_associada") {
    // Idempotente (créditos por origem, subscrição por id): repetir depois
    // de uma falha completa o que faltou, sem duplicar.
    await aplicarCompraConfirmadaNaConta(session, conta.id, deps.webhook);
  }
  if (resultado === "duplicado_por_rever" && subscriptionId && existente) {
    await deps.webhook.notificarAdmin(
      "Subscrição duplicada por rever — DoLado",
      `A conta ${conta.id} pediu para associar a compra ${session.id} (subscrição ${subscriptionId}), mas já tem a subscrição ativa ${existente}. ` +
        "A nova subscrição NÃO foi aplicada à conta; nada foi cancelado nem reembolsado. " +
        "Ação recomendada: confirmar com o cliente, cancelar no Stripe Dashboard a subscrição a mais e, se houve cobrança, decidir o reembolso; depois marcar como resolvida no backoffice.",
    );
  }
  return resultado;
}

/** Texto para o cliente (português europeu, sem detalhes técnicos). */
export const MENSAGENS_ASSOCIACAO: Record<ResultadoAssociacao, string> = {
  associada: "A compra foi associada à sua conta.",
  ja_associada: "Esta compra já está associada à sua conta.",
  duplicado_por_rever:
    "A sua conta já tem uma subscrição ativa, por isso esta compra não foi somada à conta. A DoLado vai analisar a situação e responder-lhe por e-mail no prazo máximo de 48 horas úteis.",
  ja_em_revisao:
    "Esta compra já está em análise pela DoLado. A DoLado responde-lhe por e-mail no prazo máximo de 48 horas úteis.",
  outra_conta: "Esta compra já está associada a outra conta. Se precisar de ajuda, contacte-nos.",
  sem_pagamento: "Ainda estamos a confirmar este pagamento. Tente novamente dentro de alguns minutos.",
  pagamento_nao_confirmado:
    "O pagamento desta compra ainda não está confirmado. Assim que for confirmado, pode associá-la à sua conta.",
  email_nao_confirmado: "Confirme primeiro o e-mail da sua conta e depois volte a esta página.",
  email_diferente:
    "O e-mail da sua conta não é o e-mail usado no pagamento. Inicie sessão com a conta que usa o mesmo e-mail.",
  dados_diferentes: "Não foi possível confirmar os dados desta compra. Contacte-nos para a associarmos.",
  sem_sessao: "Inicie sessão para associar esta compra.",
  sessao_invalida: "Não encontrámos esta compra.",
  compra_com_conta: "Esta compra já pertence a uma conta. Inicie sessão para a ver no portal.",
};
