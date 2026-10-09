import { redirect } from "next/navigation";
import { haPedidoPorPagarNoBrowser } from "@/lib/pedidoCasoServidor";
import { createClient } from "@/lib/supabase/server";
import { Etapas } from "../_components/Etapas";
import { FormularioConta } from "./FormularioConta";
import { caminho, idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";

// Etapa 2 — conta. Já com sessão, segue para a modalidade. Sem um pedido
// por pagar neste browser, volta ao formulário.
export default async function ContaPedidoPage({ params }: ComIdioma) {
  await idiomaDaPagina(params);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) redirect(await caminho("/tratar-caso/modalidade"));
  if (!(await haPedidoPorPagarNoBrowser())) redirect(await caminho("/tratar-caso"));

  return (
    <>
      <Etapas atual={2} />
      <div className="rounded-[16px] border border-[var(--v2-line)] bg-white p-5 sm:p-8">
        <FormularioConta />
      </div>
    </>
  );
}
