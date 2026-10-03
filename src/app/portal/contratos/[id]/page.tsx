import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProtecao } from "@/lib/auth";
import { urlTratarCaso } from "@/lib/site";
import {
  CAMPOS_EDITAVEIS,
  ROTULO_CAMPO,
  ROTULO_ORIGEM,
  ROTULO_SETOR,
  formatarDataPt,
  formatarEurosCents,
  formatarValorCampo,
  proximaData,
  setorTratarCaso,
  textoProximaData,
  valorParaEdicao,
  type SetorContratoMonitor,
} from "@/lib/monitor/contratos";
import {
  componentesFatura,
  dataReferencia,
  fraseEvento,
  fraseVariacaoTotal,
  mesAno,
  mesAnoTexto,
  ordenarFaturas,
  padraoObservado,
  type FaturaComparavel,
  type Severidade,
  type TipoEvento,
} from "@/lib/monitor/acompanhamento";
import type { CampoContrato, LinhaFatura } from "@/lib/monitor/extracaoFatura";
import { emCurso } from "@/lib/monitor/processamento";
import { apresentarFornecedor } from "@/lib/monitor/servidor";
import { corrigirContrato, deixarDeAcompanhar, responderFatura } from "../actions";
import { CamposContrato } from "../_components/CamposContrato";
import { ConfirmarDados, type CampoPorConfirmar } from "../_components/ConfirmarDados";
import { ProgressoDocumento } from "../_components/ProgressoDocumento";
import { CustoSaida } from "../_components/CustoSaida";
import { UploadDocumento } from "../_components/UploadDocumento";
import { HistoricoServico, type PeriodoHistorico } from "../_components/HistoricoServico";
import { BotaoSubmeter } from "../_components/BotaoSubmeter";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CARTAO, TITULO_SECCAO } from "../_components/estilos";

// Serviço acompanhado. Funciona só com faturas (histórico e padrão
// observado) e fica mais completo com o contrato (contratado × faturado,
// promoções, fidelização, custo de saída). Ordem: resumo → mês a mês →
// situações → condições do contrato → padrões observados → documentos.
//
// Sem contrato nunca se fala de "contratado": os valores das faturas são
// observados. Uma fatura nunca altera as condições do contrato.

function hojeLisboa() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

// Condições do contrato, pela ordem de apresentação.
const CONDICOES: CampoContrato[] = [
  "servico",
  "mensalidade_cents",
  "servicos_incluidos",
  "descricao_promocao",
  "desconto_promocao_cents",
  "data_inicio_promocao",
  "data_fim_promocao",
  "data_assinatura",
  "data_ativacao",
  "inicio_na_ativacao",
  "data_inicio",
  "duracao_fidelizacao_meses",
  "data_fim_fidelizacao",
  "vantagem_cents",
  "tipo_fidelizacao",
  "nova_instalacao",
  "equipamento_subsidiado",
  "referencia_contrato",
  "cpe",
  "cui",
];
// Propostas que mudam o preço/promoção/serviços (podem ser uma alteração do contrato).
const CAMPOS_COMERCIAIS = new Set<CampoContrato>([
  "mensalidade_cents",
  "desconto_promocao_cents",
  "descricao_promocao",
  "data_inicio_promocao",
  "data_fim_promocao",
  "servicos_incluidos",
]);
// Informação contratual que a própria fatura pode indicar (nível 2).
const LIDOS_DA_FATURA: CampoContrato[] = ["data_fim_fidelizacao", "cessacao_operador_cents", "cessacao_operador_data"];

const MENSAGEM: Record<string, string> = {
  processado: "Lemos o documento.",
  pendente: "Recebemos o documento. Ainda não o conseguimos ler automaticamente: a DoLado vai verificá-lo.",
  a_rever: "Lemos o documento, mas alguns dados precisam de ser verificados pela DoLado.",
};

type Campo = {
  id: string;
  campo: CampoContrato;
  valor: unknown;
  origem: string;
  estado: string;
  pagina: number | null;
  evidencia: string | null;
  documento_id: string | null;
  confirmado_cliente_em: string | null;
  created_at: string;
};

