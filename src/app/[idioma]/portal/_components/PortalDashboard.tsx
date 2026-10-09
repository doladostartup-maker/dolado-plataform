"use client";

import Link from "@/i18n/Link";
import type { Idioma } from "@/i18n/config";
import { useIdioma } from "@/i18n/cliente";
import { formatarDataCurta } from "@/i18n/formatar";
import { rico } from "@/i18n/Rico";
import { precoNoIdioma, tPlanos } from "@/i18n/mensagens/planos";
import { tPortal } from "@/i18n/mensagens/portal";
import { tTratarCaso } from "@/i18n/mensagens/tratarCaso";
import { useEffect, useState } from "react";
import { ConfirmarCompra } from "@/components/compra/ConfirmarCompra";
import { linhasDaCobranca, type ResumoCobranca } from "@/lib/proximaCobranca";
import type { ResumoPlano } from "@/lib/acesso";
import type { CasosDoMes } from "@/lib/casoExtra";
import { LIMITE_CASOS_ACUMULADOS, PLANOS } from "@/lib/planos";
import { MARKETING_SITE_URL } from "@/lib/site";
import type { TomEstado } from "@/lib/portal/estadoCaso";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import { Etiqueta } from "@/components/portal/Etiqueta";
import { Dado, ListaDados } from "@/components/portal/Dados";
import { TituloSeccao } from "@/components/portal/Cabecalho";
import { IconeAlerta, IconeCalendario, IconeCirculoVisto, IconeEscudo, IconeInfo, IconeMais, IconePasta, IconeSeta, IconeSino } from "@/components/portal/Icones";
import {
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CARTAO,
  CARTAO_ACAO,
  CARTAO_DESTAQUE,
  CARTAO_LIGACAO,
  LIGACAO,
  METADADOS,
  TEXTO_SECUNDARIO,
  TITULO_CARTAO,
  TITULO_PAGINA,
} from "@/components/portal/ui";

type OfertaConversao = { mensalidade: number; reembolso: number } | null;

/** Algo que precisa do cliente (calculado no servidor). */
export type ItemAtencao = { id: string; titulo: string; texto: string; href: string; cta: string };

export type ResumoCaso = {
  id: string;
  empresa: string;
  problema: string | null;
  setor: string | null;
  rotulo: string;
  tom: TomEstado;
  proximoPasso: string | null;
  requerAcao: boolean;
  concluido: boolean;
  abertoEm: string;
};

export type ResumoProtecao = {
  servicos: number;
  proximoEvento: string | null;
  /** Resultado atual (src/lib/monitor/resultadoProtecao.ts). null = ainda sem serviços. */
  resultado: { titulo: string; texto: string; tom: "ok" | "info" | "atencao"; ultimaVerificacao: string | null } | null;
};

// Escolher uma opção abre a confirmação da compra (ConfirmarCompra); só essa
// envia o identificador do plano à Server Action. O Price ID e o acesso são
// decididos no servidor. Textos em src/i18n/mensagens/*/portal.ts.
const OPCOES = ["protecao", "caso_protecao"] as const;

function nomeDoPlano(resumo: ResumoPlano, idioma: Idioma) {
  return resumo.plano === "sem_plano" ? tPortal[idioma].painel.plano.semSubscricao : tPlanos[idioma].nome[resumo.plano];
}

