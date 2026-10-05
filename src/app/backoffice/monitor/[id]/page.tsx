import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROTULO_CAMPO, ROTULO_ORIGEM, ROTULO_SETOR, SETORES_CONTRATO, formatarValorCampo } from "@/lib/monitor/contratos";
import type { CampoContrato } from "@/lib/monitor/extracaoFatura";
import { criarContratoParaDocumento, definirCampoAdmin, marcarDocumento, reprocessarDocumento } from "../actions";
import { BotaoAcao } from "../_components/BotaoAcao";
import { AlterarTipoDocumento } from "../_components/AlterarTipoDocumento";
import { ROTULO_TIPO_DOCUMENTO, sugestaoTipoDocumento } from "@/lib/monitor/tipoDocumento";

const MOTIVO: Record<string, string> = {
  api_nao_configurada: "A ANTHROPIC_API_KEY não está configurada no servidor (Clever Cloud). O documento fica pendente até haver chave.",
  erro_api: "A Claude API respondeu com erro. Verifique a chave e o modelo (ANTHROPIC_DOCUMENT_MODEL) no Clever Cloud.",
  orcamento_atingido: "O orçamento da Claude API (ANTHROPIC_ORCAMENTO_USD) foi atingido. Aumente o teto para continuar a ler documentos automaticamente.",
  ficheiro_nao_encontrado: "O ficheiro não foi encontrado no Storage.",
  formato_nao_lido: "Este formato não é lido automaticamente.",
  recusa: "A Claude API recusou ler o documento.",
  resposta_invalida: "A leitura não devolveu um resultado válido.",
  validacao: "Os dados lidos não passaram a validação.",
  nao_e_fatura: "A leitura indica que o documento não é uma fatura.",
  nao_e_contrato: "A leitura indica que o documento não é um contrato.",
  erro_inesperado: "Erro inesperado no processamento.",
};

const INPUT =
  "rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)]";
const BOTAO =
  "rounded-[var(--radius-button)] border border-[var(--color-hairline-strong)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-brand)]";

