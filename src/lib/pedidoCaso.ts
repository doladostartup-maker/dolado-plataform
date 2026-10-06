// Pedido de caso antes do pagamento — regras sem efeitos, para serem
// testáveis com `node --test`. Quem lê/grava é src/lib/pedidoCasoServidor.ts.
//
// Fluxo: formulário do caso → conta → modalidade → Stripe Checkout →
// webhook confirma o pagamento → converter_pedido_em_caso() cria o caso.
// Até lá o pedido vive em pedidos_caso (nunca em casos) e não dá acesso a
// nada. Ver a migration 20261001220000_pedidos_caso_antes_do_pagamento.sql.
//
// Posse: um pedido acabado de preencher ainda não tem conta; fica ligado ao
// browser por um cookie httpOnly com um token aleatório (na base de dados só
// o hash). Quando há sessão, o pedido passa a pertencer à conta. Daí em
// diante só essa conta o pode usar.

import type { Acesso } from "./acesso.ts";
import { elegivelCasoExtra } from "./casoExtra.ts";

export const COOKIE_PEDIDO = "dolado_pedido";
/** Validade do pedido não pago e do cookie (igual a pedidos_caso.expira_em). */
export const DIAS_VALIDADE_PEDIDO = 30;

export type EstadoPedido = "rascunho" | "aguarda_pagamento" | "convertido" | "cancelado";

/** Modalidades que tratam um caso (Proteção sozinha não inclui casos). */
export const MODALIDADES_CASO = ["avulso", "caso_protecao"] as const;
export type ModalidadeCaso = (typeof MODALIDADES_CASO)[number];

// Fonte única dos setores dos casos (formulários, filtros do backoffice, avisos
// sectoriais, regras jurídicas, simulador). O valor é também o nome mostrado
// ao cliente e o que fica gravado em casos.sector / pedidos_caso.sector.
// Acrescentar um setor: aqui e nos `check` de preferencias_setor,
// avisos_setoriais e regras_juridicas (ver 20261006120000_novos_setores.sql).
export const SETORES = ["Telecomunicações", "Energia", "Gás", "Água", "Compras & Reembolsos", "Ginásios"];
// Tipos de problema ("O que aconteceu?"). O cliente só vê os do setor
// escolhido (problemasDoSetor); PROBLEMAS é a lista de todos os valores
// válidos (backoffice, regras jurídicas). Cada setor termina em "Outro".
const PROBLEMAS_SERVICOS = [
  "Aumento de mensalidade",
  "Cobrança indevida",
  "Fidelização ou penalização",
  "Corte ou falha de serviço",
  "Cancelamento recusado",
  "Outro",
];

export const PROBLEMAS_POR_SETOR: Record<string, string[]> = {
  "Telecomunicações": PROBLEMAS_SERVICOS,
  Energia: PROBLEMAS_SERVICOS,
  "Gás": PROBLEMAS_SERVICOS,
  "Água": PROBLEMAS_SERVICOS,
  "Compras & Reembolsos": [
    "Produto com defeito",
    "Produto errado ou danificado",
    "Encomenda não entregue",
    "Devolução ou reembolso em falta",
    "Garantia recusada",
    "Cobrança indevida",
    "Outro",
  ],
  "Ginásios": [
    "Cancelamento recusado",
    "Fidelização ou penalização",
    "Cobrança após cancelamento",
    "Aumento de mensalidade",
    "Cobrança indevida",
    "Serviço diferente do contratado",
    "Outro",
  ],
};

export const PROBLEMAS = [...new Set(SETORES.flatMap((s) => PROBLEMAS_POR_SETOR[s]))];

