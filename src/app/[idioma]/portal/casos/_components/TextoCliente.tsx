import { MAX_PEDIDO_ALTERACOES, ehResultadoAcaoTexto, type EstadoTexto } from "@/lib/textoCaso";
import type { Idioma } from "@/i18n/config";
import { tTexto } from "@/i18n/mensagens/texto";
import { MensagemTexto, TextoIntegral } from "@/app/[idioma]/texto/_components/Mensagem";
import { formatarDataHora } from "@/app/[idioma]/texto/_components/data";
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
  seguimento = false,
  idioma = "pt-PT",
}: {
  idioma?: Idioma;
  casoId: string;
  texto: { id: string; versao: number; conteudo: string; estado: EstadoTexto; autorizado_em: string | null } | null;
  resultado?: string;
  /** Já houve um envio: este texto é uma nova comunicação à empresa. */
  seguimento?: boolean;
}) {
  if (!texto) return null;
  const tt = tTexto[idioma];
  const t = tt.portal;
  const aRever = texto.estado === "aguardando_aprovacao";
  return (
    <section id="texto" aria-labelledby="texto-titulo" className={`${aRever ? CARTAO_ACAO : CARTAO} flex scroll-mt-24 flex-col gap-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="texto-titulo" className={TITULO_SECCAO}>
          {seguimento ? (aRever ? t.reveNova : t.nova) : aRever ? t.reveTexto : t.textoReclamacao}
        </h2>
        <Etiqueta tom={aRever ? "acao" : texto.estado === "autorizado" ? "concluido" : "curso"}>{tt.estados[texto.estado]}</Etiqueta>
      </div>

      {ehResultadoAcaoTexto(resultado) && <MensagemTexto resultado={resultado} autorizadoEm={texto.autorizado_em} />}

      {aRever && (
        <p className={TEXTO}>{t.aRever}</p>
      )}
      {texto.estado === "alteracoes_solicitadas" && (
        <p className={TEXTO}>{t.alteracoesRecebidas}</p>
      )}
      <TextoIntegral conteudo={texto.conteudo} />

      {aRever && (
        <div className="flex flex-col gap-4 border-t border-[var(--v2-line)] pt-4">
          <form action={autorizarTextoNoPortal.bind(null, casoId, texto.id)} className="flex flex-col gap-3">
            <p className="text-[14.5px] leading-relaxed text-[var(--v2-navy)]">
              {tt.autorizarConfirma}
            </p>
            <div>
              <button type="submit" className={`${BOTAO_PRIMARIO} w-full sm:w-auto`}>
                {tt.autorizar}
              </button>
            </div>
          </form>
          <details className="group">
            <summary className={`${BOTAO_SECUNDARIO} w-full cursor-pointer list-none sm:w-auto [&::-webkit-details-marker]:hidden`}>
              {t.pedirAlteracoes}
            </summary>
            <form action={pedirAlteracoesNoPortal.bind(null, casoId, texto.id)} className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-[var(--v2-navy)]">
                {tt.oQueAlterar}
                <textarea name="mensagem" required rows={5} maxLength={MAX_PEDIDO_ALTERACOES} className={CAMPO} />
              </label>
              <div>
                <button type="submit" className={`${BOTAO_SECUNDARIO} w-full sm:w-auto`}>
                  {tt.enviarPedido}
                </button>
              </div>
            </form>
          </details>
        </div>
      )}

      {texto.estado === "autorizado" && texto.autorizado_em && (
        <p className={METADADOS}>{t.autorizouEm(formatarDataHora(texto.autorizado_em, idioma))}</p>
      )}
    </section>
  );
}
