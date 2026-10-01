import { createClient } from "@/lib/supabase/server";
import { Etapas } from "./_components/Etapas";
import { FormularioCaso } from "./_components/FormularioCaso";

// Etapa 1 — o cliente descreve o caso. Grava um pedido (não um caso).
export default async function TratarCasoPage({
  searchParams,
}: {
  searchParams: Promise<{ origem?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const origem = typeof params.origem === "string" && params.origem ? params.origem.slice(0, 200) : "/";

  return (
    <>
      <Etapas atual={1} />
      <FormularioCaso origem={origem} comSessao={!!data?.claims?.sub} />
    </>
  );
}