/** Tipos de problema do setor; sem setor conhecido, todos. */
export function problemasDoSetor(setor: string | null | undefined): string[] {
  return (setor && PROBLEMAS_POR_SETOR[setor]) || PROBLEMAS;
}
export const MOMENTOS = [
  "Sim, e não me responderam",
  "Sim, mas a resposta não resolveu",
  "Ainda não reclamei",
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ehUuid(valor: unknown): valor is string {
  return typeof valor === "string" && UUID.test(valor);
}

export function validNome(v: string) {
  return v.trim().length >= 3 && !/\d/.test(v);
}

export function validEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function validTelemovel(v: string) {
  if (v.trim() === "") return true;
  let n = v.replace(/[^\d+]/g, "");
  if (n.indexOf("+351") === 0) n = n.slice(4);
  else if (n.indexOf("351") === 0 && n.length > 9) n = n.slice(3);
  return /^9\d{8}$/.test(n);
}

export type DadosPedido = {
  nome: string;
  telefone: string | null;
  sector: string;
  empresa: string;
  problema_tipo: string;
  descricao: string | null;
  momento_cliente: string;
  origem: string;
  consentimento_alertas: boolean;
  anexo: { caminho: string; nome: string; tipo: string | null; tamanho: number | null } | null;
};

/**
 * Lê e valida o formulário do caso. Só aceita valores das listas fechadas e
 * um anexo gerado pelo servidor (pasta "pendentes/").
 */
export function lerDadosPedido(ler: (campo: string) => unknown): { ok: true; dados: DadosPedido } | { ok: false; erro: string } {
  const texto = (campo: string, max = 500) => (typeof ler(campo) === "string" ? (ler(campo) as string).trim().slice(0, max) : "");

  const sector = texto("sector", 60);
  const empresa = texto("empresa", 120);
  const problemaTipo = texto("problema_tipo", 80);
  const descricao = texto("descricao", 500);
  const momento = texto("momento_cliente", 80);
  const nome = texto("nome", 120);
  const telefone = texto("telefone", 30);
  const origem = texto("origem", 200) || "/";

  if (!SETORES.includes(sector) || empresa.length < 2) return { ok: false, erro: "Indique o setor e a empresa." };
  if (!problemasDoSetor(sector).includes(problemaTipo)) return { ok: false, erro: "Selecione o que aconteceu." };
  if (!MOMENTOS.includes(momento)) return { ok: false, erro: "Indique se já reclamou junto da empresa." };
  if (!validNome(nome)) return { ok: false, erro: "Insira um nome válido." };
  if (!validTelemovel(telefone)) return { ok: false, erro: "Telemóvel inválido." };
  if (ler("autorizacao") !== "on") return { ok: false, erro: "Confirme o pedido para avançar." };

  const caminho = texto("anexo_caminho", 400);
  const anexo =
    caminho && caminho.startsWith("pendentes/") && !caminho.includes("..")
      ? {
          caminho,
          nome: texto("anexo_nome", 200) || caminho,
          tipo: texto("anexo_tipo", 100) || null,
          tamanho: Number(ler("anexo_tamanho")) || null,
        }
      : null;

  return {
    ok: true,
    dados: {
      nome,
      telefone: telefone || null,
      sector,
      empresa,
      problema_tipo: problemaTipo,
      descricao: descricao || null,
      momento_cliente: momento,
      origem,
      consentimento_alertas: ler("consentimento_alertas") === "on",
      anexo,
    },
  };
}

export type PedidoParaPosse = { user_id: string | null; token_hash: string | null; estado: EstadoPedido };

/**
 * Quem pode usar o pedido: a conta dona; ou, enquanto não tem conta, quem
 * tiver o cookie do browser que o preencheu (e tiver sessão — o pedido passa
 * então a ser dessa conta).
 *   "dono"      → já é desta conta
 *   "reclamar"  → sem conta e com o cookie certo: ligar a esta conta
 *   "negado"    → de outra conta, ou sem prova de posse
 */
export function posseDoPedido(
  pedido: PedidoParaPosse,
  userId: string,
  tokenHashDoCookie: string | null,
): "dono" | "reclamar" | "negado" {
  if (pedido.user_id) return pedido.user_id === userId ? "dono" : "negado";
  if (tokenHashDoCookie && pedido.token_hash && pedido.token_hash === tokenHashDoCookie) return "reclamar";
  return "negado";
}

/** O pedido ainda pode seguir para pagamento (ou para usar um caso disponível). */
export function pedidoPorPagar(estado: EstadoPedido) {
  return estado === "rascunho" || estado === "aguarda_pagamento";
}

/**
 * Modalidades a mostrar para o pedido, a partir do acesso real da conta.
 * - Com casos disponíveis: pode usar um (sem novo pagamento).
 * - Caso + Proteção ativo sem casos disponíveis: Caso Extra (benefício de
 *   subscritor), quando está configurado — nunca o Avulso ao lado, que
 *   custaria mais pelo mesmo. Sem Caso Extra configurado: Avulso, como antes.
 * - Outra subscrição de proteção ativa (Proteção): não abre outra (só Avulso).
 * A mesma regra (direitoCasoExtra) é verificada de novo no servidor ao abrir
 * o Checkout.
 */
export function opcoesDoPedido(
  acesso: Pick<Acesso, "creditos" | "temProtecao" | "plano" | "estadoSubscricao">,
  casoExtraConfigurado = false,
) {
  const casoExtra = casoExtraConfigurado && elegivelCasoExtra(acesso);
  return {
    usarCasoDisponivel: acesso.creditos > 0,
    casoExtra,
    modalidades: (casoExtra ? [] : acesso.temProtecao ? ["avulso"] : ["avulso", "caso_protecao"]) as ModalidadeCaso[],
  };
}

/**
 * O que o formulário "Tratar o meu caso" anuncia antes de o pedido ser
 * guardado. Deriva sempre de opcoesDoPedido (a mesma regra da modalidade),
 * para o início do fluxo nunca prometer outra coisa que o fim:
 * - "usar_caso": a conta tem casos disponíveis — sem novo pagamento;
 * - "caso_extra": já usou o caso incluído no Caso + Proteção — Caso Extra;
 * - "so_avulso": subscrição de proteção ativa sem casos disponíveis — só Avulso;
 * - "escolher": sem sessão ou sem direito a caso — Avulso ou Caso + Proteção.
 */
export type EntradaPedido = "usar_caso" | "caso_extra" | "so_avulso" | "escolher";

export function entradaDoPedido(
  acesso: Pick<Acesso, "creditos" | "temProtecao" | "plano" | "estadoSubscricao"> | null,
  casoExtraConfigurado = false,
): EntradaPedido {
  if (!acesso) return "escolher";
  const opcoes = opcoesDoPedido(acesso, casoExtraConfigurado);
  if (opcoes.usarCasoDisponivel) return "usar_caso";
  if (opcoes.casoExtra) return "caso_extra";
  return opcoes.modalidades.includes("caso_protecao") ? "escolher" : "so_avulso";
}

/** id do pedido lido da metadata Stripe (só formato UUID). */
export function pedidoDaMetadata(metadata: Record<string, string> | null | undefined) {
  const id = metadata?.pedido_id;
  return ehUuid(id) ? id : null;
}

// Destinos depois de autenticar: regras em destinoAuth.ts (reexportadas
// aqui para quem já as importava deste módulo).
export { COOKIE_DESTINO_POS_LOGIN, destinoSeguro } from "./destinoAuth.ts";
