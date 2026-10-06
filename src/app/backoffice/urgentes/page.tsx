import { requireAdmin } from "@/lib/auth";
import { COLUNAS_CASO_LISTA, juntarTextos, type CasoLista } from "@/lib/backoffice/filas";
import { FILTRO_FINAIS } from "@/lib/backoffice/triagem";
import { CabecalhoPagina } from "@/components/backoffice/Cabecalho";
import { TabelaCasos } from "@/components/backoffice/TabelaCasos";
import { Aviso } from "@/components/portal/Aviso";

// Fila de urgência: casos em curso com a fidelização a terminar em 15 dias
// ou menos (ou já terminada), do prazo mais próximo para o mais distante.
export default async function UrgentesPage() {
  const { supabase } = await requireAdmin();

  const limite = new Date();
  limite.setDate(limite.getDate() + 15);
  const limiteISO = limite.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("casos")
    .select(COLUNAS_CASO_LISTA)
    .not("status", "in", FILTRO_FINAIS)
    .not("data_fim_fidelidade", "is", null)
    .lte("data_fim_fidelidade", limiteISO)
    .order("data_fim_fidelidade", { ascending: true });
  const casos = await juntarTextos(supabase, (data ?? []) as unknown as Omit<CasoLista, "texto">[]);

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        contexto="Fila de urgência"
        titulo="Fidelização a terminar"
        descricao="Casos em curso com a fidelização a terminar em 15 dias ou menos, ou já terminada. O prazo mais próximo aparece primeiro."
      />
      {error && (
        <Aviso tom="erro" titulo="Não foi possível carregar os casos.">
          {error.message}
        </Aviso>
      )}
      <TabelaCasos casos={casos} vazio={{ titulo: "Sem casos urgentes.", texto: "Nenhum caso em curso tem a fidelização a terminar nos próximos 15 dias." }} />
    </div>
  );
}
