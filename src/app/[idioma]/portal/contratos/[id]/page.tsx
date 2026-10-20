import Link from "@/i18n/Link";
import { idiomaDaPagina } from "@/i18n/servidor";
import { localizarHref, type Idioma } from "@/i18n/config";
import { tProtecao, traduzirMensagemProtecao } from "@/i18n/mensagens/protecao";
import { notFound } from "next/navigation";
import { requireProtecao } from "@/lib/auth";
import { urlTratarCaso } from "@/lib/site";
import {
  CAMPOS_EDITAVEIS,
  formatarDataPt,
  formatarEurosCents as formatarEuros,
  formatarValorCampo,
  rotuloCampo,
  rotuloOrigem,
  rotuloSetorMonitor,
  setorTratarCaso,
  textoProximaData,
  valorParaEdicao,
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
import { carregarProtecao } from "@/lib/monitor/protecaoCliente";
import { dataExtenso } from "@/lib/monitor/resultadoProtecao";
import { corrigirContrato, deixarDeAcompanhar, responderFatura } from "../actions";
import { CamposContrato } from "../_components/CamposContrato";
import { ConfirmarDados, type CampoPorConfirmar } from "../_components/ConfirmarDados";
import { ProgressoDocumento } from "../_components/ProgressoDocumento";
import { CustoSaida } from "../_components/CustoSaida";
import { UploadDocumento } from "../_components/UploadDocumento";
import { HistoricoServico, type PeriodoHistorico } from "../_components/HistoricoServico";
import { ListaAtentos, ListaVerificacoes, ResultadoAtual, SituacaoEncontrada, TituloBloco } from "../_components/ResultadoProtecao";
import { BotaoSubmeter } from "../_components/BotaoSubmeter";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CARTAO, TITULO_SECCAO } from "../_components/estilos";
import { Aviso } from "@/components/portal/Aviso";
import { CabecalhoPagina } from "@/components/portal/Cabecalho";
import { IconeCalendario, IconeInfo } from "@/components/portal/Icones";
import { BOTAO_DESTRUTIVO, CAIXA_SELECAO, CARTAO_ACAO, CARTAO_DESTAQUE, LIGACAO, LIGACAO_DISCRETA, TEXTO_SECUNDARIO } from "@/components/portal/ui";

// Serviço acompanhado. Funciona só com faturas (histórico e padrão
// observado) e fica mais completo com o contrato (contratado × faturado,
// promoções, fidelização, custo de saída). Ordem: resultado (o que a DoLado
// verificou e encontrou) → situações → confirmações → o que verificámos →
// o que estamos a acompanhar → mês a mês → condições do contrato → custo de
// saída → padrões observados → documentos. Regras do resultado em
// src/lib/monitor/resultadoProtecao.ts.
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

// "processado" não precisa de mensagem: o resultado da verificação é o
// próprio topo da página.
const MENSAGEM = ["pendente", "a_rever"] as const;

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

function Origem({ c, idioma }: { c: Campo; idioma: Idioma }) {
  const t = tProtecao[idioma].servico;
  const partes = [rotuloOrigem(c.origem, idioma)];
  if (c.pagina) partes.push(t.pagina(c.pagina));
  if (c.origem !== "cliente" && c.confirmado_cliente_em) partes.push(t.confirmadoPorSi(formatarDataPt(c.confirmado_cliente_em)));
  return <span className="text-[13px] text-[var(--v2-muted)]">{partes.join(" · ")}</span>;
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[var(--v2-line)] py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-[14px] text-[var(--v2-muted)]">{rotulo}</dt>
      <dd className="flex min-w-0 flex-col break-words text-[15px] text-[var(--v2-navy)] sm:items-end sm:text-right">{children}</dd>
    </div>
  );
}

