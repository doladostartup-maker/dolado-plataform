// Programa de Parceiros — Parceiro de Indicação: regras sem I/O (`npm test`).
// Base de dados: 20261021090000_programa_parceiros.sql (atribuição, comissões
// e pagamentos atómicos, máquina de estados); servidor:
// src/lib/parceiros/servidor.ts; webhook: src/lib/parceiros/webhook.ts.
// Especificação: docs/especificacoes/PROGRAMA_PARCEIROS_FASE1.md.
//
// Decisões de Thiago (20/10/2026):
//   - o cliente indicado por um parceiro não tem desconto (só o parceiro tem
//     comissão);
//   - além de /r/<código> (com consentimento de marketing), o cliente pode
//     escrever o "Código de parceiro" no registo e antes do Checkout;
//   - comissões sem IVA (acresce o IVA do parceiro, quando o cobra).
// Uma conta só tem uma atribuição — amigo ou parceiro, a primeira válida —
// garantido na base de dados.

import { normalizarCodigo } from "../indicacoes/regras.ts";

/** Programa ligado (PARCEIROS_ATIVO=1): página /parceiros, ligações /r/ de parceiros e código escrito. */
export function parceirosAtivos(valor: string | undefined = process.env.PARCEIROS_ATIVO) {
  return valor === "1";
}

/** Mesmo formato dos códigos de amigos (8 caracteres sem 0/O/1/I). */
export function normalizarCodigoParceiro(valor: unknown) {
  if (typeof valor !== "string") return null;
  return normalizarCodigo(valor.replace(/[\s-]/g, ""));
}

/** Ligação do parceiro (a mesma rota dos amigos). */
export function urlParceiro(codigo: string, base = "https://dolado.pt") {
  return `${base}/r/${codigo}`;
}

// ---------------------------------------------------------------------------
// Cookie: o mesmo cookie dolado_indicacao (só depois do consentimento de
// marketing). Amigo: "<uuid da visita>"; parceiro: "p.<uuid da visita>". Uma
// visita de parceiro nunca é lida como de amigo (o formato é diferente).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREFIXO = "p.";

export function valorCookieParceiro(visitaId: string) {
  return `${PREFIXO}${visitaId}`;
}

export function visitaParceiroDoCookie(valor: string | null | undefined) {
  if (!valor?.startsWith(PREFIXO)) return null;
  const id = valor.slice(PREFIXO.length);
  return UUID.test(id) ? id : null;
}

/** Metadado da conta com o código escrito no registo (só o código; a base de dados decide). */
export const CHAVE_CODIGO_PARCEIRO = "codigo_parceiro";

// ---------------------------------------------------------------------------
// Resultado da atribuição (decidida na base de dados — parceiro_atribuir)

export const RESULTADOS_ATRIBUICAO = [
  "atribuida",
  "ja_atribuida",
  "visita_invalida",
  "expirada",
  "codigo_invalido",
  "auto_indicacao",
  "ja_cliente",
] as const;
export type ResultadoAtribuicao = (typeof RESULTADOS_ATRIBUICAO)[number];

export function lerResultadoAtribuicao(valor: unknown): ResultadoAtribuicao {
  return typeof valor === "string" && (RESULTADOS_ATRIBUICAO as readonly string[]).includes(valor)
    ? (valor as ResultadoAtribuicao)
    : "codigo_invalido";
}

/** Código escrito antes do Checkout: só um código inexistente impede a compra (o cliente corrige ou apaga). */
export function codigoBloqueiaCompra(r: ResultadoAtribuicao) {
  return r === "codigo_invalido" || r === "auto_indicacao";
}

// ---------------------------------------------------------------------------
// Candidatura (/parceiros)

export const TIPOS_CANDIDATURA = ["indicacao", "distribuicao", "ambos"] as const;
export type TipoCandidatura = (typeof TIPOS_CANDIDATURA)[number];

