import { notFound } from "next/navigation";
import { EVENTOS_CASO } from "@/lib/textoCaso";
import { prazosCaso, proximaAcao } from "@/lib/backoffice/triagem";
import { CabecalhoPagina } from "@/components/backoffice/Cabecalho";
import { Dado, Historico, ListaDados, Seccao, type EventoHistorico } from "@/components/backoffice/Blocos";
import { ConfirmarAcao } from "@/components/backoffice/ConfirmarAcao";
import { EstadoCaso, Etiqueta, IndicadorPrazo } from "@/components/backoffice/Estado";
import { dataCurta } from "@/components/backoffice/TabelaCasos";
import { Aviso } from "@/components/portal/Aviso";
import { BLOCO_LEITURA, BOTAO_DESTRUTIVO, BOTAO_PRIMARIO, BOTAO_SECUNDARIO, EYEBROW, LIGACAO } from "@/components/backoffice/ui";
import { createClient } from "@/lib/supabase/server";
import { actualizarCaso, decidirCaso } from "../actions";
import { carregarAnexo, apagarAnexo } from "../anexos-actions";
import { CasoForm } from "../_components/CasoForm";
import { EnviarBoasVindas } from "../_components/EnviarBoasVindas";
import { AnexosCaso } from "../_components/AnexosCaso";
import {
  TextoCaso,
  dataHora,
  type AutorizacaoTexto,
  type EnvioTexto,
  type EventoCaso,
  type PedidoAlteracao,
  type VersaoTexto,
} from "../_components/TextoCaso";
import { EnviosCaso, type ComprovativoEquipa, type EnvioEquipa } from "../_components/EnviosCaso";
import { createAdminClient } from "@/lib/supabase/admin";
import { rascunhoIAAtivo } from "@/lib/rascunhoIA/servidor";
import type { GeracaoIA } from "../_components/RascunhoIA";

// casos.origem_credito: caso disponível gasto para abrir o caso. A compra
// única (Avulso / Caso Extra) fica ligada ao caso em case_credit_grants.caso_id.
const ORIGEM_COMERCIAL: Record<string, string> = {
  subscricao: "Caso incluído na subscrição",
  caso_extra: "Caso Extra (subscritor)",
  avulso: "Avulso",
};

const ATOR: Record<string, string> = { cliente: "pelo cliente", equipa: "pela DoLado", sistema: "automático" };

