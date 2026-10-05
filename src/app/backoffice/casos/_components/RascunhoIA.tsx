import { CONFIANCA, LIMITE_GERACAO_MS, motivoFalha } from "@/lib/rascunhoIA/apresentacao";
import type { RegraEnviada } from "@/lib/rascunhoIA/regras";
import type { RespostaRascunho } from "@/lib/rascunhoIA/validacao";
import { aplicarSugestaoIA, gerarRascunhoIAAcao } from "../rascunho-ia-actions";
import { AtualizarEnquanto } from "./AtualizarEnquanto";

// Sugestão do texto pela IA (só equipa). Mostra o estado da geração, a
// informação a confirmar, os avisos e os fundamentos usados. Nada disto é
// mostrado ao cliente; a confiança é só um indicador interno.

export type GeracaoIA = {
  id: string;
  estado: "a_gerar" | "gerado" | "falhou";
  origem: "automatico" | "manual";
  erro: string | null;
  erro_detalhe: string | null;
  modelo: string | null;
  created_at: string;
  concluido_em: string | null;
  confianca: string | null;
  resposta: RespostaRascunho | null;
  regras_enviadas: RegraEnviada[];
};

const BOTAO_SEC =
  "rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]";

function dataHora(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Lisbon" }) : "—";
}

export function emCurso(g: GeracaoIA | undefined, agora: number) {
  return !!g && g.estado === "a_gerar" && agora - new Date(g.created_at).getTime() < LIMITE_GERACAO_MS;
}