function OSeuPlano({
  resumo,
  casosDoMes,
  cobranca,
  pagamentoPendente,
  onEscolherSubscricao,
}: {
  resumo: ResumoPlano;
  casosDoMes: CasosDoMes | null;
  cobranca: ResumoCobranca | null;
  pagamentoPendente: boolean;
  onEscolherSubscricao: () => void;
}) {
  const idioma = useIdioma();
  const t = tPortal[idioma].painel.plano;
  const tp = tPlanos[idioma];
  const formatarData = (iso: string) => formatarDataCurta(idioma, iso);
  const semSubscricao = resumo.plano === "sem_plano";
  const linhas: { label: string; valor: string }[] = [];
  if (!semSubscricao) {
    const plano = PLANOS[resumo.plano as "protecao" | "caso_protecao"];
    linhas.push({ label: t.preco, valor: `${tp.comUnidade(precoNoIdioma(idioma, plano.precoCentimos), true)} (${tp.ivaIncluido})` });
    if (cobranca) linhas.push(...linhasDaCobranca(cobranca, idioma));
    if (resumo.estado) linhas.push({ label: t.estado, valor: resumo.estado });
    if (resumo.renovacao) linhas.push({ label: t.renovacao, valor: formatarData(resumo.renovacao) });
    if (resumo.fimAgendado) linhas.push({ label: t.ativaAte, valor: formatarData(resumo.fimAgendado) });
  }
  if (casosDoMes) {
    linhas.push({ label: t.casosMes, valor: tTratarCaso[idioma].casoExtra.utilizacao(casosDoMes.utilizado) });
    if (casosDoMes.proximoCasoEm) linhas.push({ label: t.proximoCaso, valor: formatarData(casosDoMes.proximoCasoEm) });
  }
  if (resumo.casosDisponiveis !== null) {
    linhas.push({ label: t.casosDisponiveis, valor: tp.casosDisponiveis(resumo.casosDisponiveis) });
  } else if (resumo.plano === "protecao") {
    linhas.push({ label: t.casosDisponiveis, valor: t.protecaoSemCasos });
  }

  return (
    <section aria-labelledby="o-seu-plano" data-plano={resumo.plano} className={`${CARTAO} flex flex-col gap-4`}>
      <div className="flex flex-col gap-1">
        <h2 id="o-seu-plano" className="text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--v2-muted)]">
          {t.oSeuPlano}
        </h2>
        <p className={TITULO_CARTAO}>{nomeDoPlano(resumo, idioma)}</p>
      </div>
      {linhas.length > 0 && (
        <ListaDados>
          {linhas.map((l) => (
            <Dado key={l.label} rotulo={l.label}>
              {l.valor}
            </Dado>
          ))}
        </ListaDados>
      )}
      {pagamentoPendente && <p className={METADADOS}>{t.pagamentoPendente}</p>}
      {casosDoMes?.utilizado && resumo.casosDisponiveis === 0 && (
        <p className={METADADOS}>
          {rico(t.jaUtilizou, {
            casos: (c) => (
              <Link href="/portal/casos" className={LIGACAO}>
                {c}
              </Link>
            ),
          })}
        </p>
      )}
      {!semSubscricao && (
        <Link href="/portal/subscricao" className={`${BOTAO_SECUNDARIO} self-start`}>
          {t.gerir}
        </Link>
      )}
      {semSubscricao && !pagamentoPendente && (
        <button type="button" onClick={onEscolherSubscricao} className={`${BOTAO_SECUNDARIO} self-start`}>
          {t.verSubscricoes}
        </button>
      )}
    </section>
  );
}

function CartaoCaso({ caso }: { caso: ResumoCaso }) {
  const idioma = useIdioma();
  const t = tPortal[idioma].painel;
  return (
    <li>
      <Link href={`/portal/casos/${caso.id}`} className={`${CARTAO_LIGACAO} flex flex-col gap-2`}>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <p className={`${TITULO_CARTAO} break-words`}>{caso.empresa}</p>
            <p className={METADADOS}>
              {[caso.setor, caso.problema].filter(Boolean).join(" · ") || t.abertoA(formatarDataCurta(idioma, caso.abertoEm))}
            </p>
          </div>
          <Etiqueta tom={caso.tom}>{caso.rotulo}</Etiqueta>
        </div>
        {caso.proximoPasso && (
          <p className={TEXTO_SECUNDARIO}>
            <span className="font-semibold text-[var(--v2-navy)]">{t.proximoPasso}</span>
            {caso.proximoPasso}
          </p>
        )}
      </Link>
    </li>
  );
}

