// Proteção gratuita durante 30 dias — regras sem I/O (testáveis com
// `node --test`). Base de dados: 20261018090000_protecao_gratuita.sql;
// servidor: src/lib/protecaoGratuitaServidor.ts.
//
// Decisões de Thiago (18/10/2026):
//   * estado interno, não um trial do Stripe — durante o período gratuito
//     não há Customer, subscrição nem fatura no Stripe;
//   * começa quando o cliente o ativa expressamente; termina sozinho, sem
//     cobrança; uma vez por conta e por e-mail; nunca para quem já teve
//     Proteção ou Caso + Proteção;
//   * aderir durante o período: a 1.ª cobrança da Proteção é no dia em que o
//     período terminaria (trial_end); o Caso + Proteção é cobrado logo;
//   * quem usou o período gratuito não recebe também o desconto de indicação
//     de novo cliente na Proteção (não acumula).
//
// Nunca decide acesso sozinho: o acesso vem da base de dados
// (conta_tem_protecao) e de src/lib/acesso.ts, que usa estas regras.

export const DIAS_PROTECAO_GRATUITA = 30;

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Termos, secção 5: se faltarem menos de 2 dias (48 horas) para o fim do
 * período, a 1.ª cobrança é no dia da adesão (e a interface diz isso); com
 * 48 horas ou mais, é no dia em que o período terminaria. Até 21/10/2026 o
 * limite era 49 h, o que não coincidia com os Termos durante uma hora —
 * a advogada confirmou as 48 horas (21/10/2026).
 */
export const MARGEM_MINIMA_INICIO_COBRANCA_MS = 48 * 60 * 60 * 1000;

/**
 * O Stripe só aceita trial_end no Checkout pelo menos 48 horas depois de
 * criada a sessão. Com o fim a menos de 48 h + esta folga, o trial_end
 * passa para agora + 48 h + folga: a cobrança fica no máximo 5 minutos
 * depois do fim do período (nunca antes), no mesmo dia.
 */
export const FOLGA_TRIAL_END_STRIPE_MS = 5 * 60 * 1000;

export type EstadoGratuita = "ativa" | "convertida" | "terminada";

export type LinhaProtecaoGratuita = {
  id?: string;
  estado: string;
  inicio_em: string;
  termina_em: string;
  lembretes_desativados_em?: string | null;
};

export type ProtecaoGratuita = {
  estado: EstadoGratuita;
  /** Período em curso agora (estado ativa e fim no futuro) — dá Proteção. */
  emCurso: boolean;
  inicio: string;
  fim: string;
  /** Dias até ao fim, arredondados para cima (0 se terminou). */
  diasRestantes: number;
};

function lerEstado(valor: string): EstadoGratuita {
  return valor === "convertida" || valor === "terminada" ? valor : "ativa";
}

export function protecaoGratuitaDe(
  linha: LinhaProtecaoGratuita | null | undefined,
  agora: Date = new Date(),
): ProtecaoGratuita | null {
  if (!linha) return null;
  const fim = new Date(linha.termina_em).getTime();
  const estado = lerEstado(linha.estado);
  const emCurso = estado === "ativa" && fim > agora.getTime();
  return {
    estado,
    emCurso,
    inicio: linha.inicio_em,
    fim: linha.termina_em,
    diasRestantes: emCurso ? Math.max(1, Math.ceil((fim - agora.getTime()) / DIA_MS)) : 0,
  };
}

/**
 * Data da 1.ª cobrança de uma adesão à Proteção feita durante o período
 * gratuito: o fim do período (trial_end), se ainda faltar tempo suficiente
 * para o Stripe aceitar. null = cobrança no dia da adesão. Só para o plano
 * Proteção — o Caso + Proteção inclui casos e é cobrado logo.
 */
export function inicioCobrancaAdesao(
  gratuita: Pick<ProtecaoGratuita, "emCurso" | "fim"> | null,
  plano: string,
  agora: Date = new Date(),
): Date | null {
  if (plano !== "protecao" || !gratuita?.emCurso) return null;
  const fim = new Date(gratuita.fim);
  return fim.getTime() - agora.getTime() >= MARGEM_MINIMA_INICIO_COBRANCA_MS ? fim : null;
}

/** Fim de um período ativado agora (só para mostrar antes da ativação). */
export function fimSeAtivarAgora(agora: Date = new Date()) {
  return new Date(agora.getTime() + DIAS_PROTECAO_GRATUITA * DIA_MS);
}

/**
 * trial_end do Stripe (segundos inteiros) para a 1.ª cobrança em `data`:
 * nunca antes de agora + 48 h + folga (mínimo do Stripe no Checkout).
 */
export function trialEndStripe(data: Date, agora: Date = new Date()) {
  const minimo = agora.getTime() + MARGEM_MINIMA_INICIO_COBRANCA_MS + FOLGA_TRIAL_END_STRIPE_MS;
  return Math.ceil(Math.max(data.getTime(), minimo) / 1000);
}

// ---------------------------------------------------------------------------
// Elegibilidade (decidida na base de dados — protecao_gratuita_elegibilidade)

