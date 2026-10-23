import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { diagnosticoAtivo } from "@/lib/diagnostico/regras";
import {
  NOMES_CANAL,
  NOMES_FALHA,
  NOMES_FUNCIONALIDADE,
  NOMES_SETOR,
  intervaloAnterior,
  lerCambio,
  lerIntervalo,
  maiorPerda,
  montarFunil,
  porUnidade,
  variacao,
  type Cambio,
  type Intervalo,
  type Metricas,
} from "@/lib/aquisicao/regras";
import { CabecalhoPagina, TituloSeccao } from "@/components/backoffice/Cabecalho";
import { Metrica } from "@/components/backoffice/Blocos";
import { Aviso } from "@/components/portal/Aviso";
import {
  BOTAO_PEQUENO,
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CAMPO,
  METADADOS,
  PAINEL,
  PAINEL_CORPO,
  ROTULO,
  TABELA,
  TABELA_MOLDURA,
  TABELA_TD,
  TABELA_TH,
  TABELA_TR,
  TEXTO_SECUNDARIO,
} from "@/components/backoffice/ui";

export const dynamic = "force-dynamic";

// Aquisição e Conversão (fase 3 da missão do diagnóstico gratuito). Responde
// a cinco perguntas: quantos experimentam a DoLado, quantos recebem
// resultados, onde se perdem, que canais trazem clientes pagos e quanto custa
// a IA. Tudo de aquisicao_metricas() (só admin, só contagens, sem dados
// pessoais nem conteúdo de documentos). Visitas à homepage e cliques no botão
// só existem no GA4 (com consentimento): não aparecem aqui como se fossem
// contagens exactas.

const NUMERO = new Intl.NumberFormat("pt-PT");
const fmt = (n: number) => NUMERO.format(n);
const fmtPct = (n: number | null) => (n === null ? "—" : `${n.toFixed(1).replace(".", ",")}%`);
const pct = (parte: number, total: number) => (total > 0 ? (parte / total) * 100 : null);

function usd(v: number | null, cambio: Cambio): string {
  if (v === null) return "—";
  const dolares = `${v < 0.01 && v > 0 ? v.toFixed(4) : v.toFixed(2)} USD`.replace(".", ",");
  if (!cambio) return dolares;
  const euros = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: v * cambio.taxa < 0.01 && v > 0 ? 4 : 2 }).format(
    v * cambio.taxa,
  );
  return `${euros} (${dolares})`;
}

function Variacao({ actual, anterior }: { actual: number; anterior?: number }) {
  if (anterior === undefined) return null;
  const v = variacao(actual, anterior);
  const texto = v === null ? `antes: ${fmt(anterior)}` : `${v >= 0 ? "+" : ""}${v.toFixed(0)}% face a ${fmt(anterior)}`;
  return <>{texto}</>;
}

const ROTULOS_PERIODO: Record<string, string> = { hoje: "Hoje", "7d": "7 dias", "30d": "30 dias", "90d": "90 dias" };

