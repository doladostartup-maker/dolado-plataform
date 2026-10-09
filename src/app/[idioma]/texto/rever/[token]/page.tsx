import { consultarLink } from "@/lib/textoCasoServidor";
import { AutorizarEnvio, PedirNovoLink } from "../../_components/Formularios";
import { MensagemTexto, TextoIntegral } from "../../_components/Mensagem";
import { CARTAO, EYEBROW, METADADOS, TEXTO, TITULO_PAGINA } from "@/components/portal/ui";
import { tTexto } from "@/i18n/mensagens/texto";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";

// GET só lê (texto_consultar_link). Nada é autorizado nem consumido ao abrir
// a página — só o botão "Autorizar envio" (POST) autoriza.
export const dynamic = "force-dynamic";

export default async function ReverTextoPage({ params }: ComIdioma<{ token: string }>) {
  const t = tTexto[await idiomaDaPagina(params)];
  const { token } = await params;
  const info = await consultarLink(token, "rever_autorizar");

  return (
    <article className="flex flex-col gap-5 pt-2">
      <header className="flex flex-col gap-2">
        <p className={EYEBROW}>{t.eyebrow}</p>
        <h1 className={TITULO_PAGINA}>{t.reverTitulo}</h1>
      </header>
      {info.situacao === "valido" && info.conteudo ? (
        <>
          <p className={METADADOS}>
            {info.assunto ? t.relativaA(info.assunto) : t.aSuaReclamacao}
            {info.versao && info.versao > 1 ? t.versao(info.versao) : ""}
          </p>
          <p className={TEXTO}>{t.reverTexto}</p>
          <TextoIntegral conteudo={info.conteudo} />
          <div className={CARTAO}>
            <AutorizarEnvio token={token} />
          </div>
          <p className={METADADOS}>{t.reverNota}</p>
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
