import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { actualizarCaso, decidirCaso } from "../actions";
import { carregarAnexo, apagarAnexo } from "../anexos-actions";
import { CasoForm } from "../_components/CasoForm";
import { EnviarBoasVindas } from "../_components/EnviarBoasVindas";
import { AnexosCaso } from "../_components/AnexosCaso";
import {
  TextoCaso,
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
  const criadoEm = new Date(caso.created_at).toLocaleString("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
          {caso.nome}
        </h1>
        <p className="text-[var(--text-caption)] text-[var(--color-ink-faint)]">
          Criado em {criadoEm}
          {caso.origem && ` · origem: ${caso.origem}`}
          {` · origem comercial: ${ORIGEM_COMERCIAL[caso.origem_credito as string] ?? "sem registo"}`}
          {caso.consentimento_alertas && " · marcou a caixa opcional de comunicações"}
        </p>
      </div>

      {query.guardado && (
        <p className="text-sm text-[var(--color-status-success)]">Alterações guardadas.</p>
      )}
      {query.erro && <p className="text-sm text-[var(--color-status-danger)]">{query.erro}</p>}

      <div className="flex gap-3">
        <form action={aceitar}>
          <button
            type="submit"
            className="rounded-[var(--radius-button)] border border-[var(--color-status-success)] bg-[var(--color-surface)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-status-success)] hover:bg-[var(--color-status-success-wash)]"
          >
            Cliente aceitou oferta
          </button>
        </form>
        <form action={recusar}>
          <button
            type="submit"
            className="rounded-[var(--radius-button)] border border-[var(--color-status-danger)] bg-[var(--color-surface)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-wash)]"
          >
            Cliente recusou oferta
          </button>
        </form>
      </div>

      <EnviarBoasVindas
        casoId={id}
        enviadoEmInicial={caso.email_boas_vindas_enviado_em ?? null}
      />

      <TextoCaso
        casoId={id}
        temEmail={!!caso.email}
        versoes={(versoes.data ?? []) as VersaoTexto[]}
        autorizacoes={(autorizacoes.data ?? []) as AutorizacaoTexto[]}
        pedidos={(pedidos.data ?? []) as PedidoAlteracao[]}
        envios={(envios.data ?? []) as EnvioTexto[]}
        eventos={(eventos.data ?? []) as EventoCaso[]}
        geracoes={(geracoes.data ?? []) as GeracaoIA[]}
        iaAtiva={rascunhoIAAtivo()}
        agora={agora}
        ok={query.texto_ok}
        erro={query.texto_erro}
      />

      <EnviosCaso casoId={id} envios={enviosEquipa} comprovativos={(comprovativos ?? []) as ComprovativoEquipa[]} />

      <AnexosCaso anexos={anexos} carregarAction={carregarComId} />

      <CasoForm action={actualizarComId} valores={caso} submitLabel="Guardar alterações" />
    </div>
  );
}
