import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { decidirClienteCaso } from "../actions";
import type { EstadoTexto } from "@/lib/textoCaso";
import { estadoCasoCliente, rotuloEventoCliente, type EstadoTextoRelevante } from "@/lib/portal/estadoCaso";
import { formatarDataHora } from "@/app/texto/_components/Mensagem";
import { Aviso } from "@/components/portal/Aviso";
import { CabecalhoPagina } from "@/components/portal/Cabecalho";
import { Dado, ListaDados } from "@/components/portal/Dados";
import { Etiqueta } from "@/components/portal/Etiqueta";
import { IconeDocumentoVisto, IconeSeta } from "@/components/portal/Icones";
import { LinhaTemporal, type PassoLinhaTemporal } from "@/components/portal/LinhaTemporal";
import {
  BOTAO_SECUNDARIO,
  CARTAO,
  CARTAO_ACAO,
  CARTAO_DESTAQUE,
  CARTAO_SUCESSO,
  LIGACAO,
  TEXTO,
  TEXTO_SECUNDARIO,
  TITULO_SECCAO,
} from "@/components/portal/ui";
import { TextoCliente } from "../_components/TextoCliente";
import {
  Comprovativo,
  ReclamacaoEnviada,
  type ComprovativoCliente,
  type EnvioCliente,
} from "../_components/ReclamacaoEnviada";

// Caso visto pelo cliente: ponto de situação → o que precisa de si (decisão
// ou autorização do texto) → reclamação enviada e comprovativo → linha
// temporal e detalhes. Só apresentação; as ações são as Server Actions de
// sempre (decidirClienteCaso, texto-actions) e o RLS decide o que é lido.