export type Candidatura = {
  nome: string;
  email: string;
  empresa: string | null;
  tipo: TipoCandidatura;
  descricao: string;
};

export type ErroCandidatura = "nome" | "email" | "tipo" | "descricao" | "aceitar";

/** Validação da forma (o servidor e a base de dados validam de novo). */
export function lerCandidatura(campo: (nome: string) => unknown):
  | { ok: true; candidatura: Candidatura }
  | { ok: false; erro: ErroCandidatura } {
  const texto = (n: string) => (typeof campo(n) === "string" ? (campo(n) as string).trim() : "");
  const nome = texto("nome");
  const email = texto("email").toLowerCase();
  const empresa = texto("empresa");
  const tipo = texto("tipo");
  const descricao = texto("descricao");
  if (nome.length < 2 || nome.length > 120) return { ok: false, erro: "nome" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return { ok: false, erro: "email" };
  if (!(TIPOS_CANDIDATURA as readonly string[]).includes(tipo)) return { ok: false, erro: "tipo" };
  if (descricao.length < 10 || descricao.length > 2000) return { ok: false, erro: "descricao" };
  if (campo("aceita") !== "sim") return { ok: false, erro: "aceitar" };
  return {
    ok: true,
    candidatura: { nome, email, empresa: empresa ? empresa.slice(0, 160) : null, tipo: tipo as TipoCandidatura, descricao },
  };
}

// ---------------------------------------------------------------------------
// Faturas do webhook: valor pago, IVA e descontos (cêntimos). O IVA só é
// conhecido quando o Stripe o calcula (total_taxes); sem isso, 0 — a
// comissão B2C é um valor fixo e não depende dele.

type FaturaStripe = {
  amount_paid?: number | null;
  total_taxes?: Array<{ amount?: number | null }> | null;
  total_discount_amounts?: Array<{ amount?: number | null }> | null;
};

export function valoresDaFatura(invoice: FaturaStripe) {
  const soma = (l: Array<{ amount?: number | null }> | null | undefined) =>
    (l ?? []).reduce((n, x) => n + Math.max(0, x.amount ?? 0), 0);
  return {
    valorPagoCents: Math.max(0, invoice.amount_paid ?? 0),
    ivaCents: soma(invoice.total_taxes),
    descontoCents: soma(invoice.total_discount_amounts),
  };
}

/** Reembolso integral (só esse reverte uma mensalidade; parcial = aviso ao admin). */
export function reembolsoIntegral(refund: { amount?: number | null }, valorPagoCents: number | null | undefined) {
  return !!valorPagoCents && (refund.amount ?? 0) >= valorPagoCents;
}

// ---------------------------------------------------------------------------
// Pagamentos manuais

/** IVA máximo aceite no registo do pagamento (23 % da soma das comissões, arredondado para cima). */
export function ivaMaximo(totalCents: number) {
  return Math.ceil(totalCents * 0.23);
}

/** IVA escrito no backoffice ("1,15") → cêntimos; vazio = parceiro isento. */
export function lerIva(valor: unknown): { ok: true; cents: number | null } | { ok: false } {
  if (typeof valor !== "string" || valor.trim() === "") return { ok: true, cents: null };
  const n = Number(valor.trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return { ok: false };
  return { ok: true, cents: Math.round(n * 100) };
}

export const ESTADOS_COMISSAO_PT: Record<string, string> = {
  pendente: "Pendente",
  em_validacao: "Em validação",
  elegivel: "Elegível",
  aprovada: "Aprovada",
  paga: "Paga",
  cancelada: "Cancelada",
  revertida: "Revertida",
};

export const ESTADOS_OPORTUNIDADE_PT: Record<string, string> = {
  nova: "Nova",
  em_contacto: "Em contacto",
  reuniao_realizada: "Reunião realizada",
  proposta_enviada: "Proposta enviada",
  ganha: "Ganha",
  perdida: "Perdida",
};
