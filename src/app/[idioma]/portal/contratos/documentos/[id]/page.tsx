import { notFound, redirect } from "next/navigation";
import { idiomaDaPagina } from "@/i18n/servidor";
import { localizarHref } from "@/i18n/config";
import { tProtecao, traduzirMensagemProtecao } from "@/i18n/mensagens/protecao";
import { tMonitor } from "@/i18n/mensagens/monitor";
import { requireProtecao } from "@/lib/auth";
import { formatarDataPt, formatarEurosCents } from "@/lib/monitor/contratos";
import type { TipoIdentificador } from "@/lib/monitor/identificacao";
import { nomeComercial } from "@/lib/monitor/fornecedores";
import { listaFornecedores, resumoDocumentoPorAssociar } from "@/lib/monitor/servidor";
import { decidirDocumento } from "../../actions";
import { BotaoSubmeter } from "../../_components/BotaoSubmeter";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CARTAO, INPUT_CLASS, TITULO_SECCAO } from "../../_components/estilos";
import { Aviso } from "@/components/portal/Aviso";
import { CabecalhoPagina } from "@/components/portal/Cabecalho";
import { IconeAlerta, IconeCirculoVisto } from "@/components/portal/Icones";
import { BOTAO_FANTASMA, ROTULO } from "@/components/portal/ui";

// Documento lido cuja identificação não confirma o serviço (outro cliente,
// outro número de serviço, ou dados insuficientes). Primeiro resolve-se a
// identidade: nenhum dado do serviço é alterado e nenhum outro campo é
// pedido até o cliente decidir. Cada decisão fica registada.

