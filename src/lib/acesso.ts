// Regras de acesso por plano — sem efeitos, para serem testáveis com
// `node --test`. Quem lê a base de dados é src/lib/auth.ts.
//
// Proteção (4,99 €/mês): funcionalidades de proteção; não inclui casos.
// Caso + Proteção (7,99 €/mês): proteção + 1 crédito de caso por ciclo pago
//   (acumula até 4).
// Avulso (14,99 €): +1 crédito de caso por compra; não dá proteção.
// Sem linha em user_access (piloto Remax / registo livre): continua como
//   antes — sem proteção, casos no portal sem crédito.
//
// "Funcionalidades de proteção" são as que hoje estão marcadas "Somente
// Assinantes" (alertas de fidelização e de promoção, aviso sectorial,
// comparador de faturas, simulador de elegibilidade). Funcionalidades
// futuras de proteção usam a mesma verificação (temProtecao).

export type PlanoSubscricao = "none" | "protecao" | "caso_protecao";

export type LinhaAcesso = {
  subscription_plan: string | null;
  subscription_status: string | null;
  case_credits: number | null;
};

export type Acesso = {
  /** A conta comprou algum plano (tem linha em user_access). */
  temPlanoStripe: boolean;
  plano: PlanoSubscricao;
  estadoSubscricao: string | null;
  creditos: number;
  /** Funcionalidades de proteção desbloqueadas. */
  temProtecao: boolean;
  /** Pode abrir um caso novo no portal agora. */
  podeCriarCaso: boolean;
  /** Abrir um caso gasta um crédito. */
  casoConsomeCredito: boolean;
};

export const LIMITE_CREDITOS_MENSAIS = 4;

// past_due mantém o acesso: o Stripe ainda está a tentar cobrar.
const ESTADOS_COM_ACESSO: ReadonlySet<string> = new Set(["active", "trialing", "past_due"]);

export function estadoComAcesso(status: string | null | undefined) {
  return !!status && ESTADOS_COM_ACESSO.has(status);
}

function lerPlano(valor: string | null | undefined): PlanoSubscricao {
  return valor === "protecao" || valor === "caso_protecao" ? valor : "none";
}

export function calcularAcesso(linha: LinhaAcesso | null): Acesso {
  if (!linha) {
    return {
      temPlanoStripe: false,
      plano: "none",
      estadoSubscricao: null,
      creditos: 0,
      temProtecao: false,
      podeCriarCaso: true,
      casoConsomeCredito: false,
    };
  }

  const plano = lerPlano(linha.subscription_plan);
  const creditos = Math.max(0, linha.case_credits ?? 0);
  return {
    temPlanoStripe: true,
    plano,
    estadoSubscricao: linha.subscription_status,
    creditos,
    temProtecao: plano !== "none" && estadoComAcesso(linha.subscription_status),
    podeCriarCaso: creditos > 0,
    casoConsomeCredito: true,
  };
}

export type AvisoPortal = "pagamento_pendente" | "pagamento_falhado" | "plano_ativo" | null;

/**
 * Aviso a mostrar no painel. Só lê estado real (acesso na base de dados e o
 * último pagamento da conta); `regressoDoCheckout` (?upgraded=true) apenas
 * escolhe a mensagem de sucesso — nunca dá acesso.
 */
export function avisoDoPortal({
  regressoDoCheckout,
  acesso,
  ultimoPagamentoEstado,
}: {
  regressoDoCheckout: boolean;
  acesso: Acesso;
  ultimoPagamentoEstado: string | null;
}): AvisoPortal {
  if (ultimoPagamentoEstado === "pendente") return "pagamento_pendente";
  if (ultimoPagamentoEstado === "falhado") return "pagamento_falhado";
  if (regressoDoCheckout && acesso.temProtecao) return "plano_ativo";
  return null;
}
