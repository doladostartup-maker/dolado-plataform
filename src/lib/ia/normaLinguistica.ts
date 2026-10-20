// Norma linguística da DoLado para todo o texto em português produzido pela
// IA (sem I/O; `npm test`). Fonte única: cada prompt que gera texto em
// português inclui INSTRUCAO_NORMA_LINGUISTICA, para as funcionalidades não
// divergirem. Regras completas em docs/identidade-linguistica-dolado.md.
//
// Mudar este texto muda os prompts que o usam: subir a versão de cada um
// (PROMPT_VERSAO em src/lib/rascunhoIA/prompt.ts e src/lib/analiseResposta/prompt.ts).

/** Instrução obrigatória (decisão de Thiago, 19/10/2026). */
export const INSTRUCAO_NORMA_LINGUISTICA =
  "Redige todo o conteúdo em português europeu, segundo a ortografia tradicional portuguesa anterior ao Acordo Ortográfico de 1990. Utiliza vocabulário, sintaxe e construções próprios de Portugal. Mantém uma linguagem clara, profissional, acessível e juridicamente rigorosa. Não utilizes grafias introduzidas pelo Acordo Ortográfico de 1990 quando diferirem da grafia tradicional portuguesa. Preserva integralmente os factos fornecidos pelo consumidor, as citações, as referências jurídicas e os elementos documentais. Esta regra é obrigatória para todo o texto original que produzires.";

/** Exemplos curtos que acompanham a instrução nos prompts. */
export const EXEMPLOS_NORMA_LINGUISTICA =
  'Exemplos: "factura", "facturação", "acção", "direcção", "correcção", "actual", "actualização", "activo", "sector", "electricidade", "objectivo", "seleccionar", "detectar", "respectivo", "excepção", "exacto", "efectuar"; meses com maiúscula ("15 de Outubro"). Nunca português do Brasil ("você", "tela", "celular", "cadastro", "arquivo").';

/** Bloco pronto a incluir num prompt de sistema. */
export const BLOCO_NORMA_LINGUISTICA = `- ${INSTRUCAO_NORMA_LINGUISTICA}\n- ${EXEMPLOS_NORMA_LINGUISTICA}`;
