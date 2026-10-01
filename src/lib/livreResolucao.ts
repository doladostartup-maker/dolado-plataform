// Função online de livre resolução (/livre-resolucao): textos, versão e
// validação do pedido. Sem efeitos nem imports de runtime: usada no browser,
// no servidor e nos testes (`node --test`).
//
// O pedido fica registado em pedidos_livre_resolucao e não produz efeitos
// automáticos — a DoLado aprecia cada pedido nos termos da lei.

/** Versão do formulário/textos apresentados (gravada em cada pedido). */
export const FORMULARIO_LIVRE_RESOLUCAO_VERSAO = "2026-10-01";

/** Rótulo do botão que abre a função (art. 11.º-A da Diretiva 2011/83/UE). */
export const ROTULO_RESOLVER = "Resolver o contrato aqui";
/** Rótulo do botão que confirma o pedido. */
export const ROTULO_CONFIRMAR = "Confirmar a livre resolução";

/** Máximo de pedidos aceites por e-mail em 24 horas (proteção contra abuso). */
export const MAX_PEDIDOS_POR_EMAIL_24H = 3;

export const PLANOS_LIVRE_RESOLUCAO = {
  protecao: "Proteção",
  caso_protecao: "Caso + Proteção",
  avulso: "Avulso",
  nao_sei: "Não sei / mais do que um",
} as const;

export type PlanoLivreResolucao = keyof typeof PLANOS_LIVRE_RESOLUCAO;

export type PedidoLivreResolucao = {
  nome: string;
  email: string;
  plano: PlanoLivreResolucao;
  data_compra: string | null;
  identificacao: string | null;
  mensagem: string | null;
};

export type ErroPedido =
  | "nome"
  | "email"
  | "plano"
  | "data_compra"
  | "identificacao"
  | "mensagem"
  | "confirmacao";

export const MENSAGENS_ERRO_PEDIDO: Record<ErroPedido, string> = {
  nome: "Indique o seu nome.",
  email: "Indique um e-mail válido (o que usou na compra).",
  plano: "Indique o plano em causa.",
  data_compra: "A data da compra não é válida.",
  identificacao: "A identificação é demasiado longa.",
  mensagem: "A mensagem é demasiado longa (máximo 2000 caracteres).",
  confirmacao: "Confirme que pretende exercer o direito de livre resolução.",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

/** Valida os campos enviados pelo formulário. `hoje` em AAAA-MM-DD (para a data da compra). */
export function lerPedidoLivreResolucao(
  campos: Record<string, unknown>,
  hoje: string,
): { ok: true; pedido: PedidoLivreResolucao } | { ok: false; erro: ErroPedido } {
  const nome = texto(campos.nome);
  if (nome.length < 2 || nome.length > 120) return { ok: false, erro: "nome" };

  const email = texto(campos.email).toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, erro: "email" };

  const plano = texto(campos.plano);
  if (!(plano in PLANOS_LIVRE_RESOLUCAO)) return { ok: false, erro: "plano" };

  const dataCompra = texto(campos.data_compra);
  if (dataCompra && (!/^\d{4}-\d{2}-\d{2}$/.test(dataCompra) || Number.isNaN(Date.parse(dataCompra)) || dataCompra > hoje)) {
    return { ok: false, erro: "data_compra" };
  }

  const identificacao = texto(campos.identificacao);
  if (identificacao.length > 200) return { ok: false, erro: "identificacao" };

  const mensagem = texto(campos.mensagem);
  if (mensagem.length > 2000) return { ok: false, erro: "mensagem" };

  if (campos.confirmo !== "sim") return { ok: false, erro: "confirmacao" };

  return {
    ok: true,
    pedido: {
      nome,
      email,
      plano: plano as PlanoLivreResolucao,
      data_compra: dataCompra || null,
      identificacao: identificacao || null,
      mensagem: mensagem || null,
    },
  };
}
