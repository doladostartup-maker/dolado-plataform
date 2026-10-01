import { CANAIS_ENVIO, ESTADO_TEXTO_EQUIPA, EVENTOS_CASO, type EstadoTexto } from "@/lib/textoCaso";
import { enviarTextoParaRevisao, guardarTexto, registarEnvioTexto } from "../texto-actions";

// Texto para envio (equipa). A autorização do cliente aparece só para
// leitura: não há — nem a base de dados aceita — forma de a criar ou editar
// aqui. "Registar envio" só passa na base de dados com a versão atual
// autorizada.

export type VersaoTexto = {
  id: string;
  versao: number;
  conteudo: string;
  conteudo_sha256: string;
  estado: EstadoTexto;
  created_at: string;
  enviado_para_revisao_em: string | null;
  autorizado_em: string | null;
  alteracoes_solicitadas_em: string | null;
  enviado_em: string | null;
  substituido_em: string | null;
};
export type AutorizacaoTexto = { texto_id: string; autorizado_em: string; metodo: string; conteudo_sha256: string };
export type PedidoAlteracao = { texto_id: string; mensagem: string; created_at: string; metodo: string };
export type EnvioTexto = { texto_id: string; destinatario: string; canal: string; resultado: string | null; enviado_em: string };
export type EventoCaso = { tipo: string; versao: number | null; ator: string; created_at: string };

const CAIXA = "flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5";
const TEXTAREA =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 font-mono text-[13px] text-[var(--color-ink)] focus:border-[var(--color-hairline-strong)] focus:outline-none";
const INPUT =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)]";
const BOTAO =
  "rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]";
const BOTAO_SEC =
  "rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]";

function dataHora(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Lisbon" }) : "—";
}

function EditorTexto({ casoId, inicial, rotulo, aviso }: { casoId: string; inicial: string; rotulo: string; aviso?: string }) {
  return (
    <form action={guardarTexto.bind(null, casoId)} className="flex flex-col gap-2">
      {aviso && <p className="text-[13px] text-[var(--color-status-urgent)]">{aviso}</p>}
      <textarea name="conteudo" defaultValue={inicial} rows={14} required className={TEXTAREA} />
      <div>
        <button type="submit" className={BOTAO_SEC}>
          {rotulo}
        </button>
      </div>
    </form>
  );
}