export default async function ServicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; idioma: string }>;
  searchParams: Promise<{ erro?: string; guardado?: string; documento?: string; aviso?: string; editar?: string; associado?: string; fatura?: string }>;
}) {
  const { id } = await params;
  const idioma = await idiomaDaPagina(params);
  const t = tProtecao[idioma].servico;
  const formatarEurosCents = (c: number | null | undefined) => formatarEuros(c, idioma);
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
    { servicos: resultados },
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
    carregarProtecao(supabase, user.id, id, idioma),
  ]);
  const resultado = resultados[0];
  if (!resultado) notFound();

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
  const hrefCaso = localizarHref(idioma, `${urlTratarCaso("/portal/contratos")}${setor ? `&setor=${encodeURIComponent(setor)}` : ""}`);
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
        texto: (e.achado_id && textoAchado.get(e.achado_id)) || fraseEvento({ tipo: e.tipo, base: e.base, montanteCents: e.montante_cents, dados: e.dados }, idioma),
      }));

  const periodos: PeriodoHistorico[] = ordenadas
    .map((f, i) => {
      const itens = itensDe(f.id);
      return {
        id: f.id,
        titulo: mesAno(dataReferencia(f), idioma),
        totalCents: f.totalCents,
        itens: itens.length || f.linha.em_verificacao ? itens : [{ severidade: "ok" as const, texto: t.semDiferencas }],
        explicacao: fraseVariacaoTotal(f, ordenadas[i - 1] ?? null, idioma),
        emVerificacao: f.linha.em_verificacao,
        data: dataReferencia(f) ?? "",
      };
    })
    .concat(
      resultado.historico
        .filter((h) => h.tipo === "aviso")
        .map((h, i) => ({
          id: `aviso-${i}`,
          titulo: t.avisoEmail(formatarDataPt(h.data.slice(0, 10))),
          totalCents: null,
          itens: [{ severidade: "info" as const, texto: h.texto }],
          explicacao: null,
          emVerificacao: false,
          nota: true,
          data: h.data.slice(0, 10),
        })),
    )
    .concat(
      docsContrato.map((d) => ({
        id: d.id,
        titulo: t.contratoAdicionadoA(formatarDataPt(d.created_at)),
        totalCents: null,
        itens: [],
        explicacao: ordenadas.length ? t.comparadasDepois : null,
        emVerificacao: false,
        nota: true,
        data: d.created_at.slice(0, 10),
      })),
    )
    .sort((a, b) => (a.data < b.data ? 1 : -1));
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
    campo === "fornecedor" && typeof valor === "string" ? valor : formatarValorCampo(campo, valor, idioma);
  const camposPorConfirmar: CampoPorConfirmar[] = [...grupos.values()].map((iguais) => {
    const c = iguais[0];
    const tipo = CAMPOS_EDITAVEIS[c.campo] ?? null;
    const atual = iguais.some((x) => x.estado === "em_conflito") ? atuais.get(c.campo) : undefined;
    const origem = [rotuloOrigem(c.origem, idioma), c.pagina ? t.pagina(c.pagina) : null].filter(Boolean).join(" · ");
    return {
      id: c.id,
      ids: iguais.map((x) => x.id),
      rotulo: rotuloCampo(c.campo, idioma),
      valor: nomeFornecedor(c.campo, c.valor),
      valorAtual: atual ? nomeFornecedor(c.campo, atual.valor) : null,
      origem: iguais.length > 1 ? `${origem}${t.eMais(iguais.length - 1)}` : origem,
      evidencia: c.evidencia,
      tipoEdicao: tipo,
      valorEdicao: tipo ? valorParaEdicao(tipo, c.valor) : "",
    };
  });
  const camposCondicoes = [...grupos.values()].filter((iguais) => CAMPOS_COMERCIAIS.has(iguais[0].campo)).map((iguais) => iguais[0].id);
  const propostasDoContrato = porConfirmar.some((c) => c.origem === "contrato");

  const vistoEmFaturas = LIDOS_DA_FATURA.map((c) => atuais.get(c)).filter((c): c is Campo => !!c && c.origem === "fatura");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {/* ===== Cabeçalho ===== */}
      <CabecalhoPagina
        voltar={{ href: "/portal/contratos", texto: tProtecao[idioma].lista.titulo }}
        contexto={rotuloSetorMonitor(contrato.setor, idioma)}
        titulo={fornecedor ?? t.fornecedorPorConfirmar}
      />

      {(MENSAGEM as readonly string[]).includes(query.documento ?? "") && (
        <Aviso tom="info">{t.mensagem[query.documento as (typeof MENSAGEM)[number]]}</Aviso>
      )}
      {query.aviso === "repetido" && <Aviso tom="info">{t.repetido}</Aviso>}
      {query.associado && (
        <Aviso tom="sucesso">
          {query.associado === "novo_servico" ? t.novoServico : t.associado}
        </Aviso>
      )}
      {query.fatura === "confirmada" && <Aviso tom="sucesso">{t.faturaConfirmada}</Aviso>}
      {query.fatura === "contestada" && <Aviso tom="info">{t.faturaContestada}</Aviso>}
      {query.guardado && <Aviso tom="sucesso">{t.guardado}</Aviso>}
      {query.erro && <Aviso tom="erro">{traduzirMensagemProtecao(idioma, query.erro)}</Aviso>}

      {/* ===== Identidade por resolver (primeiro, antes de tudo o resto) ===== */}
      {(porAssociar ?? []).map((d) => (
        <div key={d.id} role="alert" className={`${CARTAO_ACAO} flex flex-col gap-2`}>
          <p className="text-[16px] font-bold text-[var(--v2-navy)]">
            {d.associacao_estado === "conflito"
              ? tProtecao[idioma].lista.conflito(d.tipo === "contrato")
              : t.possivel(d.tipo === "contrato")}
          </p>
          <p className={TEXTO_SECUNDARIO}>{t.naoAlteramos}</p>
          <Link href={`/portal/contratos/documentos/${d.id}`} className={`${BOTAO_PRIMARIO} self-start`}>
            {tProtecao[idioma].lista.reverDados}
          </Link>
        </div>
      ))}

      {emAnalise.map((d) => (
        <ProgressoDocumento key={d.id} documentoId={d.id} contratoAtual={contrato.id} inicial={d} />
      ))}

      {/* ===== 1. Resultado: o que a DoLado verificou e encontrou ===== */}
      <ResultadoAtual
        id="resultado"
        estado={resultado.estado}
        eyebrow={query.documento === "processado" ? t.concluida : undefined}
        idioma={idioma}
        titulo={resultado.titulo}
        conclusao={resultado.conclusao}
        texto={resultado.texto}
        ultimaVerificacao={resultado.ultimaVerificacao}
        documentoVerificado={resultado.documentoVerificado}
        hoje={hoje}
        trabalho={{
          verificamos: resultado.verificacoes.length ? tProtecao[idioma].lista.pontos(resultado.verificacoes.length) : null,
          encontramos: resultado.encontramos,
          atentos: resultado.atentos.length ? tProtecao[idioma].lista.situacoes(resultado.atentos.length) : null,
        }}
      />

      {/* ===== 2. Situações encontradas (revistas pela DoLado) ===== */}
      {resultado.situacoes.map((s) => (
        <SituacaoEncontrada key={s.id} s={s} setor={contrato.setor} hoje={hoje} idioma={idioma} />
      ))}

      {/* ===== Dados lidos por confirmar ===== */}
      {camposPorConfirmar.length > 0 && (
        <section id="confirmar" className={`${CARTAO_ACAO} flex scroll-mt-24 flex-col gap-4`}>
          <div>
            <h2 className={TITULO_SECCAO}>{propostasDoContrato ? t.dadosContrato : t.dadosDocumento}</h2>
            <p className={TEXTO_SECUNDARIO}>{t.revejaCada}</p>
            {propostasDoContrato && ordenadas.length > 0 && (
              <p className={`${TEXTO_SECUNDARIO} mt-1`}>
                {t.faturasAnteriores(ordenadas.length)}
              </p>
            )}
          </div>
          <ConfirmarDados contratoId={contrato.id} campos={camposPorConfirmar} camposCondicoes={camposCondicoes} />
        </section>
      )}

      {/* ===== 3. O que verificámos ===== */}
      {resultado.verificacoes.length > 0 && (
        <section aria-labelledby="verificamos" className={`${CARTAO} flex flex-col gap-4`}>
          <TituloBloco
            id="verificamos"
            descricao={resultado.documentoVerificado ? t.ultimaVerificacaoDoc(resultado.documentoVerificado) : undefined}
          >
            {tProtecao[idioma].lista.oQueVerificamos}
          </TituloBloco>
          <ListaVerificacoes verificacoes={resultado.verificacoes} />
          {resultado.lacunas.length > 0 && (
            <ul className="flex flex-col gap-1.5 border-t border-[var(--v2-line)] pt-4">
              {resultado.lacunas.map((l) => (
                <li key={l} className="flex items-start gap-2 text-[14.5px] leading-relaxed text-[var(--v2-muted)]">
                  <IconeInfo tamanho={17} className="mt-0.5 shrink-0 text-[var(--v2-blue)]" />
                  <span>
                    {l}
                    {!temContrato && tProtecao[idioma].lista.contratoAjuda}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {/* Fatura nova: confirmar os valores lidos (opcional, sem campo a campo). */}
          {porConfirmarFatura && cUltima && (
            <div className="border-t border-[var(--v2-line)] pt-4">
              {docUltima?.estado === "a_rever" ? (
                <p className={TEXTO_SECUNDARIO}>
                  {t.faturaARever(mesAnoTexto(dataReferencia(porConfirmarFatura), idioma))}
                </p>
              ) : (
                <form action={responderFatura} className="flex flex-col gap-3">
                  <input type="hidden" name="fatura_id" value={porConfirmarFatura.id} />
                  <input type="hidden" name="contrato_id" value={contrato.id} />
                  <p className="text-[14.5px] text-[var(--v2-navy)]">
                    {t.faturaCorreta(
                      mesAnoTexto(dataReferencia(porConfirmarFatura), idioma),
                      porConfirmarFatura.totalCents != null ? formatarEurosCents(porConfirmarFatura.totalCents) : null,
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <BotaoSubmeter name="acao" value="confirmar" className={BOTAO_SECUNDARIO}>
                      {t.simCorretos}
                    </BotaoSubmeter>
                    <BotaoSubmeter name="acao" value="contestar" aDecorrer={t.aEnviar} className={`${LIGACAO_DISCRETA} min-h-11 text-[14px]`}>
                      {t.naoCorretos}
                    </BotaoSubmeter>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      )}

      {/* ===== 4. Estamos atentos a ===== */}
      {(resultado.atentos.length > 0 || resultado.seguinte) && (
        <section aria-labelledby="atentos" className={`${CARTAO} flex flex-col gap-4`}>
          <TituloBloco id="atentos">{tProtecao[idioma].lista.atentosA}</TituloBloco>
          {resultado.atentos.length > 0 && <ListaAtentos atentos={resultado.atentos} />}
          {resultado.proxima && (
            <p className="flex items-start gap-2 text-[14.5px] font-semibold text-[var(--v2-navy)]">
              <IconeCalendario tamanho={18} className="mt-0.5 shrink-0 text-[var(--v2-muted)]" />
              <span>
                {t.proximaData(textoProximaData(resultado.proxima, idioma), dataExtenso(resultado.proxima.data, hoje, idioma))}
              </span>
            </p>
          )}
          {resultado.seguinte && (
            <p className={`${TEXTO_SECUNDARIO} border-t border-[var(--v2-line)] pt-4`}>
              {resultado.seguinte}
              {!temContrato && (
                <>
                  {" "}
                  <a href="#adicionar-contrato" className={LIGACAO}>
                    {t.adicionarContrato}
                  </a>
                </>
              )}
            </p>
          )}
        </section>
      )}

      {/* ===== 5. Mês a mês ===== */}
      <section className={`${CARTAO} flex flex-col gap-3`}>
        <div>
          <h2 className={TITULO_SECCAO}>{t.mesAMes}</h2>
          <p className={TEXTO_SECUNDARIO}>
            {temContrato
              ? t.mesAMesContrato
              : t.mesAMesHistorico}
          </p>
        </div>
        <HistoricoServico
          periodos={periodos}
          idioma={idioma}
          vazio={<p className={TEXTO_SECUNDARIO}>{t.semFaturas}</p>}
        />
      </section>

      {/* ===== 6. Condições do contrato ===== */}
      {temContrato ? (
        <section className={`${CARTAO} flex flex-col gap-3`}>
          <h2 className={TITULO_SECCAO}>{t.condicoes}</h2>
          <dl className="flex flex-col">
            {CONDICOES.filter((campo) => condicao(campo)).map((campo) => {
              const c = condicao(campo)!;
              return (
                <Linha key={campo} rotulo={rotuloCampo(campo, idioma)}>
                  <span>{formatarValorCampo(campo, c.valor, idioma)}</span>
                  <Origem c={c} idioma={idioma} />
                </Linha>
              );
            })}
          </dl>
          {(versoes ?? []).length > 1 && (
            <div className="flex flex-col gap-1 pt-1">
              <p className="text-[14.5px] font-semibold text-[var(--v2-navy)]">{t.alteracoes}</p>
              {versoes!.map((v) => (
                <p key={v.id} className="text-[13px] text-[var(--color-ink-muted)]">
                  {v.valido_desde ? t.desde(formatarDataPt(v.valido_desde)) : t.iniciais}
                  {v.valido_ate ? t.ate(formatarDataPt(v.valido_ate)) : t.emVigor}
                  {v.mensalidade_cents != null ? ` · ${formatarEurosCents(v.mensalidade_cents)}` : ""}
                  {v.desconto_cents ? t.descontoDe(formatarEurosCents(v.desconto_cents)) : ""}
                </p>
              ))}
            </div>
          )}
          <details open={Boolean(query.editar)} className="pt-1">
            <summary className={`${LIGACAO} min-h-11 cursor-pointer text-[14.5px]`}>{t.corrigirCondicoes}</summary>
            <form action={corrigirContrato} className="mt-4 flex flex-col gap-4">
              <input type="hidden" name="contrato_id" value={contrato.id} />
              <CamposContrato idioma={idioma} valores={{ ...contrato, mensalidade_cents: condicao("mensalidade_cents") ? contrato.mensalidade_cents : null }} />
              <p className="text-[12.5px] text-[var(--color-ink-faint)]">
                {t.corrigirNota}
              </p>
              <button type="submit" className={`${BOTAO_PRIMARIO} self-start`}>
                {t.guardar}
              </button>
            </form>
          </details>
        </section>
      ) : (
        <section id="adicionar-contrato" className={`${CARTAO} flex scroll-mt-24 flex-col gap-3`}>
          <h2 className={TITULO_SECCAO}>{t.temContrato}</h2>
          <p className={TEXTO_SECUNDARIO}>
            {t.temContratoTexto}
          </p>
          <UploadDocumento contratoId={contrato.id} tipoInicial="contrato" />
          <details className="pt-1">
            <summary className={`${LIGACAO} min-h-11 cursor-pointer text-[14.5px]`}>{t.aMao}</summary>
            <form action={corrigirContrato} className="mt-4 flex flex-col gap-4">
              <input type="hidden" name="contrato_id" value={contrato.id} />
              <CamposContrato idioma={idioma} valores={{ ...contrato, mensalidade_cents: null }} />
              <button type="submit" className={`${BOTAO_PRIMARIO} self-start`}>
                {t.guardar}
              </button>
            </form>
          </details>
        </section>
      )}

      {temContrato && <CustoSaida contrato={contrato} origens={Object.fromEntries([...atuais].map(([campo, c]) => [campo, c.origem]))} hoje={hoje} idioma={idioma} />}

      {/* ===== 7. Padrões observados nas faturas ===== */}
      {ordenadas.length >= 2 && (
        <section className={`${CARTAO} flex flex-col gap-2`}>
          <h2 className={TITULO_SECCAO}>{t.padroes}</h2>
          {padrao.trechos.map((tr, i) => (
            <p key={i} className="text-sm text-[var(--color-ink)]">
              {padrao.trechos.length === 1
                ? t.mensalidadeEm(formatarEurosCents(tr.valorCents), tr.faturas)
                : i === padrao.trechos.length - 1
                  ? t.desdeValor(mesAnoTexto(tr.desde, idioma), formatarEurosCents(tr.valorCents))
                  : `${tr.ate !== tr.desde ? t.deA(mesAnoTexto(tr.desde, idioma), mesAnoTexto(tr.ate, idioma)) : t.em(mesAnoTexto(tr.desde, idioma))}: ${formatarEurosCents(tr.valorCents)}.`}
            </p>
          ))}
          {padrao.descontoAtualCents > 0 && (
            <p className="text-sm text-[var(--color-ink)]">{t.descontoFaturas(formatarEurosCents(padrao.descontoAtualCents))}</p>
          )}
          {vistoEmFaturas.map((c) => (
            <p key={c.id} className="text-sm text-[var(--color-ink)]">
              {rotuloCampo(c.campo, idioma)}: {formatarValorCampo(c.campo, c.valor, idioma)}{" "}
              <span className="text-[12.5px] text-[var(--color-ink-faint)]">{t.lidoFatura}</span>
            </p>
          ))}
          {!temContrato && (
            <p className="text-[12.5px] text-[var(--color-ink-faint)]">
              {t.observados}
            </p>
          )}
        </section>
      )}

      {/* ===== 8. Documentos ===== */}
      <section className={`${CARTAO} flex flex-col gap-4`}>
        <h2 className={TITULO_SECCAO}>{t.documentos}</h2>
        {docs.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <a
                  href={`/api/monitor/documentos/${d.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--v2-navy)] underline decoration-[var(--v2-line-strong)] underline-offset-4 hover:text-[var(--v2-green)]"
                >
                  {d.tipo === "contrato" ? t.contrato : t.fatura} · {formatarDataPt(d.created_at)}
                  {d.nome_ficheiro && <span className="text-[var(--color-ink-faint)]"> · {d.nome_ficheiro}</span>}
                </a>
                <span className="text-[13px] text-[var(--v2-muted)]">
                  {emCurso(d.etapa)
                    ? t.emAnalise
                    : d.estado === "processado"
                      ? d.associacao_estado === "manual"
                        ? t.lidoPorSi
                        : t.lido
                      : d.estado === "ilegivel"
                        ? t.ilegivel
                        : t.aVerificar}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={TEXTO_SECUNDARIO}>{t.semDocumentos}</p>
        )}
        <details>
          <summary className={`${BOTAO_SECUNDARIO} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>{tProtecao[idioma].lista.adicionarDocumento}</summary>
          <div className="mt-4">
            <UploadDocumento contratoId={contrato.id} />
          </div>
        </details>
      </section>

      {/* ===== Ações ===== */}
      <section className={`${CARTAO_DESTAQUE} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <p className="text-[16px] font-bold text-[var(--v2-navy)]">{t.problema}</p>
          <p className={TEXTO_SECUNDARIO}>{t.problemaTexto}</p>
        </div>
        <a href={hrefCaso} className={`${BOTAO_SECUNDARIO} shrink-0`}>
          {t.tratarCaso}
        </a>
      </section>

      <details className="rounded-[16px] border border-[var(--v2-line)] bg-white px-5 py-1 text-[14.5px]">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-[var(--v2-muted)] hover:text-[var(--v2-erro)]">
          {t.deixar}
        </summary>
        <form action={deixarDeAcompanhar} className="flex flex-col gap-3 pb-4 pt-2">
          <input type="hidden" name="contrato_id" value={contrato.id} />
          <p className="text-[var(--v2-muted)]">
            {t.deixarTexto}
          </p>
          <label className="flex items-start gap-3 text-[var(--v2-navy)]">
            <input type="checkbox" name="confirmar" value="sim" required className={CAIXA_SELECAO} /> {t.deixarConfirmar}
          </label>
          <button type="submit" className={`${BOTAO_DESTRUTIVO} self-start`}>
            {t.deixarBotao}
          </button>
        </form>
      </details>
    </div>
  );
}
