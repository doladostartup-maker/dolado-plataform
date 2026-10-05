import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROTULO_CAMPO, ROTULO_ORIGEM, ROTULO_SETOR, SETORES_CONTRATO, formatarValorCampo } from "@/lib/monitor/contratos";
import type { CampoContrato } from "@/lib/monitor/extracaoFatura";
import { criarContratoParaDocumento, definirCampoAdmin, marcarDocumento, reprocessarDocumento } from "../actions";
import { AlterarTipoDocumento } from "../_components/AlterarTipoDocumento";
import { ROTULO_TIPO_DOCUMENTO, sugestaoTipoDocumento } from "@/lib/monitor/tipoDocumento";
import type { TomBackoffice } from "@/lib/backoffice/triagem";
import { CabecalhoPagina } from "@/components/backoffice/Cabecalho";
import { Dado, Historico, ListaDados, Seccao } from "@/components/backoffice/Blocos";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import { Etiqueta } from "@/components/backoffice/Estado";
import { Aviso } from "@/components/portal/Aviso";
import {
  AJUDA_CAMPO,
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  BOTAO_TERCIARIO,
  CAMPO,
  LIGACAO,
  ROTULO,
} from "@/components/backoffice/ui";

const MOTIVO: Record<string, string> = {
  api_nao_configurada: "A ANTHROPIC_API_KEY não está configurada no servidor (Clever Cloud). O documento fica pendente até haver chave.",
  erro_api: "A Claude API respondeu com erro. Verifique a chave e o modelo (ANTHROPIC_DOCUMENT_MODEL) no Clever Cloud.",
  orcamento_atingido: "O orçamento da Claude API (ANTHROPIC_ORCAMENTO_USD) foi atingido. Aumente o teto para continuar a ler documentos automaticamente.",
  ficheiro_nao_encontrado: "O ficheiro não foi encontrado no Storage.",
  formato_nao_lido: "Este formato não é lido automaticamente.",
  recusa: "A Claude API recusou ler o documento.",
  resposta_invalida: "A leitura não devolveu um resultado válido.",
  validacao: "Os dados lidos não passaram a validação.",
  nao_e_fatura: "A leitura indica que o documento não é uma fatura.",
  nao_e_contrato: "A leitura indica que o documento não é um contrato.",
  erro_inesperado: "Erro inesperado no processamento.",
};

const ESTADO_DOC: Record<string, { rotulo: string; tom: TomBackoffice }> = {
  pendente: { rotulo: "Por processar", tom: "aviso" },
  a_rever: { rotulo: "Por rever", tom: "acao" },
  processado: { rotulo: "Lido", tom: "sucesso" },
  ilegivel: { rotulo: "Ilegível", tom: "erro" },
};

function dataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Lisbon" });
}

