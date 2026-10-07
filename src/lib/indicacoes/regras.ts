// Programa de indicação — regras e textos, sem I/O (`npm test`).
//
// "20% para si. 20% para quem indicar."
//   - Novo cliente (link válido, 30 dias, só com conta): 20% na primeira
//     compra, só no Avulso e na Proteção (1.ª mensalidade). A primeira compra
//     paga do Caso + Proteção (sem desconto) continua a recompensar quem
//     indicou.
//   - Quem indicou: 1 desconto de 20% por primeira compra confirmada e paga
//     (valor > 0) de quem indicou, válido 12 meses. Usado automaticamente na
//     próxima compra Avulso ou na próxima renovação mensal da Proteção ou do
//     Caso + Proteção. Nunca no Caso Extra (já tem desconto de subscritor).
//   - REGRA_CASO_PROTECAO: Caso + Proteção não é elegível para o desconto de
//     aquisição de 20%; uma recompensa já ganha pode ser usada numa renovação
//     mensal futura do Caso + Proteção.
//   - Acumulam em quantidade, nunca em percentagem: 1 desconto por cobrança.
//   - Um desconto de indicação não acumula com códigos promocionais nem com
//     outros descontos: um Checkout com desconto de indicação não aceita
//     códigos (o cliente pode prescindir do desconto para usar um código), e
//     uma subscrição que já tem um desconto não recebe o de indicação.
//
// Quem decide é sempre o servidor (src/lib/indicacoes/servidor.ts e o
// webhook Stripe); a base de dados garante a atomicidade
// (20261007090000_programa_indicacoes.sql).

import type { PlanoId } from "../planos.ts";

export const INDICACAO_PERCENTAGEM = 20;
export const INDICACAO_JANELA_DIAS = 30;
/** Validade de um desconto de quem indicou, a partir de ficar disponível (expira automaticamente). */
export const VALIDADE_RECOMPENSA_MESES = 12;

export const REGRA_CASO_PROTECAO =
  "Caso + Proteção não é elegível para o desconto de aquisição de 20%. Contudo, uma recompensa de indicação já ganha pelo cliente pode ser utilizada numa renovação mensal futura do Caso + Proteção.";

/** Cookie com o id da visita pelo link (só o id; o código e a data vêm da base de dados). */
export const COOKIE_INDICACAO = "dolado_indicacao";

/** Prazo de uma Checkout Session que leva um desconto reservado (o Stripe aceita 30 min a 24 h). */
export const CHECKOUT_COM_RECOMPENSA_MINUTOS = 60;
/** A reserva dura um pouco mais do que a sessão, para nunca expirar antes dela. */
export const RESERVA_CHECKOUT_MINUTOS = CHECKOUT_COM_RECOMPENSA_MINUTOS + 10;

/** Ligado só com INDICACOES_ATIVO=1 (Termos e Política de Privacidade têm de o descrever antes). */
export function indicacoesAtivas(valor: string | undefined = process.env.INDICACOES_ATIVO) {
  return valor === "1";
}

type CupaoIndicacao = { id: string; percent_off: number; duration: "once"; name: string };

/** Cupão do novo cliente: 20%, uma única cobrança (Avulso, ou 1.ª mensalidade da Proteção). */
export const CUPAO_INDICACAO_NOVO_CLIENTE: CupaoIndicacao = {
  id: "dolado-indicacao-novo-cliente-20",
  percent_off: INDICACAO_PERCENTAGEM,
  duration: "once",
  name: "Indicação — 20% na primeira compra",
};

/** Cupão de quem indicou: 20%, uma única cobrança. */
export const CUPAO_INDICACAO_RECOMPENSA: CupaoIndicacao = {
  id: "dolado-indicacao-recompensa-20",
  percent_off: INDICACAO_PERCENTAGEM,
  duration: "once",
  name: "Indicação — 20% para quem indicou",
};

/** O cupão no Stripe tem exatamente esta configuração? (nunca aplicar um editado à mão) */
export function cupaoConforme(
  cupao: { percent_off?: number | null; duration?: string | null; valid?: boolean | null; amount_off?: number | null },
  esperado: CupaoIndicacao,
) {
  return cupao.percent_off === esperado.percent_off && cupao.duration === esperado.duration && !cupao.amount_off && cupao.valid === true;
}

// ---------------------------------------------------------------------------
// Códigos
// ---------------------------------------------------------------------------

/** 32 símbolos sem 0/O/1/I (fáceis de ditar e de copiar). */
export const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const COMPRIMENTO_CODIGO = 8;
const CODIGO = /^[A-HJ-NP-Z2-9]{8}$/;

