// Regras de acesso por plano — sem efeitos, para serem testáveis com
// `node --test`. Quem lê a base de dados é src/lib/auth.ts.
//
// Planos, preços e Price IDs: src/lib/planos.ts. Aqui só as regras:
// Proteção: funcionalidades de proteção; não inclui casos.
// Caso + Proteção: proteção + 1 crédito de caso por ciclo pago (acumula
//   até 4). Na interface, "créditos" chamam-se sempre "casos disponíveis".
// Avulso: +1 crédito de caso por compra; não dá proteção.
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
  current_period_end?: string | null;
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
  /** Fim do período pago da subscrição (ISO), se houver. */
  fimPeriodo: string | null;
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
      fimPeriodo: null,
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
    fimPeriodo: linha.current_period_end ?? null,
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

// ---------------------------------------------------------------------------
// Plano apresentado no portal. Só lê estado real (user_access e pagamentos
// da própria conta, gravados pelo webhook) — nunca parâmetros do URL.

export type PlanoPortal = "protecao" | "caso_protecao" | "avulso" | "sem_plano";

export type ResumoPlano = {
  plano: PlanoPortal;
  /** Estado da subscrição em português (só Proteção / Caso + Proteção). */
  estado: string | null;
  /** Próxima renovação (ISO), só com a subscrição em vigor. */
  renovacao: string | null;
  /** null = não se aplica (ex.: conta sem plano Stripe, que abre casos livremente). */
  casosDisponiveis: number | null;
};

const ESTADO_SUBSCRICAO_PT: Record<string, string> = {
  active: "Ativa",
  trialing: "Ativa",
  past_due: "Pagamento em atraso",
  incomplete: "Pagamento em confirmação",
  unpaid: "Suspensa por falta de pagamento",
  paused: "Suspensa",
};

// Subscrições terminadas deixam de identificar o plano da conta.
const ESTADOS_TERMINADOS: ReadonlySet<string> = new Set(["canceled", "incomplete_expired"]);

export function estadoSubscricaoPt(status: string | null | undefined) {
  if (!status) return null;
  return ESTADO_SUBSCRICAO_PT[status] ?? null;
}

export function resumoPlanoPortal(acesso: Acesso, temAvulsoPago: boolean): ResumoPlano {
  const subscricaoEmVigor =
    acesso.plano !== "none" && !!acesso.estadoSubscricao && !ESTADOS_TERMINADOS.has(acesso.estadoSubscricao);

  if (subscricaoEmVigor) {
    return {
      plano: acesso.plano as "protecao" | "caso_protecao",
      estado: estadoSubscricaoPt(acesso.estadoSubscricao),
      renovacao: estadoComAcesso(acesso.estadoSubscricao) ? acesso.fimPeriodo : null,
      // Proteção não inclui casos; só mostra se tiver comprado um Avulso à parte.
      casosDisponiveis: acesso.plano === "protecao" && acesso.creditos === 0 ? null : acesso.creditos,
    };
  }

  if (acesso.temPlanoStripe && (temAvulsoPago || acesso.creditos > 0)) {
    return { plano: "avulso", estado: null, renovacao: null, casosDisponiveis: acesso.creditos };
  }

  return { plano: "sem_plano", estado: null, renovacao: null, casosDisponiveis: null };
}

// ---------------------------------------------------------------------------
// Estado do reembolso de uma conversão Avulso → subscrição, para o cliente.
// Nunca mostra mensagens técnicas do Stripe.

export type EstadoReembolsoCliente = { titulo: string; texto: string } | null;

export function estadoReembolsoCliente({
  refundEstado,
  requerIntervencao,
  intervencaoResolvida,
  montanteCentimos,
}: {
  refundEstado: string | null;
  requerIntervencao: boolean;
  intervencaoResolvida: boolean;
  montanteCentimos: number;
}): EstadoReembolsoCliente {
  if (montanteCentimos <= 0) return null;
  if (refundEstado === "succeeded") {
    return {
      titulo: "Reembolso efetuado",
      texto: "O reembolso foi processado para o método de pagamento original.",
    };
  }
  // Resolvido manualmente pelo admin: sem estado fiável a mostrar.
  if (intervencaoResolvida) return null;
  if (requerIntervencao || refundEstado === "failed" || refundEstado === "canceled") {
    return {
      titulo: "Estamos a verificar o reembolso",
      texto: "Houve um problema no processamento do reembolso. Não precisa de fazer nada neste momento.",
    };
  }
  return {
    titulo: "Reembolso em processamento",
    texto: "O reembolso foi iniciado para o método de pagamento original.",
  };
}
