// Caso Extra — regras sem efeitos, para serem testáveis com `node --test`.
// Quem lê a base de dados e fala com o Stripe é app/actions/stripe.ts.
//
// Três formas de ter direito a tratar um caso:
//   caso mensal  — incluído no Caso + Proteção: 1 por ciclo pago, acumula
//                  até 4 (case_credits - avulso_credits). Congela 90 dias no
//                  fim da subscrição.
//   Caso Extra   — compra única (11,99 €) só para subscritores do Caso +
//                  Proteção sem casos disponíveis. Não muda o plano nem a
//                  subscrição; não congela; não conta para o limite de 4.
//   Avulso       — compra única (14,99 €) para quem não tem subscrição.
//                  Pode ser convertido na 1.ª mensalidade (o Caso Extra não).
// Ordem de consumo (consumir_credito_caso): primeiro os casos mensais;
// depois a compra única mais antiga (Avulso ou Caso Extra). Um pedido pago
// com um Caso Extra gasta esse Caso Extra.
//
// O direito ao desconto é decidido aqui, no servidor, com o acesso lido da
// base de dados (gravado pelo webhook) e confirmado na subscrição Stripe —
// nunca com o que o browser envia.

import { estadoComAcesso, type Acesso } from "./acesso.ts";

/** Só uma subscrição em dia dá o benefício (past_due mantém o acesso, mas não o desconto). */
const ESTADOS_COM_BENEFICIO: ReadonlySet<string> = new Set(["active", "trialing"]);

export type MotivoSemCasoExtra = "sem_caso_protecao" | "subscricao_nao_ativa" | "tem_casos_disponiveis";

type AcessoCasoExtra = Pick<Acesso, "plano" | "estadoSubscricao" | "creditos">;

export function direitoCasoExtra(acesso: AcessoCasoExtra): { ok: true } | { ok: false; motivo: MotivoSemCasoExtra } {
  if (acesso.plano !== "caso_protecao") return { ok: false, motivo: "sem_caso_protecao" };
  if (!acesso.estadoSubscricao || !ESTADOS_COM_BENEFICIO.has(acesso.estadoSubscricao)) {
    return { ok: false, motivo: "subscricao_nao_ativa" };
  }
  // Com casos por usar (mensais acumulados, Avulso ou Caso Extra já pago),
  // usa-se um deles — não se vende outro.
  if (acesso.creditos > 0) return { ok: false, motivo: "tem_casos_disponiveis" };
  return { ok: true };
}

export function elegivelCasoExtra(acesso: AcessoCasoExtra) {
  return direitoCasoExtra(acesso).ok;
}

/**
 * Confirmação na subscrição Stripe, antes de abrir o Checkout: a subscrição
 * da conta é do Customer da conta, está ativa e é Caso + Proteção. Protege
 * de um estado desatualizado na base de dados.
 */
export function subscricaoStripeConfirmaCasoExtra(
  sub: { status: string; customerId: string | null; plano: string | null } | null,
  customerDaConta: string | null,
) {
  return (
    !!sub &&
    !!customerDaConta &&
    sub.customerId === customerDaConta &&
    ESTADOS_COM_BENEFICIO.has(sub.status) &&
    sub.plano === "caso_protecao"
  );
}

export type CasosDoMes = {
  /** O caso incluído no ciclo atual já foi usado (sem casos mensais por usar). */
  utilizado: boolean;
  /** Casos mensais por usar (inclui os acumulados de meses anteriores). */
  casosSubscricao: number;
  /** Casos comprados à parte por usar (Avulso ou Caso Extra). */
  casosComprados: number;
  /** Quando chega o próximo caso incluído (fim do período pago no Stripe), se a subscrição renovar. */
  proximoCasoEm: string | null;
  /** Fim da subscrição, se o cancelamento estiver agendado (não há próximo caso incluído). */
  subscricaoTerminaEm: string | null;
};

/**
 * "Casos deste mês" — só para o Caso + Proteção em vigor. A data do próximo
 * caso é o fim do período pago gravado a partir do Stripe
 * (user_access.current_period_end): é aí que a renovação gera o caso novo.
 */
export function casosDoMes(
  acesso: Pick<Acesso, "plano" | "estadoSubscricao" | "casosSubscricao" | "casosComprados" | "fimPeriodo" | "cancelamentoAgendado">,
): CasosDoMes | null {
  if (acesso.plano !== "caso_protecao" || !estadoComAcesso(acesso.estadoSubscricao)) return null;
  return {
    utilizado: acesso.casosSubscricao === 0,
    casosSubscricao: acesso.casosSubscricao,
    casosComprados: acesso.casosComprados,
    proximoCasoEm: acesso.cancelamentoAgendado ? null : acesso.fimPeriodo,
    subscricaoTerminaEm: acesso.cancelamentoAgendado ? acesso.fimPeriodo : null,
  };
}

/** "0 de 1 utilizado" / "1 de 1 utilizado". */
export function textoUtilizacaoMes(c: Pick<CasosDoMes, "utilizado">) {
  return c.utilizado ? "1 de 1 utilizado" : "0 de 1 utilizado";
}

/** Casos mensais acumulados além do deste mês (0 se não houver). */
export function casosAcumulados(c: Pick<CasosDoMes, "casosSubscricao">) {
  return Math.max(0, c.casosSubscricao - 1);
}

/** 2026-11-05T… → "5 de novembro de 2026" (hora de Lisboa). */
export function dataCasoExtra(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Lisbon",
  });
}
