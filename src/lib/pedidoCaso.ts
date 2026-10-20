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

// Energia e Gás (20/10/2026 — auditoria em
// docs/legal/auditoria-energia-facturacao-contratacao-2026-10-20.md): além dos
// tipos comuns, os dois grandes temas das reclamações aos comercializadores
// (ERSE, 2025: facturação e cobrança 49,6%, contratação 35,1%) têm tipo
// próprio — factura alta/estimativa/acerto, cobrança depois de sair e
// contrato ou condições não aceites —, a mudança de comercializador e a
// tarifa social (06/10/2026). "Cobrança após cancelamento" é o mesmo valor
// dos Ginásios. Os valores gravados nunca mudam; a ordem é só a do ecrã.
export const PROBLEMA_FACTURA_ACERTO = "Factura alta, estimativa ou acerto";
export const PROBLEMA_COBRANCA_APOS_CANCELAMENTO = "Cobrança após cancelamento";
export const PROBLEMA_CONTRATO_NAO_ACEITE = "Contrato ou condições que não aceitei";
const PROBLEMAS_ENERGIA_GAS = [
  "Aumento de mensalidade",
  PROBLEMA_FACTURA_ACERTO,
  "Cobrança indevida",
  PROBLEMA_COBRANCA_APOS_CANCELAMENTO,
  PROBLEMA_CONTRATO_NAO_ACEITE,
  "Fidelização ou penalização",
  "Corte ou falha de serviço",
  "Cancelamento recusado",
  "Mudança de comercializador",
  "Tarifa social",
  "Outro",
];

// Energia Solar / Autoconsumo (13/10/2026): venda, instalação e registo de
// sistemas de painéis solares — não é fornecimento de eletricidade. Só em
// Energia (setor) e com seleção de regras própria (perfilAutoconsumo.ts, em
// src/lib/rascunhoIA/). O valor gravado é o texto completo.
export const PROBLEMA_SOLAR_INSTALACAO = "Painéis solares: instalação, avaria ou garantia";
export const PROBLEMA_SOLAR_CONTRATO = "Painéis solares: contrato, cancelamento ou promessa comercial";
export const PROBLEMA_SOLAR_REGISTO = "Painéis solares: registo, ligação ou autoconsumo";
export const PROBLEMAS_AUTOCONSUMO: readonly string[] = [PROBLEMA_SOLAR_INSTALACAO, PROBLEMA_SOLAR_CONTRATO, PROBLEMA_SOLAR_REGISTO];

/** Caso de painéis solares (Energia → Autoconsumo)? */
export function ehCasoAutoconsumo(setor: string | null | undefined, problema: string | null | undefined): boolean {
  return setor === "Energia" && !!problema && PROBLEMAS_AUTOCONSUMO.includes(problema);
}