export type MotivoElegibilidade =
  | "elegivel"
  | "ativa"
  | "ja_utilizada"
  | "ja_teve_protecao"
  | "protecao_ativa"
  | "email_nao_confirmado"
  | "conta_invalida";

const MOTIVOS: ReadonlySet<string> = new Set([
  "elegivel",
  "ativa",
  "ja_utilizada",
  "ja_teve_protecao",
  "protecao_ativa",
  "email_nao_confirmado",
  "conta_invalida",
]);

/** Resposta da base de dados → motivo conhecido (desconhecido = não elegível). */
export function lerMotivo(valor: unknown): MotivoElegibilidade {
  return typeof valor === "string" && MOTIVOS.has(valor) ? (valor as MotivoElegibilidade) : "conta_invalida";
}

// ---------------------------------------------------------------------------
// Origem (só métricas; valores fixos)

export const ORIGENS_PROTECAO_GRATUITA = ["homepage", "precario", "protecao", "portal", "landing_30d"] as const;
export type OrigemProtecaoGratuita = (typeof ORIGENS_PROTECAO_GRATUITA)[number] | "outro";

export function lerOrigem(valor: unknown): OrigemProtecaoGratuita {
  return typeof valor === "string" && (ORIGENS_PROTECAO_GRATUITA as readonly string[]).includes(valor)
    ? (valor as OrigemProtecaoGratuita)
    : "outro";
}

// ---------------------------------------------------------------------------
// E-mail normalizado (antes do pseudónimo HMAC). Reduz contas repetidas com
// o mesmo endereço: maiúsculas, espaços, "+etiqueta" e, no Gmail, pontos.

export function normalizarEmail(email: string): string | null {
  const e = email.trim().toLowerCase();
  const arroba = e.lastIndexOf("@");
  if (arroba <= 0 || arroba === e.length - 1) return null;
  let local = e.slice(0, arroba).split("+")[0];
  let dominio = e.slice(arroba + 1);
  if (dominio === "googlemail.com") dominio = "gmail.com";
  if (dominio === "gmail.com") local = local.replace(/\./g, "");
  if (!local) return null;
  return `${local}@${dominio}`;
}

// ---------------------------------------------------------------------------
// Interruptor (desligado por omissão até haver Termos e Política validados).

export const MINIMO_CHAVE = 32;

export function ofertaLigada(env: { PROTECAO_GRATUITA_ATIVA?: string; PROTECAO_GRATUITA_CHAVE?: string }) {
  return env.PROTECAO_GRATUITA_ATIVA === "1" && (env.PROTECAO_GRATUITA_CHAVE?.length ?? 0) >= MINIMO_CHAVE;
}

/** Caminho da página de ativação (portal.dolado.pt). */
export const ROTA_EXPERIMENTAR = "/experimentar-protecao";

// ---------------------------------------------------------------------------
// Marcos dos e-mails (calculados na base de dados — protecao_gratuita_marco_atual)

export const MARCOS_AVISO = ["d0", "d7", "d25", "d29", "d30"] as const;
export type MarcoAviso = (typeof MARCOS_AVISO)[number];

export function ehMarco(valor: unknown): valor is MarcoAviso {
  return typeof valor === "string" && (MARCOS_AVISO as readonly string[]).includes(valor);
}

/** Marcos opcionais (lembretes): levam ligação para deixar de os receber. */
export function marcoOpcional(marco: MarcoAviso) {
  return marco === "d7" || marco === "d25";
}

// ---------------------------------------------------------------------------
// Estado mostrado no portal (só apresentação: datas reais do período e a
// data da 1.ª cobrança que o servidor volta a decidir ao abrir o Checkout).

export type EstadoProtecaoGratuitaPortal =
  | { tipo: "em_curso"; inicio: string; fim: string; diasRestantes: number; primeiraCobranca: string | null }
  | { tipo: "terminada"; fim: string }
  | { tipo: "oferta" };

/** Durante quanto tempo o portal lembra que o período terminou. */
export const DIAS_AVISO_TERMINADA = 60;

export function estadoPortal(
  dados: { gratuita: ProtecaoGratuita | null; temSubscricao: boolean; temProtecao: boolean; elegivel: boolean },
  agora: Date = new Date(),
): EstadoProtecaoGratuitaPortal | null {
  const g = dados.gratuita;
  if (g?.emCurso && !dados.temSubscricao) {
    const cobranca = inicioCobrancaAdesao(g, "protecao", agora);
    return { tipo: "em_curso", inicio: g.inicio, fim: g.fim, diasRestantes: g.diasRestantes, primeiraCobranca: cobranca?.toISOString() ?? null };
  }
  if (g && g.estado !== "convertida" && !g.emCurso && !dados.temProtecao) {
    const terminou = new Date(g.fim).getTime();
    return agora.getTime() - terminou < DIAS_AVISO_TERMINADA * DIA_MS ? { tipo: "terminada", fim: g.fim } : null;
  }
  if (!g && !dados.temProtecao && dados.elegivel) return { tipo: "oferta" };
  return null;
}
