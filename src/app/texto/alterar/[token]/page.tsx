import { consultarLink } from "@/lib/textoCasoServidor";
import { PedirAlteracoes, PedirNovoLink } from "../../_components/Formularios";
import { MensagemTexto, TextoIntegral } from "../../_components/Mensagem";

// GET só lê. O pedido só é registado com o botão "Enviar pedido de
// alterações" (POST).
export const dynamic = "force-dynamic";

export default async function PedirAlteracoesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await consultarLink(token, "pedir_alteracoes");

  return (
    <article className="flex flex-col gap-5 pt-2">
      <h1 className="text-[26px] font-semibold leading-tight text-[var(--color-ink)]">Pedir alterações</h1>
      {info.situacao === "valido" && info.conteudo ? (
        <>
          <p className="text-[14px] text-[var(--color-ink-muted)]">
            {info.assunto ? `Reclamação relativa a ${info.assunto}` : "A sua reclamação"}
            {info.versao && info.versao > 1 ? ` · versão ${info.versao}` : ""}
          </p>
          <p className="text-[14.5px] leading-relaxed text-[var(--color-ink)]">
            Este é o texto preparado pela DoLado. Indique-nos o que gostaria de rever — vamos preparar uma nova versão e
            enviá-la para a sua aprovação. O pedido só fica registado quando selecionar “Enviar pedido de alterações”, e
            nada é enviado sem a sua autorização.
          </p>
          <TextoIntegral conteudo={info.conteudo} />
          <PedirAlteracoes token={token} />
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