export function PortalDashboard({
  primeiroNome,
  atencao,
  casos,
  protecao,
  resumo,
  casosDoMes = null,
  cobranca,
  temProtecao,
  temPlanoStripe,
  pagamentoPendente,
  conversaoProtecao,
  conversaoCasoProtecao,
  bloqueadoInicial,
}: {
  primeiroNome: string | null;
  /** O que precisa do cliente, já calculado no servidor. */
  atencao: ItemAtencao[];
  casos: ResumoCaso[];
  /** null = sem Proteção ativa. */
  protecao: ResumoProtecao | null;
  /** Calculado no servidor (src/lib/acesso.ts) — aqui só decide o que mostrar. */
  resumo: ResumoPlano;
  /** Caso + Proteção: utilização do caso incluído (src/lib/casoExtra.ts). */
  casosDoMes?: CasosDoMes | null;
  /** Próxima cobrança com os descontos do Stripe (null = sem renovação ou sem dados). */
  cobranca: ResumoCobranca | null;
  temProtecao: boolean;
  temPlanoStripe: boolean;
  pagamentoPendente: boolean;
  /** O que um Avulso pago cobre em cada plano (null = sem conversão). */
  conversaoProtecao: OfertaConversao;
  conversaoCasoProtecao: OfertaConversao;
  bloqueadoInicial?: string;
}) {
  const idioma = useIdioma();
  const t = tPortal[idioma].painel;
  const tp = tPlanos[idioma];
  const formatarPreco = (c: number) => precoNoIdioma(idioma, c);
  const [modalAberto, setModalAberto] = useState(Boolean(bloqueadoInicial));
  const [aConfirmar, setAConfirmar] = useState<"protecao" | "caso_protecao" | null>(null);

  // Fechar o modal com Escape (teclado).
  useEffect(() => {
    if (!modalAberto) return;
    const fechar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalAberto(false);
    };
    document.addEventListener("keydown", fechar);
    return () => document.removeEventListener("keydown", fechar);
  }, [modalAberto]);

  const assinante = temProtecao;
  // Conta com plano Stripe pode aderir daqui (com conversão do Avulso, se
  // tiver um elegível); sem nenhuma compra vê os planos.
  const podeSubscreverAqui = temPlanoStripe && !pagamentoPendente;

  const emCurso = casos.filter((c) => !c.concluido);
  const concluidos = casos.length - emCurso.length;
  // A ação já aparece em "Precisa da sua atenção": aqui por ordem de abertura.
  const casosVisiveis = emCurso.slice(0, 3);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className={TITULO_PAGINA}>{primeiroNome ? t.ola(primeiroNome) : t.oSeuPainel}</h1>
        <p className={TEXTO_SECUNDARIO}>
          {atencao.length > 0
            ? atencao.length === 1
              ? t.atencaoUm
              : t.atencaoVarios(atencao.length)
            : emCurso.length > 0
              ? t.nadaEmCurso
              : t.nada}
        </p>
      </header>

      {/* 1. O que precisa do cliente */}
      {atencao.length > 0 && (
        <section aria-labelledby="atencao" className="flex flex-col gap-3">
          <TituloSeccao id="atencao" titulo={t.precisaAtencao} />
          <ul className="flex flex-col gap-3">
            {atencao.map((a, n) => (
              <li key={a.id} className={`${CARTAO_ACAO} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
                <div className="flex min-w-0 gap-3">
                  <span aria-hidden className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--v2-mint)] text-[var(--v2-green)]">
                    <IconeSino tamanho={18} />
                  </span>
                  <div className="min-w-0">
                    <p className={`${TITULO_CARTAO} break-words`}>{a.titulo}</p>
                    <p className={TEXTO_SECUNDARIO}>{a.texto}</p>
                  </div>
                </div>
                {/* Uma só ação principal: a primeira; as seguintes são secundárias. */}
                <Link href={a.href} className={`${n === 0 ? BOTAO_PRIMARIO : BOTAO_SECUNDARIO} shrink-0`}>
                  {a.cta}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 2. Casos em curso */}
      <section aria-labelledby="casos-em-curso" className="flex flex-col gap-3">
        <TituloSeccao
          id="casos-em-curso"
          titulo={t.osSeusCasos}
          acao={
            casos.length > 0 ? (
              <Link href="/portal/casos" className={`${LIGACAO} min-h-11 text-[14.5px]`}>
                {t.verTodos}
                <IconeSeta tamanho={16} />
              </Link>
            ) : undefined
          }
        />
        {casosVisiveis.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {casosVisiveis.map((c) => (
              <CartaoCaso key={c.id} caso={c} />
            ))}
          </ul>
        ) : (
          <EstadoVazio
            icone={casos.length > 0 ? <IconeCirculoVisto tamanho={20} /> : <IconePasta tamanho={20} />}
            titulo={casos.length > 0 ? t.semCasosEmCurso : t.aindaSemCasos}
            acao={
              <Link href="/portal/casos/novo" className={BOTAO_PRIMARIO}>
                <IconeMais tamanho={18} />
                {tPortal[idioma].navegacao.novoCaso}
              </Link>
            }
          >
            {casos.length > 0 ? t.semEmCursoTexto(concluidos) : t.semCasosTexto}
          </EstadoVazio>
        )}
        {emCurso.length > casosVisiveis.length && (
          <p className={METADADOS}>
            {rico(t.eMais(emCurso.length - casosVisiveis.length), {
              casos: (c) => (
                <Link href="/portal/casos" className="font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline">
                  {c}
                </Link>
              ),
            })}
          </p>
        )}
      </section>

      {/* 3. Proteção e plano */}
      <section aria-labelledby="protecao" className="flex flex-col gap-3">
        <TituloSeccao id="protecao" titulo={t.protecao} />
        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          {protecao ? (
            <div className={`${CARTAO_DESTAQUE} flex flex-col gap-4`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-[var(--v2-green)]">
                  <IconeEscudo tamanho={22} />
                  <span className={TITULO_CARTAO}>{t.atenta}</span>
                </span>
                <Etiqueta tom="concluido">{t.protecaoAtiva}</Etiqueta>
              </div>
              {protecao.resultado && (
                <div className="flex items-start gap-2.5">
                  {protecao.resultado.tom === "atencao" ? (
                    <IconeAlerta tamanho={20} className="mt-0.5 shrink-0 text-[var(--v2-aviso)]" />
                  ) : protecao.resultado.tom === "info" ? (
                    <IconeInfo tamanho={20} className="mt-0.5 shrink-0 text-[var(--v2-blue)]" />
                  ) : (
                    <IconeCirculoVisto tamanho={20} className="mt-0.5 shrink-0 text-[var(--v2-green)]" />
                  )}
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[16px] font-bold text-[var(--v2-navy)]">{protecao.resultado.titulo}</p>
                    <p className={TEXTO_SECUNDARIO}>{protecao.resultado.texto}</p>
                    {protecao.resultado.ultimaVerificacao && (
                      <p className={METADADOS}>{t.ultimaVerificacao(protecao.resultado.ultimaVerificacao)}</p>
                    )}
                  </div>
                </div>
              )}
              {protecao.servicos > 0 ? (
                <ListaDados>
                  <Dado rotulo={t.servicosAcompanhados}>{t.servicos(protecao.servicos)}</Dado>
                  <Dado rotulo={t.proximaData}>
                    {protecao.proximoEvento ? (
                      <span className="inline-flex items-start gap-2">
                        <IconeCalendario tamanho={18} className="mt-0.5 shrink-0 text-[var(--v2-muted)]" />
                        <span>{protecao.proximoEvento}</span>
                      </span>
                    ) : (
                      t.semDatas
                    )}
                  </Dado>
                </ListaDados>
              ) : (
                <p className={TEXTO_SECUNDARIO}>{t.semServicos}</p>
              )}
              <div className="flex flex-wrap gap-3">
                <Link href="/portal/contratos" className={protecao.servicos > 0 ? BOTAO_SECUNDARIO : BOTAO_PRIMARIO}>
                  {protecao.servicos > 0 ? t.verProtecao : t.adicionarFatura}
                </Link>
                <Link href="/portal/perfil#avisos" className={`${LIGACAO} min-h-11 text-[14.5px]`}>
                  {t.avisosSetor}
                </Link>
              </div>
            </div>
          ) : (
            <div className={`${CARTAO} flex flex-col gap-4`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-[var(--v2-muted)]">
                  <IconeEscudo tamanho={22} />
                  <span className={TITULO_CARTAO}>{t.prevenir}</span>
                </span>
                <Etiqueta tom="neutro">{t.protecaoInativa}</Etiqueta>
              </div>
              <p className={TEXTO_SECUNDARIO}>{t.comProtecao}</p>
              <button type="button" onClick={() => setModalAberto(true)} className={`${BOTAO_SECUNDARIO} self-start`}>
                {t.conhecerProtecao}
              </button>
            </div>
          )}

          {/* Contas sem nenhuma compra não veem este bloco. */}
          {temPlanoStripe && (
            <OSeuPlano
              resumo={resumo}
              casosDoMes={casosDoMes}
              cobranca={cobranca}
              pagamentoPendente={pagamentoPendente}
              onEscolherSubscricao={() => setModalAberto(true)}
            />
          )}
        </div>
      </section>

      {!assinante && modalAberto && (
        <div
          onClick={() => setModalAberto(false)}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(11,37,69,0.42)] px-4 py-6 sm:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-protecao-titulo"
            className="max-h-full w-full max-w-[480px] overflow-y-auto rounded-[20px] bg-white p-6 shadow-[var(--shadow-md)]"
          >
            <h2 id="modal-protecao-titulo" className="mb-3 text-[19px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">
              {pagamentoPendente ? t.modal.emConfirmacao : podeSubscreverAqui ? t.modal.escolha : t.modal.faz}
            </h2>

            {pagamentoPendente ? (
              <p className="mb-5 text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
                {t.modal.emConfirmacaoTexto}
              </p>
            ) : podeSubscreverAqui ? (
              <div className="mb-5 flex flex-col gap-3">
                {OPCOES.map((planoOpcao) => {
                  const opcao = {
                    plano: planoOpcao,
                    descricao:
                      planoOpcao === "protecao"
                        ? t.modal.opcoes.protecao.descricao
                        : t.modal.opcoes.caso_protecao.descricao(LIMITE_CASOS_ACUMULADOS),
                    cta: t.modal.opcoes[planoOpcao].cta,
                  };
                  const conversao = opcao.plano === "protecao" ? conversaoProtecao : conversaoCasoProtecao;
                  return (
                    <div
                      key={opcao.plano}
                      className="rounded-[14px] border border-[var(--v2-line)] p-4"
                    >
                      <p className="text-[14px] font-semibold text-[var(--color-ink)]">
                        {tp.nome[opcao.plano]} — {tp.comUnidade(formatarPreco(PLANOS[opcao.plano].precoCentimos), true)}
                      </p>
                      <p className="text-[12px] text-[var(--color-ink-faint)]">{tp.ivaIncluido}</p>
                      <p className="mb-3 mt-1 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                        {opcao.descricao}
                        {conversao && (
                          <>
                            {" "}
                            {t.modal.conversao(formatarPreco(conversao.mensalidade))}
                            {conversao.reembolso > 0 && rico(t.modal.conversaoReembolso(formatarPreco(conversao.reembolso)))}
                            {t.modal.conversaoFim}
                          </>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setModalAberto(false);
                          setAConfirmar(opcao.plano);
                        }}
                        className={`${BOTAO_PRIMARIO} w-full`}
                      >
                        {opcao.cta}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mb-5 text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]">
                {t.modal.protecaoTexto}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              {!pagamentoPendente && !podeSubscreverAqui && (
                <Link
                  href={`${MARKETING_SITE_URL}/precario`}
                  className={`${BOTAO_PRIMARIO} flex-1`}
                >
                  {t.modal.verPlanos}
                </Link>
              )}
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className={`${BOTAO_SECUNDARIO} flex-1`}
              >
                {pagamentoPendente || podeSubscreverAqui ? t.modal.fechar : t.modal.cancelar}
              </button>
            </div>
          </div>
        </div>
      )}
      {aConfirmar && (
        <ConfirmarCompra
          plano={aConfirmar}
          fluxo="adesao"
          origem="portal"
          conversao={aConfirmar === "protecao" ? conversaoProtecao : conversaoCasoProtecao}
          onFechar={() => setAConfirmar(null)}
        />
      )}
    </div>
  );
}
