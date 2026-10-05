// Regras de acesso por plano — sem efeitos, para serem testáveis com
// `node --test`. Quem lê a base de dados é src/lib/auth.ts.
//
// Planos, preços e Price IDs: src/lib/planos.ts. Aqui só as regras:
// Proteção: funcionalidades de proteção; não inclui casos.
// Caso + Proteção: proteção + 1 crédito de caso por ciclo pago (acumula
//   até 4). Na interface, "créditos" chamam-se sempre "casos disponíveis".
// Avulso: +1 crédito de caso por compra; não dá proteção. Avulso é uma
//   compra, não um estado da conta: uma conta sem subscrição está "sem
//   subscrição", mesmo que tenha comprado Avulsos.
// Cancelamento normal: a subscrição fica com cancelamento agendado e tudo
//   continua a funcionar até current_period_end; só depois a conta fica sem
//   subscrição (o webhook trata disso).
// Sem linha em user_access (conta criada sem compra): sem proteção e sem
//   casos disponíveis. Criar conta não dá direito ao tratamento de um caso —
//   o caso é pago no fluxo "Tratar o meu caso" (src/lib/pedidoCaso.ts).
//
// "Funcionalidades de proteção" são as que hoje estão marcadas "Somente
// Assinantes" (Monitor de Proteção — contratos, faturas e alertas de datas —
// e aviso sectorial). O Simulador de Elegibilidade é público e gratuito
// desde 01/10/2026 — não depende do plano. Funcionalidades
// futuras de proteção usam a mesma verificação (temProtecao).

export type PlanoSubscricao = "none" | "protecao" | "caso_protecao";

export type LinhaAcesso = {
  subscription_plan: string | null;
  subscription_status: string | null;
  case_credits: number | null;
  /** Parte de case_credits que vem de compras únicas por usar (Avulso ou Caso Extra). */
  avulso_credits?: number | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
};

export type Acesso = {
  /** A conta comprou algum plano (tem linha em user_access). */
  temPlanoStripe: boolean;
  plano: PlanoSubscricao;
  estadoSubscricao: string | null;
  creditos: number;
  /** Casos comprados à parte (Avulso ou Caso Extra) ainda por usar — incluídos em `creditos`. */
  casosComprados: number;
  /** Casos incluídos na subscrição ainda por usar (creditos - casosComprados). */
  casosSubscricao: number;
  /** Funcionalidades de proteção desbloqueadas. */
  temProtecao: boolean;
  /** Pode abrir um caso novo no portal agora (tem casos disponíveis). */
  podeCriarCaso: boolean;
  /** Abrir um caso gasta um crédito (sempre — não há casos sem pagamento). */
  casoConsomeCredito: boolean;
  /** Fim do período pago da subscrição (ISO), se houver. */
  fimPeriodo: string | null;
  /** Cancelamento agendado para o fim do período (a proteção mantém-se até lá). */
  cancelamentoAgendado: boolean;
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
      casosComprados: 0,
      casosSubscricao: 0,
      temProtecao: false,
      podeCriarCaso: false,
      casoConsomeCredito: true,
      fimPeriodo: null,
      cancelamentoAgendado: false,
    };
  }

  const plano = lerPlano(linha.subscription_plan);
  const creditos = Math.max(0, linha.case_credits ?? 0);
  const casosComprados = Math.min(creditos, Math.max(0, linha.avulso_credits ?? 0));
  return {
    temPlanoStripe: true,
    plano,
    estadoSubscricao: linha.subscription_status,
    creditos,
    casosComprados,
    casosSubscricao: creditos - casosComprados,
    temProtecao: plano !== "none" && estadoComAcesso(linha.subscription_status),
    podeCriarCaso: creditos > 0,
    casoConsomeCredito: true,
    fimPeriodo: linha.current_period_end ?? null,
    cancelamentoAgendado: plano !== "none" && !!linha.cancel_at_period_end,
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

// "sem_plano" = sem subscrição (estado da conta). Avulso é um produto, não
// aparece aqui: os casos comprados contam em casosDisponiveis.
export type PlanoPortal = "protecao" | "caso_protecao" | "sem_plano";

export type ResumoPlano = {
  plano: PlanoPortal;
  /** Estado da subscrição em português (só Proteção / Caso + Proteção). */
  estado: string | null;
  /** Próxima renovação (ISO), só com a subscrição em vigor e sem cancelamento agendado. */
  renovacao: string | null;
  /** Data em que a Proteção termina (ISO), quando há cancelamento agendado. */
  fimAgendado: string | null;
  /** null = não se aplica (ex.: conta sem nenhuma compra). */
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

export function resumoPlanoPortal(acesso: Acesso): ResumoPlano {
  const subscricaoEmVigor =
    acesso.plano !== "none" && !!acesso.estadoSubscricao && !ESTADOS_TERMINADOS.has(acesso.estadoSubscricao);

  if (subscricaoEmVigor) {
    const comAcesso = estadoComAcesso(acesso.estadoSubscricao);
    const agendado = comAcesso && acesso.cancelamentoAgendado;
    return {
      plano: acesso.plano as "protecao" | "caso_protecao",
      estado: agendado ? "Cancelamento agendado" : estadoSubscricaoPt(acesso.estadoSubscricao),
      renovacao: comAcesso && !agendado ? acesso.fimPeriodo : null,
      fimAgendado: agendado ? acesso.fimPeriodo : null,
      // Proteção não inclui casos; só mostra se tiver comprado um Avulso à parte.
      casosDisponiveis: acesso.plano === "protecao" && acesso.creditos === 0 ? null : acesso.creditos,
    };
  }

  // Sem subscrição. Quem já comprou (linha em user_access) vê os casos
  // disponíveis — Avulso por usar, por exemplo.
  return {
    plano: "sem_plano",
    estado: null,
    renovacao: null,
    fimAgendado: null,
    casosDisponiveis: acesso.temPlanoStripe ? acesso.creditos : null,
  };
}

// ---------------------------------------------------------------------------
// Casos disponíveis congelados no fim de um Caso + Proteção (90 dias).

export const DIAS_CASOS_GUARDADOS = 90;

// Alertas desativados no fim da subscrição: dados conservados 6 meses, só
// para o cliente recuperar a configuração se voltar. O prazo efetivo vive na
// base de dados (public.retencao_alertas_desativados()); este valor é só
// para o texto.
export const MESES_ALERTAS_GUARDADOS = 6;

export type CongelamentoCasos = {
  quantidade: number;
  expira_em: string;
  restaurado_em: string | null;
};

/** Casos guardados que ainda podem ser recuperados (null se não houver). */
export function casosGuardados(
  congelamentos: CongelamentoCasos[],
  agora: Date = new Date(),
): { quantidade: number; ate: string } | null {
  const validos = congelamentos.filter(
    (c) => !c.restaurado_em && c.quantidade > 0 && new Date(c.expira_em).getTime() > agora.getTime(),
  );
  if (validos.length === 0) return null;
  const quantidade = validos.reduce((soma, c) => soma + c.quantidade, 0);
  // A data mais próxima: depois dela, pelo menos parte deixa de ser recuperável.
  const ate = validos.map((c) => c.expira_em).sort()[0];
  return { quantidade, ate };
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
