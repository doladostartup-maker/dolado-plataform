import { obterAcesso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { contactoConhecido, entradaDoPedido, MOMENTOS, problemasDoSetor, SETORES } from "@/lib/pedidoCaso";
import { casoExtraConfigurado } from "@/lib/stripe/planos";
import { Etapas } from "./_components/Etapas";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { FormularioCaso } from "./_components/FormularioCaso";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Nome e telemóvel que a DoLado já conhece desta conta (qualquer conta com
// sessão, com ou sem subscrição). Sempre com o cliente da sessão: o RLS só
// devolve o perfil, os casos e os pedidos da própria conta.
async function contactoDaConta(supabase: Supabase, userId: string, metadata: unknown) {
  const [perfil, casos, pedidos] = await Promise.all([
    supabase.from("utilizadores").select("nome").eq("id", userId).maybeSingle(),
    supabase.from("casos").select("nome, telefone, created_at").eq("utilizador_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("pedidos_caso").select("nome, telefone, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
  ]);
  const anteriores = [...(casos.data ?? []), ...(pedidos.data ?? [])].sort((a, b) =>
    String(b.created_at).localeCompare(String(a.created_at)),
  );
  const meta = (metadata ?? {}) as Record<string, unknown>;
  const nomeDaConta = [meta.nome, meta.full_name, meta.name].find((v): v is string => typeof v === "string");
  return contactoConhecido({ perfilNome: perfil.data?.nome, anteriores, nomeDaConta });
}

// Etapa 1 — o cliente descreve o caso. Grava um pedido (não um caso).
// setor/problema/momento chegam do Simulador de Elegibilidade público para
// pré-preencher o formulário; só se aceitam valores das listas fechadas.
export default async function TratarCasoPage({
  searchParams,
  params: paramsPagina,
}: {
  searchParams: Promise<{ origem?: string; setor?: string; problema?: string; momento?: string }>;
} & ComIdioma) {
  await idiomaDaPagina(paramsPagina);
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  // Com sessão, o aviso inicial segue o acesso real da conta (mesma regra da
  // modalidade): quem tem casos disponíveis não é avisado de um pagamento.
  const acesso = userId ? await obterAcesso(supabase, userId) : null;
  const contacto = userId ? await contactoDaConta(supabase, userId, data?.claims?.user_metadata) : null;
  const origem = typeof params.origem === "string" && params.origem ? params.origem.slice(0, 200) : "/";
  const setor = typeof params.setor === "string" && SETORES.includes(params.setor) ? params.setor : "";
  const inicial = {
    sector: setor,
    problemaTipo: typeof params.problema === "string" && problemasDoSetor(setor).includes(params.problema) ? params.problema : "",
    momentoCliente: typeof params.momento === "string" && MOMENTOS.includes(params.momento) ? params.momento : "",
    nome: contacto?.nome ?? "",
    telefone: contacto?.telefone ?? "",
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