export default async function CasoClienteDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; guardado?: string; texto?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const { data: caso } = await supabase.from("casos").select("*").eq("id", id).single();

  if (!caso) {
    notFound();
  }

  // Tudo com a sessão do cliente (RLS: só o próprio caso; nunca rascunhos;
  // sem o caminho no storage dos comprovativos).
  const [{ data: textoAtual }, { data: eventos }, { data: envios }, { data: comprovativos }] = await Promise.all([
    // Texto em curso: o mais recente ainda não enviado nem substituído.
    supabase
      .from("casos_textos")
      .select("id, versao, conteudo, estado, autorizado_em")
      .eq("caso_id", id)
      .in("estado", ["aguardando_aprovacao", "alteracoes_solicitadas", "autorizado"])
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("casos_eventos").select("tipo, created_at").eq("caso_id", id).order("created_at"),
    supabase
      .from("casos_textos_envios")
      .select("id, texto_id, enviado_em, canal, destinatario")
      .eq("caso_id", id)
      .order("enviado_em", { ascending: false }),
    supabase
      .from("casos_comprovativos")
      .select("id, envio_id, tipo, nome, identificador_externo")
      .eq("caso_id", id)
      .is("substituido_em", null),
  ]);

  // Texto de cada envio: a versão apontada pelo registo de envio (imutável).
  const idsTextosEnviados = (envios ?? []).map((e) => e.texto_id as string);
  const { data: textosEnviados } = idsTextosEnviados.length
    ? await supabase.from("casos_textos").select("id, versao, conteudo").in("id", idsTextosEnviados)
    : { data: [] };
  const textoDoEnvio = new Map((textosEnviados ?? []).map((t) => [t.id as string, t]));
  const enviosCliente: EnvioCliente[] = (envios ?? []).map((e) => ({
    id: e.id as string,
    enviado_em: e.enviado_em as string,
    canal: e.canal as string,
    destinatario: e.destinatario as string,
    versao: (textoDoEnvio.get(e.texto_id as string)?.versao as number | undefined) ?? null,
    conteudo: (textoDoEnvio.get(e.texto_id as string)?.conteudo as string | undefined) ?? null,
  }));
  const listaComprovativos = (comprovativos ?? []) as ComprovativoCliente[];
  // Casos antigos: comprovativo associado ao caso sem envio no sistema.
  const comprovativoSemEnvio = listaComprovativos.find((c) => c.envio_id === null) ?? null;

  const aceitar = decidirClienteCaso.bind(null, id, "aceitou");
  const recusar = decidirClienteCaso.bind(null, id, "recusou");

  const apresentacao = estadoCasoCliente(caso.status, (textoAtual?.estado as EstadoTextoRelevante | undefined) ?? null);
  const concluido = caso.status === "Resolvido";
  const aguardaDecisao = caso.status === "Aguardando decisão cliente";

  // Linha temporal: caso recebido → acontecimentos registados → situação
  // atual → próximo passo (ou conclusão).
  const passos: PassoLinhaTemporal[] = [
    { id: "recebido", titulo: "Caso recebido", quando: formatarDataHora(caso.created_at), estado: "feito" },
    ...((eventos ?? []) as { tipo: string; created_at: string }[]).map((e, i) => ({
      id: `evento-${i}`,
      titulo: rotuloEventoCliente(e.tipo),
      quando: formatarDataHora(e.created_at),
      estado: "feito" as const,
    })),
    concluido
      ? { id: "concluido", titulo: "Caso concluído", estado: "feito" as const }
      : { id: "atual", titulo: apresentacao.rotulo, estado: "atual" as const },
    ...(!concluido && apresentacao.proximoPasso
      ? [{ id: "seguinte", titulo: "A seguir", detalhe: apresentacao.proximoPasso, estado: "futuro" as const }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        voltar={{ href: "/portal/casos", texto: "Os meus casos" }}
        contexto={[caso.sector, caso.tipo_problema ?? caso.problema_tipo].filter(Boolean).join(" · ") || undefined}
        titulo={caso.empresa ?? caso.empresa_parceira ?? "O seu caso"}
        estado={<Etiqueta tom={apresentacao.tom}>{apresentacao.rotulo}</Etiqueta>}
      />

      {query.guardado && <Aviso tom="sucesso">A sua decisão foi registada.</Aviso>}
      {query.erro && <Aviso tom="erro">{query.erro}</Aviso>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Ponto de situação */}
          <section
            aria-labelledby="situacao"
            className={`${concluido ? CARTAO_SUCESSO : apresentacao.requerAcao ? CARTAO_ACAO : CARTAO_DESTAQUE} flex flex-col gap-3`}
          >
            <h2 id="situacao" className="text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--v2-muted)]">
              Ponto de situação
            </h2>
            <p className="text-[19px] font-bold leading-snug tracking-[-0.01em] text-[var(--v2-navy)]">{apresentacao.explicacao}</p>
            {apresentacao.proximoPasso && (
              <p className={TEXTO_SECUNDARIO}>
                <span className="font-semibold text-[var(--v2-navy)]">Próximo passo: </span>
                {apresentacao.proximoPasso}
              </p>
            )}
            {apresentacao.requerAcao && (
              <a href={aguardaDecisao ? "#decisao" : "#texto"} className={`${LIGACAO} self-start text-[14.5px]`}>
                {aguardaDecisao ? "Ver a proposta" : "Rever o texto"}
                <IconeSeta tamanho={16} />
              </a>
            )}
          </section>

          {aguardaDecisao && (
            <section id="decisao" aria-labelledby="decisao-titulo" className={`${CARTAO_ACAO} flex scroll-mt-24 flex-col gap-4`}>
              <h2 id="decisao-titulo" className={TITULO_SECCAO}>
                Precisamos da sua decisão
              </h2>
              <p className={TEXTO}>
                Foi encontrada uma proposta para o seu caso
                {caso.valor_indicado != null ? ` no valor de ${caso.valor_indicado} €` : ""}. O que decide?
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <form action={aceitar}>
                  <button type="submit" className={`${BOTAO_SECUNDARIO} w-full sm:w-auto`}>
                    Aceito
                  </button>
                </form>
                <form action={recusar}>
                  <button type="submit" className={`${BOTAO_SECUNDARIO} w-full sm:w-auto`}>
                    Não aceito, quero avançar
                  </button>
                </form>
              </div>
            </section>
          )}

          <TextoCliente
            casoId={id}
            texto={
              textoAtual
                ? {
                    id: textoAtual.id as string,
                    versao: textoAtual.versao as number,
                    conteudo: textoAtual.conteudo as string,
                    estado: textoAtual.estado as EstadoTexto,
                    autorizado_em: textoAtual.autorizado_em as string | null,
                  }
                : null
            }
            resultado={query.texto}
          />

          {enviosCliente.map((envio) => (
            <ReclamacaoEnviada
              key={envio.id}
              envio={envio}
              comprovativo={listaComprovativos.find((c) => c.envio_id === envio.id) ?? null}
            />
          ))}

          {enviosCliente.length === 0 && comprovativoSemEnvio && (
            <section className={CARTAO}>
              <Comprovativo comprovativo={comprovativoSemEnvio} />
            </section>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-8">
          <section aria-labelledby="linha-temporal" className={`${CARTAO} flex flex-col gap-4`}>
            <h2 id="linha-temporal" className={TITULO_SECCAO}>
              O que já aconteceu
            </h2>
            <LinhaTemporal passos={passos} rotulo="Linha temporal do caso" />
          </section>

          {caso.dossie_url && (
            <section className={`${CARTAO} flex flex-col gap-3`}>
              <div className="flex items-center gap-3">
                <span aria-hidden className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--v2-mint-bg)] text-[var(--v2-green)]">
                  <IconeDocumentoVisto tamanho={20} />
                </span>
                <h2 className={TITULO_SECCAO}>Dossiê do caso</h2>
              </div>
              <a href={caso.dossie_url} target="_blank" rel="noopener noreferrer" className={`${BOTAO_SECUNDARIO} self-start`}>
                Ver dossiê
              </a>
            </section>
          )}

          <section aria-labelledby="detalhes" className={`${CARTAO} flex flex-col gap-4`}>
            <h2 id="detalhes" className={TITULO_SECCAO}>
              Detalhes do caso
            </h2>
            <ListaDados>
              <Dado rotulo="Setor">{caso.sector ?? "—"}</Dado>
              <Dado rotulo="Tipo de problema">{caso.tipo_problema ?? caso.problema_tipo ?? "—"}</Dado>
              {caso.data_fim_fidelidade && <Dado rotulo="Fim da fidelização">{caso.data_fim_fidelidade}</Dado>}
              <Dado rotulo="O que nos contou">
                <span className="whitespace-pre-wrap">{caso.descricao ?? "—"}</span>
              </Dado>
            </ListaDados>
          </section>
        </aside>
      </div>
    </div>
  );
}
