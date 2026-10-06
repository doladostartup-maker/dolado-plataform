"use server";

import { requireAdmin } from "@/lib/auth";
import { extrairDadosDoDocumento, type FonteDocumento, type ResultadoPreenchimento } from "@/lib/preenchimentoReclamacao/servidor";

// Preenchimento dos marcadores de identificação ([NOME DO CLIENTE], [NIF],
// [MORADA], [N.º DE CLIENTE OU CONTRATO]) a partir de um documento já
// carregado. Só lê: não grava nada nem muda o texto — os valores voltam ao
// editor, onde a pessoa os confere e os insere; o texto só fica guardado
// quando ela carregar em "Guardar" (fluxo de sempre).
export async function lerDadosDoDocumento(casoId: string, fonte: FonteDocumento, documentoId: string): Promise<ResultadoPreenchimento> {
  await requireAdmin();
  if (fonte !== "anexo" && fonte !== "monitor") return { ok: false, erro: "Documento inválido." };
  return extrairDadosDoDocumento(casoId, fonte, documentoId);
}
