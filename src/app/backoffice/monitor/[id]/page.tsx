import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROTULO_CAMPO, ROTULO_ORIGEM, ROTULO_SETOR, SETORES_CONTRATO, formatarValorCampo } from "@/lib/monitor/contratos";
import type { CampoContrato } from "@/lib/monitor/extracaoFatura";
import { criarContratoParaDocumento, definirCampoAdmin, marcarDocumento, reprocessarDocumento } from "../actions";

const INPUT =
  "rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)]";
const BOTAO =
  "rounded-[var(--radius-button)] border border-[var(--color-hairline-strong)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-brand)]";

export default async function DocumentoMonitorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; guardado?: string; resultado?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  await requireAdmin();
  const admin = createAdminClient();

  const { data: doc } = await admin.from("documentos_monitor").select("*").eq("id", id).maybeSingle();
  if (!doc) notFound();

  const [{ data: conta }, { data: extracoes }, { data: contrato }, { data: campos }] = await Promise.all([
    admin.from("utilizadores").select("nome, email").eq("id", doc.utilizador_id).maybeSingle(),
    admin.from("extracoes_documento").select("id, modelo, schema_versao, prompt_versao, estado, erro, resultado, created_at").eq("documento_id", id).order("created_at", { ascending: false }),
    doc.contrato_id ? admin.from("contratos_monitorizados").select("id, setor, fornecedor, estado").eq("id", doc.contrato_id).maybeSingle() : Promise.resolve({ data: null }),
    doc.contrato_id
      ? admin.from("contratos_campos").select("id, campo, valor, origem, estado, confianca").eq("contrato_id", doc.contrato_id).in("estado", ["atual", "proposto", "em_conflito"]).order("campo")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">{doc.tipo === "contrato" ? "Contrato" : "Fatura"} carregado</h1>
        <Link href="/backoffice/monitor" className="text-sm text-[var(--color-ink-muted)] underline">
          Voltar
        </Link>
      </div>

      {query.resultado && <p className="text-sm text-[var(--color-ink-muted)]">Estado do documento: {query.resultado}</p>}
      {query.guardado && <p className="text-sm text-[var(--color-status-success)]">✓ Guardado.</p>}
      {query.erro && <p className="text-sm text-[var(--color-status-danger)]">{query.erro}</p>}

      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
        <dt className="text-[var(--color-ink-muted)]">Cliente</dt>
        <dd>{conta?.nome ?? "—"} · {conta?.email}</dd>
        <dt className="text-[var(--color-ink-muted)]">Estado</dt>
        <dd>{doc.estado}</dd>
        <dt className="text-[var(--color-ink-muted)]">Ficheiro</dt>
        <dd>
          {/* Ligação assinada gerada no clique (rota /api/monitor/documentos). */}
          <a href={`/api/monitor/documentos/${doc.id}`} target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand)] underline">
            Abrir ({doc.mime_type}, {Math.round((doc.tamanho_bytes ?? 0) / 1024)} KB)
          </a>
        </dd>
        <dt className="text-[var(--color-ink-muted)]">Contrato</dt>
        <dd>{contrato ? `${contrato.fornecedor ?? "sem fornecedor"} · ${ROTULO_SETOR[contrato.setor as keyof typeof ROTULO_SETOR]} · ${contrato.estado}` : "por associar"}</dd>
      </dl>

      <div className="flex flex-wrap gap-2">
        <form action={reprocessarDocumento}>
          <input type="hidden" name="documento_id" value={doc.id} />
          <button className={BOTAO}>Ler de novo</button>
        </form>
        <form action={marcarDocumento}>
          <input type="hidden" name="documento_id" value={doc.id} />
          <input type="hidden" name="estado" value="processado" />
          <button className={BOTAO}>Marcar como revisto</button>
        </form>
        <form action={marcarDocumento}>
          <input type="hidden" name="documento_id" value={doc.id} />
          <input type="hidden" name="estado" value="ilegivel" />
          <button className={BOTAO}>Marcar como ilegível</button>
        </form>
      </div>

      {!contrato && (
        <form action={criarContratoParaDocumento} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="documento_id" value={doc.id} />
          <select name="setor" className={INPUT} defaultValue="telecomunicacoes">
            {SETORES_CONTRATO.map((s) => (
              <option key={s} value={s}>
                {ROTULO_SETOR[s]}
              </option>
            ))}
          </select>
          <input name="fornecedor" placeholder="Fornecedor" className={INPUT} />
          <button className={BOTAO}>Criar contrato para este documento</button>
        </form>
      )}

      {contrato && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">Valores do contrato</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {(campos ?? []).map((c) => (
              <li key={c.id}>
                <strong>{ROTULO_CAMPO[c.campo as CampoContrato]}:</strong> {formatarValorCampo(c.campo as CampoContrato, c.valor)}{" "}
                <span className="text-[var(--color-ink-faint)]">
                  ({c.estado} · {ROTULO_ORIGEM[c.origem] ?? c.origem}
                  {c.confianca ? ` · ${c.confianca}` : ""})
                </span>
              </li>
            ))}
          </ul>
          <form action={definirCampoAdmin} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="documento_id" value={doc.id} />
            <select name="campo" className={INPUT}>
              {(Object.keys(ROTULO_CAMPO) as CampoContrato[]).map((c) => (
                <option key={c} value={c}>
                  {ROTULO_CAMPO[c]}
                </option>
              ))}
            </select>
            <input name="valor" placeholder="Valor (AAAA-MM-DD ou 42,99)" className={INPUT} />
            <button className={BOTAO}>Definir (origem: DoLado)</button>
          </form>
          <p className="text-[12.5px] text-[var(--color-ink-faint)]">
            Um valor definido aqui passa a ser o atual e fica marcado como corrigido pela DoLado. Não use para concluir sobre
            o cumprimento da lei ou do contrato.
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">Leituras</h2>
        {(extracoes ?? []).length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">Sem leituras.</p>}
        {(extracoes ?? []).map((e) => (
          <details key={e.id} className="rounded-[10px] border border-[var(--color-hairline)] p-3 text-sm">
            <summary className="cursor-pointer">
              {new Date(e.created_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })} · {e.estado} · {e.modelo} · {e.schema_versao}
              {e.erro ? ` · ${e.erro}` : ""}
            </summary>
            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words text-[12px]">{JSON.stringify(e.resultado, null, 2)}</pre>
          </details>
        ))}
      </section>
    </div>
  );
}
