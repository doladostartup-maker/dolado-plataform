import { requireAdmin } from "@/lib/auth";
import { COLUNAS_CASO_LISTA, juntarTextos, type CasoLista } from "@/lib/backoffice/filas";
import { CabecalhoPagina } from "@/components/backoffice/Cabecalho";
import { TabelaCasos } from "@/components/backoffice/TabelaCasos";
import { Aviso } from "@/components/portal/Aviso";

// Fila de revisão: casos novos, com resposta da empresa em análise ou a
// aguardar a confirmação do cliente, do mais antigo para o mais recente.
export default async function RevisaoPage() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("casos")
    .select(COLUNAS_CASO_LISTA)
    .in("status", ["Novo", "Resposta em análise", "Aguardando decisão cliente"])
    .order("created_at", { ascending: true });
  const casos = await juntarTextos(supabase, (data ?? []) as unknown as Omit<CasoLista, "texto">[]);

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        contexto="Fila de revisão"
        titulo="Novos, respostas em análise e a aguardar confirmação"
        descricao="Casos novos, com resposta da empresa em análise ou à espera da confirmação do cliente, do mais antigo para o mais recente."
      />
      {error && (
        <Aviso tom="erro" titulo="Não foi possível carregar os casos.">
          {error.message}
        </Aviso>
      )}
      <TabelaCasos casos={casos} vazio={{ titulo: "Fila vazia.", texto: "Não há casos novos, respostas por analisar nem confirmações pendentes." }} />
    </div>
  );
}