/** Informação a confirmar, avisos e fundamentos de uma sugestão. */
export function DetalhesSugestao({ geracao }: { geracao: GeracaoIA }) {
  const r = geracao.resposta;
  if (!r) return null;
  const avisos = [...(r.server_warnings ?? []), ...r.warnings];
  const regras = new Map(geracao.regras_enviadas.map((g) => [g.rule_id, g]));
  return (
    <div className="flex flex-col gap-3">
      {r.missing_information.length > 0 && (
        <div className="rounded-[var(--radius-input)] border-l-[3px] border-[var(--color-status-urgent)] bg-[var(--color-status-urgent-wash)] p-3">
          <p className="mb-1 text-sm font-semibold text-[var(--color-ink)]">⚠️ Informação a confirmar</p>
          <ul className="list-disc pl-5 text-[13px] text-[var(--color-ink)]">
            {r.missing_information.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      {avisos.length > 0 && (
        <div className="rounded-[var(--radius-input)] border-l-[3px] border-[var(--color-status-danger)] bg-[var(--color-surface-sunken)] p-3">
          <p className="mb-1 text-sm font-semibold text-[var(--color-ink)]">Avisos para a revisão</p>
          <ul className="list-disc pl-5 text-[13px] text-[var(--color-ink)]">
            {avisos.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      <details className="rounded-[var(--radius-input)] border border-[var(--color-hairline)] p-3">
        <summary className="cursor-pointer text-sm font-medium text-[var(--color-ink)]">
          Fundamentos utilizados ({r.legal_basis.length}) · regras enviadas: {geracao.regras_enviadas.length}
        </summary>
        {r.legal_basis.length === 0 ? (
          <p className="mt-2 text-[13px] text-[var(--color-ink-muted)]">Nenhuma regra jurídica da base da DoLado foi usada no texto.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2 text-[13px] text-[var(--color-ink)]">
            {r.legal_basis.map((b) => {
              const g = regras.get(b.rule_id);
              return (
                <li key={b.rule_id}>
                  <p className="font-medium">
                    {b.rule_id} · {g?.titulo ?? "—"}
                  </p>
                  <p className="text-[var(--color-ink-muted)]">
                    {g?.diploma}
                    {g?.artigo ? `, ${g.artigo}` : ""}
                    {g?.fonte && (
                      <>
                        {" · "}
                        <a href={g.fonte} target="_blank" rel="noreferrer" className="underline">
                          fonte oficial
                        </a>
                      </>
                    )}
                  </p>
                  <p>{b.reason}</p>
                </li>
              );
            })}
          </ul>
        )}
      </details>
      <p className="text-[12px] text-[var(--color-ink-faint)]">
        Gerada {dataHora(geracao.concluido_em)} · {geracao.modelo ?? "—"} · confiança interna:{" "}
        {CONFIANCA[geracao.confianca ?? ""] ?? "—"} (indicador para a revisão, não é uma avaliação jurídica)
      </p>
    </div>
  );
}

/**
 * Estado da geração e ações: gerar / tentar novamente / usar uma sugestão
 * que não foi colocada no texto (porque o texto atual foi editado).
 */
export function PainelRascunhoIA({
  casoId,
  ativa,
  podeGerar,
  geracoes,
  aplicadas,
  agora,
}: {
  casoId: string;
  ativa: boolean;
  podeGerar: boolean;
  geracoes: GeracaoIA[];
  aplicadas: Set<string>;
  agora: number;
}) {
  const ultima = geracoes[0];
  const aGerar = emCurso(ultima, agora);
  const porUsar = ultima?.estado === "gerado" && !aplicadas.has(ultima.id) ? ultima : null;

  if (!ativa && geracoes.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--color-hairline-strong)] bg-[var(--color-surface)] p-4">
      <p className="text-sm font-semibold text-[var(--color-ink)]">Sugestão por IA (uso interno)</p>

      {aGerar && (
        <p className="text-[13px] text-[var(--color-ink-muted)]">
          A gerar o rascunho com IA (pedido {dataHora(ultima.created_at)})… A página atualiza sozinha.
          <AtualizarEnquanto />
        </p>
      )}

      {!aGerar && (ultima?.estado === "falhou" || (ultima?.estado === "a_gerar" && !aGerar)) && (
        <div className="text-[13px] text-[var(--color-ink)]">
          <p className="font-semibold text-[var(--color-status-danger)]">Rascunho IA não gerado</p>
          <p>{ultima.estado === "a_gerar" ? motivoFalha("interrompido") : motivoFalha(ultima.erro)}</p>
          {ultima.erro_detalhe && <p className="text-[12px] text-[var(--color-ink-faint)]">{ultima.erro_detalhe}</p>}
          <p className="text-[12px] text-[var(--color-ink-faint)]">O caso segue normalmente: o texto pode ser preparado à mão.</p>
        </div>
      )}

      {porUsar && (
        <div className="flex flex-col gap-2 border-t border-[var(--color-hairline)] pt-3">
          <p className="text-[13px] text-[var(--color-ink)]">
            Há uma sugestão nova ({dataHora(porUsar.concluido_em)}) que não foi colocada no texto, porque o texto atual foi editado
            por uma pessoa ou já seguiu para o cliente.
          </p>
          <details>
            <summary className="cursor-pointer text-[13px] font-medium text-[var(--color-ink)]">Ver a sugestão</summary>
            <div className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-[var(--radius-input)] bg-[var(--color-surface-sunken)] p-3 font-mono text-[12.5px] text-[var(--color-ink)]">
              {porUsar.resposta?.draft}
            </div>
            <div className="mt-2">
              <DetalhesSugestao geracao={porUsar} />
            </div>
          </details>
          <form action={aplicarSugestaoIA.bind(null, casoId, porUsar.id)} className="flex flex-col gap-2">
            <label className="flex items-start gap-2 text-[13px] text-[var(--color-ink)]">
              <input type="checkbox" name="confirmar" required className="mt-0.5" />
              Substituir o texto atual por esta sugestão. O texto atual fica guardado como versão anterior; a sugestão fica por rever.
            </label>
            <div>
              <button type="submit" className={BOTAO_SEC}>
                Usar esta sugestão
              </button>
            </div>
          </form>
        </div>
      )}

      {ativa && podeGerar && !aGerar && (
        <form action={gerarRascunhoIAAcao.bind(null, casoId)}>
          <button type="submit" className={BOTAO_SEC}>
            {ultima?.estado === "falhou" || (ultima?.estado === "a_gerar" && !aGerar)
              ? "Tentar novamente"
              : geracoes.length === 0
                ? "Gerar rascunho com IA"
                : "Gerar nova sugestão com IA"}
          </button>
          <p className="mt-1 text-[12px] text-[var(--color-ink-faint)]">
            Nunca substitui texto editado sem confirmação. A sugestão nunca é enviada ao cliente sem revisão.
          </p>
        </form>
      )}
      {!ativa && <p className="text-[12px] text-[var(--color-ink-faint)]">Sugestão por IA desativada neste ambiente.</p>}
    </div>
  );
}
