import { obterAcesso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { entradaDoPedido, MOMENTOS, problemasDoSetor, SETORES } from "@/lib/pedidoCaso";
import { casoExtraConfigurado } from "@/lib/stripe/planos";
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
  const userId = data?.claims?.sub as string | undefined;
  // Com sessão, o aviso inicial segue o acesso real da conta (mesma regra da
  // modalidade): quem tem casos disponíveis não é avisado de um pagamento.
  const acesso = userId ? await obterAcesso(supabase, userId) : null;
  const origem = typeof params.origem === "string" && params.origem ? params.origem.slice(0, 200) : "/";
  const setor = typeof params.setor === "string" && SETORES.includes(params.setor) ? params.setor : "";
  const inicial = {
    sector: setor,
    problemaTipo: typeof params.problema === "string" && problemasDoSetor(setor).includes(params.problema) ? params.problema : "",
    momentoCliente: typeof params.momento === "string" && MOMENTOS.includes(params.momento) ? params.momento : "",
  };

  return (
    <>
      <Etapas atual={1} />
      <FormularioCaso
        origem={origem}
        comSessao={!!userId}
        inicial={inicial}
        entrada={entradaDoPedido(acesso, casoExtraConfigurado())}
        casosDisponiveis={acesso?.creditos ?? 0}
      />
    </>
  );
}
