import Link from "next/link";
import { requireProtecao, obterAcesso } from "@/lib/auth";
import { resumoPlanoPortal } from "@/lib/acesso";
import { ROTULO_SETOR, diasAte, textoProximaData, type SetorContratoMonitor } from "@/lib/monitor/contratos";
import { emCurso } from "@/lib/monitor/processamento";
import { carregarProtecao, hojeLisboa } from "@/lib/monitor/protecaoCliente";
import { dataCurta, dataExtenso, diaLisboa, type ResultadoServico } from "@/lib/monitor/resultadoProtecao";
import { ProgressoDocumento } from "./_components/ProgressoDocumento";
import { UploadDocumento } from "./_components/UploadDocumento";
import { FaturaDoCaso } from "./_components/FaturaDoCaso";
import { carregarFaturaDoCaso } from "@/lib/monitor/faturaDoCasoServidor";
import { HistoricoProtecao, ListaAtentos, ListaVerificacoes, ResultadoAtual, SituacaoEncontrada, TituloBloco, plural } from "./_components/ResultadoProtecao";
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
    texto: "Recebemos o documento. Ainda não o conseguimos ler automaticamente: a DoLado vai verificá-lo e o resultado aparece aqui quando estiver pronto.",
    tom: "info",
  },
  a_rever: { texto: "Recebemos o documento. Alguns dados precisam de ser verificados pela DoLado antes de aparecerem.", tom: "info" },
};

const ESTADO_SERVICO: Record<ResultadoServico["estado"], { texto: string; Icone: typeof IconeInfo; cor: string }> = {
  encontramos: { texto: "Encontrámos algo que merece a sua atenção", Icone: IconeAlerta, cor: "text-[var(--v2-aviso)]" },
  por_confirmar: { texto: "Condições por confirmar", Icone: IconeInfo, cor: "text-[var(--v2-blue)]" },
  em_verificacao: { texto: "Estamos a verificar uma alteração", Icone: IconeInfo, cor: "text-[var(--v2-blue)]" },
  verificado: { texto: "Tudo certo", Icone: IconeCirculoVisto, cor: "text-[var(--v2-green)]" },
  a_rever: { texto: "A DoLado está a verificar o documento", Icone: IconeInfo, cor: "text-[var(--v2-blue)]" },
  em_analise: { texto: "A verificar o documento", Icone: IconeInfo, cor: "text-[var(--v2-blue)]" },
  sem_dados: { texto: "Ainda sem documentos", Icone: IconeInfo, cor: "text-[var(--v2-muted)]" },
};

const DIAS_DOCUMENTO_ILEGIVEL = 14;

