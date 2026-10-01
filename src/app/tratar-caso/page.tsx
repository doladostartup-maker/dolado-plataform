import { createClient } from "@/lib/supabase/server";
import { MOMENTOS, PROBLEMAS, SETORES } from "@/lib/pedidoCaso";
import { Etapas } from "./_components/Etapas";
import { FormularioCaso } from "./_components/FormularioCaso";

// Etapa 1 — o cliente descreve o caso. Grava um pedido (não um caso).
// setor/problema/momento chegam do Simulador de Elegibilidade público para
// pré-preencher o formulário; só se aceitam valores das listas fechadas.
export default async function TratarCasoPage({
  searchParams,
}: {
  searchParams: Promise<{ origem?: string; setor?: string; problema?: string; momento?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const origem = typeof params.origem === "string" && params.origem ? params.origem.slice(0, 200) : "/";
  const inicial = {
    sector: typeof params.setor === "string" && SETORES.includes(params.setor) ? params.setor : "",
    problemaTipo: typeof params.problema === "string" && PROBLEMAS.includes(params.problema) ? params.problema : "",
    momentoCliente: typeof params.momento === "string" && MOMENTOS.includes(params.momento) ? params.momento : "",
  };

  return (
    <>
      <Etapas atual={1} />
      <FormularioCaso origem={origem} comSessao={!!data?.claims?.sub} inicial={inicial} />
    </>
  );
}
