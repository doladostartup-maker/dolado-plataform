// Gestão de Subscrição no portal: cancelamento no fim do período pago e
// reversão ("Manter subscrição"). Sem efeitos nem imports de runtime — tudo
// o que fala com o Stripe ou a Supabase entra por `DependenciasGestao`, para
// os testes correrem com `node --test` (quem liga as dependências reais é
// app/portal/subscricao/actions.ts).
//
// Regras:
// - Cancelamento normal = cancel_at_period_end no Stripe. A subscrição
//   continua ativa (e os casos disponíveis utilizáveis) até ao fim do período
//   pago; não há reembolso proporcional nem nova cobrança.
// - "Manter subscrição" retira o agendamento na MESMA subscrição: não cria
//   outra nem cobra nada naquele momento.
// - O motivo é opcional e nunca impede o cancelamento.
// - Isto NÃO é o direito de livre resolução nem um cancelamento imediato com
//   reembolso: esses casos são tratados à parte pela DoLado (no Stripe), e o
//   webhook sincroniza o resultado.

export const MOTIVOS_CANCELAMENTO = [
  { codigo: "ja_nao_preciso", texto: "Já não preciso do serviço" },
  { codigo: "preco", texto: "O preço não se ajusta ao que procuro" },
  { codigo: "pouco_uso", texto: "Utilizei pouco as funcionalidades" },
  { codigo: "problema_resolvido", texto: "O meu problema ficou resolvido" },
  { codigo: "outro", texto: "Outro motivo" },
] as const;

export type CodigoMotivo = (typeof MOTIVOS_CANCELAMENTO)[number]["codigo"];

export const MAX_MOTIVO_TEXTO = 500;

export type MotivoCancelamento = { codigo: CodigoMotivo | null; texto: string | null };

/** Lê o motivo do formulário. Qualquer valor inválido conta como "sem resposta" — nunca bloqueia. */
export function lerMotivo(codigo: unknown, texto: unknown): MotivoCancelamento {
  const codigoValido = MOTIVOS_CANCELAMENTO.some((m) => m.codigo === codigo) ? (codigo as CodigoMotivo) : null;
  const textoLimpo = typeof texto === "string" ? texto.trim().slice(0, MAX_MOTIVO_TEXTO) : "";
  return { codigo: codigoValido, texto: textoLimpo || null };
}

export type ContaSubscricao = {
  subscription_plan: string | null;
  subscription_status: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
};

/** O que o Stripe devolve depois de alterar a subscrição. */
export type SubscricaoAtualizada = {
  stripe_customer_id: string;
  status: string;
  cancel_at_period_end: boolean;
  /** Fim do período pago (ISO) — a data em que a Proteção termina se o cancelamento se mantiver. */
  current_period_end: string | null;
};

export interface DependenciasGestao {
  /** user_access da própria conta (o user_id vem sempre da sessão). */
  obterConta(userId: string): Promise<ContaSubscricao | null>;
  /** subscriptions.update(cancel_at_period_end) no Stripe. */
  definirCancelamentoNoFimDoPeriodo(subscriptionId: string, cancelar: boolean): Promise<SubscricaoAtualizada>;
  /** Espelha o estado na conta, para o portal refletir já (o webhook confirma depois). */
  gravarNaConta(
    userId: string,
    subscriptionId: string,
    dados: { cancel_at_period_end: boolean; current_period_end: string | null },
  ): Promise<void>;
  registarPedido(dados: {
    userId: string;
    subscriptionId: string;
    plano: "protecao" | "caso_protecao";
    motivo: MotivoCancelamento;
    pedidoEm: string;
    fimPrevisto: string | null;
  }): Promise<void>;
  registarReversao(subscriptionId: string, em: string): Promise<void>;
}

export type ResultadoGestao =
  | { ok: true; fim: string | null; jaEstava: boolean }
  | { ok: false; erro: "sem_subscricao" | "sem_cancelamento" | "subscricao_diferente" };

const ESTADOS_COM_ACESSO = new Set(["active", "trialing", "past_due"]);

function subscricaoGerivel(conta: ContaSubscricao | null) {
  if (!conta?.stripe_subscription_id) return null;
  const plano = conta.subscription_plan;
  if (plano !== "protecao" && plano !== "caso_protecao") return null;
  if (!ESTADOS_COM_ACESSO.has(conta.subscription_status ?? "")) return null;
  return { plano, subscriptionId: conta.stripe_subscription_id } as const;
}

export async function pedirCancelamento(
  userId: string,
  motivo: MotivoCancelamento,
  deps: DependenciasGestao,
  agora: Date = new Date(),
): Promise<ResultadoGestao> {
  const conta = await deps.obterConta(userId);
  const sub = subscricaoGerivel(conta);
  if (!sub || !conta) return { ok: false, erro: "sem_subscricao" };
  // Pedido repetido (duplo clique, outro separador): nada a fazer.
  if (conta.cancel_at_period_end) return { ok: true, fim: conta.current_period_end, jaEstava: true };

  const atualizada = await deps.definirCancelamentoNoFimDoPeriodo(sub.subscriptionId, true);
  if (conta.stripe_customer_id && atualizada.stripe_customer_id !== conta.stripe_customer_id) {
    // Nunca deve acontecer (o id vem da própria conta), mas não se grava
    // nada noutra conta.
    return { ok: false, erro: "subscricao_diferente" };
  }

  await deps.gravarNaConta(userId, sub.subscriptionId, {
    cancel_at_period_end: true,
    current_period_end: atualizada.current_period_end,
  });
  await deps.registarPedido({
    userId,
    subscriptionId: sub.subscriptionId,
    plano: sub.plano,
    motivo,
    pedidoEm: agora.toISOString(),
    fimPrevisto: atualizada.current_period_end,
  });
  return { ok: true, fim: atualizada.current_period_end, jaEstava: false };
}

export async function manterSubscricao(
  userId: string,
  deps: DependenciasGestao,
  agora: Date = new Date(),
): Promise<ResultadoGestao> {
  const conta = await deps.obterConta(userId);
  const sub = subscricaoGerivel(conta);
  if (!sub || !conta) return { ok: false, erro: "sem_subscricao" };
  if (!conta.cancel_at_period_end) return { ok: false, erro: "sem_cancelamento" };

  const atualizada = await deps.definirCancelamentoNoFimDoPeriodo(sub.subscriptionId, false);
  if (conta.stripe_customer_id && atualizada.stripe_customer_id !== conta.stripe_customer_id) {
    return { ok: false, erro: "subscricao_diferente" };
  }

  await deps.gravarNaConta(userId, sub.subscriptionId, {
    cancel_at_period_end: false,
    current_period_end: atualizada.current_period_end,
  });
  await deps.registarReversao(sub.subscriptionId, agora.toISOString());
  return { ok: true, fim: atualizada.current_period_end, jaEstava: false };
}
