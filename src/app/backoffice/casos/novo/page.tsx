import { criarCaso } from "../actions";
import { CasoForm } from "../_components/CasoForm";
import { CabecalhoPagina } from "@/components/backoffice/Cabecalho";
import { PAINEL, PAINEL_CORPO } from "@/components/backoffice/ui";
import { Aviso } from "@/components/portal/Aviso";

export default async function NovoCasoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <CabecalhoPagina
        voltar={{ href: "/backoffice/casos", texto: "Casos" }}
        titulo="Novo caso"
        descricao="Criar um caso à mão, por exemplo depois de um contacto por e-mail ou telefone."
      />
      {params.erro && (
        <Aviso tom="erro" titulo="Não foi possível criar o caso.">
          {params.erro}
        </Aviso>
      )}
      <div className={`${PAINEL} ${PAINEL_CORPO}`}>
        <CasoForm action={criarCaso} submitLabel="Criar caso" />
      </div>
    </div>
  );
}
