import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CLASSIFICACAO_ROTULO,
  DECISAO_SUGERIDA,
  DECISOES,
  ESTADO_ANALISE,
  MOTIVOS_FALHA_ANALISE,
  PROXIMO_PASSO_ROTULO,
  RESPONDEU_ROTULO,
  ROTULO_CANAL_RECEBIDA,
  type Decisao,
} from "@/lib/acompanhamento/apresentacao";
import { MOTIVOS_REJEICAO_ANEXO } from "@/lib/comunicacoes/anexos";
import type { AnaliseIA } from "@/lib/analiseResposta/validacao";
import { analiseIAAtiva } from "@/lib/analiseResposta/servidor";
import { CabecalhoPagina } from "@/components/backoffice/Cabecalho";
import { Dado, ListaDados, Seccao } from "@/components/backoffice/Blocos";
import { Etiqueta, IndicadorIA } from "@/components/backoffice/Estado";
import { Aviso } from "@/components/portal/Aviso";
import { AJUDA_CAMPO, BOTAO_SECUNDARIO, CODIGO, LIGACAO, METADADOS, TEXTO_DOCUMENTO, TITULO_BLOCO } from "@/components/backoffice/ui";
import { decidirAposAnalise, pedirAnaliseIA } from "../../../acompanhamento-actions";
import { DecisaoAnalise, type TipoEncaminhamento } from "../../../_components/DecisaoAnalise";
import { AtualizarEnquanto } from "../../../_components/AtualizarEnquanto";

// Comunicação recebida num caso (equipa): o que chegou (só como texto), os
// anexos, a análise sugerida pela IA (interna) e a decisão humana. O
// conteúdo é de fora da DoLado: nunca é apresentado como HTML.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMITE_ANALISE_MS = 5 * 60 * 1000;

function dataHora(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Lisbon" }) : "—";
}

