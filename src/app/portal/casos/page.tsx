import Link from "next/link";
import { obterAcesso, requireUser } from "@/lib/auth";
import { casosDoMes, elegivelCasoExtra } from "@/lib/casoExtra";
import { casoExtraConfigurado } from "@/lib/stripe/planos";
import { CasosDoMes } from "@/components/portal/CasoExtra";
import { estadoCasoCliente, type EstadoTextoRelevante } from "@/lib/portal/estadoCaso";
import { CabecalhoPagina, TituloSeccao } from "@/components/portal/Cabecalho";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import { Etiqueta } from "@/components/portal/Etiqueta";
import { IconeMais, IconePasta, IconeSeta } from "@/components/portal/Icones";
import { BOTAO_PRIMARIO, CARTAO_ACAO, CARTAO_LIGACAO, METADADOS, TEXTO_SECUNDARIO, TITULO_CARTAO } from "@/components/portal/ui";

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" });
}

export default async function MeusCasosPage() {
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

  const lista = (casos ?? []).map((c) => ({ ...c, apresentacao: estadoCasoCliente(c.status, textoDoCaso.get(c.id) ?? null) }));
  // Primeiro o que precisa do cliente; depois em curso; concluídos no fim.
  const emCurso = lista.filter((c) => c.status !== "Resolvido").sort((a, b) => Number(b.apresentacao.requerAcao) - Number(a.apresentacao.requerAcao));
  const concluidos = lista.filter((c) => c.status === "Resolvido");

  const cartao = (c: (typeof lista)[number]) => (
    <li key={c.id}>
      <Link href={`/portal/casos/${c.id}`} className={`${CARTAO_LIGACAO} flex flex-col gap-3`}>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <p className={`${TITULO_CARTAO} break-words`}>{c.empresa ?? c.empresa_parceira ?? "O meu caso"}</p>
            <p className={METADADOS}>{[c.sector, c.tipo_problema ?? c.problema_tipo].filter(Boolean).join(" · ") || "—"}</p>
          </div>
          <Etiqueta tom={c.apresentacao.tom}>{c.apresentacao.rotulo}</Etiqueta>
        </div>
        <p className={TEXTO_SECUNDARIO}>{c.apresentacao.explicacao}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={METADADOS}>
            Aberto a {formatarData(c.created_at)}
            {c.data_fim_fidelidade ? ` · Fim da fidelização: ${c.data_fim_fidelidade}` : ""}
          </p>
          <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--v2-green)]">
            {c.apresentacao.requerAcao ? "Ver o que é preciso" : "Ver o caso"}
            <IconeSeta tamanho={16} />
          </span>
        </div>
      </Link>
    </li>
  );

  return (
    <div className="flex flex-col gap-8">
      <CabecalhoPagina
        titulo="Os meus casos"
        descricao="Acompanhe o que a DoLado está a fazer em cada caso e o que precisa de si."
        acao={
          lista.length > 0 ? (
            <Link href="/portal/casos/novo" className={BOTAO_PRIMARIO}>
              <IconeMais tamanho={18} />
              Abrir novo caso
            </Link>
          ) : undefined
        }
      />

      {mes && <CasosDoMes casos={mes} oferta={ofertaCasoExtra} />}

      {(pedidos ?? []).length > 0 && (
        <section aria-labelledby="pedidos" className="flex flex-col gap-3">
          <TituloSeccao
            id="pedidos"
            titulo="Pedidos por concluir"
            descricao="Estão guardados, mas ainda não são casos: só começamos a tratá-los depois de escolher a modalidade e de o pagamento ser confirmado."
          />
          <ul className="flex flex-col gap-3">
            {(pedidos ?? []).map((p) => (
              <li key={p.id} className={`${CARTAO_ACAO} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
                <div className="min-w-0">
                  <p className={`${TITULO_CARTAO} break-words`}>{p.empresa}</p>
                  <p className={METADADOS}>
                    {p.sector} · {p.problema_tipo}
                  </p>
                </div>
                <Link href={`/tratar-caso/modalidade?pedido=${p.id}`} className={`${BOTAO_PRIMARIO} shrink-0`}>
                  Concluir pedido
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lista.length === 0 ? (
        <EstadoVazio
          icone={<IconePasta tamanho={20} />}
          titulo="Ainda não tem casos"
          acao={
            <Link href="/portal/casos/novo" className={BOTAO_PRIMARIO}>
              <IconeMais tamanho={18} />
              Abrir novo caso
            </Link>
          }
        >
          Conte-nos o problema com a empresa — de telecomunicações, energia, gás ou água, uma loja ou um ginásio. A DoLado analisa, prepara a
          reclamação, mostra-lha antes de enviar e acompanha a resposta.
        </EstadoVazio>
      ) : (
        <>
          <section aria-labelledby="em-curso" className="flex flex-col gap-3">
            <TituloSeccao id="em-curso" titulo="Em curso" />
            {emCurso.length > 0 ? (
              <ul className="flex flex-col gap-3">{emCurso.map(cartao)}</ul>
            ) : (
              <EstadoVazio titulo="Sem casos em curso">
                Não tem nenhum problema em tratamento neste momento. Se surgir outro, pode abrir um novo caso.
              </EstadoVazio>
            )}
          </section>
          {concluidos.length > 0 && (
            <section aria-labelledby="concluidos" className="flex flex-col gap-3">
              <TituloSeccao id="concluidos" titulo="Concluídos" />
              <ul className="flex flex-col gap-3">{concluidos.map(cartao)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
