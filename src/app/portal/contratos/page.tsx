import Link from "next/link";
import { requireProtecao } from "@/lib/auth";
import { ROTULO_SETOR, formatarEurosCents, proximaData, textoProximaData, type SetorContratoMonitor } from "@/lib/monitor/contratos";
import { mesAnoTexto } from "@/lib/monitor/acompanhamento";
import { nomeComercial } from "@/lib/monitor/fornecedores";
import { emCurso } from "@/lib/monitor/processamento";
import { listaFornecedores } from "@/lib/monitor/servidor";
import { ProgressoDocumento } from "./_components/ProgressoDocumento";
import { UploadDocumento } from "./_components/UploadDocumento";
import { CARTAO, TITULO_SECCAO } from "./_components/estilos";

function hojeLisboa() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

const MENSAGENS: Record<string, { texto: string; tom: "ok" | "info" | "erro" }> = {
  removido: { texto: "Deixámos de acompanhar o serviço e apagámos os documentos e os dados associados.", tom: "ok" },
  cancelado: { texto: "O documento foi apagado. Nada foi alterado nos seus serviços.", tom: "ok" },
  repetido: { texto: "Este documento já tinha sido carregado.", tom: "info" },
  pendente: {
    texto: "Recebemos o documento. Ainda não o conseguimos ler automaticamente: a DoLado vai verificá-lo e os dados aparecem aqui quando estiverem prontos.",
    tom: "info",
  },
  a_rever: { texto: "Recebemos o documento. Alguns dados precisam de ser verificados pela DoLado antes de aparecerem.", tom: "info" },
};

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; removido?: string; aviso?: string; documento?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireProtecao("contratos");

  const [{ data: contratos }, { data: porConfirmar }, { data: aLer }, { data: faturas }, { data: versoes }, { data: porAssociar }] = await Promise.all([
    supabase
      .from("contratos_monitorizados")
      .select("id, setor, fornecedor, estado, data_fim_fidelizacao, data_fim_promocao, desativado_em")
      .eq("utilizador_id", user.id)
      .is("desativado_em", null)
      .order("created_at", { ascending: true }),
    supabase.from("contratos_campos").select("contrato_id").eq("utilizador_id", user.id).in("estado", ["proposto", "em_conflito"]),
    supabase
      .from("documentos_monitor")
      .select("id, etapa, etapa_atualizada_em, estado, contrato_id")
      .eq("utilizador_id", user.id)
      .is("contrato_id", null)
      .in("estado", ["pendente", "a_rever"])
      .or("etapa.is.null,etapa.neq.repetido"),
    supabase.from("faturas_monitor").select("contrato_id, data_emissao, periodo_fim, total_cents").eq("utilizador_id", user.id),
    supabase.from("contratos_versoes").select("contrato_id").eq("utilizador_id", user.id).is("valido_ate", null).not("mensalidade_cents", "is", null),
    supabase
      .from("documentos_monitor")
      .select("id, tipo, associacao_estado")
      .eq("utilizador_id", user.id)
      .is("contrato_id", null)
      .in("associacao_estado", ["possivel", "conflito"]),
  ]);
  // Última fatura de cada serviço e serviços com condições contratuais.
  const ultimaFatura = new Map<string, { data: string; totalCents: number | null }>();
  for (const f of faturas ?? []) {
    const data = f.data_emissao ?? f.periodo_fim ?? "";
    const atual = ultimaFatura.get(f.contrato_id);
    if (!atual || data > atual.data) ultimaFatura.set(f.contrato_id, { data, totalCents: f.total_cents });
  }
  const comContrato = new Set((versoes ?? []).map((v) => v.contrato_id));
  // Identificador visível para distinguir dois serviços do mesmo fornecedor.
  const { data: identificadores } = await supabase
    .from("servicos_identificadores")
    .select("contrato_id, tipo, apresentacao")
    .eq("utilizador_id", user.id)
    .in("tipo", ["numero_servico", "cpe", "cui", "referencia_conta", "numero_cliente", "referencia_contrato"])
    .not("apresentacao", "is", null);
  const referencia = new Map<string, string>();
  for (const i of identificadores ?? []) {
    if (!referencia.has(i.contrato_id) || i.tipo === "numero_servico") referencia.set(i.contrato_id, i.apresentacao as string);
  }
  const fornecedores = await listaFornecedores();
  // Em análise (ou falhada e por repetir): progresso com as etapas reais.
  const emAnalise = (aLer ?? []).filter((d) => emCurso(d.etapa) || d.etapa === "falhou");
  const aVerificar = (aLer ?? []).filter((d) => !emCurso(d.etapa) && d.etapa !== "falhou");

  const pendentesPorContrato = new Map<string, number>();
  for (const c of porConfirmar ?? []) pendentesPorContrato.set(c.contrato_id, (pendentesPorContrato.get(c.contrato_id) ?? 0) + 1);

  const hoje = hojeLisboa();
  const chaveMensagem = params.removido ? "removido" : params.aviso ?? params.documento;
  const mensagem = chaveMensagem ? MENSAGENS[chaveMensagem] : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">Os meus serviços</h1>
        <p className="max-w-[62ch] text-sm leading-relaxed text-[var(--color-ink-muted)]">
          Basta uma fatura para começar: acompanhamos a evolução de cada serviço mês a mês e assinalamos alterações. Com o
          contrato, verificamos também se o que é faturado corresponde ao que foi contratado e avisamo-lo por e-mail antes do
          fim da fidelização e das promoções.
        </p>
      </div>

      {mensagem && (
        <p className={`text-sm ${mensagem.tom === "ok" ? "text-[var(--color-status-success)]" : "text-[var(--color-ink-muted)]"}`}>{mensagem.texto}</p>
      )}
      {params.erro && <p className="text-sm text-[var(--color-status-danger)]">{params.erro}</p>}

      {(porAssociar ?? []).map((d) => (
        <div key={d.id} role="alert" className={`${CARTAO} flex max-w-xl flex-col gap-2 border-[var(--color-status-urgent)]`}>
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {d.associacao_estado === "conflito"
              ? `${d.tipo === "contrato" ? "Um contrato" : "Uma fatura"} que carregou parece pertencer a outro serviço ou cliente.`
              : `Não conseguimos confirmar a que serviço pertence ${d.tipo === "contrato" ? "o contrato" : "a fatura"} que carregou.`}
          </p>
          <Link href={`/portal/contratos/documentos/${d.id}`} className="self-start text-sm font-medium text-[var(--color-brand)] underline">
            Rever dados
          </Link>
        </div>
      ))}

      {(contratos ?? []).length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(contratos ?? []).map((c) => {
            const pendentes = pendentesPorContrato.get(c.id) ?? 0;
            return (
              <Link key={c.id} href={`/portal/contratos/${c.id}`} className={`${CARTAO} flex flex-col gap-1.5 transition hover:border-[var(--color-brand)]`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[15px] font-semibold text-[var(--color-ink)]">{nomeComercial(c.fornecedor, fornecedores) ?? "Fornecedor por confirmar"}</p>
                  {pendentes > 0 && (
                    <span className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--color-brand-wash)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-brand)]">
                      {pendentes === 1 ? "1 dado por confirmar" : `${pendentes} dados por confirmar`}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-[var(--color-ink-faint)]">
                  {ROTULO_SETOR[c.setor as SetorContratoMonitor] ?? c.setor}
                  {referencia.has(c.id) ? ` · ${referencia.get(c.id)}` : ""} · {comContrato.has(c.id) ? "Com contrato" : "Contrato não adicionado"}
                </p>
                {ultimaFatura.has(c.id) && (
                  <p className="text-sm text-[var(--color-ink)]">
                    Última fatura: {formatarEurosCents(ultimaFatura.get(c.id)!.totalCents)}{" "}
                    <span className="text-[var(--color-ink-faint)]">({mesAnoTexto(ultimaFatura.get(c.id)!.data || null)})</span>
                  </p>
                )}
                <p className="text-sm text-[var(--color-ink-muted)]">{textoProximaData(proximaData(c, hoje))}</p>
              </Link>
            );
          })}
        </div>
      )}

      {emAnalise.map((d) => (
        <div key={d.id} className="max-w-xl">
          <ProgressoDocumento documentoId={d.id} inicial={d} />
        </div>
      ))}

      {aVerificar.length > 0 && (
        <p className="text-sm text-[var(--color-ink-muted)]">
          {aVerificar.length === 1 ? "1 documento está" : `${aVerificar.length} documentos estão`} a ser verificados pela DoLado.
          Os dados aparecem aqui quando estiverem prontos.
        </p>
      )}

      <div id="acrescentar" className={`${CARTAO} max-w-xl scroll-mt-24`}>
        <h2 className={`${TITULO_SECCAO} mb-1`}>{(contratos ?? []).length ? "Adicionar fatura ou contrato" : "Adicione a sua fatura"}</h2>
        <p className="mb-4 text-sm text-[var(--color-ink-muted)]">
          {(contratos ?? []).length
            ? "Se o documento for de um serviço que já acompanhamos (mesmo titular e mesma conta ou número de serviço), juntamo-lo a esse serviço. Se não tivermos a certeza, perguntamos."
            : "Começamos a acompanhar a evolução deste serviço. O contrato é opcional: pode adicioná-lo mais tarde."}
        </p>
        <UploadDocumento />
      </div>

      <p className="text-sm text-[var(--color-ink-muted)]">
        Não tem o documento à mão?{" "}
        <Link href="/portal/contratos/novo" className="font-medium text-[var(--color-brand)] underline">
          Indique os dados do serviço
        </Link>
        .
      </p>
    </div>
  );
}