function listaNomes(nomes: string[]) {
  return nomes.length <= 1 ? nomes.join("") : `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
}

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; removido?: string; aviso?: string; documento?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireProtecao("contratos");

  const [{ servicos, geral }, acesso, { data: semServico }, { data: porAssociar }, { data: identificadores }] = await Promise.all([
    carregarProtecao(supabase, user.id),
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
  const fimAgendado = resumoPlanoPortal(acesso).fimAgendado;
  const chaveMensagem = params.removido ? (params.removido === "ultimo" ? "ultimo" : "removido") : params.aviso ?? params.documento;
  const mensagem = chaveMensagem ? MENSAGENS[chaveMensagem] : undefined;
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
        titulo="Estamos a verificar por si"
        conclusao={null}
        texto="Estamos a analisar o documento e a identificar as condições que merecem acompanhamento. Pode sair desta página: o resultado fica aqui quando estiver pronto."
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
        titulo="Estamos a verificar o seu documento"
        conclusao={null}
        texto="Não conseguimos ler tudo automaticamente. A DoLado vai verificá-lo e o resultado aparece aqui quando estiver pronto."
        ultimaVerificacao={null}
        hoje={hoje}
      />
    );
  } else if (servicos.length === 0) {
    resultado = (
      <ResultadoAtual id="resultado" estado="sem_dados" titulo={geral.titulo} conclusao={null} texto={geral.texto} ultimaVerificacao={null} hoje={hoje}>
        <div className="rounded-[16px] border border-[var(--v2-line)] bg-white p-4 sm:p-5">
          {faturaDoCaso ? <FaturaDoCaso anexoId={faturaDoCaso.anexoId} nome={faturaDoCaso.nome} empresa={faturaDoCaso.empresa} /> : <UploadDocumento />}
        </div>
        <p className={TEXTO_SECUNDARIO}>
          Não tem o documento à mão?{" "}
          <Link href="/portal/contratos/novo" className={LIGACAO}>
            Indique os dados do serviço
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
        eyebrow="Resultado atual"
        titulo={geral.titulo}
        conclusao={geral.conclusao}
        texto={geral.texto}
        ultimaVerificacao={geral.ultimaVerificacao}
        documentoVerificado={unico?.documentoVerificado}
        hoje={hoje}
        trabalho={{
          verificamos:
            geral.pontos > 0
              ? `${plural(geral.pontos, "ponto importante", "pontos importantes")}${varios ? ` em ${plural(geral.servicosVerificados, "serviço", "serviços")}` : ""}`
              : null,
          encontramos: geral.encontramos,
          atentos: !varios
            ? geral.atentos.length > 0
              ? plural(geral.atentos.length, "situação importante", "situações importantes")
              : null
            : [
                geral.datasAcompanhadas.length ? plural(geral.datasAcompanhadas.length, "data importante", "datas importantes") : null,
                geral.faturasAcompanhadas.length ? `faturas de ${plural(geral.faturasAcompanhadas.length, "serviço", "serviços")}` : null,
              ]
                .filter(Boolean)
                .join(" e ") || null,
        }}
      >
        {progresso}
      </ResultadoAtual>
    );
  }

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <CabecalhoPagina
        titulo="Proteção"
        estado={<Etiqueta tom="concluido">Proteção ativa</Etiqueta>}
        descricao="Verificamos a sua situação atual e, a partir daí, ficamos atentos por si: comparamos as faturas, acompanhamos as datas importantes e avisamo-lo quando alguma coisa merece a sua atenção."
      />

      {mensagem && <Aviso tom={tomMensagem[mensagem.tom]}>{mensagem.texto}</Aviso>}
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}
      {fimAgendado && (
        <Aviso tom="info">
          A sua subscrição termina a {dataExtenso(fimAgendado, hoje)}. Até lá, continuamos atentos aos seus serviços.{" "}
          <Link href="/portal/subscricao" className={LIGACAO}>
            Gerir subscrição
          </Link>
        </Aviso>
      )}

      {resultado}

      {/* ===== O que precisa da sua atenção ===== */}
      {temAtencao && (
        <section aria-labelledby="atencao" className="flex flex-col gap-3">
          <TituloBloco id="atencao">Precisa da sua atenção</TituloBloco>
          {geral.situacoes.map((s) => (
            <SituacaoEncontrada key={s.id} s={s} setor={servicos.find((x) => x.id === s.servicoId)?.setor ?? ""} hoje={hoje} mostrarServico={varios} />
          ))}
          {porConfirmar.map((s) => (
            <div key={s.id} className={`${CARTAO_ACAO} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
              <div className="min-w-0">
                <p className={TITULO_CARTAO}>Confirme os dados de {s.nome}</p>
                <p className={TEXTO_SECUNDARIO}>
                  {s.estado === "por_confirmar"
                    ? "Lemos o contrato. Só começamos a acompanhar estas condições depois de as confirmar."
                    : "Encontrámos na fatura informação que pode ajudar a acompanhar este serviço. Só a usamos depois de a confirmar."}
                </p>
              </div>
              <Link href={`/portal/contratos/${s.id}#confirmar`} className={`${BOTAO_PRIMARIO} shrink-0`}>
                Rever dados
              </Link>
            </div>
          ))}
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
          {ilegiveis.map((d) => (
            <Aviso key={d.id} tom="atencao" titulo="Não conseguimos ler um documento">
              {d.nome_ficheiro ? `“${d.nome_ficheiro}”, carregado a ${dataExtenso(d.created_at, hoje)}. ` : ""}
              Experimente carregar outra versão, em PDF ou numa fotografia nítida.{" "}
              <a href={servicos.length ? "#acrescentar" : "#resultado"} className={LIGACAO}>
                Carregar outra versão
              </a>
            </Aviso>
          ))}
        </section>
      )}

      {aVerificar.length > 0 && servicos.length > 0 && (
        <Aviso tom="info">
          {aVerificar.length === 1 ? "1 documento está" : `${aVerificar.length} documentos estão`} a ser verificados pela DoLado. O resultado
          aparece aqui quando estiver pronto.
        </Aviso>
      )}

      {/* ===== O que verificámos (um só serviço) ===== */}
      {unico && unico.verificacoes.length > 0 && (
        <section aria-labelledby="verificamos" className={`${CARTAO} flex flex-col gap-4`}>
          <TituloBloco id="verificamos" descricao={unico.documentoVerificado ? `O que encontrámos em ${unico.documentoVerificado}.` : undefined}>
            O que verificámos
          </TituloBloco>
          <ListaVerificacoes verificacoes={unico.verificacoes} />
          {unico.lacunas.length > 0 && (
            <ul className="flex flex-col gap-1.5 border-t border-[var(--v2-line)] pt-4">
              {unico.lacunas.map((l) => (
                <li key={l} className="flex items-start gap-2 text-[14.5px] leading-relaxed text-[var(--v2-muted)]">
                  <IconeInfo tamanho={17} className="mt-0.5 shrink-0 text-[var(--v2-blue)]" />
                  <span>
                    {l}
                    {!unico.temContrato && " O contrato ajuda-nos a confirmar."}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/portal/contratos/${unico.id}`} className={`${LIGACAO} min-h-11 self-start text-[14.5px]`}>
            Ver o serviço em detalhe
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
                ? "Comparamos cada nova fatura e avisamo-lo por e-mail antes destas datas."
                : "Comparamos cada nova fatura e avisamo-lo se alguma coisa mudar ou merecer a sua atenção."
            }
          >
            Estamos atentos a
          </TituloBloco>
          {varios ? (
            <ListaAtentos
              servico
              atentos={[
                ...geral.datasAcompanhadas,
                ...(geral.faturasAcompanhadas.length
                  ? [
                      {
                        texto: `Cada nova fatura de ${listaNomes(geral.faturasAcompanhadas)}: mensalidade, descontos e cobranças novas ou repetidas`,
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
                Próxima data importante{varios ? ` (${geral.proxima.servico})` : ""}: {textoProximaData(geral.proxima.proxima).toLowerCase()}, a{" "}
                {dataExtenso(geral.proxima.proxima.data, hoje)}.
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
            <TituloBloco id="servicos">{varios ? "Os seus serviços" : "O seu serviço"}</TituloBloco>
            <a href="#acrescentar" className={`${LIGACAO} min-h-11 text-[14.5px]`}>
              Adicionar fatura ou contrato
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
                        {ROTULO_SETOR[s.setor as SetorContratoMonitor] ?? s.setor}
                        {referencia.has(s.id) ? ` · ${referencia.get(s.id)}` : ""}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-1 sm:items-end sm:text-right">
                      <span className="inline-flex items-start gap-1.5 text-[14.5px] font-semibold text-[var(--v2-navy)]">
                        <e.Icone tamanho={17} className={`mt-0.5 shrink-0 ${e.cor}`} />
                        {e.texto}
                        {s.estado === "verificado" && s.ultimaVerificacao ? (
                          <span className="font-normal text-[var(--v2-muted)]"> · verificado a {dataCurta(s.ultimaVerificacao, hoje)}</span>
                        ) : null}
                      </span>
                      <span className={METADADOS}>{s.proxima ? textoProximaData(s.proxima) : s.temContrato ? "Contrato adicionado" : "Contrato não adicionado"}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--v2-green)] sm:hidden">
                      Ver serviço
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
          <TituloBloco id="historico">O que já fizemos por si</TituloBloco>
          <HistoricoProtecao itens={geral.historico} hoje={hoje} comServico={varios} />
        </section>
      )}

      {/* ===== Adicionar documentos ===== */}
      {servicos.length > 0 && (
        <section id="acrescentar" aria-labelledby="acrescentar-titulo" className={`${CARTAO} flex max-w-2xl scroll-mt-24 flex-col gap-4`}>
          <TituloBloco
            id="acrescentar-titulo"
            descricao="Uma nova fatura ou o contrato ajudam-nos a acompanhar melhor. Se o documento for de um serviço que já acompanhamos (mesmo titular e mesma conta ou número de serviço), juntamo-lo a esse serviço. Se não tivermos a certeza, perguntamos."
          >
            Adicionar fatura ou contrato
          </TituloBloco>
          <UploadDocumento />
          <p className={`${TEXTO_SECUNDARIO} border-t border-[var(--v2-line)] pt-4`}>
            Não tem o documento à mão?{" "}
            <Link href="/portal/contratos/novo" className={LIGACAO}>
              Indique os dados do serviço
            </Link>
            .
          </p>
        </section>
      )}
    </div>
  );
}