type Evento = {
  fatura_id: string | null;
  tipo: TipoEvento;
  base: "contrato" | "historico";
  severidade: Severidade;
  montante_cents: number | null;
  dados: Record<string, unknown>;
  achado_id: string | null;
};

const ORDEM_SEVERIDADE: Record<Severidade, number> = { atencao: 0, info: 1, ok: 2 };

function Origem({ c }: { c: Campo }) {
  const partes = [ROTULO_ORIGEM[c.origem] ?? c.origem];
  if (c.pagina) partes.push(`página ${c.pagina}`);
  if (c.origem !== "cliente" && c.confirmado_cliente_em) partes.push(`confirmado por si em ${formatarDataPt(c.confirmado_cliente_em)}`);
  return <span className="text-[12.5px] text-[var(--color-ink-faint)]">{partes.join(" · ")}</span>;
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[var(--color-hairline)] py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-sm text-[var(--color-ink-muted)]">{rotulo}</dt>
      <dd className="flex flex-col text-[15px] text-[var(--color-ink)] sm:items-end sm:text-right">{children}</dd>
    </div>
  );
}

export default async function ServicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; guardado?: string; documento?: string; aviso?: string; editar?: string; associado?: string; fatura?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, user } = await requireProtecao("contratos");

  const { data: contrato } = await supabase
    .from("contratos_monitorizados")
    .select("*")
    .eq("id", id)
    .eq("utilizador_id", user.id)
    .is("desativado_em", null)
    .maybeSingle();
  if (!contrato) notFound();

  const [
    { data: campos },
    { data: documentos },
    { data: faturas },
    { data: eventos },
    { data: achados },
    { data: versoes },
    { data: porAssociar },
  ] = await Promise.all([
    supabase
      .from("contratos_campos")
      .select("id, campo, valor, origem, estado, pagina, evidencia, documento_id, confirmado_cliente_em, created_at")
      .eq("contrato_id", id)
      .in("estado", ["atual", "proposto", "em_conflito"])
      .order("created_at", { ascending: true }),
    supabase
      .from("documentos_monitor")
      .select("id, tipo, nome_ficheiro, estado, etapa, etapa_atualizada_em, contrato_id, associacao_estado, created_at")
      .eq("contrato_id", id)
      .or("etapa.is.null,etapa.neq.repetido")
      .order("created_at", { ascending: false }),
    supabase
      .from("faturas_monitor")
      .select(
        "id, documento_id, data_emissao, periodo_inicio, periodo_fim, total_cents, mensalidade_lida_cents, recorrente_cents, linhas, data_fim_fidelizacao, em_verificacao, confirmada_cliente_em, valores_contestados_em",
      )
      .eq("contrato_id", id),
    supabase
      .from("eventos_servico")
      .select("fatura_id, tipo, base, severidade, montante_cents, dados, achado_id")
      .eq("contrato_id", id)
      .is("substituido_em", null),
    supabase.from("achados_monitor").select("id, fatura_id, texto_cliente, comunicado_em").eq("contrato_id", id).order("comunicado_em", { ascending: false }),
    supabase
      .from("contratos_versoes")
      .select("id, valido_desde, valido_ate, mensalidade_cents, desconto_cents, motivo")
      .eq("contrato_id", id)
      .order("valido_desde", { ascending: false, nullsFirst: false }),
    supabase
      .from("documentos_monitor")
      .select("id, tipo, associacao_estado")
      .eq("utilizador_id", user.id)
      .eq("associacao_sugerida", id)
      .is("contrato_id", null)
      .in("associacao_estado", ["possivel", "conflito"]),
  ]);

  const hoje = hojeLisboa();
  const lista = (campos ?? []) as Campo[];
  const atuais = new Map(lista.filter((c) => c.estado === "atual").map((c) => [c.campo, c]));
  // Condições do contrato: nunca valores lidos de faturas.
  const condicao = (campo: CampoContrato) => {
    const c = atuais.get(campo);
    return c && c.origem !== "fatura" ? c : undefined;
  };
  const docs = documentos ?? [];
  const docsContrato = docs.filter((d) => d.tipo === "contrato");
  const versaoAtual = (versoes ?? []).find((v) => v.valido_ate === null) ?? null;
  const mensalidadeContratada = versaoAtual?.mensalidade_cents ?? null;
  const temContrato = mensalidadeContratada != null || CONDICOES.some((c) => c !== "referencia_contrato" && condicao(c));
  const fornecedor = await apresentarFornecedor(contrato.fornecedor);
  const setor = setorTratarCaso(contrato.setor);
  const hrefCaso = `${urlTratarCaso("/portal/contratos")}${setor ? `&setor=${encodeURIComponent(setor)}` : ""}`;
  const emAnalise = docs.filter((d) => emCurso(d.etapa) || d.etapa === "falhou");

  // ---- Faturas e histórico ----------------------------------------------
  type FaturaLinha = NonNullable<typeof faturas>[number];
  const comparaveis: (FaturaComparavel & { linha: FaturaLinha })[] = (faturas ?? []).map((f) => ({
    id: f.id,
    dataEmissao: f.data_emissao,
    periodoInicio: f.periodo_inicio,
    periodoFim: f.periodo_fim,
    totalCents: f.total_cents,
    mensalidadeLidaCents: f.mensalidade_lida_cents,
    recorrenteCents: f.recorrente_cents,
    linhas: (Array.isArray(f.linhas) ? f.linhas : []) as LinhaFatura[],
    dataFimFidelizacao: f.data_fim_fidelizacao,
    linha: f,
  }));
  const ordenadas = ordenarFaturas(comparaveis);
  const ultima = ordenadas.at(-1) ?? null;
  const padrao = padraoObservado(ordenadas);
  const textoAchado = new Map((achados ?? []).map((a) => [a.id, a.texto_cliente]));
  const eventosPorFatura = new Map<string, Evento[]>();
  for (const e of (eventos ?? []) as Evento[]) {
    if (!e.fatura_id) continue;
    eventosPorFatura.set(e.fatura_id, [...(eventosPorFatura.get(e.fatura_id) ?? []), e]);
  }
  const itensDe = (faturaId: string) =>
    (eventosPorFatura.get(faturaId) ?? [])
      .sort((a, b) => ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade])
      .map((e) => ({
        severidade: e.severidade,
        texto: (e.achado_id && textoAchado.get(e.achado_id)) || fraseEvento({ tipo: e.tipo, base: e.base, montanteCents: e.montante_cents, dados: e.dados }),
      }));

  const periodos: PeriodoHistorico[] = ordenadas
    .map((f, i) => {
      const itens = itensDe(f.id);
      return {
        id: f.id,
        titulo: mesAno(dataReferencia(f)),
        totalCents: f.totalCents,
        itens: itens.length || f.linha.em_verificacao ? itens : [{ severidade: "ok" as const, texto: "Não encontrámos diferenças relevantes neste mês." }],
        explicacao: fraseVariacaoTotal(f, ordenadas[i - 1] ?? null),
        emVerificacao: f.linha.em_verificacao,
        data: dataReferencia(f) ?? "",
      };
    })
    .concat(
      docsContrato.map((d) => ({
        id: d.id,
        titulo: `Contrato adicionado a ${formatarDataPt(d.created_at)}`,
        totalCents: null,
        itens: [],
        explicacao: ordenadas.length ? "As faturas são comparadas com as condições do contrato depois de as confirmar." : null,
        emVerificacao: false,
        nota: true,
        data: d.created_at.slice(0, 10),
      })),
    )
    .sort((a, b) => (a.data < b.data ? 1 : -1));
  const ultimoResultado: { severidade: Severidade; texto: string }[] = ultima
    ? [
        ...(ultima.linha.em_verificacao ? [{ severidade: "info" as const, texto: "Em verificação pela DoLado" }] : []),
        ...itensDe(ultima.id),
      ].slice(0, 2)
    : [];
  const cUltima = ultima ? componentesFatura(ultima) : null;

  // Resumo da última fatura por confirmar (só o essencial).
  const docUltima = ultima ? docs.find((d) => d.id === ultima.linha.documento_id) : undefined;
  const porConfirmarFatura = ultima && !ultima.linha.confirmada_cliente_em && !ultima.linha.valores_contestados_em ? ultima : null;

  // ---- Dados lidos por confirmar (contrato; fidelização lida da fatura) ---
  const porConfirmar = lista.filter((c) => c.estado === "proposto" || c.estado === "em_conflito");
  const grupos = new Map<string, Campo[]>();
  for (const c of porConfirmar) {
    const chave = `${c.campo}:${JSON.stringify(c.valor)}`;
    grupos.set(chave, [...(grupos.get(chave) ?? []), c]);
  }
  const nomeFornecedor = (campo: CampoContrato, valor: unknown) =>
    campo === "fornecedor" && typeof valor === "string" ? valor : formatarValorCampo(campo, valor);
  const camposPorConfirmar: CampoPorConfirmar[] = [...grupos.values()].map((iguais) => {
    const c = iguais[0];
    const tipo = CAMPOS_EDITAVEIS[c.campo] ?? null;
    const atual = iguais.some((x) => x.estado === "em_conflito") ? atuais.get(c.campo) : undefined;
    const origem = [ROTULO_ORIGEM[c.origem] ?? c.origem, c.pagina ? `página ${c.pagina}` : null].filter(Boolean).join(" · ");
    return {
      id: c.id,
      ids: iguais.map((x) => x.id),
      rotulo: ROTULO_CAMPO[c.campo],
      valor: nomeFornecedor(c.campo, c.valor),
      valorAtual: atual ? nomeFornecedor(c.campo, atual.valor) : null,
      origem: iguais.length > 1 ? `${origem} (e mais ${iguais.length - 1} documento${iguais.length > 2 ? "s" : ""})` : origem,
      evidencia: c.evidencia,
      tipoEdicao: tipo,
      valorEdicao: tipo ? valorParaEdicao(tipo, c.valor) : "",
    };
  });
  const camposCondicoes = [...grupos.values()].filter((iguais) => CAMPOS_COMERCIAIS.has(iguais[0].campo)).map((iguais) => iguais[0].id);
  const propostasDoContrato = porConfirmar.some((c) => c.origem === "contrato");

  const fimFidelizacao = atuais.get("data_fim_fidelizacao");
  const vistoEmFaturas = LIDOS_DA_FATURA.map((c) => atuais.get(c)).filter((c): c is Campo => !!c && c.origem === "fatura");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {/* ===== Cabeçalho ===== */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">{fornecedor ?? "Fornecedor por confirmar"}</h1>
          <p className="text-sm text-[var(--color-ink-faint)]">{ROTULO_SETOR[contrato.setor as SetorContratoMonitor] ?? contrato.setor}</p>
        </div>
        <Link href="/portal/contratos" className="inline-flex min-h-11 items-center text-sm text-[var(--color-ink-muted)] underline sm:min-h-0">
          Voltar aos serviços
        </Link>
      </div>

      {query.documento && MENSAGEM[query.documento] && <p className="text-sm text-[var(--color-ink-muted)]">{MENSAGEM[query.documento]}</p>}
      {query.aviso === "repetido" && <p className="text-sm text-[var(--color-ink-muted)]">Esta fatura já estava registada neste serviço: não criámos outro mês.</p>}
      {query.associado && (
        <p className="text-sm text-[var(--color-status-success)]">
          {query.associado === "novo_servico" ? "✓ Criámos um serviço novo para este documento." : "✓ Documento associado a este serviço."}
        </p>
      )}
      {query.fatura === "confirmada" && <p className="text-sm text-[var(--color-status-success)]">✓ Fatura confirmada.</p>}
      {query.fatura === "contestada" && (
        <p className="text-sm text-[var(--color-ink-muted)]">Obrigado. A DoLado vai verificar os valores desta fatura.</p>
      )}
      {query.guardado && <p className="text-sm text-[var(--color-status-success)]">✓ Dados guardados.</p>}
      {query.erro && <p className="text-sm text-[var(--color-status-danger)]">{query.erro}</p>}

      {/* ===== Identidade por resolver (primeiro, antes de tudo o resto) ===== */}
      {(porAssociar ?? []).map((d) => (
        <div key={d.id} role="alert" className={`${CARTAO} flex flex-col gap-2 border-[var(--color-status-urgent)]`}>
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {d.associacao_estado === "conflito"
              ? `${d.tipo === "contrato" ? "Um contrato" : "Uma fatura"} que carregou parece pertencer a outro serviço ou cliente.`
              : `Não conseguimos confirmar que ${d.tipo === "contrato" ? "o contrato" : "a fatura"} que carregou pertence a este serviço.`}
          </p>
          <p className="text-sm text-[var(--color-ink-muted)]">Não alterámos o acompanhamento deste serviço.</p>
          <Link href={`/portal/contratos/documentos/${d.id}`} className={`${BOTAO_PRIMARIO} self-start`}>
            Rever dados
          </Link>
        </div>
      ))}

      {emAnalise.map((d) => (
        <ProgressoDocumento key={d.id} documentoId={d.id} contratoAtual={contrato.id} inicial={d} />
      ))}

      {/* ===== 1. Resumo ===== */}
      <section className={`${CARTAO} flex flex-col gap-3`}>
        <h2 className={TITULO_SECCAO}>Resumo</h2>
        <dl className="flex flex-col">
          {temContrato ? (
            <>
              <Linha rotulo="Estado">{contrato.estado === "terminado" ? "Terminado" : "Ativo"}</Linha>
              {mensalidadeContratada != null && <Linha rotulo="Mensalidade contratada">{formatarEurosCents(mensalidadeContratada)}</Linha>}
            </>
          ) : (
            <>
              <Linha rotulo="Acompanhamento iniciado">{mesAno(padrao.inicio ?? contrato.created_at)}</Linha>
              {padrao.mensalidadeHabitualCents != null && (
                <Linha rotulo="Mensalidade habitual observada">{formatarEurosCents(padrao.mensalidadeHabitualCents)}</Linha>
              )}
            </>
          )}
          {ultima && (
            <Linha rotulo="Última fatura">
              {formatarEurosCents(ultima.totalCents)}
              <span className="text-[12.5px] text-[var(--color-ink-faint)]">{mesAno(dataReferencia(ultima))}</span>
            </Linha>
          )}
          <Linha rotulo="Fidelização">
            {fimFidelizacao ? (
              <>
                até {formatarDataPt(String(fimFidelizacao.valor))}
                <Origem c={fimFidelizacao} />
              </>
            ) : (
              <span className="text-sm text-[var(--color-ink-muted)]">
                {ordenadas.length ? "Não conseguimos determinar através das faturas disponíveis." : "Por indicar"}
              </span>
            )}
          </Linha>
          {ultimoResultado.length > 0 && (
            <Linha rotulo="Último resultado">
              {ultimoResultado.map((r, n) => (
                <span key={n} className="text-sm">
                  {r.severidade === "ok" ? "✓" : r.severidade === "info" ? "ℹ" : "⚠"} {r.texto}
                </span>
              ))}
            </Linha>
          )}
          {!temContrato && (
            <Linha rotulo="Contrato">
              <span className="text-sm text-[var(--color-ink-muted)]">Não adicionado</span>
              <a href="#adicionar-contrato" className="text-sm font-medium text-[var(--color-brand)] underline">
                Adicionar contrato
              </a>
            </Linha>
          )}
        </dl>
        <p className="text-sm text-[var(--color-ink-muted)]">{textoProximaData(proximaData(contrato, hoje))}</p>
      </section>

      {/* ===== Fatura nova: resumo para confirmar (sem campo a campo) ===== */}
      {porConfirmarFatura && cUltima && (
        <section className={`${CARTAO} flex flex-col gap-3 border-[var(--color-brand)]`}>
          {docUltima?.estado === "a_rever" ? (
            <p className="text-sm text-[var(--color-ink-muted)]">
              Lemos a fatura de {mesAnoTexto(dataReferencia(porConfirmarFatura))}. Alguns valores vão ser verificados pela DoLado antes de os usarmos.
            </p>
          ) : (
            <>
              <h2 className={TITULO_SECCAO}>Encontrámos estes dados na fatura de {mesAnoTexto(dataReferencia(porConfirmarFatura))}</h2>
              <dl className="flex flex-col">
                {cUltima.mensalidadeCents != null && <Linha rotulo="Mensalidade">{formatarEurosCents(cUltima.mensalidadeCents)}</Linha>}
                {cUltima.descontoCents > 0 && <Linha rotulo="Desconto">−{formatarEurosCents(cUltima.descontoCents)}</Linha>}
                {cUltima.consumosCents > 0 && <Linha rotulo="Consumo adicional">{formatarEurosCents(cUltima.consumosCents)}</Linha>}
                {cUltima.pontuaisCents > 0 && <Linha rotulo="Cobranças pontuais">{formatarEurosCents(cUltima.pontuaisCents)}</Linha>}
                <Linha rotulo="Total">{formatarEurosCents(porConfirmarFatura.totalCents)}</Linha>
              </dl>
              <form action={responderFatura} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <input type="hidden" name="fatura_id" value={porConfirmarFatura.id} />
                <input type="hidden" name="contrato_id" value={contrato.id} />
                <BotaoSubmeter name="acao" value="confirmar" className={BOTAO_PRIMARIO}>
                  Confirmar fatura
                </BotaoSubmeter>
                <BotaoSubmeter name="acao" value="contestar" aDecorrer="A enviar…" className="text-sm text-[var(--color-ink-muted)] underline">
                  Os valores não estão corretos
                </BotaoSubmeter>
              </form>
            </>
          )}
        </section>
      )}

      {/* ===== Dados lidos por confirmar ===== */}
      {camposPorConfirmar.length > 0 && (
        <section className={`${CARTAO} flex flex-col gap-4 border-[var(--color-brand)]`}>
          <div>
            <h2 className={TITULO_SECCAO}>{propostasDoContrato ? "Encontrámos estes dados no contrato" : "Encontrámos estes dados no documento"}</h2>
            <p className="text-sm text-[var(--color-ink-muted)]">Reveja cada valor e confirme no fim. Só começamos a usá-los depois de confirmar.</p>
            {propostasDoContrato && ordenadas.length > 0 && (
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                Encontrámos {ordenadas.length === 1 ? "1 fatura anterior" : `${ordenadas.length} faturas anteriores`}. Depois de confirmar, vamos
                compará-{ordenadas.length === 1 ? "la" : "las"} com as condições do contrato.
              </p>
            )}
          </div>
          <ConfirmarDados contratoId={contrato.id} campos={camposPorConfirmar} camposCondicoes={camposCondicoes} />
        </section>
      )}

      {/* ===== 2. Acompanhamento mês a mês ===== */}
      <section className={`${CARTAO} flex flex-col gap-3`}>
        <div>
          <h2 className={TITULO_SECCAO}>Acompanhamento mês a mês</h2>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {temContrato
              ? "Comparamos cada fatura com as condições do contrato e com as faturas anteriores."
              : "Estamos a acompanhar as suas faturas e a comparar cada mês com os anteriores."}
          </p>
        </div>
        <HistoricoServico
          periodos={periodos}
          vazio={<p className="text-sm text-[var(--color-ink-muted)]">Adicione uma fatura: começamos a acompanhar a evolução deste serviço.</p>}
        />
      </section>

      {/* ===== 3. Situações comunicadas pela DoLado ===== */}
      {(achados ?? []).length > 0 && (
        <section className={`${CARTAO} flex flex-col gap-3`}>
          <h2 className={TITULO_SECCAO}>Situações que merecem ser verificadas</h2>
          {achados!.map((a) => (
            <div key={a.id} className="flex flex-col gap-1">
              <p className="text-sm text-[var(--color-ink)]">{a.texto_cliente}</p>
              <span className="text-[12.5px] text-[var(--color-ink-faint)]">{formatarDataPt(a.comunicado_em)}</span>
            </div>
          ))}
          <a href={hrefCaso} className={`${BOTAO_PRIMARIO} self-start`}>
            Tratar o meu caso
          </a>
        </section>
      )}

      {/* ===== 4. Condições do contrato ===== */}
      {temContrato ? (
        <section className={`${CARTAO} flex flex-col gap-3`}>
          <h2 className={TITULO_SECCAO}>Condições do contrato</h2>
          <dl className="flex flex-col">
            {CONDICOES.filter((campo) => condicao(campo)).map((campo) => {
              const c = condicao(campo)!;
              return (
                <Linha key={campo} rotulo={ROTULO_CAMPO[campo]}>
                  <span>{formatarValorCampo(campo, c.valor)}</span>
                  <Origem c={c} />
                </Linha>
              );
            })}
          </dl>
          {(versoes ?? []).length > 1 && (
            <div className="flex flex-col gap-1 pt-1">
              <p className="text-sm font-medium text-[var(--color-ink)]">Alterações do contrato</p>
              {versoes!.map((v) => (
                <p key={v.id} className="text-[13px] text-[var(--color-ink-muted)]">
                  {v.valido_desde ? `Desde ${formatarDataPt(v.valido_desde)}` : "Condições iniciais"}
                  {v.valido_ate ? ` até ${formatarDataPt(v.valido_ate)}` : " (em vigor)"}
                  {v.mensalidade_cents != null ? ` · ${formatarEurosCents(v.mensalidade_cents)}` : ""}
                  {v.desconto_cents ? ` · desconto de ${formatarEurosCents(v.desconto_cents)}` : ""}
                </p>
              ))}
            </div>
          )}
          <details open={Boolean(query.editar)} className="pt-1">
            <summary className="cursor-pointer text-sm font-medium text-[var(--color-brand)]">Corrigir ou acrescentar condições</summary>
            <form action={corrigirContrato} className="mt-4 flex flex-col gap-4">
              <input type="hidden" name="contrato_id" value={contrato.id} />
              <CamposContrato valores={{ ...contrato, mensalidade_cents: condicao("mensalidade_cents") ? contrato.mensalidade_cents : null }} />
              <p className="text-[12.5px] text-[var(--color-ink-faint)]">
                Os valores que corrigir passam a ser os registados; os anteriores ficam guardados no histórico.
              </p>
              <button type="submit" className={`${BOTAO_PRIMARIO} self-start`}>
                Guardar
              </button>
            </form>
          </details>
        </section>
      ) : (
        <section id="adicionar-contrato" className={`${CARTAO} flex scroll-mt-24 flex-col gap-3`}>
          <h2 className={TITULO_SECCAO}>Tem o contrato?</h2>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Adicione-o para desbloquear as comparações com as condições contratadas: preço, promoções, serviços e fidelização.
          </p>
          <UploadDocumento contratoId={contrato.id} tipoInicial="contrato" />
          <details className="pt-1">
            <summary className="cursor-pointer text-sm font-medium text-[var(--color-brand)]">Prefere indicar as condições à mão?</summary>
            <form action={corrigirContrato} className="mt-4 flex flex-col gap-4">
              <input type="hidden" name="contrato_id" value={contrato.id} />
              <CamposContrato valores={{ ...contrato, mensalidade_cents: null }} />
              <button type="submit" className={`${BOTAO_PRIMARIO} self-start`}>
                Guardar
              </button>
            </form>
          </details>
        </section>
      )}

      {temContrato && <CustoSaida contrato={contrato} origens={Object.fromEntries([...atuais].map(([campo, c]) => [campo, c.origem]))} hoje={hoje} />}

      {/* ===== 5. Padrões observados nas faturas ===== */}
      {ordenadas.length >= 2 && (
        <section className={`${CARTAO} flex flex-col gap-2`}>
          <h2 className={TITULO_SECCAO}>Padrões observados nas faturas</h2>
          {padrao.trechos.map((t, i) => (
            <p key={i} className="text-sm text-[var(--color-ink)]">
              {padrao.trechos.length === 1
                ? `Mensalidade de ${formatarEurosCents(t.valorCents)} em ${t.faturas === 1 ? "1 fatura" : `${t.faturas} faturas seguidas`}.`
                : i === padrao.trechos.length - 1
                  ? `Desde ${mesAnoTexto(t.desde)}: ${formatarEurosCents(t.valorCents)}.`
                  : `${t.ate !== t.desde ? `De ${mesAnoTexto(t.desde)} a ${mesAnoTexto(t.ate)}` : `Em ${mesAnoTexto(t.desde)}`}: ${formatarEurosCents(t.valorCents)}.`}
            </p>
          ))}
          {padrao.descontoAtualCents > 0 && (
            <p className="text-sm text-[var(--color-ink)]">Desconto identificado nas faturas: {formatarEurosCents(padrao.descontoAtualCents)}/mês.</p>
          )}
          {vistoEmFaturas.map((c) => (
            <p key={c.id} className="text-sm text-[var(--color-ink)]">
              {ROTULO_CAMPO[c.campo]}: {formatarValorCampo(c.campo, c.valor)} <span className="text-[12.5px] text-[var(--color-ink-faint)]">· Lido da fatura</span>
            </p>
          ))}
          {!temContrato && (
            <p className="text-[12.5px] text-[var(--color-ink-faint)]">
              Valores observados nas faturas. Para os comparar com o que foi contratado, adicione o contrato.
            </p>
          )}
        </section>
      )}

      {/* ===== 6. Documentos ===== */}
      <section className={`${CARTAO} flex flex-col gap-4`}>
        <h2 className={TITULO_SECCAO}>Documentos</h2>
        {docs.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <a
                  href={`/api/monitor/documentos/${d.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-ink)] underline decoration-[var(--color-hairline-strong)] underline-offset-2 hover:text-[var(--color-brand)]"
                >
                  {d.tipo === "contrato" ? "Contrato" : "Fatura"} · {formatarDataPt(d.created_at)}
                  {d.nome_ficheiro && <span className="text-[var(--color-ink-faint)]"> · {d.nome_ficheiro}</span>}
                </a>
                <span className="text-[12.5px] text-[var(--color-ink-faint)]">
                  {emCurso(d.etapa)
                    ? "Em análise"
                    : d.estado === "processado"
                      ? d.associacao_estado === "manual"
                        ? "Lido · associado por si"
                        : "Lido"
                      : d.estado === "ilegivel"
                        ? "Não foi possível ler — carregue outra versão"
                        : "A ser verificado pela DoLado"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-ink-muted)]">Ainda não carregou documentos deste serviço.</p>
        )}
        <details>
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-brand)]">Adicionar fatura ou contrato</summary>
          <div className="mt-4">
            <UploadDocumento contratoId={contrato.id} />
          </div>
        </details>
      </section>

      {/* ===== Ações ===== */}
      <section className="flex flex-col gap-3">
        <p className="text-sm text-[var(--color-ink-muted)]">Está a ter um problema com este serviço?</p>
        <a href={hrefCaso} className={`${BOTAO_SECUNDARIO} self-start`}>
          Tratar o meu caso
        </a>
      </section>

      <details className="text-sm">
        <summary className="cursor-pointer text-[var(--color-status-danger)]">Deixar de acompanhar este serviço</summary>
        <form action={deixarDeAcompanhar} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="contrato_id" value={contrato.id} />
          <p className="text-[var(--color-ink-muted)]">
            Deixamos de enviar avisos e apagamos os documentos e os dados deste serviço. Esta ação não pode ser desfeita.
          </p>
          <label className="flex items-center gap-2 text-[var(--color-ink)]">
            <input type="checkbox" name="confirmar" value="sim" required /> Quero deixar de acompanhar e apagar os dados
          </label>
          <button type="submit" className="self-start text-[var(--color-status-danger)] underline">
            Deixar de acompanhar
          </button>
        </form>
      </details>
    </div>
  );
}
