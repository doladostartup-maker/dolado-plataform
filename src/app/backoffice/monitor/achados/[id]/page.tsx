import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROTULO_ACHADO } from "@/lib/monitor/achados";
import { ROTULO_CAMPO, formatarDataPt, formatarEurosCents, formatarValorCampo } from "@/lib/monitor/contratos";
import type { CampoContrato } from "@/lib/monitor/extracaoFatura";
import { comunicarAchado, decidirAchado } from "../actions";

const INPUT =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)]";
const BOTAO =
  "rounded-[var(--radius-button)] border border-[var(--color-hairline-strong)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-brand)]";

type Fatura = {
  id: string;
  documento_id: string;
  data_emissao: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  total_cents: number | null;
  recorrente_cents: number | null;
  cessacao_operador_cents: number | null;
  linhas: { descricao: string; categoria: string; valorCents: number; recorrente: boolean | null }[];
};

function TabelaFatura({ titulo, f }: { titulo: string; f: Fatura }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p className="font-medium">
        {titulo} · {formatarDataPt(f.periodo_inicio)} a {formatarDataPt(f.periodo_fim)} (emitida {formatarDataPt(f.data_emissao)}) ·{" "}
        <Link href={`/backoffice/monitor/${f.documento_id}`} className="text-[var(--color-brand)] underline">
          documento
        </Link>
      </p>
      <p className="text-[var(--color-ink-muted)]">
        Total {formatarEurosCents(f.total_cents)} · recorrente {formatarEurosCents(f.recorrente_cents)}
        {f.cessacao_operador_cents != null && ` · cessação ${formatarEurosCents(f.cessacao_operador_cents)}`}
      </p>
      <ul className="ml-4 list-disc text-[13px] text-[var(--color-ink-muted)]">
        {(f.linhas ?? []).map((l, i) => (
          <li key={i}>
            {l.descricao} — {formatarEurosCents(l.valorCents)} ({l.categoria}
            {l.recorrente === true ? ", recorrente" : l.recorrente === false ? ", pontual" : ""})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function AchadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; guardado?: string; comunicado?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  await requireAdmin();
  const admin = createAdminClient();

  const { data: a } = await admin.from("achados_monitor").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();

  const evidencia = (a.evidencia ?? {}) as Record<string, unknown>;
  const idsFaturas = [a.fatura_id, evidencia.fatura_anterior_id, ...((evidencia.faturas as string[]) ?? [])].filter(Boolean) as string[];

  const [{ data: contrato }, { data: campos }, { data: faturas }, { data: revisoes }] = await Promise.all([
    admin.from("contratos_monitorizados").select("id, fornecedor, setor, utilizador_id").eq("id", a.contrato_id).maybeSingle(),
    admin.from("contratos_campos").select("campo, valor, origem, confianca").eq("contrato_id", a.contrato_id).eq("estado", "atual"),
    // Acompanhamento (acomp_*): a fatura e as anteriores do mesmo serviço.
    String(a.versao_regra).startsWith("acomp_")
      ? admin
          .from("faturas_monitor")
          .select("id, documento_id, data_emissao, periodo_inicio, periodo_fim, total_cents, recorrente_cents, cessacao_operador_cents, linhas")
          .eq("contrato_id", a.contrato_id)
          .order("data_emissao", { ascending: false })
          .limit(6)
      : admin
          .from("faturas_monitor")
          .select("id, documento_id, data_emissao, periodo_inicio, periodo_fim, total_cents, recorrente_cents, cessacao_operador_cents, linhas")
          .in("id", [...new Set(idsFaturas)]),
    admin.from("achados_revisoes").select("decisao, notas, created_at").eq("achado_id", id).order("created_at"),
  ]);

  const porId = new Map(((faturas ?? []) as Fatura[]).map((f) => [f.id, f]));
  const atual = a.fatura_id ? porId.get(a.fatura_id) : undefined;
  const outras = [...porId.values()].filter((f) => f.id !== a.fatura_id);
  const decidido = ["comunicado", "descartado", "obsoleto"].includes(a.estado);
  const textoProposto = (a.texto_cliente as string | null) ?? (evidencia.texto_proposto as string | undefined) ?? "";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">{ROTULO_ACHADO[a.tipo] ?? a.tipo}</h1>
        <Link href="/backoffice/monitor/achados" className="text-sm text-[var(--color-ink-muted)] underline">
          Voltar
        </Link>
      </div>

      {query.comunicado === "email" && <p className="text-sm text-[var(--color-status-success)]">✓ Comunicado ao cliente (portal e e-mail).</p>}
      {query.comunicado === "portal" && <p className="text-sm text-[var(--color-status-success)]">✓ Comunicado no portal (sem e-mail: conta sem e-mail confirmado ou falha no envio).</p>}
      {query.guardado && <p className="text-sm text-[var(--color-status-success)]">✓ Decisão registada.</p>}
      {query.erro && <p className="text-sm text-[var(--color-status-danger)]">{query.erro}</p>}

      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
        <dt className="text-[var(--color-ink-muted)]">Contrato</dt>
        <dd>{contrato?.fornecedor ?? "—"} ({contrato?.setor})</dd>
        <dt className="text-[var(--color-ink-muted)]">Estado</dt>
        <dd>{a.estado}</dd>
        <dt className="text-[var(--color-ink-muted)]">Regra</dt>
        <dd>{a.versao_regra}</dd>
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="text-[var(--text-subheading)] font-medium">Faturas</h2>
        {atual && <TabelaFatura titulo="Fatura atual" f={atual} />}
        {outras.map((f) => (
          <TabelaFatura key={f.id} titulo="Fatura comparada" f={f} />
        ))}
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <h2 className="text-[var(--text-subheading)] font-medium">Dados do contrato registados</h2>
        <ul className="flex flex-col gap-0.5">
          {(campos ?? []).map((c) => (
            <li key={c.campo}>
              <strong>{ROTULO_CAMPO[c.campo as CampoContrato]}:</strong> {formatarValorCampo(c.campo as CampoContrato, c.valor)}{" "}
              <span className="text-[var(--color-ink-faint)]">({c.origem}{c.confianca ? ` · ${c.confianca}` : ""})</span>
            </li>
          ))}
        </ul>
        <details>
          <summary className="cursor-pointer text-[var(--color-brand)]">Evidência da regra</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-[12px]">{JSON.stringify(evidencia, null, 2)}</pre>
        </details>
      </section>

      {(revisoes ?? []).length > 0 && (
        <section className="flex flex-col gap-1 text-sm">
          <h2 className="text-[var(--text-subheading)] font-medium">Revisões</h2>
          {revisoes!.map((r, i) => (
            <p key={i}>
              {new Date(r.created_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })} · {r.decisao}
              {r.notas ? ` — ${r.notas}` : ""}
            </p>
          ))}
        </section>
      )}

      {decidido ? (
        a.texto_cliente && (
          <section className="flex flex-col gap-1 text-sm">
            <h2 className="text-[var(--text-subheading)] font-medium">Texto comunicado</h2>
            <p className="whitespace-pre-wrap">{a.texto_cliente}</p>
          </section>
        )
      ) : (
        <>
          <form action={comunicarAchado} className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-hairline)] p-4">
            <input type="hidden" name="achado_id" value={a.id} />
            <h2 className="text-[var(--text-subheading)] font-medium">Comunicar ao cliente</h2>
            <p className="text-[12.5px] text-[var(--color-ink-faint)]">
              Descreva o facto e o que merece ser verificado. Nunca conclua que a empresa errou ou violou a lei. O cliente vê
              este texto no portal e recebe-o por e-mail.
            </p>
            <textarea name="texto" rows={6} defaultValue={textoProposto} className={INPUT} maxLength={1500} required />
            <textarea name="notas" rows={2} placeholder="Notas internas (opcional)" className={INPUT} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="revisto" value="sim" required /> Revi a situação, as faturas e o texto
            </label>
            <button className={`${BOTAO} self-start border-[var(--color-brand)] text-[var(--color-brand)]`}>Confirmar e comunicar</button>
          </form>

          <form action={decidirAchado} className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-hairline)] p-4">
            <input type="hidden" name="achado_id" value={a.id} />
            <h2 className="text-[var(--text-subheading)] font-medium">Outra decisão</h2>
            <select name="decisao" className={INPUT} defaultValue="descartar">
              <option value="descartar">Descartar (não comunicar)</option>
              <option value="corrigir_dados">Os dados lidos estão errados — vou corrigir</option>
              <option value="pedir_informacao">Pedir mais informação ou documentos ao cliente</option>
            </select>
            <textarea name="notas" rows={2} placeholder="Motivo / notas (obrigatório para descartar)" className={INPUT} />
            <button className={`${BOTAO} self-start`}>Registar decisão</button>
          </form>
        </>
      )}
    </div>
  );
}
