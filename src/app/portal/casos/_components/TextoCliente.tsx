import { ESTADO_TEXTO_CLIENTE, MAX_PEDIDO_ALTERACOES, ehResultadoAcaoTexto, type EstadoTexto } from "@/lib/textoCaso";
import { MensagemTexto, TextoIntegral, formatarDataHora } from "@/app/texto/_components/Mensagem";
import { Etiqueta } from "@/components/portal/Etiqueta";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, CARTAO, CARTAO_ACAO, METADADOS, TEXTO, TITULO_SECCAO } from "@/components/portal/ui";
import { autorizarTextoNoPortal, pedirAlteracoesNoPortal } from "../texto-actions";

// Texto em curso (ainda não enviado), visto pelo cliente autenticado. O
// texto já enviado aparece à parte, em ReclamacaoEnviada. Mesmas regras que os
// links do e-mail (mesmas funções da base de dados). O RLS nunca devolve
// rascunhos ao cliente.

export function TextoCliente({
  casoId,
  texto,
  resultado,
}: {
  casoId: string;
  texto: { id: string; versao: number; conteudo: string; estado: EstadoTexto; autorizado_em: string | null } | null;
  resultado?: string;
}) {
  if (!texto) return null;
  const aRever = texto.estado === "aguardando_aprovacao";
  return (
    <section id="texto" aria-labelledby="texto-titulo" className={`${aRever ? CARTAO_ACAO : CARTAO} flex scroll-mt-24 flex-col gap-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="texto-titulo" className={TITULO_SECCAO}>
          {aRever ? "Reveja o texto da reclamação" : "Texto da reclamação"}
        </h2>
        <Etiqueta tom={aRever ? "acao" : texto.estado === "autorizado" ? "concluido" : "curso"}>{ESTADO_TEXTO_CLIENTE[texto.estado]}</Etiqueta>
      </div>

      {ehResultadoAcaoTexto(resultado) && <MensagemTexto resultado={resultado} autorizadoEm={texto.autorizado_em} />}

      {aRever && (
        <p className={TEXTO}>
          Este é exatamente o texto que a DoLado vai enviar em seu nome. Reveja-o e autorize o envio, ou peça alterações.
        </p>
      )}
      {texto.estado === "alteracoes_solicitadas" && (
        <p className={TEXTO}>Recebemos o seu pedido. Vamos preparar uma nova versão e mostrar-lha antes de qualquer envio.</p>
      )}
      <TextoIntegral conteudo={texto.conteudo} />

      {aRever && (
        <div className="flex flex-col gap-4 border-t border-[var(--v2-line)] pt-4">
          <form action={autorizarTextoNoPortal.bind(null, casoId, texto.id)} className="flex flex-col gap-3">
            <p className="text-[14.5px] leading-relaxed text-[var(--v2-navy)]">
              Ao autorizar, confirma que reviu este texto e autoriza a DoLado a enviá-lo em seu nome.
            </p>
            <div>
              <button type="submit" className={`${BOTAO_PRIMARIO} w-full sm:w-auto`}>
                Autorizar envio
              </button>
            </div>
          </form>
          <details className="group">
            <summary className={`${BOTAO_SECUNDARIO} w-full cursor-pointer list-none sm:w-auto [&::-webkit-details-marker]:hidden`}>
              Pedir alterações
            </summary>
            <form action={pedirAlteracoesNoPortal.bind(null, casoId, texto.id)} className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-[var(--v2-navy)]">
                O que gostaria de alterar?
                <textarea name="mensagem" required rows={5} maxLength={MAX_PEDIDO_ALTERACOES} className={CAMPO} />
              </label>
              <div>
                <button type="submit" className={`${BOTAO_SECUNDARIO} w-full sm:w-auto`}>
                  Enviar pedido de alterações
                </button>
              </div>
            </form>
          </details>
        </div>
      )}

      {texto.estado === "autorizado" && texto.autorizado_em && (
        <p className={METADADOS}>Autorizou o envio em {formatarDataHora(texto.autorizado_em)}.</p>
      )}
    </section>
  );
}
