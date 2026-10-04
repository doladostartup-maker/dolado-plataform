import { consultarLink } from "@/lib/textoCasoServidor";
import { AutorizarEnvio, PedirNovoLink } from "../../_components/Formularios";
import { MensagemTexto, TextoIntegral } from "../../_components/Mensagem";

// GET só lê (texto_consultar_link). Nada é autorizado nem consumido ao abrir
// a página — só o botão "Autorizo o envio" (POST) autoriza.
export const dynamic = "force-dynamic";

export default async function ReverTextoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await consultarLink(token, "rever_autorizar");

  return (
    <article className="flex flex-col gap-5 pt-2">
      <h1 className="text-[26px] font-semibold leading-tight text-[var(--color-ink)]">Rever e autorizar o envio</h1>
      {info.situacao === "valido" && info.conteudo ? (
        <>
          <p className="text-[14px] text-[var(--color-ink-muted)]">
            {info.assunto ? `Reclamação relativa a ${info.assunto}` : "A sua reclamação"}
            {info.versao && info.versao > 1 ? ` · versão ${info.versao}` : ""}
          </p>
          <p className="text-[14.5px] leading-relaxed text-[var(--color-ink)]">
            Este é exatamente o texto que a DoLado vai enviar em seu nome. Leia-o com atenção. Abrir este link não
            autorizou nada: o envio só fica autorizado depois de selecionar “Autorizo o envio”.
          </p>
          <TextoIntegral conteudo={info.conteudo} />
          <AutorizarEnvio token={token} />
          <p className="text-[13px] text-[var(--color-ink-muted)]">
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
