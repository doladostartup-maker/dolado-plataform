import { ESTADO_TEXTO_CLIENTE, EVENTOS_CASO, MAX_PEDIDO_ALTERACOES, ehResultadoAcaoTexto, type EstadoTexto } from "@/lib/textoCaso";
import { MensagemTexto, TextoIntegral, formatarDataHora } from "@/app/texto/_components/Mensagem";
import { autorizarTextoNoPortal, pedirAlteracoesNoPortal } from "../texto-actions";

// Texto preparado, visto pelo cliente autenticado. Mesmas regras que os
// links do e-mail (mesmas funções da base de dados). O RLS nunca devolve
// rascunhos ao cliente.

const BOTAO =
  "min-h-11 rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";
const BOTAO_SEC =
  "min-h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]";

export function TextoCliente({
  casoId,
  texto,
  enviadoEm,
  eventos,
  resultado,
}: {
  casoId: string;
  texto: { id: string; versao: number; conteudo: string; estado: EstadoTexto; autorizado_em: string | null } | null;
  enviadoEm: string | null;
  eventos: { tipo: string; versao: number | null; created_at: string }[];
  resultado?: string;
}) {
  if (!texto) return null;
  return (
    <section id="texto" className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-subtle)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Texto da reclamação</h2>
        <span className="rounded-[var(--radius-pill)] bg-[var(--color-surface-sunken)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-ink)]">
          {ESTADO_TEXTO_CLIENTE[texto.estado]}
        </span>
      </div>

      {ehResultadoAcaoTexto(resultado) && <MensagemTexto resultado={resultado} autorizadoEm={texto.autorizado_em} />}

      {texto.estado === "aguardando_aprovacao" && (
        <p className="text-[14px] leading-relaxed text-[var(--color-ink)]">
          Este é exatamente o texto que a DoLado vai enviar em seu nome. Reveja-o e autorize o envio, ou peça alterações.
        </p>
      )}
      <TextoIntegral conteudo={texto.conteudo} />

      {texto.estado === "aguardando_aprovacao" && (
        <div className="flex flex-col gap-4">
          <form action={autorizarTextoNoPortal.bind(null, casoId, texto.id)} className="flex flex-col gap-2">
            <p className="text-[13.5px] text-[var(--color-ink)]">
              Ao autorizar, confirma que reviu este texto e autoriza a DoLado a enviá-lo em seu nome.
            </p>
            <div>
              <button type="submit" className={BOTAO}>
                Autorizo o envio
              </button>
            </div>
          </form>
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-[var(--color-brand)]">Pedir alterações</summary>
            <form action={pedirAlteracoesNoPortal.bind(null, casoId, texto.id)} className="mt-2 flex flex-col gap-2">
              <textarea
                name="mensagem"
                required
                rows={5}
                maxLength={MAX_PEDIDO_ALTERACOES}
                aria-label="O que gostaria de alterar?"
                placeholder="O que gostaria de alterar?"
                className="w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)]"
              />
              <div>
                <button type="submit" className={BOTAO_SEC}>
                  Enviar pedido de alterações
                </button>
              </div>
            </form>
          </details>
        </div>
      )}

      {texto.estado === "autorizado" && texto.autorizado_em && (
        <p className="text-[13.5px] text-[var(--color-ink-muted)]">Autorizou o envio em {formatarDataHora(texto.autorizado_em)}.</p>
      )}
      {texto.estado === "enviado" && enviadoEm && (
        <p className="text-[13.5px] text-[var(--color-ink-muted)]">Enviado em {formatarDataHora(enviadoEm)}.</p>
      )}

      {eventos.length > 0 && (
        <ol className="flex flex-col gap-1 border-t border-[var(--color-hairline)] pt-3 text-[13px] text-[var(--color-ink-muted)]">
          {eventos.map((e, i) => (
            <li key={i}>
              {formatarDataHora(e.created_at)} · {EVENTOS_CASO[e.tipo] ?? e.tipo}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
