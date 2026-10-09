import Link from "@/i18n/Link";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { tProtecao, traduzirMensagemProtecao } from "@/i18n/mensagens/protecao";
import type { Idioma } from "@/i18n/config";
import { requireProtecao, obterAcesso } from "@/lib/auth";
import { resumoPlanoPortal } from "@/lib/acesso";
import { diasAte, rotuloSetorMonitor, textoProximaData } from "@/lib/monitor/contratos";
import { emCurso } from "@/lib/monitor/processamento";
import { carregarProtecao, hojeLisboa } from "@/lib/monitor/protecaoCliente";
import { dataCurta, dataExtenso, diaLisboa, type ResultadoServico } from "@/lib/monitor/resultadoProtecao";
import { ProgressoDocumento } from "./_components/ProgressoDocumento";
import { UploadDocumento } from "./_components/UploadDocumento";
import { FaturaDoCaso } from "./_components/FaturaDoCaso";
import { carregarFaturaDoCaso } from "@/lib/monitor/faturaDoCasoServidor";
import { HistoricoProtecao, ListaAtentos, ListaVerificacoes, ResultadoAtual, SituacaoEncontrada, TituloBloco } from "./_components/ResultadoProtecao";
import { Aviso, type TomAviso } from "@/components/portal/Aviso";
import { CabecalhoPagina } from "@/components/portal/Cabecalho";
import { Etiqueta } from "@/components/portal/Etiqueta";
import { IconeAlerta, IconeCalendario, IconeCirculoVisto, IconeInfo, IconeSeta } from "@/components/portal/Icones";
import { BOTAO_PRIMARIO, CARTAO, CARTAO_ACAO, LIGACAO, METADADOS, TEXTO_SECUNDARIO, TITULO_CARTAO } from "@/components/portal/ui";

// Proteção — "Primeiro verificamos a sua situação atual. Depois continuamos
// atentos por si." Hierarquia: resultado atual → o que precisa de atenção →
// o que estamos a acompanhar (e a próxima data) → serviços → o que já
// fizemos → adicionar documentos. Os documentos são matéria-prima do
// serviço, não o protagonista. Regras do resultado em
// src/lib/monitor/resultadoProtecao.ts.

const TOM_MENSAGEM: Record<string, "ok" | "info" | "erro"> = {
  removido: "ok",
  ultimo: "ok",
  cancelado: "ok",
  repetido: "info",
  pendente: "info",
  a_rever: "info",
};

const ESTADO_SERVICO: Record<ResultadoServico["estado"], { Icone: typeof IconeInfo; cor: string }> = {
  encontramos: { Icone: IconeAlerta, cor: "text-[var(--v2-aviso)]" },
  por_confirmar: { Icone: IconeInfo, cor: "text-[var(--v2-blue)]" },
  em_verificacao: { Icone: IconeInfo, cor: "text-[var(--v2-blue)]" },
  verificado: { Icone: IconeCirculoVisto, cor: "text-[var(--v2-green)]" },
  a_rever: { Icone: IconeInfo, cor: "text-[var(--v2-blue)]" },
  em_analise: { Icone: IconeInfo, cor: "text-[var(--v2-blue)]" },
  sem_dados: { Icone: IconeInfo, cor: "text-[var(--v2-muted)]" },
};

const DIAS_DOCUMENTO_ILEGIVEL = 14;

