// DoLado Empresas — âmbito da análise automática (regras sem I/O). Fase 6A.
//
// Automático: electricidade em baixa tensão normal (BTN), água e
// telecomunicações. A BTN reconhece-se pela potência contratada ≤ 41,4 kVA
// (V8: a tensão não é extraída); sem a potência lida, a factura de
// electricidade não é tratada automaticamente. Gás (até haver testes
// próprios), sector desconhecido e electricidade fora da BTN (média tensão,
// BTE) ficam guardados para análise manual pela DoLado.

export const POTENCIA_MAXIMA_BTN_KVA = 41.4;

export type MotivoForaDoAmbito = "gas" | "setor_desconhecido" | "eletricidade_sem_potencia" | "eletricidade_fora_btn";

export const TEXTO_FORA_DO_AMBITO: Record<MotivoForaDoAmbito, string> = {
  gas: "Facturas e contratos de gás ainda não são analisados automaticamente",
  setor_desconhecido: "Não foi possível identificar o sector do documento",
  eletricidade_sem_potencia: "A potência contratada não foi lida: não é possível confirmar que é baixa tensão normal",
  eletricidade_fora_btn: "Potência acima de 41,4 kVA (fora da baixa tensão normal)",
};

type Fornecimento = { tipo: string; potenciaKva: number | null };

/**
 * Motivo para o documento ficar fora da análise automática, ou null se está
 * dentro. Os contratos de electricidade passam sem a potência (dão as
 * condições; a análise das facturas é que exige a BTN).
 */
export function foraDoAmbitoEmpresa(doc: { tipo: "fatura" | "contrato"; setor: string; energia?: Fornecimento[] | null }): MotivoForaDoAmbito | null {
  if (doc.setor === "telecomunicacoes" || doc.setor === "agua") return null;
  if (doc.setor === "gas") return "gas";
  if (doc.setor !== "eletricidade") return "setor_desconhecido";
  if (doc.tipo === "contrato") return null;
  const potencias = (doc.energia ?? []).filter((f) => f.tipo === "eletricidade").map((f) => f.potenciaKva);
  if (potencias.length === 0 || potencias.some((p) => p === null)) return "eletricidade_sem_potencia";
  return potencias.some((p) => (p as number) > POTENCIA_MAXIMA_BTN_KVA) ? "eletricidade_fora_btn" : null;
}
