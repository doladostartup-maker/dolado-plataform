// DoLado Empresas — registo, entrada e estados antes da aprovação (regras
// sem I/O). Fase 4 do piloto (docs/especificacoes/DOLADO_EMPRESAS_PILOTO.md).
// Textos só em português (D1).

import { nifValido } from "../preenchimentoReclamacao/campos.ts";
import { emailComFormatoValido, validarNovaPalavraPasse } from "../recuperarPalavraPasse.ts";

export { ROTAS_EMPRESA, ehCaminhoDeContaEmpresa } from "./contas.ts";

/** Interruptor do piloto: desligado, as páginas respondem 404 e as acções recusam. */
export function empresasAtivo(env: Record<string, string | undefined> = process.env): boolean {
  return env.EMPRESAS_ATIVO === "1";
}

export const TIPOS_ENTIDADE = {
  sociedade: "Sociedade (empresa com NIPC)",
  empresario_nome_individual: "Empresário em nome individual",
  profissional_independente: "Profissional independente",
} as const;

export type TipoEntidade = keyof typeof TIPOS_ENTIDADE;

export function ehTipoEntidade(valor: unknown): valor is TipoEntidade {
  return typeof valor === "string" && Object.hasOwn(TIPOS_ENTIDADE, valor);
}

/** NIPC/NIF escrito com espaços, pontos ou "PT" → 9 dígitos (ou null). */
export function normalizarNif(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const digitos = valor.replace(/^\s*PT/i, "").replace(/[\s.\-]/g, "");
  return /^\d{9}$/.test(digitos) ? digitos : null;
}

/**
 * NIPC/NIF válido para o tipo de entidade: dígito de controlo e primeiro
 * dígito (sociedades 5, 6, 9; empresários em nome individual e
 * profissionais independentes 1, 2, 3 — o NIF da pessoa). A base de dados
 * volta a verificar (empresa_registar).
 */
export function nifValidoParaTipo(nif: string, tipo: TipoEntidade): boolean {
  if (!nifValido(nif)) return false;
  return tipo === "sociedade" ? /^[569]/.test(nif) : /^[123]/.test(nif);
}

export type DadosRegisto = {
  tipo: TipoEntidade;
  nome: string;
  nif: string;
  responsavel: string;
  email: string;
  palavraPasse: string;
};

export const LIMITE_NOME = 200;

/**
 * Valida o formulário de registo; devolve os dados ou a primeira mensagem de
 * erro. Sem aceitação de Termos nesta fase: os Termos B2B dependem da
 * revisão jurídica e entram antes do lançamento (EMPRESAS_ATIVO desligado).
 */
export function validarRegisto(form: {
  tipo: unknown;
  nome: unknown;
  nif: unknown;
  responsavel: unknown;
  email: unknown;
  palavraPasse: unknown;
  confirmar: unknown;
}): { ok: true; dados: DadosRegisto } | { ok: false; erro: string } {
  if (!ehTipoEntidade(form.tipo)) return { ok: false, erro: "Escolha o tipo de entidade." };
  const nome = typeof form.nome === "string" ? form.nome.trim() : "";
  if (!nome || nome.length > LIMITE_NOME) return { ok: false, erro: "Indique o nome da empresa ou do profissional." };
  const nif = normalizarNif(form.nif);
  if (!nif || !nifValidoParaTipo(nif, form.tipo)) {
    return {
      ok: false,
      erro:
        form.tipo === "sociedade"
          ? "O NIPC não é válido. Confirme os 9 dígitos."
          : "O NIF não é válido. Confirme os 9 dígitos do seu NIF.",
    };
  }
  const responsavel = typeof form.responsavel === "string" ? form.responsavel.trim() : "";
  if (!responsavel || responsavel.length > LIMITE_NOME) return { ok: false, erro: "Indique o nome do responsável pela conta." };
  const email = typeof form.email === "string" ? form.email.trim().toLowerCase() : "";
  if (!emailComFormatoValido(email)) return { ok: false, erro: "Insira um e-mail válido." };
  const erroPalavraPasse = validarNovaPalavraPasse(form.palavraPasse, form.confirmar);
  if (erroPalavraPasse) return { ok: false, erro: erroPalavraPasse };
  return { ok: true, dados: { tipo: form.tipo, nome, nif, responsavel, email, palavraPasse: form.palavraPasse as string } };
}

/**
 * Mensagem depois do registo — a mesma quando o e-mail já tem conta (a
 * Supabase devolve então um utilizador sem identidades) e quando a conta
 * foi criada: nunca revela se um e-mail está registado.
 */
export const MSG_REGISTO_ENVIADO =
  "Se o e-mail puder ser usado, enviámos-lhe uma ligação para o confirmar. Abra-a neste navegador para continuar o registo.";

/** Resultado de empresa_registar() → mensagem ao visitante. */
export function mensagemResultadoRegisto(resultado: string): string | null {
  switch (resultado) {
    case "registada":
      return null;
    case "nif_invalido":
    case "tipo_invalido":
      return "O NIPC/NIF não corresponde ao tipo de entidade escolhido.";
    case "nif_em_uso":
      return "Não foi possível concluir o registo com estes dados. Se a empresa já tem conta, entre na conta ou contacte-nos.";
    default:
      // ja_empresa, conta_antiga, com_historico, conta_admin, sem_conta: o
      // e-mail já pertence a outra conta — a mesma mensagem genérica.
      return MSG_REGISTO_ENVIADO;
  }
}

