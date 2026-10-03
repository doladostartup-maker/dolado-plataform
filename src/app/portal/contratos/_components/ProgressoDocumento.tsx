"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PASSOS, situacaoDocumento, type SituacaoDocumento } from "@/lib/monitor/processamento";
import { descartarDocumentoRepetido, tentarNovamenteDocumento } from "../actions";
import { BOTAO_PRIMARIO } from "./estilos";

// Acompanha a leitura de um documento pelas etapas reais gravadas pelo
// servidor (documentos_monitor.etapa). Lê diretamente da Supabase (RLS: só
// os próprios documentos) — não ocupa o servidor da aplicação enquanto
// espera. O cliente pode sair da página: a leitura continua.

const INTERVALO_MS = 2000;

type Linha = {
  etapa: string | null;
  etapa_atualizada_em: string | null;
  estado: string;
  contrato_id: string | null;
  associacao_estado?: string | null;
};

export function ProgressoDocumento({
  documentoId,
  inicial,
  contratoAtual,
}: {
  documentoId: string;
  inicial?: Linha;
  /** Contrato da página em que o progresso é mostrado (para só atualizar em vez de navegar). */
  contratoAtual?: string;
}) {
  const router = useRouter();
  const [linha, setLinha] = useState<Linha | null>(inicial ?? null);
  const [agora, setAgora] = useState(() => Date.now());
  const [aRepetir, iniciarRepeticao] = useTransition();
  const terminou = useRef(false);

  const situacao: SituacaoDocumento | null = linha ? situacaoDocumento(linha, agora) : null;
  const final = situacao !== null && situacao.tipo !== "em_curso";

  useEffect(() => {
    if (final) return;
    const supabase = createClient();
    let ativo = true;
    async function ler() {
      const { data } = await supabase
        .from("documentos_monitor")
        .select("etapa, etapa_atualizada_em, estado, contrato_id, associacao_estado")
        .eq("id", documentoId)
        .maybeSingle();
      if (!ativo) return;
      setAgora(Date.now());
      if (data) setLinha(data as Linha);
    }
    ler();
    const id = setInterval(ler, INTERVALO_MS);
    return () => {
      ativo = false;
      clearInterval(id);
    };
  }, [documentoId, final]);

  // Fim da leitura: mostra o serviço com o resultado, ou — se não
  // confirmámos a que serviço pertence o documento — a decisão do cliente.
  useEffect(() => {
    if (!situacao || terminou.current) return;
    if (situacao.tipo === "por_associar") {
      terminou.current = true;
      router.push(`/portal/contratos/documentos/${documentoId}`);
      return;
    }
    if (situacao.tipo === "pronto") {
      terminou.current = true;
      const destino = situacao.contratoId ?? null;
      if (destino && destino !== contratoAtual) {
        router.push(`/portal/contratos/${destino}?documento=${situacao.estado}`);
      } else {
        router.replace(`${destino ? `/portal/contratos/${destino}` : "/portal/contratos"}?documento=${situacao.estado}`);
        router.refresh();
      }
    }
    if (situacao.tipo === "repetido") {
      terminou.current = true;
      descartarDocumentoRepetido(documentoId).catch(() => {});
    }
  }, [situacao, documentoId, contratoAtual, router]);

  if (situacao?.tipo === "repetido") {
    return (
      <div role="status" className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] px-4 py-3 text-sm text-[var(--color-ink)]">
        Este documento já tinha sido carregado.{" "}
        {situacao.contratoId && (
          <a href={`/portal/contratos/${situacao.contratoId}`} className="font-medium text-[var(--color-brand)] underline">
            Ver o serviço
          </a>
        )}
      </div>
    );
  }

  if (situacao?.tipo === "nao_concluido") {
    return (
      <div role="alert" className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] px-4 py-3 text-sm text-[var(--color-ink)]">
        <p>
          <strong>Não foi possível concluir a análise.</strong> O documento ficou guardado e a DoLado vai verificá-lo.
          {situacao.podeRepetir && " Também pode tentar novamente."}
        </p>
        {situacao.podeRepetir && (
          <button
            type="button"
            disabled={aRepetir}
            onClick={() =>
              iniciarRepeticao(async () => {
                const r = await tentarNovamenteDocumento(documentoId).catch(() => ({ ok: false }));
                if (r.ok) {
                  terminou.current = false;
                  setLinha((l) => (l ? { ...l, etapa: "recebido", etapa_atualizada_em: new Date().toISOString() } : l));
                  setAgora(Date.now());
                }
              })
            }
            className={`${BOTAO_PRIMARIO} self-start`}
          >
            {aRepetir ? "A reiniciar…" : "Tentar novamente"}
          </button>
        )}
      </div>
    );
  }

  const passoAtual = situacao?.tipo === "em_curso" ? situacao.passo : situacao?.tipo === "pronto" ? PASSOS.length : 0;

  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-brand)] bg-[var(--color-brand-wash)] px-4 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--color-ink)]">A analisar o documento</p>
        <p className="text-[12.5px] text-[var(--color-ink-muted)]">
          Etapa {Math.min(passoAtual + 1, PASSOS.length)} de {PASSOS.length}
        </p>
      </div>
      <ol className="flex flex-col gap-1.5">
        {PASSOS.map((p, i) => {
          const feito = i < passoAtual;
          const atual = i === passoAtual;
          return (
            <li key={p.etapa} className={`flex items-center gap-2.5 text-sm ${feito || atual ? "text-[var(--color-ink)]" : "text-[var(--color-ink-faint)]"}`}>
              <span aria-hidden className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                {feito ? (
                  <span className="text-[var(--color-status-success)]">✓</span>
                ) : atual ? (
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--color-brand)]" />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full border border-[var(--color-hairline-strong)]" />
                )}
              </span>
              <span className={atual ? "font-medium" : undefined}>{p.texto}</span>
              <span className="sr-only">{feito ? "(concluído)" : atual ? "(em curso)" : "(por fazer)"}</span>
            </li>
          );
        })}
      </ol>
      <p className="text-[12.5px] leading-relaxed text-[var(--color-ink-muted)]">
        Normalmente demora menos de meio minuto. Pode continuar a usar a DoLado: a análise prossegue e o resultado aparece
        no serviço quando estiver pronto.
      </p>
    </div>
  );
}