export default async function ContratosPage({
  params: parametros,
  searchParams,
}: ComIdioma & {
  searchParams: Promise<{ erro?: string; removido?: string; aviso?: string; documento?: string }>;
}) {
  const idioma: Idioma = await idiomaDaPagina(parametros);
  const t = tProtecao[idioma].lista;
  const params = await searchParams;
  const { supabase, user } = await requireProtecao("contratos");

  const [{ servicos, geral }, acesso, { data: semServico }, { data: porAssociar }, { data: identificadores }] = await Promise.all([
    carregarProtecao(supabase, user.id, undefined, idioma),
    obterAcesso(supabase, user.id),
    // Documentos ainda sem serviço: em leitura, por verificar ou ilegíveis.
    supabase
      .from("documentos_monitor")
      .select("id, nome_ficheiro, etapa, etapa_atualizada_em, estado, contrato_id, created_at")
      .eq("utilizador_id", user.id)
      .is("contrato_id", null)
      .is("associacao_estado", null)
      .or("etapa.is.null,etapa.neq.repetido")
      .order("created_at", { ascending: false }),
    supabase
      .from("documentos_monitor")
      .select("id, tipo, associacao_estado")
      .eq("utilizador_id", user.id)
      .is("contrato_id", null)
      .in("associacao_estado", ["possivel", "conflito"]),
    // Identificador visível para distinguir dois serviços do mesmo fornecedor.
    supabase
      .from("servicos_identificadores")
      .select("contrato_id, tipo, apresentacao")
      .eq("utilizador_id", user.id)
      .in("tipo", ["numero_servico", "cpe", "cui", "referencia_conta", "numero_cliente", "referencia_contrato"])
      .not("apresentacao", "is", null),
  ]);
  const referencia = new Map<string, string>();
  for (const i of identificadores ?? []) {
    if (!referencia.has(i.contrato_id) || i.tipo === "numero_servico") referencia.set(i.contrato_id, i.apresentacao as string);
  }

  const docs = semServico ?? [];
  const emAnalise = docs.filter((d) => emCurso(d.etapa) || d.etapa === "falhou");
  const aVerificar = docs.filter((d) => !emCurso(d.etapa) && d.etapa !== "falhou" && (d.estado === "pendente" || d.estado === "a_rever"));
  const hoje = hojeLisboa();
  const ilegiveis = docs.filter((d) => d.estado === "ilegivel" && diasAte(diaLisboa(d.created_at), hoje) >= -DIAS_DOCUMENTO_ILEGIVEL);
  const fimAgendado = resumoPlanoPortal(acesso, idioma).fimAgendado;
  const chaveMensagem = params.removido ? (params.removido === "ultimo" ? "ultimo" : "removido") : params.aviso ?? params.documento;
  const mensagem =
    chaveMensagem && TOM_MENSAGEM[chaveMensagem]
      ? { texto: t.mensagens[chaveMensagem as keyof typeof t.mensagens], tom: TOM_MENSAGEM[chaveMensagem] }
      : undefined;
  const tomMensagem: Record<"ok" | "info" | "erro", TomAviso> = { ok: "sucesso", info: "info", erro: "erro" };
  const varios = servicos.length > 1;
  // Um só serviço (o caso da primeira utilização): o detalhe do que
  // verificámos aparece logo aqui, sem obrigar a abrir o serviço.
  const unico = servicos.length === 1 ? servicos[0] : null;
  const porConfirmar = servicos.filter((s) => s.confirmar);
  // Primeiro documento: se o cliente já enviou uma fatura num caso, é
  // proposta sem novo upload (só lida depois do clique do cliente).
  const faturaDoCaso =
    servicos.length === 0 && docs.length === 0 && (porAssociar ?? []).length === 0 ? await carregarFaturaDoCaso(supabase, user.id) : null;
  const temAtencao = geral.situacoes.length > 0 || (porAssociar ?? []).length > 0 || porConfirmar.length > 0 || ilegiveis.length > 0;

  // ---- Resultado atual -------------------------------------------------------
  const progresso = emAnalise.length > 0 && (
    <div className="flex flex-col gap-3">
      {emAnalise.map((d) => (
        <ProgressoDocumento key={d.id} documentoId={d.id} inicial={d} compacto />
      ))}
    </div>
  );
  let resultado: React.ReactNode;
  if (servicos.length === 0 && emAnalise.length > 0) {
    resultado = (
      <ResultadoAtual
        id="resultado"
        estado="em_analise"
        titulo={t.aVerificarPorSi}
        conclusao={null}
        texto={t.aVerificarPorSiTexto}
        idioma={idioma}
        ultimaVerificacao={null}
        hoje={hoje}
      >
        {progresso}
      </ResultadoAtual>
    );
  } else if (servicos.length === 0 && aVerificar.length > 0) {
    resultado = (
      <ResultadoAtual
        id="resultado"
        estado="a_rever"
        titulo={t.aVerificarDocumento}
        conclusao={null}
        texto={t.aVerificarDocumentoTexto}
        idioma={idioma}
        ultimaVerificacao={null}
        hoje={hoje}
      />
    );
  } else if (servicos.length === 0) {
    resultado = (
      <ResultadoAtual id="resultado" estado="sem_dados" titulo={geral.titulo} conclusao={null} texto={geral.texto} ultimaVerificacao={null} hoje={hoje} idioma={idioma}>
        <div className="rounded-[16px] border border-[var(--v2-line)] bg-white p-4 sm:p-5">
          {faturaDoCaso ? <FaturaDoCaso anexoId={faturaDoCaso.anexoId} nome={faturaDoCaso.nome} empresa={faturaDoCaso.empresa} /> : <UploadDocumento />}
        </div>
        <p className={TEXTO_SECUNDARIO}>
          {t.semDocumento}{" "}
          <Link href="/portal/contratos/novo" className={LIGACAO}>
            {t.indiqueDados}
          </Link>
          .
        </p>
      </ResultadoAtual>
    );
  } else {
    resultado = (
      <ResultadoAtual
        id="resultado"
        estado={geral.estado}
        eyebrow={t.resultadoAtual}
        idioma={idioma}
        titulo={geral.titulo}
        conclusao={geral.conclusao}
        texto={geral.texto}
        ultimaVerificacao={geral.ultimaVerificacao}
        documentoVerificado={unico?.documentoVerificado}
        hoje={hoje}
        trabalho={{
          verificamos:
            geral.pontos > 0
              ? `${t.pontos(geral.pontos)}${varios ? t.emServicos(geral.servicosVerificados) : ""}`
              : null,
          encontramos: geral.encontramos,
          atentos: !varios
            ? geral.atentos.length > 0
              ? t.situacoes(geral.atentos.length)
              : null
            : [
                geral.datasAcompanhadas.length ? t.datas(geral.datasAcompanhadas.length) : null,
                geral.faturasAcompanhadas.length ? t.faturasDe(geral.faturasAcompanhadas.length) : null,
              ]
                .filter(Boolean)
                .join(t.e) || null,
        }}
      >
        {progresso}
      </ResultadoAtual>
    );
  }

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <CabecalhoPagina
        titulo={t.titulo}
        estado={<Etiqueta tom="concluido">{t.ativa}</Etiqueta>}
        descricao={t.descricao}
      />

      {mensagem && <Aviso tom={tomMensagem[mensagem.tom]}>{mensagem.texto}</Aviso>}
      {params.erro && <Aviso tom="erro">{traduzirMensagemProtecao(idioma, params.erro)}</Aviso>}
      {fimAgendado && (
        <Aviso tom="info">
          {t.fimAgendado(dataExtenso(fimAgendado, hoje, idioma))}{" "}
          <Link href="/portal/subscricao" className={LIGACAO}>
            {t.gerirSubscricao}
          </Link>
        </Aviso>
      )}

      {resultado}

      {/* ===== O que precisa da sua atenção ===== */}
      {temAtencao && (
        <section aria-labelledby="atencao" className="flex flex-col gap-3">
          <TituloBloco id="atencao">{t.precisaAtencao}</TituloBloco>
          {geral.situacoes.map((s) => (
            <SituacaoEncontrada key={s.id} s={s} setor={servicos.find((x) => x.id === s.servicoId)?.setor ?? ""} hoje={hoje} mostrarServico={varios} idioma={idioma} />
          ))}
          {porConfirmar.map((s) => (
            <div key={s.id} className={`${CARTAO_ACAO} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
              <div className="min-w-0">
                <p className={TITULO_CARTAO}>{t.confirmeDados(s.nome)}</p>
                <p className={TEXTO_SECUNDARIO}>
                  {s.estado === "por_confirmar"
                    ? t.lemosContrato
                    : t.encontramosNaFatura}
                </p>
              </div>
              <Link href={`/portal/contratos/${s.id}#confirmar`} className={`${BOTAO_PRIMARIO} shrink-0`}>
                {t.reverDados}
              </Link>
            </div>
          ))}
          {(porAssociar ?? []).map((d) => (
            <div key={d.id} className={`${CARTAO_ACAO} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
              <div className="min-w-0">
                <p className={TITULO_CARTAO}>
                  {d.associacao_estado === "conflito"
                    ? t.conflito(d.tipo === "contrato")
                    : t.possivel(d.tipo === "contrato")}
                </p>
                <p className={TEXTO_SECUNDARIO}>{t.naoAlteramos}</p>
              </div>
              <Link href={`/portal/contratos/documentos/${d.id}`} className={`${BOTAO_PRIMARIO} shrink-0`}>
                {t.reverDados}
              </Link>
            </div>
          ))}
          {ilegiveis.map((d) => (
            <Aviso key={d.id} tom="atencao" titulo={t.ilegivelTitulo}>
              {d.nome_ficheiro ? t.ilegivel(d.nome_ficheiro, dataExtenso(d.created_at, hoje, idioma)) : ""}
              {t.ilegivelTexto}{" "}
              <a href={servicos.length ? "#acrescentar" : "#resultado"} className={LIGACAO}>
                {t.carregarOutra}
              </a>
            </Aviso>
          ))}
        </section>
      )}

      {aVerificar.length > 0 && servicos.length > 0 && (
        <Aviso tom="info">
          {t.aVerificar(aVerificar.length)}
        </Aviso>
      )}

      {/* ===== O que verificámos (um só serviço) ===== */}
      {unico && unico.verificacoes.length > 0 && (
        <section aria-labelledby="verificamos" className={`${CARTAO} flex flex-col gap-4`}>
          <TituloBloco id="verificamos" descricao={unico.documentoVerificado ? t.encontramosEm(unico.documentoVerificado) : undefined}>
            {t.oQueVerificamos}
          </TituloBloco>
          <ListaVerificacoes verificacoes={unico.verificacoes} />
          {unico.lacunas.length > 0 && (
            <ul className="flex flex-col gap-1.5 border-t border-[var(--v2-line)] pt-4">
              {unico.lacunas.map((l) => (
                <li key={l} className="flex items-start gap-2 text-[14.5px] leading-relaxed text-[var(--v2-muted)]">
                  <IconeInfo tamanho={17} className="mt-0.5 shrink-0 text-[var(--v2-blue)]" />
                  <span>
                    {l}
                    {!unico.temContrato && t.contratoAjuda}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/portal/contratos/${unico.id}`} className={`${LIGACAO} min-h-11 self-start text-[14.5px]`}>
            {t.verDetalhe}
            <IconeSeta tamanho={16} />
          </Link>
        </section>
      )}

      {/* ===== Estamos atentos a ===== */}
      {geral.atentos.length > 0 && (
        <section aria-labelledby="atentos" className={`${CARTAO} flex flex-col gap-4`}>
          <TituloBloco
            id="atentos"
            descricao={
              geral.atentos.some((a) => a.data)
                ? t.atentosDatas
                : t.atentosFaturas
            }
          >
            {t.atentosA}
          </TituloBloco>
          {varios ? (
            <ListaAtentos
              servico
              atentos={[
                ...geral.datasAcompanhadas,
                ...(geral.faturasAcompanhadas.length
                  ? [
                      {
                        texto: t.cadaFatura(t.lista(geral.faturasAcompanhadas)),
                      },
                    ]
                  : []),
              ]}
            />
          ) : (
            <ListaAtentos atentos={geral.atentos} />
          )}
          {geral.proxima && (
            <p className="flex items-start gap-2 border-t border-[var(--v2-line)] pt-4 text-[14.5px] font-semibold text-[var(--v2-navy)]">
              <IconeCalendario tamanho={18} className="mt-0.5 shrink-0 text-[var(--v2-muted)]" />
              <span>
                {t.proximaData(
                  varios ? geral.proxima.servico : null,
                  textoProximaData(geral.proxima.proxima, idioma),
                  dataExtenso(geral.proxima.proxima.data, hoje, idioma),
                )}
              </span>
            </p>
          )}
          {unico?.seguinte && <p className={`${TEXTO_SECUNDARIO} border-t border-[var(--v2-line)] pt-4`}>{unico.seguinte}</p>}
        </section>
      )}

      {/* ===== Os seus serviços ===== */}
      {servicos.length > 0 && (
        <section aria-labelledby="servicos" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <TituloBloco id="servicos">{varios ? t.osSeusServicos : t.oSeuServico}</TituloBloco>
            <a href="#acrescentar" className={`${LIGACAO} min-h-11 text-[14.5px]`}>
              {t.adicionarDocumento}
            </a>
          </div>
          <ul className="flex flex-col overflow-hidden rounded-[16px] border border-[var(--v2-line)] bg-white">
            {servicos.map((s) => {
              const e = ESTADO_SERVICO[s.estado];
              return (
                <li key={s.id} className="border-b border-[var(--v2-line)] last:border-b-0">
                  <Link
                    href={`/portal/contratos/${s.id}`}
                    className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-[var(--v2-surface)] focus-visible:bg-[var(--v2-surface)] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className={`${TITULO_CARTAO} break-words`}>{s.nome}</p>
                      <p className={METADADOS}>
                        {rotuloSetorMonitor(s.setor, idioma)}
                        {referencia.has(s.id) ? ` · ${referencia.get(s.id)}` : ""}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-1 sm:items-end sm:text-right">
                      <span className="inline-flex items-start gap-1.5 text-[14.5px] font-semibold text-[var(--v2-navy)]">
                        <e.Icone tamanho={17} className={`mt-0.5 shrink-0 ${e.cor}`} />
                        {t.estadoServico[s.estado]}
                        {s.estado === "verificado" && s.ultimaVerificacao ? (
                          <span className="font-normal text-[var(--v2-muted)]">{t.verificadoA(dataCurta(s.ultimaVerificacao, hoje, idioma))}</span>
                        ) : null}
                      </span>
                      <span className={METADADOS}>{s.proxima ? textoProximaData(s.proxima, idioma) : s.temContrato ? t.contratoAdicionado : t.contratoNaoAdicionado}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--v2-green)] sm:hidden">
                      {t.verServico}
                      <IconeSeta tamanho={16} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ===== O que já fizemos por si ===== */}
      {geral.historico.length > 0 && (
        <section aria-labelledby="historico" className="flex flex-col gap-3">
          <TituloBloco id="historico">{t.jaFizemos}</TituloBloco>
          <HistoricoProtecao itens={geral.historico} hoje={hoje} comServico={varios} idioma={idioma} />
        </section>
      )}

      {/* ===== Adicionar documentos ===== */}
      {servicos.length > 0 && (
        <section id="acrescentar" aria-labelledby="acrescentar-titulo" className={`${CARTAO} flex max-w-2xl scroll-mt-24 flex-col gap-4`}>
          <TituloBloco
            id="acrescentar-titulo"
            descricao={t.adicionarDescricao}
          >
            {t.adicionarDocumento}
          </TituloBloco>
          <UploadDocumento />
          <p className={`${TEXTO_SECUNDARIO} border-t border-[var(--v2-line)] pt-4`}>
            {t.semDocumento}{" "}
            <Link href="/portal/contratos/novo" className={LIGACAO}>
              {t.indiqueDados}
            </Link>
            .
          </p>
        </section>
      )}
    </div>
  );
}