export default async function DocumentoPorAssociarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; idioma: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const idioma = await idiomaDaPagina(params);
  const t = tProtecao[idioma].documento;
  const tm = tMonitor[idioma];
  const rotuloId = (tipo: string) => tm.rotulosIdentificador[tipo as TipoIdentificador] ?? tipo;
  const frase = (texto: string) => (tm.identificacao as Record<string, string>)[texto] ?? texto;
  const { supabase, user } = await requireProtecao("contratos");

  const { data: doc } = await supabase
    .from("documentos_monitor")
    .select("id, tipo, nome_ficheiro, contrato_id, associacao_estado, associacao_motivos, associacao_conflitos, associacao_sugerida, created_at")
    .eq("id", id)
    .eq("utilizador_id", user.id)
    .maybeSingle();
  if (!doc) notFound();
  if (doc.contrato_id) redirect(localizarHref(idioma, `/portal/contratos/${doc.contrato_id}`));
  if (doc.associacao_estado !== "possivel" && doc.associacao_estado !== "conflito") redirect(localizarHref(idioma, "/portal/contratos"));

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
  const nomeServico = (s: { fornecedor: string | null }) => nomeComercial(s.fornecedor, fornecedores) ?? t.semFornecedor;
  const conflito = doc.associacao_estado === "conflito";
  const ehContrato = doc.tipo === "contrato";
  const documento = ehContrato ? t.esteContrato : t.estaFatura;
  const conflitos = (Array.isArray(doc.associacao_conflitos) ? doc.associacao_conflitos : []) as string[];
  const motivos = (Array.isArray(doc.associacao_motivos) ? doc.associacao_motivos : []) as string[];
  const linhasDoServico = (idsSugerido ?? []).filter((i) => i.apresentacao);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <CabecalhoPagina
        voltar={{ href: "/portal/contratos", texto: tProtecao[idioma].lista.titulo }}
        contexto={t.contexto}
        titulo={
          conflito
            ? t.conflito(documento)
            : t.possivel(ehContrato, sugerido ? nomeServico(sugerido) : null)
        }
        descricao={
          conflito
            ? t.conflitoTexto
            : t.possivelTexto
        }
      />

      {erro && <Aviso tom="erro">{traduzirMensagemProtecao(idioma, erro)}</Aviso>}

      <section className={`${CARTAO} flex flex-col gap-3`}>
        <h2 className={TITULO_SECCAO}>{t.oQueVerificamos}</h2>
        <ul className="flex flex-col gap-1.5 text-sm">
          {conflitos.map((c) => (
            <li key={c} className="flex gap-2 text-[var(--color-ink)]">
              <IconeAlerta tamanho={18} className="mt-0.5 shrink-0 text-[var(--v2-aviso)]" />
              {frase(c)}
            </li>
          ))}
          {motivos.map((m) => (
            <li key={m} className="flex gap-2 text-[var(--color-ink-muted)]">
              <IconeCirculoVisto tamanho={18} className="mt-0.5 shrink-0 text-[var(--v2-green)]" />
              {frase(m)}
            </li>
          ))}
        </ul>

        <details open={!conflito} className="pt-1">
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-brand)]">{t.reverDados}</summary>
          <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <p className="font-medium text-[var(--color-ink)]">{t.nesteDocumento}</p>
              {resumo ? (
                <>
                  {resumo.fornecedor && <p className="text-[var(--color-ink-muted)]">{t.fornecedor(resumo.fornecedor)}</p>}
                  {resumo.periodoInicio && resumo.periodoFim ? (
                    <p className="text-[var(--color-ink-muted)]">
                      {t.periodo(formatarDataPt(resumo.periodoInicio), formatarDataPt(resumo.periodoFim))}
                    </p>
                  ) : (
                    resumo.dataEmissao && <p className="text-[var(--color-ink-muted)]">{t.data(formatarDataPt(resumo.dataEmissao))}</p>
                  )}
                  {resumo.totalCents != null && <p className="text-[var(--color-ink-muted)]">{t.total(formatarEurosCents(resumo.totalCents, idioma))}</p>}
                  {resumo.identificacao.map((i) => (
                    <p key={`${i.tipo}${i.apresentacao}`} className="text-[var(--color-ink-muted)]">
                      {rotuloId(i.tipo)}: {i.apresentacao}
                    </p>
                  ))}
                  {resumo.identificacao.length === 0 && <p className="text-[var(--color-ink-faint)]">{t.semIdentificacao}</p>}
                </>
              ) : (
                <p className="text-[var(--color-ink-faint)]">
                  {doc.nome_ficheiro ?? t.documento}
                  {t.carregadoA(formatarDataPt(doc.created_at))}
                </p>
              )}
            </div>
            {sugerido && (
              <div className="flex flex-col gap-1">
                <p className="font-medium text-[var(--color-ink)]">{t.noServico(nomeServico(sugerido))}</p>
                {linhasDoServico.map((i) => (
                  <p key={`${i.tipo}${i.apresentacao}`} className="text-[var(--color-ink-muted)]">
                    {rotuloId(i.tipo)}: {i.apresentacao}
                  </p>
                ))}
                {linhasDoServico.length === 0 && <p className="text-[var(--color-ink-faint)]">{t.semRegistados}</p>}
              </div>
            )}
          </div>
        </details>
      </section>

      <section aria-label={t.oQueFazer} className={`${CARTAO} flex flex-col gap-5`}>
        {!conflito && sugerido && (
          <form action={decidirDocumento} className="flex flex-col gap-1.5">
            <input type="hidden" name="documento_id" value={doc.id} />
            <BotaoSubmeter name="decisao" value="associar_mesmo_assim" aDecorrer={t.aAssociar} className={`${BOTAO_PRIMARIO} self-start`}>
              {t.associarMesmoAssim}
            </BotaoSubmeter>
            <span className="text-[12.5px] text-[var(--color-ink-faint)]">
              {t.ficaRegistado(nomeServico(sugerido))}
            </span>
          </form>
        )}

        <form action={decidirDocumento}>
          <input type="hidden" name="documento_id" value={doc.id} />
          <BotaoSubmeter name="decisao" value="novo_servico" aDecorrer={t.aCriar} className={conflito ? BOTAO_PRIMARIO : BOTAO_SECUNDARIO}>
            {t.novoServico}
          </BotaoSubmeter>
        </form>

        {outros.length > 0 && (
          <form action={decidirDocumento} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="documento_id" value={doc.id} />
            <input type="hidden" name="decisao" value="outro_servico" />
            <label className={`${ROTULO} flex-1`}>
              {t.outroServico}
              <select name="servico_id" required defaultValue="" className={INPUT_CLASS}>
                <option value="" disabled>
                  {t.escolha}
                </option>
                {outros.map((s) => (
                  <option key={s.id} value={s.id}>
                    {nomeServico(s)}
                  </option>
                ))}
              </select>
            </label>
            <BotaoSubmeter aDecorrer={t.aAssociar} className={BOTAO_SECUNDARIO}>
              {t.associarEste}
            </BotaoSubmeter>
          </form>
        )}

        <form action={decidirDocumento} className="flex flex-col gap-1">
          <input type="hidden" name="documento_id" value={doc.id} />
          <BotaoSubmeter name="decisao" value="cancelar" aDecorrer={t.aCancelar} className={`${BOTAO_FANTASMA} self-start`}>
            {t.cancelar}
          </BotaoSubmeter>
          <span className="text-[12.5px] text-[var(--color-ink-faint)]">{t.cancelarTexto}</span>
        </form>
      </section>

    </div>
  );
}
