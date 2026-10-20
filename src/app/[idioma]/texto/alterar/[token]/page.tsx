import { consultarLink } from "@/lib/textoCasoServidor";
import { PedirAlteracoes, PedirNovoLink } from "../../_components/Formularios";
import { MensagemTexto, TextoIntegral } from "../../_components/Mensagem";
import { CARTAO, EYEBROW, METADADOS, TEXTO, TITULO_PAGINA } from "@/components/portal/ui";
import { tTexto } from "@/i18n/mensagens/texto";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";

// GET só lê. O pedido só é registado com o botão "Enviar pedido de
// alterações" (POST).
export const dynamic = "force-dynamic";

export default async function PedirAlteracoesPage({ params }: ComIdioma<{ token: string }>) {
  const t = tTexto[await idiomaDaPagina(params)];
  const { token } = await params;
  const info = await consultarLink(token, "pedir_alteracoes");

  return (
    <article className="flex flex-col gap-5 pt-2">
      <header className="flex flex-col gap-2">
        <p className={EYEBROW}>{t.eyebrow}</p>
        <h1 className={TITULO_PAGINA}>{t.alterarTitulo}</h1>
      </header>
      {info.situacao === "valido" && info.conteudo ? (
        <>
          <p className={METADADOS}>
            {info.assunto ? t.relativaA(info.assunto) : t.aSuaReclamacao}
            {info.versao && info.versao > 1 ? t.versao(info.versao) : ""}
          </p>
          <p className={TEXTO}>{t.alterarTexto}</p>
          <TextoIntegral conteudo={info.conteudo} />
          <div className={CARTAO}>
            <PedirAlteracoes token={token} />
          </div>
        </>
      ) : (
        <>
          <MensagemTexto resultado={info.situacao === "valido" ? "invalido" : info.situacao} autorizadoEm={info.autorizadoEm} />
          {info.situacao === "expirado" && <PedirNovoLink token={token} />}
        </>
      )}
    </article>
  );
}