export default async function CasoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; guardado?: string; texto_ok?: string; texto_erro?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const { data: caso } = await supabase
    .from("casos")
    .select("*")
    .eq("id", id)
    .single();

  if (!caso) {
    notFound();
  }

  const { data: anexosData } = await supabase
    .from("anexos")
    .select("id, nome_ficheiro, tamanho_bytes, created_at")
    .eq("caso_id", id)
    .order("created_at", { ascending: false });

  // Texto para envio: leitura com a sessão do admin (RLS: só SELECT).
  const [versoes, autorizacoes, pedidos, envios, eventos, geracoes] = await Promise.all([
    supabase
      .from("casos_textos")
      .select("id, versao, conteudo, conteudo_sha256, estado, created_at, enviado_para_revisao_em, autorizado_em, alteracoes_solicitadas_em, enviado_em, substituido_em, origem, rascunho_ia_id, revisto_em")
      .eq("caso_id", id)
      .order("versao", { ascending: false }),
    supabase.from("casos_textos_autorizacoes").select("texto_id, autorizado_em, metodo, conteudo_sha256").eq("caso_id", id),
    supabase.from("casos_textos_pedidos_alteracao").select("texto_id, mensagem, created_at, metodo").eq("caso_id", id).order("created_at"),
    supabase
      .from("casos_textos_envios")
      .select("id, texto_id, destinatario, canal, resultado, enviado_em, conteudo_sha256")
      .eq("caso_id", id)
      .order("enviado_em"),
    supabase.from("casos_eventos").select("tipo, versao, ator, created_at").eq("caso_id", id).order("created_at"),
    // Sugestões da IA (só o admin lê — RLS).
    supabase
      .from("casos_rascunhos_ia")
      .select("id, estado, origem, erro, erro_detalhe, modelo, created_at, concluido_em, confianca, resposta, regras_enviadas")
      .eq("caso_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Comprovativos: com a service role (o layout já exigiu admin) para ler a
  // nota interna, que a API não expõe. O caminho no storage nunca sai do servidor.
  const { data: comprovativos } = await createAdminClient()
    .from("casos_comprovativos")
    .select("id, envio_id, tipo, nome, identificador_externo, nota, tamanho_bytes, created_at, substituido_em")
    .eq("caso_id", id)
    .order("created_at");
  const textosPorId = new Map((versoes.data ?? []).map((v) => [v.id as string, v]));
  const enviosEquipa: EnvioEquipa[] = (envios.data ?? []).map((e) => ({
    ...(e as Omit<EnvioEquipa, "versao" | "conteudo">),
    versao: (textosPorId.get(e.texto_id as string)?.versao as number | undefined) ?? null,
    conteudo: (textosPorId.get(e.texto_id as string)?.conteudo as string | undefined) ?? null,
  }));

  const anexos = (anexosData ?? []).map((anexo) => ({
    ...anexo,
    apagarAction: apagarAnexo.bind(null, anexo.id, id),
  }));

  const actualizarComId = actualizarCaso.bind(null, id);
  const aceitar = decidirCaso.bind(null, id, "aceitou");
  const recusar = decidirCaso.bind(null, id, "recusou");
  const carregarComId = carregarAnexo.bind(null, id);

  const agora = new Date().getTime();
  const criadoEm = dataHora(caso.created_at);

  // Apresentação: estado, próxima ação e prazos (sem efeitos).
  const versoesTexto = (versoes.data ?? []) as VersaoTexto[];
  const atual = versoesTexto[0];
  const triagem = {
    ...caso,
    texto: atual ? { estado: atual.estado, origem: atual.origem, revisto_em: atual.revisto_em, versao: atual.versao } : null,
  };
  const acao = proximaAcao(triagem);
  const prazos = prazosCaso(triagem);
  const problema = caso.problema_tipo || caso.tipo_problema || "Sem categoria";
  const aguardaDecisao = caso.status === "Aguardando decisão cliente";

  const historico: EventoHistorico[] = [
    { id: "criado", quando: criadoEm, titulo: "Caso criado", detalhe: caso.origem ? `Origem: ${caso.origem}` : undefined },
    ...((eventos.data ?? []) as EventoCaso[]).map((e, i) => ({
      id: `${i}-${e.created_at}`,
      quando: dataHora(e.created_at),
      titulo: `${EVENTOS_CASO[e.tipo] ?? e.tipo}${e.versao ? ` (versão ${e.versao})` : ""}`,
      ator: ATOR[e.ator] ?? e.ator,
    })),
  ];

  const ANCORAS = [
    ["contexto", "Problema"],
    ["texto", "Reclamação"],
    ["envio", "Envio"],
    ["documentos", "Documentos"],
    ["dados", "Dados do caso"],
    ["historico", "Histórico"],
  ] as const;

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        voltar={{ href: "/backoffice/casos", texto: "Casos" }}
        contexto={`${caso.sector ?? "Sem setor"} · ${problema}`}
        titulo={caso.nome}
        estado={<EstadoCaso status={caso.status} />}
        meta={
          <>
            Contra <strong className="font-semibold text-[var(--v2-navy)]">{caso.empresa || "empresa por indicar"}</strong> · criado em {criadoEm} ·{" "}
            origem comercial: {ORIGEM_COMERCIAL[caso.origem_credito as string] ?? "sem registo"}
          </>
        }
        acoes={
          acao.interna &&
          acao.ancora && (
            <a href={`#${acao.ancora}`} className={BOTAO_PRIMARIO}>
              {acao.rotulo}
            </a>
          )
        }
      />

      {query.guardado && <Aviso tom="sucesso">Alterações guardadas.</Aviso>}
      {query.erro && (
        <Aviso tom="erro" titulo="Não foi possível guardar.">
          {query.erro}
        </Aviso>
      )}

      {/* Próxima ação (ActionPanel) e prazos. */}
      <div
        className={`grid gap-4 rounded-[14px] border p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] ${
          acao.interna ? "border-[var(--v2-green)] bg-white shadow-[0_0_0_3px_var(--v2-mint)]" : "border-[var(--v2-line)] bg-white"
        }`}
      >
        <div className="flex flex-col gap-1.5">
          <p className={EYEBROW}>{acao.interna ? "Próxima ação da DoLado" : acao.aguarda ? "A aguardar" : "Estado"}</p>
          <div>
            <Etiqueta tom={acao.tom}>{acao.rotulo}</Etiqueta>
          </div>
          <p className="text-[14px] text-[var(--v2-muted)]">{acao.descricao}</p>
        </div>
        <div className="flex flex-col gap-2">
          <p className={EYEBROW}>Prazos</p>
          {prazos.length === 0 ? (
            <p className="text-[14px] text-[var(--v2-muted)]">Sem prazos a decorrer.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {prazos.map((p) => (
                <li key={p.tipo}>
                  <IndicadorPrazo prazo={p} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Navegação interna */}
      <nav aria-label="Secções do caso" className="-mx-1 flex gap-1 overflow-x-auto px-1">
        {ANCORAS.map(([ancora, texto]) => (
          <a
            key={ancora}
            href={`#${ancora}`}
            className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-[var(--v2-line)] bg-white px-3 text-[13px] font-semibold text-[var(--v2-muted)] hover:border-[var(--v2-green)] hover:text-[var(--v2-navy)]"
          >
            {texto}
          </a>
        ))}
      </nav>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Seccao id="contexto" titulo="Problema" descricao="O que o cliente submeteu.">
            {caso.descricao ? (
              <div className={`${BLOCO_LEITURA} whitespace-pre-wrap`}>{caso.descricao}</div>
            ) : (
              <p className="text-[14px] text-[var(--v2-muted)]">Sem descrição.</p>
            )}
            <ListaDados colunas={2}>
              <Dado rotulo="Empresa reclamada">{caso.empresa || "—"}</Dado>
              <Dado rotulo="Setor">{caso.sector ?? "—"}</Dado>
              <Dado rotulo="O que aconteceu">{caso.problema_tipo || "—"}</Dado>
              <Dado rotulo="Tipo de problema">{caso.tipo_problema || "—"}</Dado>
              <Dado rotulo="Já reclamou?">{caso.momento_cliente || "—"}</Dado>
              <Dado rotulo="Fim da fidelização">{caso.data_fim_fidelidade ? dataCurta(caso.data_fim_fidelidade) : "—"}</Dado>
              <Dado rotulo="Valor indicado">{caso.valor_indicado != null ? `${caso.valor_indicado} €` : "—"}</Dado>
              <Dado rotulo="Disposto a pagar">{caso.disposicao_pagar ? "Sim" : "Não"}</Dado>
            </ListaDados>
          </Seccao>

          <TextoCaso
            casoId={id}
            temEmail={!!caso.email}
            versoes={versoesTexto}
            autorizacoes={(autorizacoes.data ?? []) as AutorizacaoTexto[]}
            pedidos={(pedidos.data ?? []) as PedidoAlteracao[]}
            envios={(envios.data ?? []) as EnvioTexto[]}
            geracoes={(geracoes.data ?? []) as GeracaoIA[]}
            iaAtiva={rascunhoIAAtivo()}
            agora={agora}
            ok={query.texto_ok}
            erro={query.texto_erro}
            destaque={acao.interna && acao.ancora === "texto"}
          />

          <EnviosCaso casoId={id} envios={enviosEquipa} comprovativos={(comprovativos ?? []) as ComprovativoEquipa[]} />

          <Seccao id="documentos" titulo="Documentos" descricao="Anexos do caso e dossiê.">
            <AnexosCaso anexos={anexos} carregarAction={carregarComId} />
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--v2-line)] pt-3 text-[14px]">
              <span className="font-semibold">Dossiê:</span>
              {caso.dossie_url ? (
                <a href={caso.dossie_url} target="_blank" rel="noopener noreferrer" className={LIGACAO}>
                  Abrir o dossiê
                </a>
              ) : (
                <span className="text-[var(--v2-muted)]">ainda sem link — preencha em “Dados do caso”.</span>
              )}
            </div>
          </Seccao>

          <Seccao id="dados" titulo="Dados do caso" descricao="Editar todos os campos do caso.">
            <CasoForm action={actualizarComId} valores={caso} submitLabel="Guardar alterações" />
          </Seccao>

          <Seccao id="historico" titulo="Histórico" descricao="Eventos registados no caso, do mais antigo ao mais recente. Só leitura.">
            <Historico eventos={historico} />
          </Seccao>
        </div>

        <aside aria-label="Resumo do caso" className="flex flex-col gap-5 xl:sticky xl:top-6">
          <Seccao titulo="Cliente">
            <ListaDados>
              <Dado rotulo="Nome">{caso.nome}</Dado>
              <Dado rotulo="E-mail">
                {caso.email ? (
                  <a href={`mailto:${caso.email}`} className={`${LIGACAO} break-all`}>
                    {caso.email}
                  </a>
                ) : (
                  <span className="text-[var(--v2-erro)]">Sem e-mail</span>
                )}
              </Dado>
              <Dado rotulo="Telefone">{caso.telefone || "—"}</Dado>
              <Dado rotulo="Parceiro">{caso.empresa_parceira || "—"}</Dado>
              <Dado rotulo="Comunicações">{caso.consentimento_alertas ? "Marcou a caixa opcional" : "Sem autorização"}</Dado>
            </ListaDados>
            <div className="flex flex-col gap-1.5 border-t border-[var(--v2-line)] pt-3">
              <p className="text-[13px] font-semibold">E-mail de boas-vindas</p>
              <EnviarBoasVindas casoId={id} enviadoEmInicial={caso.email_boas_vindas_enviado_em ?? null} />
            </div>
          </Seccao>

          <Seccao
            id="decisao"
            titulo="Decisão do cliente"
            descricao="Registar a resposta do cliente à oferta da empresa."
            destaque={aguardaDecisao}
          >
            <div className="flex flex-col gap-2">
              <form action={aceitar}>
                <ConfirmarAcao
                  className={`${aguardaDecisao ? BOTAO_PRIMARIO : BOTAO_SECUNDARIO} w-full`}
                  titulo="O cliente aceitou a oferta?"
                  descricao="O caso passa a “Resolvido”, tipo A."
                  confirmar="Registar: aceitou"
                >
                  Cliente aceitou oferta
                </ConfirmarAcao>
              </form>
              <form action={recusar}>
                <ConfirmarAcao
                  className={`${BOTAO_DESTRUTIVO} w-full`}
                  titulo="O cliente recusou a oferta?"
                  descricao="O caso passa a “Bloqueado / escalada”, tipo B."
                  confirmar="Registar: recusou"
                  destrutiva
                >
                  Cliente recusou oferta
                </ConfirmarAcao>
              </form>
            </div>
          </Seccao>
        </aside>
      </div>
    </div>
  );
}