/** Código a partir de bytes aleatórios (crypto.randomBytes no servidor): 40 bits, sem dados pessoais. */
export function gerarCodigo(bytes: Uint8Array) {
  if (bytes.length < COMPRIMENTO_CODIGO) throw new Error("bytes insuficientes");
  let codigo = "";
  for (let i = 0; i < COMPRIMENTO_CODIGO; i++) codigo += ALFABETO_CODIGO[bytes[i] & 31];
  return codigo;
}

/** Normaliza o que vem do URL (/r/abc123de → ABC123DE); null se não for um código possível. */
export function normalizarCodigo(valor: unknown) {
  if (typeof valor !== "string") return null;
  const c = valor.trim().toUpperCase();
  return CODIGO.test(c) ? c : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** id da visita guardado no cookie (só formato UUID). */
export function visitaDoCookie(valor: string | null | undefined) {
  return valor && UUID.test(valor) ? valor : null;
}

/** Link pessoal: https://dolado.pt/r/ABC123DE (dolado.pt redireciona para o portal, que guarda a visita). */
export function urlIndicacao(codigo: string, base = "https://dolado.pt") {
  return `${base}/r/${codigo}`;
}

// ---------------------------------------------------------------------------
// Descontos
// ---------------------------------------------------------------------------

/**
 * Produtos com desconto de indicação num Checkout (aquisição/compra): Avulso e
 * Proteção. Nunca o Caso + Proteção — a recompensa de quem indicou só entra
 * nas renovações mensais dele (subscricaoAceitaRecompensa).
 */
export function produtoComDescontoIndicacao(plano: PlanoId) {
  return plano === "avulso" || plano === "protecao";
}

export type TipoDescontoIndicacao = "novo_cliente" | "recompensa";

export type ContextoDescontoCheckout = {
  plano: PlanoId;
  /** Fluxo de compra (consentimentoCompra.ts). */
  fluxo: "publico" | "avulso_conta" | "adesao" | "pedido_caso" | "caso_extra";
  /** Adesão com conversão de um Avulso (1.ª mensalidade já coberta a 100%). */
  conversao: boolean;
  /** Conta indicada, ainda sem nenhuma compra. */
  novoClienteIndicado: boolean;
  /** Descontos de quem indicou por usar. */
  recompensasDisponiveis: number;
  /** O cliente preferiu usar um código promocional. */
  prescindiu: boolean;
};

/**
 * Desconto de indicação para um Checkout — no máximo um, nunca acumulado.
 * Ordem determinística: primeiro o de novo cliente (só vale na primeira
 * compra), depois um desconto de quem indicou. Sem desconto em: compra sem
 * conta (o servidor não sabe quem compra), Caso Extra (já tem desconto),
 * conversão de um Avulso (1.ª mensalidade já coberta) e Caso + Proteção.
 */
export function escolherDescontoCheckout(c: ContextoDescontoCheckout): TipoDescontoIndicacao | null {
  if (c.fluxo === "publico" || c.fluxo === "caso_extra" || c.conversao || c.prescindiu) return null;
  if (!produtoComDescontoIndicacao(c.plano)) return null;
  if (c.novoClienteIndicado) return "novo_cliente";
  if (c.recompensasDisponiveis > 0) return "recompensa";
  return null;
}

/**
 * Campos de desconto de um Checkout: com desconto de indicação, só esse
 * desconto (sem códigos promocionais — o Stripe não aceita os dois juntos e
 * nunca acumulam); sem ele, os códigos promocionais de sempre.
 */
export function camposDescontoCheckout<T extends { discounts?: unknown; expires_at?: number }>(parametros: T | null) {
  return parametros ? { ...parametros } : { allow_promotion_codes: true as const };
}

/** Preço com 20% (o Stripe arredonda o desconto ao cêntimo): 1499 → 1199, 499 → 399. */
export function precoComDescontoCentimos(centimos: number) {
  const desconto = Math.round((centimos * INDICACAO_PERCENTAGEM) / 100);
  return centimos - desconto;
}

/**
 * Pode pôr-se um desconto de quem indicou na próxima renovação mensal desta
 * subscrição? Proteção ou Caso + Proteção (REGRA_CASO_PROTECAO) ativa, sem
 * cancelamento agendado (não haveria próxima mensalidade) e sem outro
 * desconto (nunca acumula — ex.: cupão de 100% do piloto).
 */
export function subscricaoAceitaRecompensa(s: {
  plano: string | null;
  status: string | null;
  cancelamentoAgendado: boolean;
  outrosDescontos: number;
}) {
  return (s.plano === "protecao" || s.plano === "caso_protecao") && (s.status === "active" || s.status === "trialing") && !s.cancelamentoAgendado && s.outrosDescontos === 0;
}

/** A fatura tem este cupão aplicado? (discounts expandidos; os ids sozinhos não dizem o cupão) */
export function faturaComCupao(
  discounts: ReadonlyArray<string | { source?: { coupon?: string | { id?: string } | null } | null } | null> | null | undefined,
  cupaoId: string,
) {
  return (discounts ?? []).some((d) => {
    if (!d || typeof d === "string") return false;
    const cupao = d.source?.coupon;
    return (typeof cupao === "string" ? cupao : cupao?.id) === cupaoId;
  });
}

/** Produto da primeira compra (para a recompensa e as métricas). null = não conta (ex.: Caso Extra). */
export function produtoDaCompra(modo: string | null | undefined, planoMetadata: string | null | undefined, planoSubscricao: string | null) {
  if (modo === "payment") return planoMetadata === "avulso" ? "avulso" : null;
  if (modo === "subscription") return planoSubscricao === "protecao" || planoSubscricao === "caso_protecao" ? planoSubscricao : null;
  return null;
}

// ---------------------------------------------------------------------------
// Textos (português europeu; a DoLado; tratamento na terceira pessoa)
// ---------------------------------------------------------------------------

export const TEXTOS_INDICACAO = {
  titulo: "Indique a DoLado",
  mensagem: `${INDICACAO_PERCENTAGEM}% para si. ${INDICACAO_PERCENTAGEM}% para quem indicar.`,
  apoio: `Partilhe o seu link. Quem vier através dele recebe ${INDICACAO_PERCENTAGEM}% na primeira compra elegível e, depois de essa compra ser confirmada, recebe também ${INDICACAO_PERCENTAGEM}% na sua próxima compra ou mensalidade.`,
  regras: `O desconto de quem chega pelo seu link aplica-se à primeira compra Avulso ou à primeira mensalidade da Proteção. Os seus descontos são válidos durante 12 meses e aplicam-se, um de cada vez, às compras Avulso e às renovações mensais da Proteção e do Caso + Proteção. Não se aplicam à adesão ao Caso + Proteção nem ao Caso Extra e não acumulam com códigos promocionais.`,
  semConta: `Chegou através de um link de indicação. Para ativar os ${INDICACAO_PERCENTAGEM}% de desconto, crie conta ou inicie sessão antes do pagamento. Se continuar sem conta, o pagamento é feito sem o desconto de indicação.`,
  aposEnvio: `Conhece alguém que também precise da DoLado? Partilhe o seu link: ${INDICACAO_PERCENTAGEM}% para si e ${INDICACAO_PERCENTAGEM}% para quem indicar.`,
  resultadoPositivo: `Conseguimos ajudar. Conhece alguém que também esteja com um problema por resolver? Ofereça-lhe ${INDICACAO_PERCENTAGEM}% na DoLado e receba também ${INDICACAO_PERCENTAGEM}%.`,
  casoProtecaoSemDesconto: "O Caso + Proteção não acumula com a promoção de indicação.",
  textoPartilha: `Experimente a DoLado: ajuda a resolver problemas com empresas de telecomunicações, energia, água e outras. Com este link tem ${INDICACAO_PERCENTAGEM}% na primeira compra elegível.`,
} as const;

/** "Sem descontos disponíveis", "1 desconto de 20% disponível", "2 descontos de 20% disponíveis". */
export function textoDescontosDisponiveis(n: number) {
  if (n <= 0) return "Sem descontos disponíveis";
  return n === 1
    ? `1 desconto de ${INDICACAO_PERCENTAGEM}% disponível`
    : `${n} descontos de ${INDICACAO_PERCENTAGEM}% disponíveis`;
}

/** "válido até 07/10/2027" (data de Lisboa). */
export function textoValidade(expiraEm: string) {
  return `válido até ${new Date(expiraEm).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" })}`;
}

/** Linha do modal de confirmação da compra. */
export function textoDescontoNaCompra(tipo: TipoDescontoIndicacao, subscricao: boolean) {
  if (tipo === "novo_cliente") {
    return subscricao
      ? `Desconto de indicação: ${INDICACAO_PERCENTAGEM}% na primeira mensalidade, aplicado automaticamente no pagamento. A partir do mês seguinte, é cobrado o preço do plano.`
      : `Desconto de indicação: ${INDICACAO_PERCENTAGEM}% na primeira compra, aplicado automaticamente no pagamento.`;
  }
  return subscricao
    ? `Usamos 1 dos seus descontos de indicação: ${INDICACAO_PERCENTAGEM}% na primeira mensalidade. A partir do mês seguinte, é cobrado o preço do plano.`
    : `Usamos 1 dos seus descontos de indicação: ${INDICACAO_PERCENTAGEM}% nesta compra.`;
}
