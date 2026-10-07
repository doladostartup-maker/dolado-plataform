import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { confirmarResolucaoCliente, responderPedidoCliente } from "../actions";
import type { EstadoTexto } from "@/lib/textoCaso";
import { cronologiaCliente, estadoCasoCliente, type EstadoTextoRelevante, type EventoCliente } from "@/lib/portal/estadoCaso";
import { formatarDataHora } from "@/app/texto/_components/Mensagem";
import { Aviso } from "@/components/portal/Aviso";
import { CabecalhoPagina } from "@/components/portal/Cabecalho";
import { Dado, ListaDados } from "@/components/portal/Dados";
import { Etiqueta } from "@/components/portal/Etiqueta";
import { IconeDocumentoVisto, IconeSeta } from "@/components/portal/Icones";
import { LinhaTemporal, type PassoLinhaTemporal } from "@/components/portal/LinhaTemporal";
import {
  AJUDA_CAMPO,
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CAMPO,
  CARTAO,
  CARTAO_ACAO,
  CARTAO_DESTAQUE,
  CARTAO_SUCESSO,
  LIGACAO,
  METADADOS,
  ROTULO,
  TEXTO,
  TEXTO_SECUNDARIO,
  TITULO_SECCAO,
} from "@/components/portal/ui";
import { TextoCliente } from "../_components/TextoCliente";
import { EncerramentoExternoResumo, EntidadesResolucaoConflitos, type DossieCliente } from "../_components/EncerramentoExterno";
import { ESTADO_ENCERRADO_EXTERNO } from "@/lib/encerramentoExterno";
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
  searchParams: Promise<{ erro?: string; guardado?: string; texto?: string; confirmado?: string; informacao?: string }>;
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
  const [{ data: textoAtual }, { data: eventos }, { data: envios }, { data: comprovativos }, { data: pedidos }, { data: decisoes }, { data: dossies }] =
    await Promise.all([
    // Texto em curso: o mais recente ainda não enviado nem substituído.
    supabase
      .from("casos_textos")
      .select("id, versao, conteudo, estado, autorizado_em")
      .eq("caso_id", id)
      .in("estado", ["aguardando_aprovacao", "alteracoes_solicitadas", "autorizado"])
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // RLS: só os acontecimentos visíveis ao cliente.
    supabase.from("casos_eventos").select("tipo, created_at, texto_id, dados").eq("caso_id", id).order("created_at"),
    supabase
      .from("casos_textos_envios")
      .select("id, texto_id, enviado_em, canal, destinatario, referencia")
      .eq("caso_id", id)
      .order("enviado_em", { ascending: false }),
    supabase
      .from("casos_comprovativos")
      .select("id, envio_id, tipo, nome, identificador_externo")
      .eq("caso_id", id)
      .is("substituido_em", null),
    supabase
      .from("casos_pedidos_cliente")
      .select("id, pedido, instrucoes, prazo, estado, created_at, respondido_em")
      .eq("caso_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
    // Só o que foi dito ao cliente (permissões por coluna; sem a análise interna).
    supabase.from("casos_analises").select("decisao, mensagem_cliente, created_at").eq("caso_id", id).order("created_at", { ascending: false }),
    // Dossiê do caso (só a versão mais recente; sem o caminho no storage).
    supabase.from("casos_dossies").select("id, versao, gerado_em").eq("caso_id", id).order("versao", { ascending: false }).limit(1),
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
    referencia: (e.referencia as string | null) ?? null,
    versao: (textoDoEnvio.get(e.texto_id as string)?.versao as number | undefined) ?? null,
    conteudo: (textoDoEnvio.get(e.texto_id as string)?.conteudo as string | undefined) ?? null,
  }));
  const listaComprovativos = (comprovativos ?? []) as ComprovativoCliente[];
  // Casos antigos: comprovativo associado ao caso sem envio no sistema.
  const comprovativoSemEnvio = listaComprovativos.find((c) => c.envio_id === null) ?? null;

  const resolvido = confirmarResolucaoCliente.bind(null, id, true);
  const naoResolvido = confirmarResolucaoCliente.bind(null, id, false);

  const listaEventos = (eventos ?? []) as EventoCliente[];
  // "Em análise" sem mensagem nova (o cliente disse que não ficou resolvido ou
  // enviou a informação pedida): texto próprio.
  const ultimoMotivo = [...listaEventos]
    .reverse()
    .find((e) => ["comunicacao_recebida", "cliente_rejeitou_resolucao", "informacao_cliente_enviada"].includes(e.tipo));
  const apresentacao = estadoCasoCliente(caso.status, (textoAtual?.estado as EstadoTextoRelevante | undefined) ?? null, {
    jaEnviado: (envios ?? []).length > 0,
    analiseSemResposta: !!ultimoMotivo && ultimoMotivo.tipo !== "comunicacao_recebida",
  });
  const concluido = caso.status === "Resolvido";
  const encerradoExterno = caso.status === ESTADO_ENCERRADO_EXTERNO;
  const encerrado = caso.status === "Encerrado sem resolução" || encerradoExterno;
  const dossie = (dossies?.[0] as DossieCliente | undefined) ?? null;
  const aguardaDecisao = caso.status === "Aguardando decisão cliente";
  const pedido = pedidos?.[0] ?? null;
  const pedidoAberto = caso.status === "Aguardando cliente" && pedido?.estado === "aberto" ? pedido : null;
  const solucao = (decisoes ?? []).find((d) => d.decisao === "resolucao_proposta");
  const encaminhamento = (decisoes ?? []).find((d) => d.decisao === "encaminhar");
  const mostrarEncaminhamento = (caso.status === "Bloqueado" || (encerrado && !encerradoExterno)) && !!encaminhamento?.mensagem_cliente;

  // Cronologia: caso recebido → acontecimentos registados (só os visíveis
  // ao cliente) → situação atual → próximo passo (ou conclusão).
  const referencias = new Map((envios ?? []).map((e) => [e.texto_id as string, (e.referencia as string | null) ?? null]));
  const passos: PassoLinhaTemporal[] = [
    { id: "recebido", titulo: "Caso recebido", quando: formatarDataHora(caso.created_at), estado: "feito" },
    ...cronologiaCliente(listaEventos, referencias).map((e, i) => ({
      id: `evento-${i}`,
      titulo: e.titulo,
      quando: formatarDataHora(e.quando),
      detalhe: e.detalhe,
      estado: "feito" as const,
    })),
    concluido || encerrado
      ? { id: "concluido", titulo: concluido ? "Caso concluído" : encerradoExterno ? "Acompanhamento terminado" : "Caso encerrado", estado: "feito" as const }
      : { id: "atual", titulo: apresentacao.rotulo, estado: "atual" as const },
    ...(!concluido && !encerrado && apresentacao.proximoPasso
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
      {query.confirmado === "resolvido" && <Aviso tom="sucesso">Obrigado pela confirmação. O caso fica dado como resolvido.</Aviso>}
      {query.confirmado === "nao_resolvido" && (
        <Aviso tom="sucesso">Obrigado. A DoLado vai analisar a situação e indicar-lhe o próximo passo.</Aviso>
      )}
      {query.informacao === "enviada" && <Aviso tom="sucesso">Recebemos a informação. A DoLado vai analisá-la.</Aviso>}
      {query.erro && <Aviso tom="erro">{query.erro}</Aviso>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Ponto de situação */}
          {encerradoExterno ? (
            <>
              <EncerramentoExternoResumo dossie={dossie} />
              <EntidadesResolucaoConflitos />
            </>
          ) : (
            <section
              aria-labelledby="situacao"
              className={`${concluido ? CARTAO_SUCESSO : apresentacao.requerAcao ? CARTAO_ACAO : CARTAO_DESTAQUE} flex flex-col gap-3`}
              aria-live="polite"
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
                <a href={aguardaDecisao ? "#decisao" : pedidoAberto ? "#pedido" : "#texto"} className={`${LIGACAO} self-start text-[14.5px]`}>
                  {aguardaDecisao ? "Ver a solução" : pedidoAberto ? "Ver o que precisamos" : "Rever o texto"}
                  <IconeSeta tamanho={16} />
                </a>
              )}
            </section>
          )}

          {aguardaDecisao && (
            <section id="decisao" aria-labelledby="decisao-titulo" className={`${CARTAO_ACAO} flex scroll-mt-24 flex-col gap-4`}>
              <h2 id="decisao-titulo" className={TITULO_SECCAO}>
                A empresa apresentou uma solução
              </h2>
              {solucao?.mensagem_cliente ? (
                <p className={`${TEXTO} whitespace-pre-wrap`}>{solucao.mensagem_cliente}</p>
              ) : (
                <p className={TEXTO}>A empresa apresentou uma solução para o seu caso.</p>
              )}
              <p className={TEXTO_SECUNDARIO}>O problema ficou resolvido? Só damos o caso por resolvido com a sua confirmação.</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <form action={resolvido}>
                  <button type="submit" className={`${BOTAO_PRIMARIO} w-full sm:w-auto`}>
                    O problema ficou resolvido
                  </button>
                </form>
                <form action={naoResolvido}>
                  <button type="submit" className={`${BOTAO_SECUNDARIO} w-full sm:w-auto`}>
                    O problema não ficou resolvido
                  </button>
                </form>
              </div>
            </section>
          )}

          {pedidoAberto && (
            <section id="pedido" aria-labelledby="pedido-titulo" className={`${CARTAO_ACAO} flex scroll-mt-24 flex-col gap-4`}>
              <h2 id="pedido-titulo" className={TITULO_SECCAO}>
                Precisamos de informação sua
              </h2>
              <p className={`${TEXTO} whitespace-pre-wrap`}>{pedidoAberto.pedido}</p>
              {pedidoAberto.instrucoes && <p className={`${TEXTO_SECUNDARIO} whitespace-pre-wrap`}>{pedidoAberto.instrucoes}</p>}
              {pedidoAberto.prazo && (
                <p className={TEXTO_SECUNDARIO}>
                  <span className="font-semibold text-[var(--v2-navy)]">Prazo: </span>
                  {new Date(`${pedidoAberto.prazo}T00:00:00`).toLocaleDateString("pt-PT", { dateStyle: "long" })}
                </p>
              )}
              <form action={responderPedidoCliente.bind(null, id, pedidoAberto.id as string)} className="flex flex-col gap-4">
                <label className={ROTULO}>
                  A sua resposta
                  <textarea name="resposta" rows={4} maxLength={5000} className={`${CAMPO} leading-relaxed`} />
                </label>
                <label className={ROTULO}>
                  Ficheiros <span className={AJUDA_CAMPO}>PDF ou imagem; até 5 ficheiros e 20 MB no total</span>
                  <input
                    type="file"
                    name="ficheiros"
                    multiple
                    accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                    className={`${CAMPO} file:mr-3 file:rounded-[8px] file:border-0 file:bg-[var(--v2-mint)] file:px-3 file:py-1.5 file:font-semibold file:text-[var(--v2-green-dark)]`}
                  />
                </label>
                <p className={METADADOS}>Os ficheiros ficam guardados no seu caso e só a equipa DoLado os vê.</p>
                <div>
                  <button type="submit" className={`${BOTAO_PRIMARIO} w-full sm:w-auto`}>
                    Enviar informação
                  </button>
                </div>
              </form>
            </section>
          )}

          {mostrarEncaminhamento && (
            <section aria-labelledby="encaminhamento-titulo" className={`${CARTAO} flex flex-col gap-3`}>
              <h2 id="encaminhamento-titulo" className={TITULO_SECCAO}>
                {encerrado ? "Encerramento do caso" : "Próximo passo indicado pela DoLado"}
              </h2>
              <p className={`${TEXTO} whitespace-pre-wrap`}>{encaminhamento!.mensagem_cliente}</p>
              <p className={TEXTO_SECUNDARIO}>Se tiver dúvidas, responda ao último e-mail da DoLado ou escreva-nos.</p>
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
            seguimento={(envios ?? []).length > 0}
          />

          {enviosCliente.map((envio, i) => (
            <ReclamacaoEnviada
              key={envio.id}
              envio={envio}
              seguimento={i < enviosCliente.length - 1}
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
