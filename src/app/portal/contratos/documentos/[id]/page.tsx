import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProtecao } from "@/lib/auth";
import { formatarDataPt, formatarEurosCents } from "@/lib/monitor/contratos";
import { ROTULO_IDENTIFICADOR, type TipoIdentificador } from "@/lib/monitor/identificacao";
import { nomeComercial } from "@/lib/monitor/fornecedores";
import { listaFornecedores, resumoDocumentoPorAssociar } from "@/lib/monitor/servidor";
import { decidirDocumento } from "../../actions";
import { BotaoSubmeter } from "../../_components/BotaoSubmeter";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CARTAO, INPUT_CLASS, TITULO_SECCAO } from "../../_components/estilos";

// Documento lido cuja identificação não confirma o serviço (outro cliente,
// outro número de serviço, ou dados insuficientes). Primeiro resolve-se a
// identidade: nenhum dado do serviço é alterado e nenhum outro campo é
// pedido até o cliente decidir. Cada decisão fica registada.

export default async function DocumentoPorAssociarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, user } = await requireProtecao("contratos");

  const { data: doc } = await supabase
    .from("documentos_monitor")
    .select("id, tipo, nome_ficheiro, contrato_id, associacao_estado, associacao_motivos, associacao_conflitos, associacao_sugerida, created_at")
    .eq("id", id)
    .eq("utilizador_id", user.id)
    .maybeSingle();
  if (!doc) notFound();
  if (doc.contrato_id) redirect(`/portal/contratos/${doc.contrato_id}`);
  if (doc.associacao_estado !== "possivel" && doc.associacao_estado !== "conflito") redirect("/portal/contratos");

  const [{ data: servicos }, { data: idsSugerido }, resumo, fornecedores] = await Promise.all([
    supabase
      .from("contratos_monitorizados")
      .select("id, fornecedor, setor")
      .eq("utilizador_id", user.id)
      .is("desativado_em", null)
      .order("created_at", { ascending: true }),
    doc.associacao_sugerida
      ? supabase.from("servicos_identificadores").select("tipo, apresentacao").eq("contrato_id", doc.associacao_sugerida)
      : Promise.resolve({ data: [] as { tipo: string; apresentacao: string | null }[] }),
    resumoDocumentoPorAssociar(doc.id, user.id),
    listaFornecedores(),
  ]);

  const sugerido = (servicos ?? []).find((s) => s.id === doc.associacao_sugerida) ?? null;
  const outros = (servicos ?? []).filter((s) => s.id !== doc.associacao_sugerida);
  const nomeServico = (s: { fornecedor: string | null }) => nomeComercial(s.fornecedor, fornecedores) ?? "Serviço sem fornecedor";
  const conflito = doc.associacao_estado === "conflito";
  const ehContrato = doc.tipo === "contrato";
  const documento = ehContrato ? "Este contrato" : "Esta fatura";
  const conflitos = (Array.isArray(doc.associacao_conflitos) ? doc.associacao_conflitos : []) as string[];
  const motivos = (Array.isArray(doc.associacao_motivos) ? doc.associacao_motivos : []) as string[];
  const linhasDoServico = (idsSugerido ?? []).filter((i) => i.apresentacao);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
          {conflito
            ? `${documento} parece pertencer a outro serviço ou cliente.`
            : `Não conseguimos confirmar que ${ehContrato ? "este contrato" : "esta fatura"} pertence a ${sugerido ? `“${nomeServico(sugerido)}”` : "um dos seus serviços"}.`}
        </h1>
        <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
          {conflito
            ? "Encontrámos diferenças nos dados de identificação e não alterámos o acompanhamento atual."
            : "Não alterámos nada. Reveja os dados e escolha o que fazer com o documento."}
        </p>
      </div>

      {erro && <p role="alert" className="text-sm text-[var(--color-status-danger)]">{erro}</p>}

      <section className={`${CARTAO} flex flex-col gap-3`}>
        <h2 className={TITULO_SECCAO}>O que verificámos</h2>
        <ul className="flex flex-col gap-1.5 text-sm">
          {conflitos.map((c) => (
            <li key={c} className="flex gap-2 text-[var(--color-ink)]">
              <span aria-hidden className="text-[var(--color-status-urgent)]">⚠</span>
              {c}
            </li>
          ))}
          {motivos.map((m) => (
            <li key={m} className="flex gap-2 text-[var(--color-ink-muted)]">
              <span aria-hidden className="text-[var(--color-status-success)]">✓</span>
              {m}
            </li>
          ))}
        </ul>

        <details open={!conflito} className="pt-1">
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-brand)]">Rever dados</summary>
          <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <p className="font-medium text-[var(--color-ink)]">Neste documento</p>
              {resumo ? (
                <>
                  {resumo.fornecedor && <p className="text-[var(--color-ink-muted)]">Fornecedor: {resumo.fornecedor}</p>}
                  {resumo.periodoInicio && resumo.periodoFim ? (
                    <p className="text-[var(--color-ink-muted)]">
                      Período: {formatarDataPt(resumo.periodoInicio)} a {formatarDataPt(resumo.periodoFim)}
                    </p>
                  ) : (
                    resumo.dataEmissao && <p className="text-[var(--color-ink-muted)]">Data: {formatarDataPt(resumo.dataEmissao)}</p>
                  )}
                  {resumo.totalCents != null && <p className="text-[var(--color-ink-muted)]">Total: {formatarEurosCents(resumo.totalCents)}</p>}
                  {resumo.identificacao.map((i) => (
                    <p key={`${i.tipo}${i.apresentacao}`} className="text-[var(--color-ink-muted)]">
                      {ROTULO_IDENTIFICADOR[i.tipo as TipoIdentificador]}: {i.apresentacao}
                    </p>
                  ))}
                  {resumo.identificacao.length === 0 && <p className="text-[var(--color-ink-faint)]">Sem dados de identificação legíveis.</p>}
                </>
              ) : (
                <p className="text-[var(--color-ink-faint)]">{doc.nome_ficheiro ?? "Documento"} · carregado a {formatarDataPt(doc.created_at)}</p>
              )}
            </div>
            {sugerido && (
              <div className="flex flex-col gap-1">
                <p className="font-medium text-[var(--color-ink)]">No serviço “{nomeServico(sugerido)}”</p>
                {linhasDoServico.map((i) => (
                  <p key={`${i.tipo}${i.apresentacao}`} className="text-[var(--color-ink-muted)]">
                    {ROTULO_IDENTIFICADOR[i.tipo as TipoIdentificador]}: {i.apresentacao}
                  </p>
                ))}
                {linhasDoServico.length === 0 && <p className="text-[var(--color-ink-faint)]">Ainda sem dados de identificação registados.</p>}
              </div>
            )}
          </div>
        </details>
      </section>

      <section className="flex flex-col gap-4">
        {!conflito && sugerido && (
          <form action={decidirDocumento} className="flex flex-col gap-1.5">
            <input type="hidden" name="documento_id" value={doc.id} />
            <BotaoSubmeter name="decisao" value="associar_mesmo_assim" aDecorrer="A associar…" className={`${BOTAO_PRIMARIO} self-start`}>
              Associar mesmo assim
            </BotaoSubmeter>
            <span className="text-[12.5px] text-[var(--color-ink-faint)]">
              Fica registado que associou este documento a “{nomeServico(sugerido)}” por sua decisão.
            </span>
          </form>
        )}

        <form action={decidirDocumento}>
          <input type="hidden" name="documento_id" value={doc.id} />
          <BotaoSubmeter name="decisao" value="novo_servico" aDecorrer="A criar…" className={conflito ? BOTAO_PRIMARIO : BOTAO_SECUNDARIO}>
            Adicionar como novo serviço
          </BotaoSubmeter>
        </form>

        {outros.length > 0 && (
          <form action={decidirDocumento} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="documento_id" value={doc.id} />
            <input type="hidden" name="decisao" value="outro_servico" />
            <label className="flex flex-1 flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
              Escolher outro serviço
              <select name="servico_id" required defaultValue="" className={INPUT_CLASS}>
                <option value="" disabled>
                  Escolha…
                </option>
                {outros.map((s) => (
                  <option key={s.id} value={s.id}>
                    {nomeServico(s)}
                  </option>
                ))}
              </select>
            </label>
            <BotaoSubmeter aDecorrer="A associar…" className={BOTAO_SECUNDARIO}>
              Associar a este serviço
            </BotaoSubmeter>
          </form>
        )}

        <form action={decidirDocumento} className="flex flex-col gap-1">
          <input type="hidden" name="documento_id" value={doc.id} />
          <BotaoSubmeter name="decisao" value="cancelar" aDecorrer="A cancelar…" className="self-start text-sm text-[var(--color-ink-muted)] underline">
            Cancelar
          </BotaoSubmeter>
          <span className="text-[12.5px] text-[var(--color-ink-faint)]">O documento é apagado e nada fica registado.</span>
        </form>
      </section>

      <Link href="/portal/contratos" className="text-sm text-[var(--color-ink-muted)] underline">
        Voltar aos serviços
      </Link>
    </div>
  );
}
