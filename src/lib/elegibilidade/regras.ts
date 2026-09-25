// DoLado — Fase 1 do Simulador de Elegibilidade: regras determinísticas,
// sem IA. Cobre a maioria dos casos com uma regra fixa e sem
// interpretação — por isso é seguro enviar o resultado directo ao
// cliente, sem gate de revisão humana. Só os casos "em_revisao" avançam
// para a Fase 2 (sugestão da Claude API + confirmação obrigatória do
// admin).

export type Setor = "Telecomunicações" | "Energia" | "Água";
export type DuracaoContrato = "menos_6m" | "6_12m" | "1_2anos" | "mais_2anos";
export type EstadoElegibilidade = "elegivel" | "nao_elegivel" | "em_revisao";

export const DURACAO_LABEL: Record<DuracaoContrato, string> = {
  menos_6m: "Menos de 6 meses",
  "6_12m": "6 a 12 meses",
  "1_2anos": "1 a 2 anos",
  mais_2anos: "Mais de 2 anos",
};

export function calcularElegibilidade(
  setor: Setor,
  duracao: DuracaoContrato,
  empresaRespondeuBem: boolean,
): { pontuacao: number; estado: EstadoElegibilidade } {
  if (empresaRespondeuBem) {
    return { pontuacao: 0, estado: "nao_elegivel" };
  }

  if (setor === "Telecomunicações") {
    if (duracao === "menos_6m") return { pontuacao: 90, estado: "elegivel" };
    if (duracao === "6_12m") return { pontuacao: 70, estado: "elegivel" };
    if (duracao === "1_2anos") return { pontuacao: 60, estado: "elegivel" };
    if (duracao === "mais_2anos") return { pontuacao: 75, estado: "elegivel" };
  }

  if (setor === "Energia") {
    if (duracao === "mais_2anos") return { pontuacao: 75, estado: "elegivel" };
    return { pontuacao: 60, estado: "em_revisao" };
  }

  if (setor === "Água") {
    return { pontuacao: 80, estado: "elegivel" };
  }

  return { pontuacao: 50, estado: "em_revisao" };
}