function Filtros({ intervalo }: { intervalo: Intervalo }) {
  const dia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(d);
  const ultimoDia = new Date(intervalo.ate.getTime() - 1);
  return (
    <div className={`${PAINEL} ${PAINEL_CORPO} flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between`}>
      <nav aria-label="Período" className="flex flex-wrap gap-2">
        {Object.entries(ROTULOS_PERIODO).map(([id, rotulo]) => (
          <Link
            key={id}
            href={`/backoffice/aquisicao?periodo=${id}`}
            aria-current={intervalo.periodo === id ? "page" : undefined}
            className={`${intervalo.periodo === id ? BOTAO_PRIMARIO : BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}
          >
            {rotulo}
          </Link>
        ))}
      </nav>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="periodo" value="personalizado" />
        <label className={ROTULO}>
          De
          <input type="date" name="desde" defaultValue={dia(intervalo.desde)} className={CAMPO} />
        </label>
        <label className={ROTULO}>
          Até
          <input type="date" name="ate" defaultValue={dia(ultimoDia)} className={CAMPO} />
        </label>
        <button type="submit" className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>
          Aplicar
        </button>
      </form>
    </div>
  );
}

function Tabela({ cabecalho, linhas, vazio }: { cabecalho: string[]; linhas: ReactNode[][]; vazio: string }) {
  if (!linhas.length) return <p className={TEXTO_SECUNDARIO}>{vazio}</p>;
  return (
    <div className={TABELA_MOLDURA}>
      <table className={TABELA}>
        <thead>
          <tr>
            {cabecalho.map((c, i) => (
              <th key={c} scope="col" className={`${TABELA_TH} ${i > 0 ? "text-right" : ""}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className={TABELA_TR}>
              {l.map((celula, j) => (
                <td key={j} className={`${TABELA_TD} ${j > 0 ? "text-right tabular-nums" : ""}`}>
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Barras diárias simples (sem biblioteca): uma série principal e uma secundária sobreposta. */
function SerieDiaria({
  dados,
  principal,
  secundaria,
  rotulos,
  formatar = fmt,
}: {
  dados: { dia: string; a: number; b: number }[];
  principal: string;
  secundaria: string;
  rotulos: [string, string];
  formatar?: (n: number) => string;
}) {
  if (!dados.length) return <p className={TEXTO_SECUNDARIO}>Sem dados neste período.</p>;
  const max = Math.max(...dados.map((d) => Math.max(d.a, d.b)), 0) || 1;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-1 overflow-x-auto pb-1" style={{ height: 140 }} role="img" aria-label={`${rotulos[0]} e ${rotulos[1]} por dia`}>
        {dados.map((d) => (
          <div key={d.dia} className="relative flex h-full min-w-[10px] flex-1 items-end" title={`${d.dia}: ${rotulos[0]} ${formatar(d.a)} · ${rotulos[1]} ${formatar(d.b)}`}>
            <div className="w-full rounded-t-[3px]" style={{ height: `${(d.a / max) * 100}%`, background: principal }} />
            <div className="absolute bottom-0 left-1/4 w-1/2 rounded-t-[3px]" style={{ height: `${(d.b / max) * 100}%`, background: secundaria }} />
          </div>
        ))}
      </div>
      <div className={`${METADADOS} flex flex-wrap gap-4`}>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: principal }} /> {rotulos[0]}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: secundaria }} /> {rotulos[1]}
        </span>
        <span>
          {dados[0].dia} — {dados[dados.length - 1].dia}
        </span>
      </div>
    </div>
  );
}

export default async function AquisicaoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireAdmin();
  const intervalo = lerIntervalo(await searchParams);
  const antes = intervaloAnterior(intervalo);
  const cambio = lerCambio(process.env.TAXA_USD_EUR, process.env.TAXA_USD_EUR_DATA);

  const [actual, anterior] = await Promise.all([
    supabase.rpc("aquisicao_metricas", { p_desde: intervalo.desde.toISOString(), p_ate: intervalo.ate.toISOString() }),
    supabase.rpc("aquisicao_metricas", { p_desde: antes.desde.toISOString(), p_ate: antes.ate.toISOString() }),
  ]);
  const m = (actual.data ?? null) as Metricas | null;
  const a = (anterior.data ?? null) as Metricas | null;

  const funil = m ? montarFunil(m, a) : [];
  const perda = maiorPerda(funil);
  const entrada = funil[0]?.valor ?? 0;

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        contexto="Crescimento"
        titulo="Aquisição e Conversão"
        descricao="Quem experimenta a DoLado pelo diagnóstico gratuito, onde abandona e quanto custa a IA. Coorte do período: os diagnósticos começados no período e o que essas pessoas fizeram depois, mesmo que mais tarde."
      />
      <Filtros intervalo={intervalo} />
      {!diagnosticoAtivo() && (
        <Aviso tom="info">O diagnóstico gratuito está desligado (DIAGNOSTICO_GRATUITO_ATIVO). Os números só começam a crescer quando for ligado; os custos da IA das outras funcionalidades já aparecem.</Aviso>
      )}
      {(actual.error || !m) && <Aviso tom="erro">Não foi possível ler as métricas (a migration 20261029090000 está aplicada?).</Aviso>}

      {m && (
        <>
          {/* ===== As cinco perguntas, em números ===== */}
          <section aria-labelledby="resumo" className="flex flex-col gap-3">
            <TituloSeccao id="resumo" titulo="Resumo" descricao="Comparado com o período anterior com a mesma duração." />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metrica rotulo="Sessões que experimentaram" valor={fmt(m.sessoes.iniciaram)} detalhe={<Variacao actual={m.sessoes.iniciaram} anterior={a?.sessoes.iniciaram} />} />
              <Metrica rotulo="Documentos carregados" valor={fmt(m.documentos.carregados)} detalhe={<Variacao actual={m.documentos.carregados} anterior={a?.documentos.carregados} />} />
              <Metrica
                rotulo="Análises concluídas"
                valor={fmt(m.documentos.concluidos)}
                detalhe={`${fmt(m.documentos.falhados)} falhadas · ${fmtPct(pct(m.documentos.concluidos, m.documentos.carregados))} dos carregados`}
              />
              <Metrica rotulo="Diagnósticos vistos (sessões)" valor={fmt(m.sessoes.viram)} detalhe={`${fmt(m.sessoes.sem_conta_depois_de_ver)} viram e não criaram conta`} />
              <Metrica rotulo="Contas" valor={fmt(m.contas.criadas_ou_ligadas)} detalhe={<Variacao actual={m.contas.criadas_ou_ligadas} anterior={a?.contas.criadas_ou_ligadas} />} />
              <Metrica rotulo="Períodos experimentais" valor={fmt(m.contas.experimental)} detalhe={<Variacao actual={m.contas.experimental} anterior={a?.contas.experimental} />} />
              <Metrica
                rotulo="Clientes pagos"
                valor={fmt(m.contas.pagas)}
                detalhe={`${fmtPct(pct(m.contas.pagas, entrada))} das sessões · ${fmt(m.contas.subscricoes_pagas)} com subscrição paga`}
              />
              <Metrica
                rotulo="IA por cliente pago"
                valor={usd(porUnidade(m.ia.coorte_usd, m.contas.pagas), cambio)}
                detalhe={`Leituras gratuitas desta coorte: ${usd(m.ia.coorte_usd, cambio)}`}
              />
            </div>
            <p className={METADADOS}>
              Sessões = browsers anónimos distintos (o mesmo browser pode carregar vários documentos; uma pessoa com dois browsers conta duas vezes). Contas e clientes
              pagos = utilizadores distintos, confirmados pela base de dados e pelo webhook do Stripe. Visitas à homepage e cliques no botão estão no GA4 (só com
              consentimento), não aqui.
            </p>
          </section>

          {/* ===== Funil ===== */}
          <section aria-labelledby="funil" className="flex flex-col gap-3">
            <TituloSeccao
              id="funil"
              titulo="Funil de conversão"
              descricao={perda ? `Maior perda: antes de "${perda.rotulo}" (${fmt(perda.perdidos ?? 0)} ${perda.unidade}, só ${fmtPct(perda.daAnterior)} passam).` : undefined}
            />
            <div className={`${PAINEL} ${PAINEL_CORPO} flex flex-col gap-3`}>
              <p className={METADADOS}>Visitante e clique no botão → ver GA4 (eventos upload_clicked e upload_started, só com consentimento).</p>
              <ol className="flex flex-col gap-2.5">
                {funil.map((e) => {
                  const largura = entrada > 0 ? Math.max((e.valor / entrada) * 100, e.valor > 0 ? 1.5 : 0) : 0;
                  const destaque = perda?.id === e.id;
                  return (
                    <li key={e.id} className="grid gap-1 sm:grid-cols-[220px_1fr_260px] sm:items-center sm:gap-4">
                      <span className="text-[14px] font-semibold text-[var(--v2-navy)]">
                        {e.rotulo} <span className="font-normal text-[var(--v2-muted)]">({e.unidade})</span>
                      </span>
                      <div className="h-7 w-full rounded-[6px] bg-[var(--v2-surface)]">
                        <div
                          className="flex h-7 items-center rounded-[6px] px-2 text-[13px] font-bold text-white"
                          style={{ width: `${largura}%`, minWidth: e.valor > 0 ? 36 : 0, background: destaque ? "var(--v2-erro)" : "var(--v2-green)" }}
                        >
                          {e.valor > 0 ? fmt(e.valor) : ""}
                        </div>
                      </div>
                      <span className={`${METADADOS} sm:text-right`}>
                        {e.valor === 0 && "0 · "}
                        {e.daAnterior !== null && `${fmtPct(e.daAnterior)} da anterior · `}
                        {fmtPct(e.daEntrada)} da entrada
                        {e.perdidos ? ` · −${fmt(e.perdidos)}` : ""}
                        {e.anterior !== undefined ? ` · antes ${fmt(e.anterior)}` : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
              {Object.keys(m.documentos.falhas_por_motivo).length > 0 && (
                <p className={METADADOS}>
                  Análises falhadas:{" "}
                  {Object.entries(m.documentos.falhas_por_motivo)
                    .map(([motivo, n]) => `${NOMES_FALHA[motivo] ?? motivo} ${fmt(n)}`)
                    .join(" · ")}
                  . Documentos passados à Protecção: {fmt(m.documentos.passados_ao_monitor)}.
                </p>
              )}
            </div>
          </section>

          {/* ===== Funil da Protecção por página de entrada ===== */}
          <section aria-labelledby="funil-protecao" className="flex flex-col gap-3">
            <TituloSeccao
              id="funil-protecao"
              titulo="Do resultado à Protecção, por página de entrada"
              descricao="Poucos cliques depois do resultado: o resultado não mostrou valor suficiente. Muitos cliques e poucos pagamentos: registo, checkout, confiança ou preço."
            />
            <Tabela
              cabecalho={["Página de entrada", "Viram o resultado", "Clicaram na Protecção", "Resultado → clique", "Contas", "Checkout", "Pagos", "Clique → pago"]}
              vazio={m.funil_protecao ? "Sem resultados vistos neste período." : "Falta aplicar a migration 20261102090000."}
              linhas={(m.funil_protecao ?? []).map((f) => [
                f.pagina,
                fmt(f.viram),
                fmt(f.clicaram_protecao),
                fmtPct(pct(f.clicaram_protecao, f.viram)),
                fmt(f.contas),
                fmt(f.checkout),
                fmt(f.pagas),
                fmtPct(pct(f.pagas, f.clicaram_protecao)),
              ])}
            />
            <p className={METADADOS}>
              Sessões até ao clique; contas a partir daí (página de entrada do primeiro diagnóstico da conta). Uma conta pode vir de &quot;Guardar o meu resultado&quot;
              sem clique na Protecção. Checkout = consentimentos gravados antes de um Stripe Checkout, depois do diagnóstico.
            </p>
          </section>

          {/* ===== Evolução ===== */}
          <section aria-labelledby="evolucao" className="flex flex-col gap-3">
            <TituloSeccao id="evolucao" titulo="Evolução no período" />
            <div className={`${PAINEL} ${PAINEL_CORPO}`}>
              <SerieDiaria
                dados={m.serie_diaria.map((d) => ({ dia: d.dia, a: d.carregados, b: d.concluidos }))}
                principal="var(--v2-blue-soft, #C9DDF5)"
                secundaria="var(--v2-green)"
                rotulos={["Documentos carregados", "Análises concluídas"]}
              />
            </div>
          </section>

          {/* ===== Origens ===== */}
          <section aria-labelledby="origens" className="flex flex-col gap-3">
            <TituloSeccao id="origens" titulo="De onde vêm" descricao="Canal da primeira sessão de cada pessoa (UTM e site de origem; nunca dados pessoais nem conteúdo dos documentos)." />
            <Tabela
              cabecalho={["Canal", "Sessões", "Carregaram", "Concluídas", "Contas", "Experimental", "Pagos", "Sessão → pago"]}
              vazio="Sem sessões neste período."
              linhas={m.por_canal.map((c) => [
                NOMES_CANAL[c.canal] ?? c.canal,
                fmt(c.sessoes),
                fmt(c.carregaram),
                fmt(c.concluiram),
                fmt(c.contas),
                fmt(c.experimental),
                fmt(c.pagas),
                fmtPct(pct(c.pagas, c.sessoes)),
              ])}
            />
            <Tabela
              cabecalho={["Campanha (utm_campaign)", "Origem", "Meio", "Documentos", "Concluídos", "Contas"]}
              vazio="Sem campanhas com UTM neste período."
              linhas={m.por_campanha.map((c) => [c.campanha, c.origem, c.meio, fmt(c.documentos), fmt(c.concluidos), fmt(c.contas)])}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Tabela
                cabecalho={["Página de entrada", "Documentos"]}
                vazio="—"
                linhas={Object.entries(m.por_pagina_entrada)
                  .sort((x, y) => y[1] - x[1])
                  .map(([p, n]) => [p, fmt(n)])}
              />
              <Tabela
                cabecalho={["Dispositivo", "Documentos"]}
                vazio="—"
                linhas={Object.entries(m.por_dispositivo).map(([d, n]) => [d === "movel" ? "Telemóvel" : d === "computador" ? "Computador" : "Desconhecido", fmt(n)])}
              />
            </div>
          </section>

          {/* ===== Sectores ===== */}
          <section aria-labelledby="sectores" className="flex flex-col gap-3">
            <TituloSeccao id="sectores" titulo="Sectores dos documentos" />
            <Tabela
              cabecalho={["Sector", "Documentos", "Concluídos", "% concluídos", "Contas", "Conversão após diagnóstico", "Custo médio da análise"]}
              vazio="Sem documentos neste período."
              linhas={m.por_setor.map((s) => [
                NOMES_SETOR[s.setor] ?? s.setor,
                fmt(s.documentos),
                fmt(s.concluidos),
                fmtPct(pct(s.concluidos, s.documentos)),
                fmt(s.contas),
                fmtPct(pct(s.contas, s.concluidos)),
                usd(porUnidade(Number(s.custo_usd), s.documentos), cambio),
              ])}
            />
          </section>

          {/* ===== Custos da IA ===== */}
          <section aria-labelledby="ia" className="flex flex-col gap-3">
            <TituloSeccao
              id="ia"
              titulo="Custos da IA"
              descricao="Estimativa calculada a cada chamada com os tokens devolvidos pela API e a tabela de preços em código, no momento da chamada. Não é a factura da Anthropic."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metrica rotulo="Total no período" valor={usd(m.ia.total_usd, cambio)} detalhe={<Variacao actual={Math.round(m.ia.total_usd * 100)} anterior={a ? Math.round(a.ia.total_usd * 100) : undefined} />} />
              <Metrica rotulo="Análises gratuitas" valor={usd(m.ia.gratuito_usd, cambio)} detalhe={`Em falhas: ${usd(m.ia.gratuito_falhado_usd, cambio)}`} />
              <Metrica rotulo="Por diagnóstico concluído" valor={usd(porUnidade(m.ia.coorte_usd, m.documentos.concluidos), cambio)} />
              <Metrica
                rotulo="Funcionalidades pagas"
                valor={usd(m.ia.total_usd - m.ia.gratuito_usd, cambio)}
                detalhe="Protecção, sugestão do texto e análise das respostas"
              />
            </div>
            <Tabela
              cabecalho={["Modelo", "Chamadas", "Tokens de entrada", "Tokens de saída", "Custo estimado", "Erros"]}
              vazio="Sem chamadas à IA neste período."
              linhas={m.ia.por_modelo.map((x) => [x.modelo, fmt(x.chamadas), fmt(x.tokens_entrada), fmt(x.tokens_saida), usd(Number(x.custo_usd), cambio), fmt(x.erros)])}
            />
            <Tabela
              cabecalho={["Funcionalidade", "Chamadas", "Custo estimado"]}
              vazio="—"
              linhas={m.ia.por_funcionalidade.map((x) => [NOMES_FUNCIONALIDADE[x.funcionalidade] ?? x.funcionalidade, fmt(x.chamadas), usd(Number(x.custo_usd), cambio)])}
            />
            <div className={`${PAINEL} ${PAINEL_CORPO}`}>
              <SerieDiaria
                dados={m.ia.serie_diaria.map((d) => ({ dia: d.dia, a: Number(d.restante_usd ?? 0) + Number(d.gratuito_usd ?? 0), b: Number(d.gratuito_usd ?? 0) }))}
                principal="var(--v2-blue-soft, #C9DDF5)"
                secundaria="var(--v2-green)"
                rotulos={["Custo total por dia", "Dos quais: análises gratuitas"]}
                formatar={(n) => usd(n, cambio)}
              />
            </div>
            <p className={METADADOS}>
              {cambio
                ? `Euros à taxa de ${String(cambio.taxa).replace(".", ",")} EUR por USD (${cambio.data}, TAXA_USD_EUR).`
                : "Valores em dólares: para mostrar euros, configure TAXA_USD_EUR e TAXA_USD_EUR_DATA (taxa e data em que foi tirada)."}{" "}
              Preços por milhão de tokens em src/lib/monitor/custos.ts; cache e tarifas acima de 100 mil tokens por pedido não são contadas à parte.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
