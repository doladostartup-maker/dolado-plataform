import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { decidirClienteCaso } from "../actions";
import { StatusBadge } from "@/components/StatusBadge";
import type { EstadoTexto } from "@/lib/textoCaso";
import { TextoCliente } from "../_components/TextoCliente";
import {
  Comprovativo,
  HistoricoCaso,
  ReclamacaoEnviada,
  type ComprovativoCliente,
  type EnvioCliente,
} from "../_components/ReclamacaoEnviada";

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

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
          {caso.empresa ?? caso.empresa_parceira ?? "O seu caso"}
        </h1>
        <StatusBadge status={caso.status} />
      </div>

      {query.guardado && (
        <p className="text-sm text-[var(--color-status-success)]">
          A sua decisão foi registada.
        </p>
      )}
      {query.erro && <p className="text-sm text-[var(--color-status-danger)]">{query.erro}</p>}

      <dl className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 text-sm shadow-[var(--shadow-subtle)]">
        <div>
          <dt className="text-[var(--color-ink-muted)]">Setor</dt>
          <dd className="text-[var(--color-ink)]">{caso.sector ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-ink-muted)]">Tipo de problema</dt>
          <dd className="text-[var(--color-ink)]">{caso.tipo_problema ?? caso.problema_tipo ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-ink-muted)]">Descrição</dt>
          <dd className="text-[var(--color-ink)]">{caso.descricao ?? "—"}</dd>
        </div>
        {caso.data_fim_fidelidade && (
          <div>
            <dt className="text-[var(--color-ink-muted)]">Fim de fidelidade</dt>
            <dd className="text-[var(--color-ink)]">{caso.data_fim_fidelidade}</dd>
          </div>
        )}
        {caso.dossie_url && (
          <div>
            <dt className="text-[var(--color-ink-muted)]">Dossiê</dt>
            <dd>
              <a
                href={caso.dossie_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-brand)] underline"
              >
                Ver dossiê
              </a>
            </dd>
          </div>
        )}
      </dl>

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
        <section className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-subtle)]">
          <Comprovativo comprovativo={comprovativoSemEnvio} />
        </section>
      )}

      {caso.status === "Aguardando decisão cliente" && (
        <div
          className="flex flex-col gap-3 rounded-[var(--radius-card)] p-5"
          style={{ backgroundColor: "var(--color-status-urgent-wash)" }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: "var(--color-status-urgent)" }}
          >
            Foi encontrada uma proposta para o seu caso
            {caso.valor_indicado != null
              ? ` no valor de ${caso.valor_indicado} €`
              : ""}
            . O que decide?
          </p>
          <div className="flex gap-3">
            <form action={aceitar}>
              <button
                type="submit"
                className="rounded-[var(--radius-button)] border border-[var(--color-status-success)] bg-[var(--color-surface)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-status-success)] hover:bg-[var(--color-status-success-wash)]"
              >
                Aceito
              </button>
            </form>
            <form action={recusar}>
              <button
                type="submit"
                className="rounded-[var(--radius-button)] border border-[var(--color-status-danger)] bg-[var(--color-surface)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-wash)]"
              >
                Não aceito, quero avançar
              </button>
            </form>
          </div>
        </div>
      )}
      <HistoricoCaso eventos={(eventos ?? []) as { tipo: string; created_at: string }[]} />
    </div>
  );
}