export type EstadoOrganizacao =
  | "email_por_confirmar"
  | "mfa_por_configurar"
  | "a_aguardar_aprovacao"
  | "lista_espera"
  | "aprovada"
  | "ativa"
  | "pagamento_em_atraso"
  | "suspensa"
  | "cancelada"
  | "rejeitada"
  | "encerrada";

/** O que a conta vê em /empresa em cada estado (o portal é a Fase 7). */
export const APRESENTACAO_ESTADO: Record<EstadoOrganizacao, { titulo: string; texto: string }> = {
  email_por_confirmar: {
    titulo: "Confirme o seu e-mail",
    texto: "Abra a ligação que lhe enviámos para confirmar o e-mail e continuar o registo.",
  },
  mfa_por_configurar: {
    titulo: "Proteja a conta",
    texto: "Inscreva os dois factores da autenticação em dois passos para concluir o registo.",
  },
  a_aguardar_aprovacao: {
    titulo: "Pedido recebido",
    texto:
      "Recebemos o pedido de adesão da sua empresa. A DoLado analisa cada pedido e responde por e-mail no prazo máximo de 2 dias úteis.",
  },
  lista_espera: {
    titulo: "Pedido em lista de espera",
    texto:
      "Nesta fase acompanhamos um número limitado de empresas e as vagas estão preenchidas. Mantemos o seu pedido e avisamos por e-mail quando houver vaga.",
  },
  aprovada: {
    titulo: "Pedido aprovado",
    texto:
      "O pedido da sua empresa foi aprovado. Enviámos-lhe por e-mail os próximos passos para activar a Protecção Empresas.",
  },
  ativa: {
    titulo: "Protecção Empresas activa",
    texto: "A área da sua empresa está a ser preparada. Avisamos por e-mail quando estiver disponível.",
  },
  pagamento_em_atraso: {
    titulo: "Pagamento em atraso",
    texto: "Há um pagamento por confirmar. Se já fez a transferência, contacte-nos com o comprovativo.",
  },
  suspensa: {
    titulo: "Protecção suspensa",
    texto: "A Protecção da sua empresa está suspensa por falta de pagamento. Contacte-nos para a retomar.",
  },
  cancelada: {
    titulo: "Protecção cancelada",
    texto: "A Protecção da sua empresa foi cancelada. Contacte-nos se quiser retomá-la.",
  },
  rejeitada: {
    titulo: "Pedido não aprovado",
    texto: "Não foi possível aprovar o pedido da sua empresa. Enviámos-lhe a explicação por e-mail.",
  },
  encerrada: {
    titulo: "Conta encerrada",
    texto: "A Protecção desta empresa terminou. Contacte-nos se precisar de alguma informação.",
  },
};

export function ehEstadoOrganizacao(valor: unknown): valor is EstadoOrganizacao {
  return typeof valor === "string" && Object.hasOwn(APRESENTACAO_ESTADO, valor);
}

/** Estados em que o admin decide (aprovar/rejeitar) — espelho de empresa_aprovar/empresa_rejeitar. */
export const ESTADOS_APROVAVEIS: readonly EstadoOrganizacao[] = ["a_aguardar_aprovacao", "lista_espera"];
export const ESTADOS_REJEITAVEIS: readonly EstadoOrganizacao[] = [
  "email_por_confirmar",
  "mfa_por_configurar",
  "a_aguardar_aprovacao",
  "lista_espera",
  "aprovada",
];

/** Resultado de empresa_aprovar() → mensagem no backoffice. */
export function mensagemAprovacao(resultado: string): string {
  switch (resultado) {
    case "aprovada":
      return "Organização aprovada. O cliente foi avisado por e-mail.";
    case "lista_espera":
      return "Sem vaga: a organização ficou em lista de espera. O cliente foi avisado por e-mail.";
    case "sem_permissao":
      return "Sem permissão.";
    default:
      return "Esta organização já não está à espera de decisão.";
  }
}

/** Pedido de recuperação assistida: só valida a forma (nunca revela se há conta). */
export function validarPedidoRecuperacao(form: { email: unknown; nif: unknown; mensagem: unknown }):
  | { ok: true; email: string; nif: string | null; mensagem: string | null }
  | { ok: false; erro: string } {
  const email = typeof form.email === "string" ? form.email.trim().toLowerCase() : "";
  if (!emailComFormatoValido(email)) return { ok: false, erro: "Insira o e-mail da conta da empresa." };
  const nifEscrito = typeof form.nif === "string" ? form.nif.trim() : "";
  const nif = nifEscrito ? normalizarNif(nifEscrito) : null;
  if (nifEscrito && (!nif || !nifValido(nif))) return { ok: false, erro: "O NIPC/NIF não é válido. Confirme os 9 dígitos." };
  const mensagem = typeof form.mensagem === "string" ? form.mensagem.trim().slice(0, 1000) : "";
  return { ok: true, email, nif, mensagem: mensagem || null };
}

export const MSG_PEDIDO_RECUPERACAO_ASSISTIDA =
  "Recebemos o pedido. Se o e-mail corresponder a uma conta de empresa, a DoLado contacta a empresa pelos contactos oficiais para confirmar a identidade antes de repor o acesso.";