function tamanho(bytes: number | null) {
  if (bytes == null) return "";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (!itens.length) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[13px] font-semibold text-[var(--v2-navy)]">{titulo}</p>
      <ul className="list-disc pl-5 text-[14px] text-[var(--v2-navy)]">
        {itens.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

type Endereco = { email: string; nome: string | null };

export default async function ComunicacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; comId: string }>;
  searchParams: Promise<{ acomp_ok?: string; acomp_erro?: string }>;
}) {
  const { id, comId } = await params;
  const query = await searchParams;
  if (!UUID.test(id) || !UUID.test(comId)) notFound();
  const { supabase } = await requireAdmin();

  const { data: com } = await supabase.from("casos_comunicacoes_recebidas").select("*").eq("id", comId).eq("caso_id", id).maybeSingle();
  if (!com) notFound();

  const admin = createAdminClient();
  const [{ data: caso }, { data: anexos }, { data: analises }, { data: decisao }, { data: envio }, { data: tipos }] = await Promise.all([
    supabase.from("casos").select("id, nome, empresa, status").eq("id", id).single(),
    supabase.from("casos_comunicacoes_anexos").select("id, nome, tipo_mime, tamanho_bytes, estado, motivo_rejeicao").eq("comunicacao_id", comId).order("indice"),
    supabase
      .from("casos_analises_ia")
      .select("id, estado, origem, erro, erro_detalhe, modelo, created_at, concluido_em, resposta")
      .eq("comunicacao_id", comId)
      .order("created_at", { ascending: false })
      .limit(5),
    admin.from("casos_analises").select("decisao, classificacao, resumo, mensagem_cliente, tipo_encaminhamento, created_at, estado_novo").eq("comunicacao_id", comId).maybeSingle(),
    admin
      .from("casos_textos_envios")
      .select("enviado_em, referencia, casos_textos(versao, conteudo)")
      .eq("caso_id", id)
      .lte("enviado_em", com.recebida_em)
      .order("enviado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("tipos_encaminhamento").select("codigo, rotulo, descricao_cliente").eq("ativo", true).order("ordem"),
  ]);

  const agora = new Date().getTime();
  const ultima = analises?.[0];
  const aGerar = ultima?.estado === "a_gerar" && agora - new Date(ultima.created_at).getTime() < LIMITE_ANALISE_MS;
  const falhou = ultima && (ultima.estado === "falhou" || (ultima.estado === "a_gerar" && !aGerar));
  const analise = ultima?.estado === "gerado" ? (ultima.resposta as AnaliseIA) : null;
  const iaAtiva = analiseIAAtiva();
  const porAnalisar = com.estado_analise === "por_analisar";
  const textoEnviado = (Array.isArray(envio?.casos_textos) ? envio?.casos_textos[0] : envio?.casos_textos) as { versao: number; conteudo: string } | null;
  const para = (com.para ?? []) as Endereco[];
  const cc = (com.cc ?? []) as Endereco[];
  const fmt = (e: Endereco) => (e.nome ? `${e.nome} <${e.email}>` : e.email);
  const estadoAnalise = ESTADO_ANALISE[com.estado_analise as string];

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        voltar={{ href: `/backoffice/casos/${id}#comunicacoes`, texto: caso?.nome ?? "Caso" }}
        contexto={`Comunicação recebida · ${caso?.empresa ?? "empresa por indicar"}`}
        titulo={com.assunto || "(sem assunto)"}
        estado={<Etiqueta tom={estadoAnalise.tom}>{estadoAnalise.rotulo}</Etiqueta>}
        meta={
          <>
            Empresa → DoLado ·{" "}
            {com.origem === "email" ? "E-mail para o endereço do caso" : `Registo manual · ${ROTULO_CANAL_RECEBIDA[com.canal] ?? com.canal}`} · recebida{" "}
            {dataHora(com.recebida_em)}
            {com.transitou ? " · pôs o caso em análise" : ` · chegou com o caso em “${com.estado_caso_na_rececao}”`}
          </>
        }
      />

      {com.estado_processamento === "falhou" && (
        <Aviso tom="atencao" titulo="Não foi possível obter todos os anexos.">
          A mensagem está guardada. O Resend volta a enviar o aviso e os anexos são obtidos de novo automaticamente; também estão disponíveis no
          Resend.
        </Aviso>
      )}
      {query.acomp_ok && <Aviso tom="sucesso">{query.acomp_ok}</Aviso>}
      {query.acomp_erro && <Aviso tom="erro">{query.acomp_erro}</Aviso>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Seccao id="mensagem" titulo="Mensagem recebida" descricao="Conteúdo de fora da DoLado, mostrado só como texto (sem imagens, ligações ativas nem scripts).">
            <ListaDados>
              <Dado rotulo="Remetente">
                {com.remetente_nome || "—"}
                {com.remetente_email ? <span className="block break-all text-[var(--v2-muted)]">{com.remetente_email}</span> : null}
              </Dado>
              <Dado rotulo="Data da mensagem">{dataHora(com.data_mensagem)}</Dado>
              {para.length > 0 && <Dado rotulo="Para">{para.map(fmt).join(", ")}</Dado>}
              {((com.responder_para ?? []) as Endereco[]).length > 0 && (
                <Dado rotulo="Responder para">{((com.responder_para ?? []) as Endereco[]).map(fmt).join(", ")}</Dado>
              )}
              {cc.length > 0 && <Dado rotulo="Cc">{cc.map(fmt).join(", ")}</Dado>}
              {com.message_id && (
                <Dado rotulo="Message-ID">
                  <span className={CODIGO}>{com.message_id}</span>
                </Dado>
              )}
              {com.in_reply_to && (
                <Dado rotulo="Em resposta a">
                  <span className={CODIGO}>{com.in_reply_to}</span>
                </Dado>
              )}
            </ListaDados>
            <div className="flex flex-wrap gap-2">
              {com.automatica && <Etiqueta tom="neutro">Parece uma resposta automática</Etiqueta>}
              {com.suspeita_spam && <Etiqueta tom="aviso">Possível spam (SPF, DKIM e DMARC sem validação)</Etiqueta>}
              {com.cabecalhos?.autenticacao && <span className={METADADOS}>Autenticação na receção: {com.cabecalhos.autenticacao}</span>}
              {com.truncado && <Etiqueta tom="aviso">Conteúdo muito longo: cortado na apresentação</Etiqueta>}
            </div>
            <div className={TEXTO_DOCUMENTO}>{com.corpo_apresentacao || com.corpo_texto || "(sem texto)"}</div>
            {com.corpo_html && (
              <details className="rounded-[12px] border border-[var(--v2-line)]">
                <summary className="flex min-h-10 cursor-pointer items-center px-4 text-[13.5px] font-semibold text-[var(--v2-navy)]">
                  HTML original (código, guardado como prova)
                </summary>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all border-t border-[var(--v2-line)] p-3 font-mono text-[12px] text-[var(--v2-muted)]">
                  {com.corpo_html}
                </pre>
              </details>
            )}
          </Seccao>

          <Seccao id="anexos" titulo="Anexos" descricao="Só tipos permitidos e verificados. Abrem sempre como descarga.">
            {!anexos?.length ? (
              <p className="text-[14px] text-[var(--v2-muted)]">{com.anexos_processados_em || com.origem === "manual" ? "Sem anexos." : "A processar os anexos…"}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {anexos.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
                    {a.estado === "guardado" ? (
                      <a href={`/api/comunicacoes/anexos/${a.id}`} className={`${LIGACAO} break-all`}>
                        {a.nome}
                      </a>
                    ) : (
                      <span className="break-all text-[var(--v2-muted)] line-through">{a.nome}</span>
                    )}
                    <span className={METADADOS}>
                      {a.estado === "guardado" ? tamanho(a.tamanho_bytes) : `Não guardado: ${MOTIVOS_REJEICAO_ANEXO[a.motivo_rejeicao ?? ""] ?? a.motivo_rejeicao}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Seccao>

          {textoEnviado && (
            <Seccao titulo="Pedido original" descricao={`Última comunicação enviada antes desta mensagem (versão ${textoEnviado.versao}, ${dataHora(envio?.enviado_em)}).`}>
              {envio?.referencia && <p className="text-[14px] text-[var(--v2-navy)]">Referência: {envio.referencia}</p>}
              <details className="rounded-[12px] border border-[var(--v2-line)]">
                <summary className="flex min-h-10 cursor-pointer items-center px-4 text-[13.5px] font-semibold text-[var(--v2-navy)]">Ver o texto enviado</summary>
                <div className={`${TEXTO_DOCUMENTO} m-3`}>{textoEnviado.conteudo}</div>
              </details>
            </Seccao>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Seccao
            id="analise"
            titulo="Análise sugerida pela IA"
            descricao="Interna e preliminar: não decide nada, nunca é mostrada ao cliente. Pode corrigi-la ou ignorá-la."
            estado={analise && <IndicadorIA revistoEm={porAnalisar ? null : (com.analisada_em as string)} rotulo={porAnalisar ? "Sugestão IA · Por rever" : "Sugestão IA · Revista"} />}
          >
            {aGerar && (
              <p className="text-[14px] text-[var(--v2-muted)]" role="status">
                A gerar a análise (pedido {dataHora(ultima?.created_at)})… A página atualiza sozinha.
                <AtualizarEnquanto />
              </p>
            )}
            {!aGerar && falhou && (
              <Aviso tom="erro" titulo="Não foi possível gerar a análise automática. Faça a análise manualmente.">
                <p>{ultima?.estado === "a_gerar" ? MOTIVOS_FALHA_ANALISE.interrompido : (MOTIVOS_FALHA_ANALISE[ultima?.erro ?? ""] ?? "Motivo desconhecido.")}</p>
              </Aviso>
            )}
            {!ultima && (
              <p className="text-[14px] text-[var(--v2-muted)]">
                {iaAtiva ? "Ainda sem análise automática." : "A análise automática está desativada neste ambiente. Faça a análise manualmente."}
              </p>
            )}
            {analise && (
              <div className="flex flex-col gap-3">
                <ListaDados>
                  <Dado rotulo="Classificação sugerida">{CLASSIFICACAO_ROTULO[analise.tipo_mensagem]}</Dado>
                  <Dado rotulo="Respondeu ao pedido?">{RESPONDEU_ROTULO[analise.respondeu_ao_pedido]}</Dado>
                  <Dado rotulo="Resultado aparente">{analise.resultado_aparente || "—"}</Dado>
                  <Dado rotulo="Próximo passo sugerido">
                    {PROXIMO_PASSO_ROTULO[analise.proximo_passo_sugerido]}
                    {analise.proximo_passo_explicacao && <span className="block text-[var(--v2-muted)]">{analise.proximo_passo_explicacao}</span>}
                  </Dado>
                  <Dado rotulo="Precisa do cliente?">{analise.requer_intervencao_cliente ? "Sim" : "Não"}</Dado>
                  <Dado rotulo="Precisa de nova resposta?">{analise.requer_nova_resposta ? "Sim" : "Não"}</Dado>
                </ListaDados>
                <div className="flex flex-col gap-1">
                  <p className="text-[13px] font-semibold text-[var(--v2-navy)]">Resumo</p>
                  <p className="whitespace-pre-wrap text-[14px] text-[var(--v2-navy)]">{analise.resumo}</p>
                </div>
                <Lista titulo="O que a empresa aceitou" itens={analise.aceite} />
                <Lista titulo="O que recusou" itens={analise.recusado} />
                <Lista titulo="Fundamentação apresentada pela empresa" itens={analise.fundamentacao_empresa} />
                <Lista titulo="Pontos não respondidos" itens={analise.pontos_nao_respondidos} />
                <Lista titulo="Contradições ou problemas" itens={analise.contradicoes_ou_problemas} />
                <Lista titulo="Informação ou documentos necessários" itens={analise.informacao_necessaria} />
                <Lista
                  titulo="Referências jurídicas possivelmente relevantes (base da DoLado)"
                  itens={(analise.referencias_juridicas ?? []).map((r) => `${r.rule_id} — ${r.razao}`)}
                />
                {[...analise.avisos_servidor, ...analise.avisos].length > 0 && (
                  <Aviso tom="atencao" titulo="Avisos para a revisão">
                    <ul className="list-disc pl-5">
                      {[...analise.avisos_servidor, ...analise.avisos].map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </Aviso>
                )}
                <p className={AJUDA_CAMPO}>
                  Gerada {dataHora(ultima?.concluido_em)} · {ultima?.modelo ?? "—"} · confiança interna: {analise.confianca} (indicador para a revisão)
                </p>
              </div>
            )}
            {iaAtiva && porAnalisar && !aGerar && (
              <form action={pedirAnaliseIA.bind(null, id, comId)}>
                <button type="submit" className={BOTAO_SECUNDARIO}>
                  {falhou ? "Tentar novamente" : analise ? "Gerar nova análise" : "Gerar análise com IA"}
                </button>
              </form>
            )}
          </Seccao>

          <Seccao id="decisao" titulo={porAnalisar ? "Decisão da DoLado" : "Decisão registada"} destaque={porAnalisar}>
            {porAnalisar ? (
              <DecisaoAnalise
                action={decidirAposAnalise.bind(null, id, comId)}
                temComunicacao
                tipos={(tipos ?? []) as TipoEncaminhamento[]}
                sugestao={
                  analise
                    ? {
                        decisao: DECISAO_SUGERIDA[analise.proximo_passo_sugerido] ?? null,
                        classificacao: analise.tipo_mensagem,
                        resumo: analise.resumo,
                        analiseIaId: ultima!.id as string,
                        pedido: analise.informacao_necessaria.join("\n") || null,
                      }
                    : undefined
                }
              />
            ) : decisao ? (
              <div className="flex flex-col gap-2 text-[14px]">
                <p className={TITULO_BLOCO}>
                  {DECISOES[decisao.decisao as Decisao]?.letra}. {DECISOES[decisao.decisao as Decisao]?.rotulo}
                </p>
                <p className={METADADOS}>
                  {dataHora(decisao.created_at)} · caso passou a “{decisao.estado_novo}”
                  {decisao.classificacao ? ` · ${CLASSIFICACAO_ROTULO[decisao.classificacao as keyof typeof CLASSIFICACAO_ROTULO] ?? decisao.classificacao}` : ""}
                </p>
                {decisao.resumo && <p className="whitespace-pre-wrap text-[var(--v2-navy)]">Análise: {decisao.resumo}</p>}
                {decisao.mensagem_cliente && <p className="whitespace-pre-wrap text-[var(--v2-muted)]">Ao cliente: {decisao.mensagem_cliente}</p>}
              </div>
            ) : (
              <p className="text-[14px] text-[var(--v2-muted)]">Analisada {dataHora(com.analisada_em)}.</p>
            )}
          </Seccao>
        </div>
      </div>
    </div>
  );
}