export default async function DocumentoMonitorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; guardado?: string; resultado?: string; motivo?: string; detalhe?: string; tipo_alterado?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  await requireAdmin();
  const admin = createAdminClient();

  const { data: doc } = await admin.from("documentos_monitor").select("*").eq("id", id).maybeSingle();
  if (!doc) notFound();

  const [{ data: conta }, { data: extracoes }, { data: contrato }, { data: campos }, { data: alteracoesTipo }] = await Promise.all([
    admin.from("utilizadores").select("nome, email").eq("id", doc.utilizador_id).maybeSingle(),
    admin.from("extracoes_documento").select("id, modelo, schema_versao, prompt_versao, estado, erro, resultado, created_at").eq("documento_id", id).order("created_at", { ascending: false }),
    doc.contrato_id ? admin.from("contratos_monitorizados").select("id, setor, fornecedor, estado").eq("id", doc.contrato_id).maybeSingle() : Promise.resolve({ data: null }),
    doc.contrato_id
      ? admin.from("contratos_campos").select("id, campo, valor, origem, estado, confianca").eq("contrato_id", doc.contrato_id).in("estado", ["atual", "proposto", "em_conflito"]).order("campo")
      : Promise.resolve({ data: [] }),
    admin
      .from("documentos_tipo_alteracoes")
      .select("id, tipo_anterior, tipo_novo, alterado_por, leituras_invalidadas, fatura_removida, valores_retirados, created_at")
      .eq("documento_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const revisores = [...new Set((alteracoesTipo ?? []).map((a) => a.alterado_por))];
  const { data: contasRevisores } = revisores.length
    ? await admin.from("utilizadores").select("id, nome, email").in("id", revisores)
    : { data: [] };
  const revisor = new Map((contasRevisores ?? []).map((c) => [c.id, c.nome || c.email]));
  const sugestao = sugestaoTipoDocumento(doc, extracoes ?? []);
  const rotuloTipo = (t: string) => ROTULO_TIPO_DOCUMENTO[t] ?? t;

  const estadoDoc = ESTADO_DOC[doc.estado] ?? { rotulo: doc.estado, tom: "neutro" as TomBackoffice };
  const porTratar = doc.estado === "pendente" || doc.estado === "a_rever";

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        voltar={{ href: "/backoffice/monitor", texto: "Documentos por tratar" }}
        contexto="Proteção · documento"
        titulo={`${rotuloTipo(doc.tipo)} carregad${doc.tipo === "fatura" ? "a" : "o"}`}
        estado={<Etiqueta tom={estadoDoc.tom}>{estadoDoc.rotulo}</Etiqueta>}
        meta={
          <>
            {conta?.nome ?? "—"} · {conta?.email} · recebido em {dataHora(doc.created_at)}
          </>
        }
      />

      {query.resultado && (
        <Aviso
          tom={query.resultado === "processado" ? "sucesso" : "atencao"}
          titulo={query.resultado === "processado" ? "Documento lido." : `O documento ficou ${query.resultado === "pendente" ? "pendente" : "por rever"}.`}
        >
          {query.motivo && <p>{MOTIVO[query.motivo] ?? query.motivo}</p>}
          {query.detalhe && <p className="mt-1 break-words text-[12.5px]">{MOTIVO[query.detalhe] ?? query.detalhe}</p>}
        </Aviso>
      )}
      {query.tipo_alterado && (
        <Aviso tom="sucesso">Tipo alterado para {rotuloTipo(doc.tipo)}. A nova análise foi pedida com o pipeline deste tipo.</Aviso>
      )}
      {query.guardado && <Aviso tom="sucesso">Guardado.</Aviso>}
      {query.erro && <Aviso tom="erro">{query.erro}</Aviso>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Seccao
            titulo="Revisão do documento"
            destaque={porTratar}
            descricao="Abra o ficheiro, confirme a leitura e decida. Marcar como revisto ou ilegível tira o documento da fila."
          >
            {sugestao && (
              <Aviso tom="info" titulo={sugestao.texto}>
                Sugestão da leitura automática. O tipo só muda se o alterar abaixo.
              </Aviso>
            )}
            <div className="flex flex-wrap gap-2">
              <form action={marcarDocumento}>
                <input type="hidden" name="documento_id" value={doc.id} />
                <input type="hidden" name="estado" value="processado" />
                <BotaoSubmeter className={porTratar ? BOTAO_PRIMARIO : BOTAO_SECUNDARIO}>Marcar como revisto</BotaoSubmeter>
              </form>
              <form action={reprocessarDocumento}>
                <input type="hidden" name="documento_id" value={doc.id} />
                <BotaoSubmeter className={BOTAO_SECUNDARIO} aDecorrer="A ler… pode demorar até um minuto">
                  Ler de novo
                </BotaoSubmeter>
              </form>
              <form action={marcarDocumento}>
                <input type="hidden" name="documento_id" value={doc.id} />
                <input type="hidden" name="estado" value="ilegivel" />
                <BotaoSubmeter className={BOTAO_TERCIARIO}>Marcar como ilegível</BotaoSubmeter>
              </form>
            </div>
            <div className="border-t border-[var(--v2-line)] pt-4">
              <AlterarTipoDocumento documentoId={doc.id} tipoAtual={doc.tipo} sugerido={sugestao?.tipo ?? null} className={BOTAO_SECUNDARIO} inputClassName={CAMPO} />
            </div>
          </Seccao>

          {!contrato && (
            <Seccao titulo="Serviço" descricao="O documento ainda não está associado a nenhum serviço acompanhado.">
              <form action={criarContratoParaDocumento} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                <input type="hidden" name="documento_id" value={doc.id} />
                <label className={ROTULO}>
                  Setor
                  <select name="setor" className={CAMPO} defaultValue="telecomunicacoes">
                    {SETORES_CONTRATO.map((s) => (
                      <option key={s} value={s}>
                        {ROTULO_SETOR[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={ROTULO}>
                  Fornecedor
                  <input name="fornecedor" className={CAMPO} />
                </label>
                <BotaoSubmeter className={BOTAO_SECUNDARIO}>Criar serviço para este documento</BotaoSubmeter>
              </form>
            </Seccao>
          )}

          {contrato && (
            <Seccao titulo="Valores do serviço" descricao="Valores atuais, propostos e em conflito, com a origem de cada um.">
              {(campos ?? []).length === 0 ? (
                <p className="text-[14px] text-[var(--v2-muted)]">Sem valores registados.</p>
              ) : (
                <ListaDados>
                  {(campos ?? []).map((c) => (
                    <Dado key={c.id} rotulo={ROTULO_CAMPO[c.campo as CampoContrato]}>
                      <span className="flex flex-wrap items-center gap-2">
                        {formatarValorCampo(c.campo as CampoContrato, c.valor)}
                        <Etiqueta tom={c.estado === "em_conflito" ? "aviso" : c.estado === "proposto" ? "info" : "neutro"}>{c.estado}</Etiqueta>
                        <span className="text-[12.5px] text-[var(--v2-muted)]">
                          {ROTULO_ORIGEM[c.origem] ?? c.origem}
                          {c.confianca ? ` · ${c.confianca}` : ""}
                        </span>
                      </span>
                    </Dado>
                  ))}
                </ListaDados>
              )}
              <form action={definirCampoAdmin} className="flex flex-col gap-3 rounded-[12px] bg-[var(--v2-surface)] p-3.5">
                <input type="hidden" name="documento_id" value={doc.id} />
                <p className="text-[14px] font-bold">Corrigir um valor (origem: DoLado)</p>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                  <label className={ROTULO}>
                    Campo
                    <select name="campo" className={CAMPO}>
                      {(Object.keys(ROTULO_CAMPO) as CampoContrato[]).map((c) => (
                        <option key={c} value={c}>
                          {ROTULO_CAMPO[c]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={ROTULO}>
                    Valor
                    <input name="valor" placeholder="AAAA-MM-DD ou 42,99" className={CAMPO} />
                  </label>
                  <BotaoSubmeter className={BOTAO_SECUNDARIO}>Definir valor</BotaoSubmeter>
                </div>
                <p className={AJUDA_CAMPO}>
                  Um valor definido aqui passa a ser o atual e fica marcado como corrigido pela DoLado. Não use para concluir sobre o cumprimento da lei ou do
                  contrato.
                </p>
              </form>
            </Seccao>
          )}

          <Seccao titulo="Leituras" descricao="Resultados da leitura automática, da mais recente para a mais antiga.">
            {(extracoes ?? []).length === 0 && <p className="text-[14px] text-[var(--v2-muted)]">Sem leituras.</p>}
            {(extracoes ?? []).map((e) => (
              <details key={e.id} className="rounded-[12px] border border-[var(--v2-line)]">
                <summary className="flex min-h-10 cursor-pointer flex-wrap items-center gap-x-2 px-4 py-2 text-[13.5px]">
                  <span className="font-semibold">{dataHora(e.created_at)}</span>
                  <Etiqueta tom={e.estado === "invalidada" ? "neutro" : e.erro ? "erro" : "info"}>{e.estado === "invalidada" ? "posta de parte" : e.estado}</Etiqueta>
                  <span className="text-[var(--v2-muted)]">
                    {e.modelo} · {e.schema_versao}
                    {e.erro ? ` · ${e.erro}` : ""}
                  </span>
                </summary>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words border-t border-[var(--v2-line)] bg-[var(--v2-surface)] p-4 font-mono text-[12px] text-[var(--v2-navy)]">
                  {JSON.stringify(e.resultado, null, 2)}
                </pre>
              </details>
            ))}
          </Seccao>
        </div>

        <aside aria-label="Dados do documento" className="flex flex-col gap-5 xl:sticky xl:top-6">
          <Seccao titulo="Documento">
            <ListaDados>
              <Dado rotulo="Cliente">
                {conta?.nome ?? "—"}
                <span className="block text-[12.5px] text-[var(--v2-muted)]">{conta?.email}</span>
              </Dado>
              <Dado rotulo="Tipo indicado pelo cliente">{rotuloTipo(doc.tipo_indicado)}</Dado>
              <Dado rotulo="Tipo usado pelo sistema">
                <span className={doc.tipo !== doc.tipo_indicado ? "font-semibold" : undefined}>
                  {rotuloTipo(doc.tipo)}
                  {doc.tipo !== doc.tipo_indicado && " (alterado na revisão)"}
                </span>
              </Dado>
              <Dado rotulo="Estado">{doc.estado}</Dado>
              <Dado rotulo="Ficheiro">
                {/* Ligação assinada gerada no clique (rota /api/monitor/documentos). */}
                <a href={`/api/monitor/documentos/${doc.id}`} target="_blank" rel="noopener noreferrer" className={LIGACAO}>
                  Abrir ({doc.mime_type}, {Math.round((doc.tamanho_bytes ?? 0) / 1024)} KB)
                </a>
              </Dado>
              <Dado rotulo="Serviço">
                {contrato ? `${contrato.fornecedor ?? "sem fornecedor"} · ${ROTULO_SETOR[contrato.setor as keyof typeof ROTULO_SETOR]} · ${contrato.estado}` : "por associar"}
              </Dado>
            </ListaDados>
          </Seccao>

          {(alteracoesTipo ?? []).length > 0 && (
            <Seccao titulo="Alterações do tipo">
              <Historico
                eventos={(alteracoesTipo ?? []).map((a) => ({
                  id: a.id,
                  quando: dataHora(a.created_at),
                  ator: revisor.get(a.alterado_por) ?? a.alterado_por,
                  titulo: `${rotuloTipo(a.tipo_anterior)} → ${rotuloTipo(a.tipo_novo)}`,
                  detalhe: `${a.leituras_invalidadas} leitura(s) posta(s) de parte${a.fatura_removida ? " · fatura registada retirada" : ""}${
                    a.valores_retirados ? ` · ${a.valores_retirados} valor(es) retirado(s)` : ""
                  }`,
                }))}
              />
            </Seccao>
          )}
        </aside>
      </div>
    </div>
  );
}
