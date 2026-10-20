import { requireProtecao } from "@/lib/auth";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { tProtecao, traduzirMensagemProtecao } from "@/i18n/mensagens/protecao";
import { criarContratoManual } from "../actions";
import { CamposContrato } from "../_components/CamposContrato";
import { BOTAO_PRIMARIO, CARTAO } from "../_components/estilos";
import { Aviso } from "@/components/portal/Aviso";
import { CabecalhoPagina } from "@/components/portal/Cabecalho";

export default async function NovoContratoPage({ params: parametros, searchParams }: ComIdioma & { searchParams: Promise<{ erro?: string }> }) {
  const idioma = await idiomaDaPagina(parametros);
  const t = tProtecao[idioma].novo;
  const params = await searchParams;
  await requireProtecao("contratos");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <CabecalhoPagina
        voltar={{ href: "/portal/contratos", texto: tProtecao[idioma].lista.titulo }}
        titulo={t.titulo}
        descricao={t.descricao}
      />
      {params.erro && <Aviso tom="erro">{traduzirMensagemProtecao(idioma, params.erro)}</Aviso>}

      <form action={criarContratoManual} className={`${CARTAO} flex flex-col gap-5`}>
        <CamposContrato setorObrigatorio idioma={idioma} />
        <button type="submit" className={`${BOTAO_PRIMARIO} w-full sm:w-auto sm:self-start`}>
          {t.comecar}
        </button>
      </form>
    </div>
  );
}
