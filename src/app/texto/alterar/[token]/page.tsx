import { consultarLink } from "@/lib/textoCasoServidor";
import { PedirAlteracoes, PedirNovoLink } from "../../_components/Formularios";
import { MensagemTexto, TextoIntegral } from "../../_components/Mensagem";
import { CARTAO, EYEBROW, METADADOS, TEXTO, TITULO_PAGINA } from "@/components/portal/ui";

// GET só lê. O pedido só é registado com o botão "Enviar pedido de
// alterações" (POST).
export const dynamic = "force-dynamic";

export default async function PedirAlteracoesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await consultarLink(token, "pedir_alteracoes");

  return (
    <article className="flex flex-col gap-5 pt-2">
      <header className="flex flex-col gap-2">
        <p className={EYEBROW}>A sua reclamação</p>
        <h1 className={TITULO_PAGINA}>Pedir alterações</h1>
      </header>
      {info.situacao === "valido" && info.conteudo ? (
        <>
          <p className={METADADOS}>
            {info.assunto ? `Reclamação relativa a ${info.assunto}` : "A sua reclamação"}
            {info.versao && info.versao > 1 ? ` · versão ${info.versao}` : ""}
          </p>
          <p className={TEXTO}>
            Este é o texto preparado pela DoLado. Indique-nos o que gostaria de rever — vamos preparar uma nova versão e
            enviá-la para a sua aprovação. O pedido só fica registado quando selecionar “Enviar pedido de alterações”, e
            nada é enviado sem a sua autorização.
          </p>
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
