import Link from "next/link";
import { requireProtecao } from "@/lib/auth";
import { ROTULO_SETOR, formatarEurosCents, proximaData, textoProximaData, type SetorContratoMonitor } from "@/lib/monitor/contratos";
import { mesAnoTexto } from "@/lib/monitor/acompanhamento";
import { nomeComercial } from "@/lib/monitor/fornecedores";
import { emCurso } from "@/lib/monitor/processamento";
import { listaFornecedores } from "@/lib/monitor/servidor";
import { ProgressoDocumento } from "./_components/ProgressoDocumento";
import { UploadDocumento } from "./_components/UploadDocumento";
import { Aviso, type TomAviso } from "@/components/portal/Aviso";
import { CabecalhoPagina, TituloSeccao } from "@/components/portal/Cabecalho";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import { Etiqueta } from "@/components/portal/Etiqueta";
import { IconeCalendario, IconeEscudo, IconeFatura, IconeSeta } from "@/components/portal/Icones";
import { BOTAO_PRIMARIO, CARTAO, CARTAO_ACAO, CARTAO_LIGACAO, LIGACAO, METADADOS, TEXTO_SECUNDARIO, TITULO_CARTAO } from "@/components/portal/ui";

function hojeLisboa() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

const MENSAGENS: Record<string, { texto: string; tom: "ok" | "info" | "erro" }> = {
  removido: { texto: "Deixámos de acompanhar o serviço e apagámos os documentos e os dados associados.", tom: "ok" },
  ultimo: {
    texto:
      "Deixou de acompanhar este serviço e apagámos os documentos e os dados associados. Neste momento não tem serviços acompanhados — pode adicionar um novo quando quiser. A sua Proteção continua ativa.",
    tom: "ok",
  },
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
  const chaveMensagem = params.removido ? (params.removido === "ultimo" ? "ultimo" : "removido") : params.aviso ?? params.documento;
  const mensagem = chaveMensagem ? MENSAGENS[chaveMensagem] : undefined;

  const servicos = contratos ?? [];
  const proximas = servicos
    .map((c) => ({ c, p: proximaData(c, hoje) }))
    .filter((x) => x.p)
    .sort((a, b) => a.p!.dias - b.p!.dias);
  const tomMensagem: Record<"ok" | "info" | "erro", TomAviso> = { ok: "sucesso", info: "info", erro: "erro" };

  return (
    <div className="flex flex-col gap-8">
      <CabecalhoPagina
        titulo="Proteção"
        estado={<Etiqueta tom="concluido">Proteção ativa</Etiqueta>}
        descricao="A DoLado acompanha as faturas dos seus serviços, assinala o que muda e avisa-o por e-mail antes do fim da fidelização e das promoções — para detetar um problema cedo e o tratar, se for preciso."
      />

      {mensagem && <Aviso tom={tomMensagem[mensagem.tom]}>{mensagem.texto}</Aviso>}
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}

      {(porAssociar ?? []).length > 0 && (
        <section aria-labelledby="atencao-protecao" className="flex flex-col gap-3">
          <TituloSeccao id="atencao-protecao" titulo="Precisa da sua atenção" />
          {(porAssociar ?? []).map((d) => (
            <div key={d.id} className={`${CARTAO_ACAO} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
              <div className="min-w-0">
                <p className={TITULO_CARTAO}>
                  {d.associacao_estado === "conflito"
                    ? `${d.tipo === "contrato" ? "Um contrato" : "Uma fatura"} que carregou parece pertencer a outro serviço ou cliente.`
                    : `Não conseguimos confirmar a que serviço pertence ${d.tipo === "contrato" ? "o contrato" : "a fatura"} que carregou.`}
                </p>
                <p className={TEXTO_SECUNDARIO}>Não alterámos nada até decidir.</p>
              </div>
              <Link href={`/portal/contratos/documentos/${d.id}`} className={`${BOTAO_PRIMARIO} shrink-0`}>
                Rever dados
              </Link>
            </div>
          ))}
        </section>
      )}

      {emAnalise.map((d) => (
        <div key={d.id} className="max-w-2xl">
          <ProgressoDocumento documentoId={d.id} inicial={d} />
        </div>
      ))}

      {aVerificar.length > 0 && (
        <Aviso tom="info">
          {aVerificar.length === 1 ? "1 documento está" : `${aVerificar.length} documentos estão`} a ser verificados pela DoLado.
          Os dados aparecem aqui quando estiverem prontos.
        </Aviso>
      )}

      <section aria-labelledby="servicos" className="flex flex-col gap-3">
        <TituloSeccao
          id="servicos"
          titulo="Os serviços que acompanhamos"
          descricao={
            proximas[0]
              ? `Próxima data importante: ${nomeComercial(proximas[0].c.fornecedor, fornecedores) ?? "serviço"} — ${textoProximaData(proximas[0].p).toLowerCase()}.`
              : undefined
          }
          acao={
            servicos.length > 0 ? (
              <a href="#acrescentar" className={`${LIGACAO} min-h-11 text-[14.5px]`}>
                Adicionar fatura ou contrato
              </a>
            ) : undefined
          }
        />
        {servicos.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {servicos.map((c) => {
              const pendentes = pendentesPorContrato.get(c.id) ?? 0;
              const fatura = ultimaFatura.get(c.id);
              const proxima = proximaData(c, hoje);
              return (
                <li key={c.id}>
                  <Link href={`/portal/contratos/${c.id}`} className={`${CARTAO_LIGACAO} flex h-full flex-col gap-3`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`${TITULO_CARTAO} break-words`}>{nomeComercial(c.fornecedor, fornecedores) ?? "Fornecedor por confirmar"}</p>
                        <p className={METADADOS}>
                          {ROTULO_SETOR[c.setor as SetorContratoMonitor] ?? c.setor}
                          {referencia.has(c.id) ? ` · ${referencia.get(c.id)}` : ""}
                        </p>
                      </div>
                      {pendentes > 0 && (
                        <Etiqueta tom="acao">{pendentes === 1 ? "1 dado por confirmar" : `${pendentes} dados por confirmar`}</Etiqueta>
                      )}
                    </div>
                    <ul className="flex flex-col gap-1.5 text-[14px] text-[var(--v2-navy)]">
                      <li className="flex items-start gap-2">
                        <IconeCalendario tamanho={17} className="mt-0.5 shrink-0 text-[var(--v2-muted)]" />
                        <span className={proxima ? undefined : "text-[var(--v2-muted)]"}>{textoProximaData(proxima)}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <IconeFatura tamanho={17} className="mt-0.5 shrink-0 text-[var(--v2-muted)]" />
                        {fatura ? (
                          <span>
                            Última fatura: {formatarEurosCents(fatura.totalCents)}{" "}
                            <span className="text-[var(--v2-muted)]">({mesAnoTexto(fatura.data || null)})</span>
                          </span>
                        ) : (
                          <span className="text-[var(--v2-muted)]">Sem faturas carregadas</span>
                        )}
                      </li>
                    </ul>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                      <span className={METADADOS}>{comContrato.has(c.id) ? "Com contrato" : "Contrato não adicionado"}</span>
                      <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--v2-green)]">
                        Ver serviço
                        <IconeSeta tamanho={16} />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EstadoVazio icone={<IconeEscudo tamanho={20} />} titulo="Ainda não acompanhamos nenhum serviço">
            Basta uma fatura para começar. A partir daí, comparamos cada mês com os anteriores e avisamo-lo se algo mudar.
          </EstadoVazio>
        )}
      </section>

      <section id="acrescentar" aria-labelledby="acrescentar-titulo" className={`${CARTAO} flex max-w-2xl scroll-mt-24 flex-col gap-4`}>
        <div className="flex flex-col gap-1">
          <h2 id="acrescentar-titulo" className="text-[18px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">
            {servicos.length ? "Adicionar fatura ou contrato" : "Adicione a sua fatura"}
          </h2>
          <p className={TEXTO_SECUNDARIO}>
            {servicos.length
              ? "Se o documento for de um serviço que já acompanhamos (mesmo titular e mesma conta ou número de serviço), juntamo-lo a esse serviço. Se não tivermos a certeza, perguntamos."
              : "Começamos a acompanhar a evolução deste serviço. O contrato é opcional: pode adicioná-lo mais tarde."}
          </p>
        </div>
        <UploadDocumento />
        <p className={`${TEXTO_SECUNDARIO} border-t border-[var(--v2-line)] pt-4`}>
          Não tem o documento à mão?{" "}
          <Link href="/portal/contratos/novo" className={LIGACAO}>
            Indique os dados do serviço
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