export function TextoCaso({
  casoId,
  temEmail,
  versoes,
  autorizacoes,
  pedidos,
  envios,
  eventos,
  ok,
  erro,
}: {
  casoId: string;
  temEmail: boolean;
  versoes: VersaoTexto[];
  autorizacoes: AutorizacaoTexto[];
  pedidos: PedidoAlteracao[];
  envios: EnvioTexto[];
  eventos: EventoCaso[];
  ok?: string;
  erro?: string;
}) {
  const atual = versoes[0] ?? null;
  const autorizacao = atual ? autorizacoes.find((a) => a.texto_id === atual.id) : undefined;
  const pedidosAtual = atual ? pedidos.filter((p) => p.texto_id === atual.id) : [];
  const envio = atual ? envios.find((e) => e.texto_id === atual.id) : undefined;

  return (
    <section id="texto" className="flex flex-col gap-4">
      <h2 className="text-[var(--text-subheading)] font-semibold text-[var(--color-ink)]">Texto para envio</h2>
      {ok && <p className="text-sm text-[var(--color-status-success)]">{ok}</p>}
      {erro && <p className="text-sm text-[var(--color-status-danger)]">{erro}</p>}
      {!temEmail && <p className="text-sm text-[var(--color-status-danger)]">Este caso não tem e-mail: não é possível enviar o texto para revisão.</p>}

      {!atual && (
        <div className={CAIXA}>
          <p className="text-sm text-[var(--color-ink-muted)]">Ainda não há texto preparado.</p>
          <EditorTexto casoId={casoId} inicial="" rotulo="Guardar rascunho (versão 1)" />
        </div>
      )}

      {atual && (
        <div className={CAIXA}>
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            Versão {atual.versao} · {ESTADO_TEXTO_EQUIPA[atual.estado]}
          </p>
          <p className="text-[12px] text-[var(--color-ink-faint)]">
            Criada {dataHora(atual.created_at)} · SHA-256 {atual.conteudo_sha256.slice(0, 12)}…
          </p>

          {atual.estado === "rascunho" && (
            <>
              <EditorTexto casoId={casoId} inicial={atual.conteudo} rotulo="Guardar rascunho" />
              <form action={enviarTextoParaRevisao.bind(null, casoId, atual.id)}>
                <button type="submit" className={BOTAO} disabled={!temEmail}>
                  Enviar ao cliente para revisão
                </button>
              </form>
            </>
          )}

          {atual.estado !== "rascunho" && (
            <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-[var(--radius-input)] bg-[var(--color-surface-sunken)] p-3 font-mono text-[13px] text-[var(--color-ink)]">
              {atual.conteudo}
            </div>
          )}

          {atual.estado === "aguardando_aprovacao" && (
            <form action={enviarTextoParaRevisao.bind(null, casoId, atual.id)}>
              <p className="mb-2 text-[13px] text-[var(--color-ink-muted)]">
                Enviado para revisão {dataHora(atual.enviado_para_revisao_em)}. A aguardar a decisão do cliente.
              </p>
              <button type="submit" className={BOTAO_SEC}>
                Reenviar ao cliente (novos links)
              </button>
            </form>
          )}

          {pedidosAtual.length > 0 && (
            <div className="rounded-[var(--radius-input)] border-l-[3px] border-[var(--color-status-urgent)] bg-[var(--color-status-urgent-wash)] p-3">
              <p className="mb-1 text-sm font-semibold text-[var(--color-ink)]">Pedido de alterações do cliente</p>
              {pedidosAtual.map((p) => (
                <div key={p.created_at} className="text-[13px] text-[var(--color-ink)]">
                  <p className="text-[12px] text-[var(--color-ink-muted)]">
                    {dataHora(p.created_at)} · {p.metodo === "portal" ? "pelo portal" : "pelo link do e-mail"}
                  </p>
                  <p className="whitespace-pre-wrap">{p.mensagem}</p>
                </div>
              ))}
            </div>
          )}

          {autorizacao && (
            <p className="rounded-[var(--radius-input)] bg-[var(--color-status-success-wash)] p-3 text-[13px] text-[var(--color-ink)]">
              Autorizado pelo cliente em {dataHora(autorizacao.autorizado_em)} ·{" "}
              {autorizacao.metodo === "portal" ? "no portal" : "por link seguro"} · versão {atual.versao} (SHA-256{" "}
              {autorizacao.conteudo_sha256.slice(0, 12)}…). Registo só de leitura.
            </p>
          )}

          {atual.estado === "autorizado" && (
            <form action={registarEnvioTexto.bind(null, casoId, atual.id)} className="flex flex-col gap-2 border-t border-[var(--color-hairline)] pt-3">
              <p className="text-sm font-semibold text-[var(--color-ink)]">Registar envio ao terceiro</p>
              <input type="hidden" name="conteudo_sha256" value={atual.conteudo_sha256} />
              <input name="destinatario" required maxLength={300} placeholder="Destinatário (ex.: operadora e canal/referência)" className={INPUT} />
              <select name="canal" required defaultValue="" className={INPUT}>
                <option value="" disabled>
                  Canal
                </option>
                {Object.entries(CANAIS_ENVIO).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <input name="resultado" maxLength={1000} placeholder="Resultado / referência (opcional)" className={INPUT} />
              <div>
                <button type="submit" className={BOTAO}>
                  Registar envio da versão {atual.versao}
                </button>
              </div>
            </form>
          )}

          {envio && (
            <p className="text-[13px] text-[var(--color-ink)]">
              Enviado {dataHora(envio.enviado_em)} · {CANAIS_ENVIO[envio.canal as keyof typeof CANAIS_ENVIO] ?? envio.canal} ·{" "}
              {envio.destinatario}
              {envio.resultado ? ` · ${envio.resultado}` : ""}
            </p>
          )}

          {atual.estado !== "rascunho" && (
            <details className="border-t border-[var(--color-hairline)] pt-3">
              <summary className="cursor-pointer text-sm font-medium text-[var(--color-ink)]">Criar nova versão</summary>
              <div className="mt-2">
                <EditorTexto
                  casoId={casoId}
                  inicial={atual.conteudo}
                  rotulo={`Guardar como versão ${atual.versao + 1}`}
                  aviso={
                    atual.estado === "autorizado" || atual.estado === "aguardando_aprovacao"
                      ? "A versão atual deixa de valer (incluindo qualquer autorização): a nova versão terá de ser enviada e autorizada pelo cliente."
                      : undefined
                  }
                />
              </div>
            </details>
          )}
        </div>
      )}

      {versoes.length > 1 && (
        <details className={CAIXA}>
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-ink)]">Versões anteriores ({versoes.length - 1})</summary>
          {versoes.slice(1).map((v) => (
            <details key={v.id} className="border-t border-[var(--color-hairline)] pt-2">
              <summary className="cursor-pointer text-[13px] text-[var(--color-ink)]">
                Versão {v.versao} · {ESTADO_TEXTO_EQUIPA[v.estado]} · {dataHora(v.created_at)}
                {v.autorizado_em ? ` · autorizada ${dataHora(v.autorizado_em)}` : ""}
                {v.enviado_em ? ` · enviada ${dataHora(v.enviado_em)}` : ""}
              </summary>
              <div className="mt-2 whitespace-pre-wrap font-mono text-[12.5px] text-[var(--color-ink-muted)]">{v.conteudo}</div>
              {pedidos
                .filter((p) => p.texto_id === v.id)
                .map((p) => (
                  <p key={p.created_at} className="mt-2 whitespace-pre-wrap text-[12.5px] text-[var(--color-ink)]">
                    Pedido de alterações ({dataHora(p.created_at)}): {p.mensagem}
                  </p>
                ))}
            </details>
          ))}
        </details>
      )}

      {eventos.length > 0 && (
        <div className={CAIXA}>
          <p className="text-sm font-semibold text-[var(--color-ink)]">Histórico</p>
          <ol className="flex flex-col gap-1 text-[13px] text-[var(--color-ink)]">
            {eventos.map((e, i) => (
              <li key={i}>
                <span className="text-[var(--color-ink-muted)]">{dataHora(e.created_at)}</span> · {EVENTOS_CASO[e.tipo] ?? e.tipo}
                {e.versao ? ` (versão ${e.versao})` : ""}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
