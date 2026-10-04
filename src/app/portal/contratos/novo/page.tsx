import { requireProtecao } from "@/lib/auth";
import { criarContratoManual } from "../actions";
import { CamposContrato } from "../_components/CamposContrato";
import { BOTAO_PRIMARIO, CARTAO } from "../_components/estilos";
import { Aviso } from "@/components/portal/Aviso";
import { CabecalhoPagina } from "@/components/portal/Cabecalho";

export default async function NovoContratoPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const params = await searchParams;
  await requireProtecao("contratos");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <CabecalhoPagina
        voltar={{ href: "/portal/contratos", texto: "Proteção" }}
        titulo="Indicar os dados do contrato"
        descricao="Preencha o que souber. Para receber os avisos basta o fornecedor e uma data (fim da fidelização ou da promoção). Pode carregar uma fatura ou o contrato mais tarde para completar os dados."
      />
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}

      <form action={criarContratoManual} className={`${CARTAO} flex flex-col gap-5`}>
        <CamposContrato setorObrigatorio />
        <button type="submit" className={`${BOTAO_PRIMARIO} w-full sm:w-auto sm:self-start`}>
          Começar a acompanhar
        </button>
      </form>
    </div>
  );
}
