"use server";

import { redirect } from "next/navigation";
import { contaComEmailConfirmado } from "@/lib/auth";
import { associarCompraAConta, type ResultadoAssociacao } from "@/lib/compra/associacao";
import { dependenciasAssociacao } from "@/lib/compra/servidor";
import { caminho } from "@/i18n/servidor";

/**
 * Associa uma compra paga sem conta à conta da sessão. A conta vem sempre
 * da sessão (nunca do formulário); o session_id só diz que compra procurar
 * — a Checkout Session é lida ao Stripe e todas as condições são validadas
 * no servidor e, de forma atómica, na base de dados.
 */
export async function associarCompra(formData: FormData) {
  const sessionId = String(formData.get("session_id") ?? "");

  let resultado: ResultadoAssociacao | "erro";
  try {
    resultado = await associarCompraAConta(sessionId, dependenciasAssociacao(contaComEmailConfirmado));
  } catch (erro) {
    console.error(JSON.stringify({ origem: "associar_compra", erro_codigo: (erro as { code?: string })?.code ?? "erro" }));
    resultado = "erro";
  }
  const pagina = await caminho(`/associar-compra?session_id=${encodeURIComponent(sessionId)}`);
  if (resultado === "sem_sessao") redirect(await caminho(`/login?next=${encodeURIComponent(pagina)}`));
  redirect(`${pagina}&resultado=${resultado}`);
}
