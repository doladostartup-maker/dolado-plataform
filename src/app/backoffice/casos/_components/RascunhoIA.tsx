import { CONFIANCA, LIMITE_GERACAO_MS, motivoFalha } from "@/lib/rascunhoIA/apresentacao";
import type { RegraEnviada } from "@/lib/rascunhoIA/regras";
import type { RespostaRascunho } from "@/lib/rascunhoIA/validacao";
import { aplicarSugestaoIA, gerarRascunhoIAAcao } from "../rascunho-ia-actions";
import { AtualizarEnquanto } from "./AtualizarEnquanto";
import { IconeSugestao } from "@/components/backoffice/Icones";
import { Aviso } from "@/components/portal/Aviso";
import { AJUDA_CAMPO, BOTAO_SECUNDARIO, CAIXA_SELECAO, LINHA_SELECAO, LIGACAO, TEXTO_DOCUMENTO, TITULO_BLOCO } from "@/components/backoffice/ui";

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
        <Aviso tom="atencao" titulo="Informação a confirmar">
          <ul className="list-disc pl-5 text-[var(--v2-navy)]">
            {r.missing_information.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </Aviso>
      )}
      {avisos.length > 0 && (
        <Aviso tom="erro" titulo="Avisos para a revisão">
          <ul className="list-disc pl-5 text-[var(--v2-navy)]">
            {avisos.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </Aviso>
      )}
      <details className="rounded-[12px] border border-[var(--v2-line)]">
        <summary className="flex min-h-10 cursor-pointer items-center px-4 text-[14px] font-semibold text-[var(--v2-navy)]">
          Fundamentos utilizados ({r.legal_basis.length}) · regras enviadas: {geracao.regras_enviadas.length}
        </summary>
        <div className="border-t border-[var(--v2-line)] px-4 py-3">
          {r.legal_basis.length === 0 ? (
            <p className="text-[13.5px] text-[var(--v2-muted)]">Nenhuma regra jurídica da base da DoLado foi usada no texto.</p>
          ) : (
            <ul className="flex flex-col gap-3 text-[13.5px] text-[var(--v2-navy)]">
              {r.legal_basis.map((b) => {
                const g = regras.get(b.rule_id);
                return (
                  <li key={b.rule_id} className="flex flex-col gap-0.5">
                    <p className="font-semibold">
                      {b.rule_id} · {g?.titulo ?? "—"}
                    </p>
                    <p className="text-[var(--v2-muted)]">
                      {g?.diploma}
                      {g?.artigo ? `, ${g.artigo}` : ""}
                      {g?.fonte && (
                        <>
                          {" · "}
                          <a href={g.fonte} target="_blank" rel="noreferrer" className={LIGACAO}>
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
        </div>
      </details>
      <p className={AJUDA_CAMPO}>
        Gerada {dataHora(geracao.concluido_em)} · {geracao.modelo ?? "—"} · confiança interna: {CONFIANCA[geracao.confianca ?? ""] ?? "—"} (indicador para a
        revisão, não é uma avaliação jurídica)
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
  finalidade = "reclamacao",
}: {
  casoId: string;
  ativa: boolean;
  podeGerar: boolean;
  /** "nova_comunicacao": depois de um envio, sugere a resposta à empresa. */
  finalidade?: "reclamacao" | "nova_comunicacao";
  geracoes: GeracaoIA[];
  aplicadas: Set<string>;
  agora: number;
}) {
  const ultima = geracoes[0];
  const aGerar = emCurso(ultima, agora);
  const porUsar = ultima?.estado === "gerado" && !aplicadas.has(ultima.id) ? ultima : null;

  if (!ativa && geracoes.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-dashed border-[#D9B98A] bg-[#FFFCF6] p-4">
      <div className="flex items-start gap-2.5">
        <span aria-hidden className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--v2-aviso-bg)] text-[var(--v2-aviso)]">
          <IconeSugestao tamanho={16} />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className={TITULO_BLOCO}>Rascunho automático (IA) · uso interno</p>
          <p className={AJUDA_CAMPO}>A IA só sugere um rascunho. Nada é enviado ao cliente sem revisão e decisão de uma pessoa da DoLado.</p>
        </div>
      </div>

      {aGerar && (
        <p className="text-[13.5px] text-[var(--v2-muted)]" role="status">
          A gerar o rascunho (pedido {dataHora(ultima.created_at)})… A página atualiza sozinha.
          <AtualizarEnquanto />
        </p>
      )}

      {!aGerar && (ultima?.estado === "falhou" || (ultima?.estado === "a_gerar" && !aGerar)) && (
        <Aviso tom="erro" titulo="Rascunho automático não gerado">
          <p>{ultima.estado === "a_gerar" ? motivoFalha("interrompido") : motivoFalha(ultima.erro)}</p>
          {ultima.erro_detalhe && <p className="text-[12.5px]">{ultima.erro_detalhe}</p>}
          <p className="text-[12.5px]">O caso segue normalmente: o texto pode ser preparado à mão.</p>
        </Aviso>
      )}

      {porUsar && (
        <div className="flex flex-col gap-2 border-t border-[#F0E2CC] pt-3">
          <p className="text-[13.5px] text-[var(--v2-navy)]">
            Há uma sugestão nova ({dataHora(porUsar.concluido_em)}) que não foi colocada no texto, porque o texto atual foi editado por uma pessoa ou já seguiu
            para o cliente.
          </p>
          <details className="rounded-[10px] border border-[var(--v2-line)] bg-white">
            <summary className="flex min-h-10 cursor-pointer items-center px-3 text-[13.5px] font-semibold text-[var(--v2-navy)]">Ver a sugestão</summary>
            <div className="flex flex-col gap-3 border-t border-[var(--v2-line)] p-3">
              <div className={TEXTO_DOCUMENTO}>{porUsar.resposta?.draft}</div>
              <DetalhesSugestao geracao={porUsar} />
            </div>
          </details>
          <form action={aplicarSugestaoIA.bind(null, casoId, porUsar.id)} className="flex flex-col gap-2">
            <label className={LINHA_SELECAO}>
              <input type="checkbox" name="confirmar" required className={CAIXA_SELECAO} />
              Substituir o texto atual por esta sugestão. O texto atual fica guardado como versão anterior; a sugestão fica por rever.
            </label>
            <div>
              <button type="submit" className={BOTAO_SECUNDARIO}>
                Usar esta sugestão
              </button>
            </div>
          </form>
        </div>
      )}

      {ativa && podeGerar && !aGerar && (
        <form action={gerarRascunhoIAAcao.bind(null, casoId, finalidade)} className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <button type="submit" className={BOTAO_SECUNDARIO}>
            {ultima?.estado === "falhou" || (ultima?.estado === "a_gerar" && !aGerar)
              ? "Tentar novamente"
              : finalidade === "nova_comunicacao"
                ? "Gerar nova comunicação com IA"
                : geracoes.length === 0
                  ? "Gerar rascunho com IA"
                  : "Gerar nova sugestão com IA"}
          </button>
          <p className={AJUDA_CAMPO}>Nunca substitui texto editado sem confirmação.</p>
        </form>
      )}
      {!ativa && <p className={AJUDA_CAMPO}>Sugestão por IA desativada neste ambiente.</p>}
    </div>
  );
}