export const PROBLEMAS_POR_SETOR: Record<string, string[]> = {
  "Telecomunicações": PROBLEMAS_SERVICOS,
  Energia: [...PROBLEMAS_ENERGIA_GAS.filter((p) => p !== "Outro"), ...PROBLEMAS_AUTOCONSUMO, "Outro"],
  "Gás": PROBLEMAS_ENERGIA_GAS,
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
    PROBLEMA_COBRANCA_APOS_CANCELAMENTO,
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

/** Sem tipo de problema é válido (casos antigos); com tipo, tem de ser do setor. */
export function problemaValidoParaSetor(setor: string | null | undefined, problema: string | null | undefined) {
  if (!problema) return true;
  return problemasDoSetor(setor).includes(problema);
}

// Setores da DoLado que são serviços públicos essenciais (Lei n.º 23/96,
// art. 1.º, n.º 2) — lista positiva. As regras jurídicas dessa lei só chegam
// a casos destes setores (src/lib/rascunhoIA/regras.ts).
//   Telecomunicações → comunicações eletrónicas (alínea d));
//   Energia → energia elétrica (b));
//   Gás → gás natural e GPL canalizados (c)) — o gás de garrafa NÃO está
//         abrangido; o formulário não distingue, por isso a revisão humana
//         confirma o tipo de gás;
//   Água → água, águas residuais e resíduos urbanos (a), f), g)).
// Serviços postais (e)) e transporte de passageiros (h)) só entram quando
// existirem como setor. Compras & Reembolsos e Ginásios não são.
export const SETORES_SERVICOS_PUBLICOS_ESSENCIAIS: readonly string[] = ["Telecomunicações", "Energia", "Gás", "Água"];

export function isServicoPublicoEssencial(setor: string | null | undefined): boolean {
  return !!setor && SETORES_SERVICOS_PUBLICOS_ESSENCIAIS.includes(setor);
}
// ---------------------------------------------------------------------------
// Respostas adicionais (só casos de painéis solares; pedidos_caso/casos
// .detalhes_caso, jsonb validado também na base de dados). Decidem que regras
// jurídicas podem ser consideradas (contratação à distância/fora do
// estabelecimento, crédito coligado, CAER) — nunca acesso, preço nem plano.
// Valores fechados; os rótulos estão em src/i18n/mensagens/*/rotulos.ts.

export const FORMAS_CONTRATACAO = ["estabelecimento", "domicilio", "distancia", "fora_estabelecimento", "nao_sei"] as const;
export const FINANCIAMENTOS = ["nao", "sim_com_compra", "sim_separado", "nao_sei"] as const;
export const TIPOS_CONTRATO_SOLAR = ["compra_instalacao", "caer", "nao_sei"] as const;

export type DetalhesCaso = {
  forma_contratacao: (typeof FORMAS_CONTRATACAO)[number];
  financiamento: (typeof FINANCIAMENTOS)[number];
  tipo_contrato_solar: (typeof TIPOS_CONTRATO_SOLAR)[number];
};

const OPCOES_DETALHES: { [K in keyof DetalhesCaso]: readonly string[] } = {
  forma_contratacao: FORMAS_CONTRATACAO,
  financiamento: FINANCIAMENTOS,
  tipo_contrato_solar: TIPOS_CONTRATO_SOLAR,
};
export const CAMPOS_DETALHES = Object.keys(OPCOES_DETALHES) as (keyof DetalhesCaso)[];

// Energia e Gás — tipos de problema de contratação (20/10/2026): o canal de
// contratação decide se as regras do DL 24/2014 (à distância, por telefone,
// fora do estabelecimento) podem ser consideradas. Só a forma de contratação
// é perguntada; as outras respostas são só dos painéis solares.
export const PROBLEMAS_CONTRATACAO_ENERGIA: readonly string[] = [
  PROBLEMA_CONTRATO_NAO_ACEITE,
  "Mudança de comercializador",
  "Cancelamento recusado",
];

/** Caso de contratação de Energia ou Gás (pergunta a forma de contratação)? */
export function ehContratacaoEnergia(setor: string | null | undefined, problema: string | null | undefined): boolean {
  return (setor === "Energia" || setor === "Gás") && !!problema && PROBLEMAS_CONTRATACAO_ENERGIA.includes(problema);
}

/** Respostas adicionais pedidas para este caso (vazio = nenhuma). */
export function camposDetalhes(setor: string | null | undefined, problema: string | null | undefined): (keyof DetalhesCaso)[] {
  if (ehCasoAutoconsumo(setor, problema)) return [...CAMPOS_DETALHES];
  if (ehContratacaoEnergia(setor, problema)) return ["forma_contratacao"];
  return [];
}

/** Valor válido de uma resposta adicional? */
export function respostaDetalheValida(campo: keyof DetalhesCaso, valor: unknown): boolean {
  return typeof valor === "string" && OPCOES_DETALHES[campo].includes(valor);
}

/**
 * Lê as respostas adicionais de um valor desconhecido (base de dados ou
 * formulário). Campo em falta ou inválido → "nao_sei"; sem nenhum campo
 * válido → null. Nunca lança.
 */
export function lerDetalhesCaso(valor: unknown): DetalhesCaso | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const v = valor as Record<string, unknown>;
  let algum = false;
  const campo = <K extends keyof DetalhesCaso>(k: K): DetalhesCaso[K] => {
    const x = v[k];
    if (typeof x === "string" && OPCOES_DETALHES[k].includes(x)) {
      algum = true;
      return x as DetalhesCaso[K];
    }
    return "nao_sei" as DetalhesCaso[K];
  };
  const detalhes: DetalhesCaso = {
    forma_contratacao: campo("forma_contratacao"),
    financiamento: campo("financiamento"),
    tipo_contrato_solar: campo("tipo_contrato_solar"),
  };
  return algum ? detalhes : null;
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

export type ContactoConhecido = { nome?: string | null; telefone?: string | null };

/**
 * Nome e telemóvel já conhecidos da conta, para pré-preencher "Tratar o meu
 * caso" (os campos continuam editáveis). Não há campo de telemóvel no perfil:
 * a fonte é o que o próprio cliente indicou nos seus casos/pedidos.
 * Ordem do nome: perfil (`utilizadores.nome`) → casos/pedidos (mais recente
 * primeiro) → nome da conta Google. Só valores válidos; sem dado, fica vazio.
 */
export function contactoConhecido({
  perfilNome,
  anteriores = [],
  nomeDaConta,
}: {
  perfilNome?: string | null;
  /** Casos e pedidos da própria conta, do mais recente para o mais antigo. */
  anteriores?: ContactoConhecido[];
  nomeDaConta?: string | null;
}): { nome: string; telefone: string } {
  const limpo = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const nome =
    [limpo(perfilNome), ...anteriores.map((a) => limpo(a.nome)), limpo(nomeDaConta)].find(
      (n) => n && n.length <= 120 && validNome(n),
    ) ?? "";
  const telefone =
    anteriores.map((a) => limpo(a.telefone)).find((t) => t && t.length <= 30 && validTelemovel(t)) ?? "";
  return { nome, telefone };
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
  /**
   * Só as respostas pedidas para o caso (camposDetalhes): as três nos painéis
   * solares, só a forma de contratação na contratação de Energia/Gás; nos
   * outros casos, null.
   */
  detalhes_caso: Partial<DetalhesCaso> | null;
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

  if (!SETORES.includes(sector) || empresa.length < 2) return { ok: false, erro: "Indique o sector e a empresa." };
  if (!problemasDoSetor(sector).includes(problemaTipo)) return { ok: false, erro: "Seleccione o que aconteceu." };
  if (!MOMENTOS.includes(momento)) return { ok: false, erro: "Indique se já reclamou junto da empresa." };
  if (!validNome(nome)) return { ok: false, erro: "Insira um nome válido." };
  if (!validTelemovel(telefone)) return { ok: false, erro: "Telemóvel inválido." };
  if (ler("autorizacao") !== "on") return { ok: false, erro: "Confirme o pedido para avançar." };

  // Respostas adicionais (painéis solares; contratação de Energia/Gás): as
  // pedidas são obrigatórias (todas têm "Não sei"); nunca se guardam outras.
  let detalhes: Partial<DetalhesCaso> | null = null;
  const campos = camposDetalhes(sector, problemaTipo);
  if (campos.length) {
    const respostas = Object.fromEntries(campos.map((c) => [c, texto(c, 40)]));
    if (campos.some((c) => !respostaDetalheValida(c, respostas[c]))) {
      return {
        ok: false,
        erro: ehCasoAutoconsumo(sector, problemaTipo)
          ? "Responda às perguntas sobre o contrato dos painéis solares."
          : "Indique como foi feito o contrato.",
      };
    }
    detalhes = respostas as Partial<DetalhesCaso>;
  }

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
      detalhes_caso: detalhes,
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
  acesso: Pick<Acesso, "creditos" | "temSubscricao" | "plano" | "estadoSubscricao">,
  casoExtraConfigurado = false,
) {
  const casoExtra = casoExtraConfigurado && elegivelCasoExtra(acesso);
  return {
    usarCasoDisponivel: acesso.creditos > 0,
    casoExtra,
    modalidades: (casoExtra ? [] : acesso.temSubscricao ? ["avulso"] : ["avulso", "caso_protecao"]) as ModalidadeCaso[],
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
  acesso: Pick<Acesso, "creditos" | "temSubscricao" | "plano" | "estadoSubscricao"> | null,
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