export default async function DocumentoMonitorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; guardado?: string; resultado?: string; motivo?: string; detalhe?: string; tipo_alterado?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  await requireAdmin();
  const admin = createAdminClient();

  const { data: doc } = await admin.from("documentos_monitor").select("*").eq("id", id).maybeSingle();
  if (!doc) notFound();

  const [{ data: conta }, { data: extracoes }, { data: contrato }, { data: campos }, { data: alteracoesTipo }] = await Promise.all([
    admin.from("utilizadores").select("nome, email").eq("id", doc.utilizador_id).maybeSingle(),
    admin.from("extracoes_documento").select("id, modelo, schema_versao, prompt_versao, estado, erro, resultado, created_at").eq("documento_id", id).order("created_at", { ascending: false }),
    doc.contrato_id ? admin.from("contratos_monitorizados").select("id, setor, fornecedor, estado").eq("id", doc.contrato_id).maybeSingle() : Promise.resolve({ data: null }),
    doc.contrato_id
      ? admin.from("contratos_campos").select("id, campo, valor, origem, estado, confianca").eq("contrato_id", doc.contrato_id).in("estado", ["atual", "proposto", "em_conflito"]).order("campo")
      : Promise.resolve({ data: [] }),
    admin
      .from("documentos_tipo_alteracoes")
      .select("id, tipo_anterior, tipo_novo, alterado_por, leituras_invalidadas, fatura_removida, valores_retirados, created_at")
      .eq("documento_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const revisores = [...new Set((alteracoesTipo ?? []).map((a) => a.alterado_por))];
  const { data: contasRevisores } = revisores.length
    ? await admin.from("utilizadores").select("id, nome, email").in("id", revisores)
    : { data: [] };
  const revisor = new Map((contasRevisores ?? []).map((c) => [c.id, c.nome || c.email]));
  const sugestao = sugestaoTipoDocumento(doc, extracoes ?? []);
  const rotuloTipo = (t: string) => ROTULO_TIPO_DOCUMENTO[t] ?? t;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">{rotuloTipo(doc.tipo)} carregad{doc.tipo === "fatura" ? "a" : "o"}</h1>
        <Link href="/backoffice/monitor" className="text-sm text-[var(--color-ink-muted)] underline">
          Voltar
        </Link>
      </div>

      {query.resultado && (
        <div
          className={`rounded-[10px] border px-4 py-3 text-sm ${
            query.resultado === "processado"
              ? "border-[var(--color-status-success)] text-[var(--color-status-success)]"
              : "border-[var(--color-status-danger)] text-[var(--color-ink)]"
          }`}
        >
          <p className="font-medium">
            {query.resultado === "processado" ? "✓ Documento lido." : `O documento ficou ${query.resultado === "pendente" ? "pendente" : "por rever"}.`}
          </p>
          {query.motivo && <p>{MOTIVO[query.motivo] ?? query.motivo}</p>}
          {query.detalhe && <p className="mt-1 break-words text-[12px] text-[var(--color-ink-faint)]">{MOTIVO[query.detalhe] ?? query.detalhe}</p>}
        </div>
      )}
      {query.tipo_alterado && <p className="text-sm text-[var(--color-status-success)]">✓ Tipo alterado para {rotuloTipo(doc.tipo)}. A nova análise foi pedida com o pipeline deste tipo.</p>}
      {query.guardado && <p className="text-sm text-[var(--color-status-success)]">✓ Guardado.</p>}
      {query.erro && <p className="text-sm text-[var(--color-status-danger)]">{query.erro}</p>}

      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
        <dt className="text-[var(--color-ink-muted)]">Cliente</dt>
        <dd>{conta?.nome ?? "—"} · {conta?.email}</dd>
        <dt className="text-[var(--color-ink-muted)]">Tipo indicado pelo cliente</dt>
        <dd>{rotuloTipo(doc.tipo_indicado)}</dd>
        <dt className="text-[var(--color-ink-muted)]">Tipo usado pelo sistema</dt>
        <dd className={doc.tipo !== doc.tipo_indicado ? "font-medium" : undefined}>
          {rotuloTipo(doc.tipo)}
          {doc.tipo !== doc.tipo_indicado && " (alterado na revisão)"}
        </dd>
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

      {sugestao && (
        <div className="rounded-[10px] border border-[var(--color-hairline-strong)] px-4 py-3 text-sm text-[var(--color-ink)]">
          <p className="font-medium">{sugestao.texto}</p>
          <p className="text-[12.5px] text-[var(--color-ink-faint)]">Sugestão da leitura automática. O tipo só muda se o alterar abaixo.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <AlterarTipoDocumento documentoId={doc.id} tipoAtual={doc.tipo} sugerido={sugestao?.tipo ?? null} className={BOTAO} inputClassName={INPUT} />
      </div>

      <div className="flex flex-wrap gap-2">
        <form action={reprocessarDocumento}>
          <input type="hidden" name="documento_id" value={doc.id} />
          <BotaoAcao className={BOTAO} aDecorrer="A ler… pode demorar até um minuto">
            Ler de novo
          </BotaoAcao>
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

      {(alteracoesTipo ?? []).length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">Alterações do tipo</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {(alteracoesTipo ?? []).map((a) => (
              <li key={a.id}>
                {new Date(a.created_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })} · {rotuloTipo(a.tipo_anterior)} → {rotuloTipo(a.tipo_novo)} ·{" "}
                {revisor.get(a.alterado_por) ?? a.alterado_por}
                <span className="text-[var(--color-ink-faint)]">
                  {" "}
                  ({a.leituras_invalidadas} leitura(s) posta(s) de parte
                  {a.fatura_removida ? " · fatura registada retirada" : ""}
                  {a.valores_retirados ? ` · ${a.valores_retirados} valor(es) retirado(s)` : ""})
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">Leituras</h2>
        {(extracoes ?? []).length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">Sem leituras.</p>}
        {(extracoes ?? []).map((e) => (
          <details key={e.id} className="rounded-[10px] border border-[var(--color-hairline)] p-3 text-sm">
            <summary className="cursor-pointer">
              {new Date(e.created_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })} · {e.estado === "invalidada" ? "posta de parte" : e.estado} · {e.modelo} ·{" "}
              {e.schema_versao}
              {e.erro ? ` · ${e.erro}` : ""}
            </summary>
            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words text-[12px]">{JSON.stringify(e.resultado, null, 2)}</pre>
          </details>
        ))}
      </section>
    </div>
  );
}
