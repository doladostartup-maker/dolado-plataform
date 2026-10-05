import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { gastoApiUsd, tetoOrcamentoUsd } from "@/lib/monitor/servidor";
import { estadoOrcamento } from "@/lib/monitor/custos";
import { MODELO_DOCUMENTOS } from "@/lib/claude";
import { ROTULO_TIPO_DOCUMENTO } from "@/lib/monitor/tipoDocumento";
import { ROTULO_SITUACAO_ADMIN, SITUACOES_ADMIN_COM_ACAO, situacaoDocumentoAdmin, type SituacaoAdmin } from "@/lib/monitor/processamento";
import { ESTADOS_ACHADO_POR_DECIDIR } from "@/lib/monitor/achados";

// Falhas a vermelho: o admin vê logo o que não se resolve sozinho.
const ERRO: SituacaoAdmin[] = ["falhou", "leitura_parada"];

function classificar<T extends { estado: string; etapa: string | null; etapa_atualizada_em: string | null }>(documentos: T[]) {
  const agora = Date.now();
  return documentos.flatMap((d) => {
    const situacao = situacaoDocumentoAdmin(d, agora);
    return situacao ? [{ ...d, situacao }] : [];
  });
}

export default async function MonitorBackofficePage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [gasto, { data: documentos }, { count: conflitos }, { count: contratos }, { count: chamadas }, { count: achados }] = await Promise.all([
    gastoApiUsd(admin),
    admin
      .from("documentos_monitor")
      .select("id, utilizador_id, tipo, tipo_indicado, estado, etapa, etapa_atualizada_em, created_at, contrato_id")
      .in("estado", ["pendente", "a_rever"])
      .is("desativado_em", null)
      .order("created_at", { ascending: true }),
    admin.from("contratos_campos").select("id", { count: "exact", head: true }).eq("estado", "em_conflito"),
    admin.from("contratos_monitorizados").select("id", { count: "exact", head: true }).is("desativado_em", null),
    admin.from("uso_api_claude").select("id", { count: "exact", head: true }),
    admin.from("achados_monitor").select("id", { count: "exact", head: true }).in("estado", ESTADOS_ACHADO_POR_DECIDIR),
  ]);

  // "pendente" cobre também documentos ainda em leitura automática (sem ação
  // possível) e repetidos à espera de o cliente ver o aviso (não contam).
  const classificados = classificar(documentos ?? []);
  const porTratar = classificados.filter((d) => SITUACOES_ADMIN_COM_ACAO.includes(d.situacao));
  const emLeitura = classificados.filter((d) => d.situacao === "em_leitura");

  const ids = [...new Set(classificados.map((d) => d.utilizador_id))];
  const { data: contas } = ids.length ? await admin.from("utilizadores").select("id, nome, email").in("id", ids) : { data: [] };
  const conta = new Map((contas ?? []).map((c) => [c.id, c]));

  const teto = tetoOrcamentoUsd();
  const orcamento = estadoOrcamento(gasto, teto);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">Monitor de Proteção</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-4">
          <p className="text-[13px] text-[var(--color-ink-muted)]">Claude API (estimado)</p>
          <p className={`text-lg font-semibold ${orcamento.bloqueado ? "text-[var(--color-status-danger)]" : "text-[var(--color-ink)]"}`}>
            {gasto.toFixed(4)} / {teto} USD
          </p>
          <p className="text-[12px] text-[var(--color-ink-faint)]">
            {orcamento.percentagem.toFixed(1)}% · {chamadas ?? 0} chamadas · {MODELO_DOCUMENTOS}
            {!process.env.ANTHROPIC_API_KEY && " · chave por configurar"}
          </p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-4">
          <p className="text-[13px] text-[var(--color-ink-muted)]">Contratos acompanhados</p>
          <p className="text-lg font-semibold text-[var(--color-ink)]">{contratos ?? 0}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-4">
          <p className="text-[13px] text-[var(--color-ink-muted)]">Valores em conflito (cliente decide)</p>
          <p className="text-lg font-semibold text-[var(--color-ink)]">{conflitos ?? 0}</p>
        </div>
      </div>

      <Link
        href="/backoffice/monitor/achados"
        className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-brand)]"
      >
        <span className="text-sm font-medium text-[var(--color-ink)]">Situações detetadas nas faturas, por decidir</span>
        <span className={`text-lg font-semibold ${achados ? "text-[var(--color-status-danger)]" : "text-[var(--color-ink)]"}`}>{achados ?? 0}</span>
      </Link>

      <h2 className="text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">Documentos por tratar</h2>
      <p className="-mt-4 text-sm text-[var(--color-ink-muted)]">
        Documentos que precisam da DoLado: leituras que falharam ou pararam, leituras por fazer à mão e dados por rever. Uma
        situação detetada só existe depois de uma fatura ser lida — por isso estes números não têm de coincidir.
      </p>
      {porTratar.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-subtle)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-surface-sunken)]">
              <tr>
                <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Cliente</th>
                <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Documento</th>
                <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Situação</th>
                <th className="px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-muted)]">Recebido em</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {porTratar.map((d) => {
                const c = conta.get(d.utilizador_id);
                return (
                  <tr key={d.id} className="border-t border-[var(--color-hairline)]">
                    <td className="px-3 py-2 text-[var(--color-ink)]">
                      {c?.nome ?? "—"}
                      <span className="block text-[12px] text-[var(--color-ink-faint)]">{c?.email}</span>
                    </td>
                    <td className="px-3 py-2 text-[var(--color-ink)]">
                      {ROTULO_TIPO_DOCUMENTO[d.tipo] ?? d.tipo}
                      {d.tipo !== d.tipo_indicado && (
                        <span className="block text-[12px] text-[var(--color-ink-faint)]">enviado como {ROTULO_TIPO_DOCUMENTO[d.tipo_indicado]?.toLowerCase()}</span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-2 ${ERRO.includes(d.situacao) ? "font-medium text-[var(--color-status-danger)]" : "text-[var(--color-ink-muted)]"}`}
                    >
                      {ROTULO_SITUACAO_ADMIN[d.situacao]}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-ink-muted)]">{new Date(d.created_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}</td>
                    <td className="px-3 py-2">
                      <Link href={`/backoffice/monitor/${d.id}`} className="text-[var(--color-brand)] underline">
                        Rever
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-ink-muted)]">Sem documentos por tratar.</p>
      )}
      {emLeitura.length > 0 && (
        <p className="text-sm text-[var(--color-ink-muted)]">
          {emLeitura.length === 1 ? "1 documento em leitura automática" : `${emLeitura.length} documentos em leitura automática`} (sem ação
          necessária; se parar, aparece acima).
        </p>
      )}
    </div>
  );
}
