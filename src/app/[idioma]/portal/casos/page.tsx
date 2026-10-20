import Link from "@/i18n/Link";
import { formatarData as formatarDataIdioma } from "@/i18n/formatar";
import { tPortal } from "@/i18n/mensagens/portal";
import { rotulo } from "@/i18n/mensagens/rotulos";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { obterAcesso, requireUser } from "@/lib/auth";
import { casosDoMes, elegivelCasoExtra } from "@/lib/casoExtra";
import { casoExtraConfigurado } from "@/lib/stripe/planos";
import { CasosDoMes } from "@/components/portal/CasoExtra";
import { ESTADOS_TERMINADOS_CLIENTE, estadoCasoCliente, type EstadoTextoRelevante } from "@/lib/portal/estadoCaso";
import { CabecalhoPagina, TituloSeccao } from "@/components/portal/Cabecalho";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import { Etiqueta } from "@/components/portal/Etiqueta";
import { IconeMais, IconePasta, IconeSeta } from "@/components/portal/Icones";
import { BOTAO_PRIMARIO, CARTAO_ACAO, CARTAO_LIGACAO, METADADOS, TEXTO_SECUNDARIO, TITULO_CARTAO } from "@/components/portal/ui";

export default async function MeusCasosPage({ params }: ComIdioma) {
  const idioma = await idiomaDaPagina(params);
  const t = tPortal[idioma].casos;
  const formatarData = (iso: string) => formatarDataIdioma(idioma, iso);
  const { supabase, user } = await requireUser();

  const [acesso, { data: casos }, { data: pedidos }, { data: textos }] = await Promise.all([
    obterAcesso(supabase, user.id),
    supabase
      .from("casos")
      .select("id, empresa_parceira, empresa, sector, tipo_problema, problema_tipo, status, data_fim_fidelidade, created_at")
      .eq("utilizador_id", user.id)
      .order("created_at", { ascending: false }),
    // Pedidos ainda não pagos: não são casos (não estão a ser tratados), mas
    // o cliente pode retomar o pagamento.
    supabase
      .from("pedidos_caso")
      .select("id, empresa, sector, problema_tipo, estado, created_at")
      .eq("user_id", user.id)
      .in("estado", ["rascunho", "aguarda_pagamento"])
      .order("created_at", { ascending: false }),
    // Texto em curso de cada caso, para o estado apresentado (RLS: só os
    // próprios casos e nunca rascunhos).
    supabase
      .from("casos_textos")
      .select("caso_id, versao, estado")
      .in("estado", ["aguardando_aprovacao", "alteracoes_solicitadas", "autorizado"])
      .order("versao", { ascending: false }),
  ]);
  // Caso + Proteção: utilização do caso incluído e, se já foi usado, o Caso
  // Extra (só leitura do acesso gravado pelo webhook; o servidor volta a
  // decidir ao abrir o Checkout).
  const mes = casosDoMes(acesso);
  const ofertaCasoExtra = casoExtraConfigurado() && elegivelCasoExtra(acesso);
  const textoDoCaso = new Map<string, EstadoTextoRelevante>();
  for (const t of textos ?? []) if (!textoDoCaso.has(t.caso_id)) textoDoCaso.set(t.caso_id, t.estado as EstadoTextoRelevante);

  const lista = (casos ?? []).map((c) => ({ ...c, apresentacao: estadoCasoCliente(c.status, textoDoCaso.get(c.id) ?? null, {}, idioma) }));
  // Primeiro o que precisa do cliente; depois em curso; concluídos no fim.
  // "Concluídos": resolvidos e encerrados (o acompanhamento da DoLado terminou).
  const terminado = (status: string) => ESTADOS_TERMINADOS_CLIENTE.includes(status);
  const emCurso = lista.filter((c) => !terminado(c.status)).sort((a, b) => Number(b.apresentacao.requerAcao) - Number(a.apresentacao.requerAcao));
  const concluidos = lista.filter((c) => terminado(c.status));

  const cartao = (c: (typeof lista)[number]) => (
    <li key={c.id}>
      <Link href={`/portal/casos/${c.id}`} className={`${CARTAO_LIGACAO} flex flex-col gap-3`}>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <p className={`${TITULO_CARTAO} break-words`}>{c.empresa ?? c.empresa_parceira ?? t.oMeuCaso}</p>
            <p className={METADADOS}>
              {[rotulo(idioma, "setores", c.sector), rotulo(idioma, "problemas", c.tipo_problema ?? c.problema_tipo)].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          <Etiqueta tom={c.apresentacao.tom}>{c.apresentacao.rotulo}</Etiqueta>
        </div>
        <p className={TEXTO_SECUNDARIO}>{c.apresentacao.explicacao}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={METADADOS}>
            {t.abertoA(formatarData(c.created_at))}
            {c.data_fim_fidelidade ? t.fimFidelizacao(c.data_fim_fidelidade) : ""}
          </p>
          <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--v2-green)]">
            {c.apresentacao.requerAcao ? t.verPreciso : t.verCaso}
            <IconeSeta tamanho={16} />
          </span>
        </div>
      </Link>
    </li>
  );

  return (
    <div className="flex flex-col gap-8">
      <CabecalhoPagina
        titulo={t.titulo}
        descricao={t.descricao}
        acao={
          lista.length > 0 ? (
            <Link href="/portal/casos/novo" className={BOTAO_PRIMARIO}>
              <IconeMais tamanho={18} />
              {tPortal[idioma].navegacao.novoCaso}
            </Link>
          ) : undefined
        }
      />

      {mes && <CasosDoMes casos={mes} oferta={ofertaCasoExtra} idioma={idioma} />}

      {(pedidos ?? []).length > 0 && (
        <section aria-labelledby="pedidos" className="flex flex-col gap-3">
          <TituloSeccao
            id="pedidos"
            titulo={t.pedidos}
            descricao={t.pedidosDescricao}
          />
          <ul className="flex flex-col gap-3">
            {(pedidos ?? []).map((p) => (
              <li key={p.id} className={`${CARTAO_ACAO} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
                <div className="min-w-0">
                  <p className={`${TITULO_CARTAO} break-words`}>{p.empresa}</p>
                  <p className={METADADOS}>
                    {rotulo(idioma, "setores", p.sector)} · {rotulo(idioma, "problemas", p.problema_tipo)}
                  </p>
                </div>
                <Link href={`/tratar-caso/modalidade?pedido=${p.id}`} className={`${BOTAO_PRIMARIO} shrink-0`}>
                  {t.concluirPedido}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lista.length === 0 ? (
        <EstadoVazio
          icone={<IconePasta tamanho={20} />}
          titulo={t.aindaSemCasos}
          acao={
            <Link href="/portal/casos/novo" className={BOTAO_PRIMARIO}>
              <IconeMais tamanho={18} />
              {tPortal[idioma].navegacao.novoCaso}
            </Link>
          }
        >
          {t.semCasosTexto}
        </EstadoVazio>
      ) : (
        <>
          <section aria-labelledby="em-curso" className="flex flex-col gap-3">
            <TituloSeccao id="em-curso" titulo={t.emCurso} />
            {emCurso.length > 0 ? (
              <ul className="flex flex-col gap-3">{emCurso.map(cartao)}</ul>
            ) : (
              <EstadoVazio titulo={t.semEmCurso}>{t.semEmCursoTexto}</EstadoVazio>
            )}
          </section>
          {concluidos.length > 0 && (
            <section aria-labelledby="concluidos" className="flex flex-col gap-3">
              <TituloSeccao id="concluidos" titulo={t.concluidos} />
              <ul className="flex flex-col gap-3">{concluidos.map(cartao)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
