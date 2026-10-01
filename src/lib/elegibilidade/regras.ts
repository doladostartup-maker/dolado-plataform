// DoLado — Simulador de Elegibilidade público (revisto a 01/10/2026).
//
// Ferramenta gratuita de qualificação, antes da compra: responde a "a DoLado
// pode ajudar-me com este caso?" com 4 perguntas de escolha e um resultado
// INDICATIVO sobre o âmbito do serviço — nunca sobre direitos do cliente nem
// sobre a conduta da empresa. Corre só no browser: não grava respostas, não
// pede dados pessoais, não envia e-mails nem chama a Claude API.
//
// As opções de setor, problema e momento são as do formulário "Tratar o meu
// caso" (src/lib/pedidoCaso.ts), para o resultado positivo poder pré-preencher
// esse formulário sem repetir perguntas.

import { MOMENTOS, PROBLEMAS, SETORES } from "../pedidoCaso.ts";

export const SETOR_FORA_DO_AMBITO = "Outro tipo de empresa";
export const OPCOES_SETOR = [...SETORES, SETOR_FORA_DO_AMBITO];

export const TITULAR_PARTICULAR = "Sim, é um contrato pessoal ou da minha casa";
export const TITULAR_EMPRESA = "Não, é de uma empresa ou atividade profissional";
export const TITULAR_NAO_SEI = "Não tenho a certeza";
export const OPCOES_TITULAR = [TITULAR_PARTICULAR, TITULAR_EMPRESA, TITULAR_NAO_SEI];

export const OPCOES_PROBLEMA = PROBLEMAS;

export const MOMENTO_RESOLVIDO = "Sim, e o problema ficou resolvido";
export const OPCOES_MOMENTO = [...MOMENTOS, MOMENTO_RESOLVIDO];

export type RespostasSimulador = {
  setor: string;
  titular: string;
  problema: string;
  momento: string;
};

export type ResultadoSimulador = "positivo" | "incerto" | "negativo";

export type AvaliacaoSimulador = {
  resultado: ResultadoSimulador;
  /** Motivo curto, sem afirmações jurídicas — só sobre o âmbito do serviço. */
  motivo: string | null;
};

export const MOTIVOS = {
  setor: "Neste momento, a DoLado trata apenas situações com empresas de telecomunicações, energia e água.",
  empresa: "O serviço atual da DoLado é dirigido a consumidores particulares, não a contratos de empresas ou atividades profissionais.",
  resolvido: "Pelas suas respostas, a situação parece já ter sido resolvida com a empresa.",
  titular: "Não é claro se o contrato é pessoal ou de uma empresa ou atividade profissional.",
  problema: "O tipo de situação não está entre os que a DoLado trata com mais frequência.",
} as const;

/**
 * Avalia as respostas. Ordem: o que está claramente fora do âmbito primeiro
 * (negativo), depois o que fica por esclarecer (incerto), senão positivo.
 */
export function avaliarSimulador(r: RespostasSimulador): AvaliacaoSimulador {
  if (r.setor === SETOR_FORA_DO_AMBITO) return { resultado: "negativo", motivo: MOTIVOS.setor };
  if (r.titular === TITULAR_EMPRESA) return { resultado: "negativo", motivo: MOTIVOS.empresa };
  if (r.momento === MOMENTO_RESOLVIDO) return { resultado: "negativo", motivo: MOTIVOS.resolvido };

  if (r.titular === TITULAR_NAO_SEI) return { resultado: "incerto", motivo: MOTIVOS.titular };
  if (r.problema === "Outro") return { resultado: "incerto", motivo: MOTIVOS.problema };

  const valido =
    SETORES.includes(r.setor) &&
    r.titular === TITULAR_PARTICULAR &&
    PROBLEMAS.includes(r.problema) &&
    MOMENTOS.includes(r.momento);
  return valido ? { resultado: "positivo", motivo: null } : { resultado: "incerto", motivo: null };
}

/**
 * Parâmetros para pré-preencher "Tratar o meu caso". Só categorias fechadas
 * (nada escrito pelo utilizador, nada identificável) e só valores que o
 * formulário aceita.
 */
export function parametrosPrePreenchimento(r: RespostasSimulador): Record<string, string> {
  const p: Record<string, string> = {};
  if (SETORES.includes(r.setor)) p.setor = r.setor;
  if (PROBLEMAS.includes(r.problema)) p.problema = r.problema;
  if (MOMENTOS.includes(r.momento)) p.momento = r.momento;
  return p;
}
