import { consultarLink } from "@/lib/textoCasoServidor";
import { AutorizarEnvio, PedirNovoLink } from "../../_components/Formularios";
import { MensagemTexto, TextoIntegral } from "../../_components/Mensagem";
import { CARTAO, EYEBROW, METADADOS, TEXTO, TITULO_PAGINA } from "@/components/portal/ui";

// GET só lê (texto_consultar_link). Nada é autorizado nem consumido ao abrir
// a página — só o botão "Autorizar envio" (POST) autoriza.
export const dynamic = "force-dynamic";

export default async function ReverTextoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await consultarLink(token, "rever_autorizar");

  return (
    <article className="flex flex-col gap-5 pt-2">
      <header className="flex flex-col gap-2">
        <p className={EYEBROW}>A sua reclamação</p>
        <h1 className={TITULO_PAGINA}>Rever e autorizar o envio</h1>
      </header>
      {info.situacao === "valido" && info.conteudo ? (
        <>
          <p className={METADADOS}>
            {info.assunto ? `Reclamação relativa a ${info.assunto}` : "A sua reclamação"}
            {info.versao && info.versao > 1 ? ` · versão ${info.versao}` : ""}
          </p>
          <p className={TEXTO}>
            Este é exatamente o texto que a DoLado vai enviar em seu nome. Leia-o com atenção. Abrir este link não
            autorizou nada: o envio só fica autorizado depois de selecionar “Autorizar envio”.
          </p>
          <TextoIntegral conteudo={info.conteudo} />
          <div className={CARTAO}>
            <AutorizarEnvio token={token} />
          </div>
          <p className={METADADOS}>
            Se quiser mudar alguma coisa, não autorize: use o link “Pedir alterações” do e-mail ou a sua área de cliente.
          </p>
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
