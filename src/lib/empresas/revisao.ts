// DoLado Empresas — revisão humana dos documentos (D3; regras sem I/O).
// Fase 6B. Até `revisao_obrigatoria_ate` (30 dias desde a activação), tudo é
// revisto; depois, só por excepção. O servidor reúne os factos e grava os
// motivos (empresa_marcar_revisao); a revisão regista minutos e tipo de erro.

export const MOTIVOS_REVISAO = [
  "periodo_inicial",
  "confianca_baixa",
  "associacao_cliente",
  "diferenca_potencial",
  "sector_novo",
  "fornecedor_novo",
  "total_soma_linhas",
  "primeira_fatura_servico",
  "analise_manual",
] as const;

export type MotivoRevisao = (typeof MOTIVOS_REVISAO)[number];

export const TEXTO_MOTIVO_REVISAO: Record<MotivoRevisao, string> = {
  periodo_inicial: "Primeiros 30 dias da empresa (revisão obrigatória)",
  confianca_baixa: "Leitura com confiança baixa num campo usado",
  associacao_cliente: "Serviço escolhido pela empresa (associação não automática)",
  diferenca_potencial: "Diferença potencial detectada",
  sector_novo: "Sector novo para esta empresa",
  fornecedor_novo: "Fornecedor novo para esta empresa",
  total_soma_linhas: "Total diferente da soma das linhas",
  primeira_fatura_servico: "Primeira factura deste serviço",
  analise_manual: "Fora da análise automática (análise manual)",
};

export type FactosRevisao = {
  dentroPeriodoObrigatorio: boolean;
  confiancaBaixa: boolean;
  decididoPelaEmpresa: boolean;
  diferencaPotencial: boolean;
  sectorNovo: boolean;
  fornecedorNovo: boolean;
  totalDiferenteSoma: boolean;
  primeiraFaturaServico: boolean;
};

/** Motivos de revisão de um documento registado (vazio = sem revisão obrigatória). */
export function motivosRevisao(f: FactosRevisao): MotivoRevisao[] {
  const m: MotivoRevisao[] = [];
  if (f.dentroPeriodoObrigatorio) m.push("periodo_inicial");
  if (f.confiancaBaixa) m.push("confianca_baixa");
  if (f.decididoPelaEmpresa) m.push("associacao_cliente");
  if (f.diferencaPotencial) m.push("diferenca_potencial");
  if (f.sectorNovo) m.push("sector_novo");
  if (f.fornecedorNovo) m.push("fornecedor_novo");
  if (f.totalDiferenteSoma) m.push("total_soma_linhas");
  if (f.primeiraFaturaServico) m.push("primeira_fatura_servico");
  return m;
}

export const RESULTADOS_REVISAO = { confirmado: "Confirmado", corrigido: "Corrigido", descartado: "Descartado" } as const;

/** Tipos de erro de empresa_revisoes (custo e qualidade do piloto). */
export const TIPOS_ERRO_REVISAO = {
  extracao_valor: "Valor mal lido",
  extracao_data: "Data mal lida",
  extracao_identificador: "Identificador mal lido",
  associacao_servico: "Serviço errado",
  associacao_instalacao: "Instalação errada",
  classificacao: "Classificação errada",
  outro: "Outro",
} as const;

export function validarRevisao(form: { minutos: unknown; resultado: unknown; tipoErro: unknown; nota: unknown }):
  | { ok: true; minutos: number; resultado: keyof typeof RESULTADOS_REVISAO; tipoErro: keyof typeof TIPOS_ERRO_REVISAO | null; nota: string | null }
  | { ok: false; erro: string } {
  const textoMinutos = String(form.minutos ?? "").trim();
  const minutos = Number(textoMinutos.replace(",", "."));
  if (!textoMinutos || !Number.isInteger(minutos) || minutos < 0 || minutos > 600) return { ok: false, erro: "Indique os minutos da revisão (0 a 600)." };
  const resultado = String(form.resultado ?? "");
  if (!Object.hasOwn(RESULTADOS_REVISAO, resultado)) return { ok: false, erro: "Escolha o resultado da revisão." };
  const tipo = String(form.tipoErro ?? "");
  const tipoErro = tipo && Object.hasOwn(TIPOS_ERRO_REVISAO, tipo) ? (tipo as keyof typeof TIPOS_ERRO_REVISAO) : null;
  if (resultado === "corrigido" && !tipoErro) return { ok: false, erro: "Numa correcção, indique o tipo de erro." };
  const nota = String(form.nota ?? "").trim().slice(0, 1000) || null;
  return { ok: true, minutos, resultado: resultado as keyof typeof RESULTADOS_REVISAO, tipoErro, nota };
}
