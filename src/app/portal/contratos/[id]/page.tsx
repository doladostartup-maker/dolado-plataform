import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProtecao } from "@/lib/auth";
import { urlTratarCaso } from "@/lib/site";
import {
  ROTULO_CAMPO,
  ROTULO_ORIGEM,
  ROTULO_SETOR,
  formatarDataPt,
  formatarValorCampo,
  proximaData,
  setorTratarCaso,
  textoProximaData,
  type SetorContratoMonitor,
} from "@/lib/monitor/contratos";
import type { CampoContrato } from "@/lib/monitor/extracaoFatura";
import { confirmarValor, corrigirContrato, deixarDeAcompanhar, rejeitarValor } from "../actions";
import { CamposContrato } from "../_components/CamposContrato";
import { CustoSaida } from "../_components/CustoSaida";
import { UploadDocumento } from "../_components/UploadDocumento";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CARTAO, TITULO_SECCAO } from "../_components/estilos";

function hojeLisboa() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

// Ordem de apresentação dos dados do contrato.
const ORDEM: CampoContrato[] = [
  "fornecedor",
  "servico",
  "referencia_contrato",
  "mensalidade_cents",
  "data_inicio",
  "data_fim_fidelizacao",
  "vantagem_cents",
  "tipo_fidelizacao",
  "nova_instalacao",
  "equipamento_subsidiado",
  "data_fim_promocao",
  "descricao_promocao",
  "cpe",
  "cui",
];

const ESTADO_DOCUMENTO: Record<string, string> = {
  pendente: "A ser verificado pela DoLado",
  processado: "Lido",
  a_rever: "A ser verificado pela DoLado",
  ilegivel: "Não foi possível ler — carregue outra versão",
};

const MENSAGEM_DOCUMENTO: Record<string, string> = {
  processado: "Lemos o documento. Confirme os dados abaixo.",
  pendente: "Recebemos o documento. Ainda não o conseguimos ler automaticamente: a DoLado vai verificá-lo.",
  a_rever: "Lemos o documento, mas alguns dados precisam de ser verificados pela DoLado.",
};

type Campo = {
  id: string;
  campo: CampoContrato;
  valor: unknown;
  origem: string;
  estado: string;
  pagina: number | null;
  evidencia: string | null;
  confirmado_cliente_em: string | null;
  created_at: string;
};

function Origem({ c }: { c: Campo }) {
  const partes = [ROTULO_ORIGEM[c.origem] ?? c.origem];
  if (c.pagina) partes.push(`página ${c.pagina}`);
  if (c.origem !== "cliente" && c.confirmado_cliente_em) partes.push(`confirmado por si em ${formatarDataPt(c.confirmado_cliente_em)}`);
  return <span className="text-[12.5px] text-[var(--color-ink-faint)]">{partes.join(" · ")}</span>;
}

export default async function ContratoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; guardado?: string; documento?: string; aviso?: string; editar?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, user } = await requireProtecao("contratos");

  const { data: contrato } = await supabase
    .from("contratos_monitorizados")
    .select("*")
    .eq("id", id)
    .eq("utilizador_id", user.id)
    .is("desativado_em", null)
    .maybeSingle();
  if (!contrato) notFound();

  const [{ data: campos }, { data: documentos }, { data: achados }] = await Promise.all([
    supabase
      .from("contratos_campos")
      .select("id, campo, valor, origem, estado, pagina, evidencia, confirmado_cliente_em, created_at")
      .eq("contrato_id", id)
      .in("estado", ["atual", "proposto", "em_conflito"])
      .order("created_at", { ascending: true }),
    supabase
      .from("documentos_monitor")
      .select("id, tipo, nome_ficheiro, estado, created_at")
      .eq("contrato_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("achados_monitor").select("id, texto_cliente, comunicado_em").eq("contrato_id", id).order("comunicado_em", { ascending: false }),
  ]);

  const lista = (campos ?? []) as Campo[];
  const atuais = new Map(lista.filter((c) => c.estado === "atual").map((c) => [c.campo, c]));
  const porConfirmar = lista.filter((c) => c.estado === "proposto" || c.estado === "em_conflito");
  const hoje = hojeLisboa();
  const setor = setorTratarCaso(contrato.setor);
  const hrefCaso = `${urlTratarCaso("/portal/contratos")}${setor ? `&setor=${encodeURIComponent(setor)}` : ""}`;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">{contrato.fornecedor ?? "Fornecedor por confirmar"}</h1>
          <p className="text-sm text-[var(--color-ink-faint)]">{ROTULO_SETOR[contrato.setor as SetorContratoMonitor] ?? contrato.setor}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Link href="/portal/contratos#acrescentar" className={BOTAO_SECUNDARIO}>
            Acrescentar outro contrato
          </Link>
          <Link href="/portal/contratos" className="text-sm text-[var(--color-ink-muted)] underline">
            Voltar
          </Link>
        </div>
      </div>

      {query.documento && MENSAGEM_DOCUMENTO[query.documento] && (
        <p className="text-sm text-[var(--color-ink-muted)]">{MENSAGEM_DOCUMENTO[query.documento]}</p>
      )}
      {query.aviso === "repetido" && <p className="text-sm text-[var(--color-ink-muted)]">Este documento já tinha sido carregado.</p>}
      {query.guardado && <p className="text-sm text-[var(--color-status-success)]">✓ Dados guardados.</p>}
      {query.erro && <p className="text-sm text-[var(--color-status-danger)]">{query.erro}</p>}

      <p className="text-[15px] font-medium text-[var(--color-ink)]">{textoProximaData(proximaData(contrato, hoje))}</p>

      {/* ===== Dados por confirmar ===== */}
      {porConfirmar.length > 0 && (
        <section className={`${CARTAO} flex flex-col gap-4 border-[var(--color-brand)]`}>
          <div>
            <h2 className={TITULO_SECCAO}>Encontrámos estes dados no documento</h2>
            <p className="text-sm text-[var(--color-ink-muted)]">Confirme antes de começarmos a usá-los.</p>
          </div>
          {porConfirmar.map((c) => {
            const atual = atuais.get(c.campo);
            return (
              <div key={c.id} className="flex flex-col gap-2 border-t border-[var(--color-hairline)] pt-3 first:border-t-0 first:pt-0">
                <p className="text-sm text-[var(--color-ink-muted)]">{ROTULO_CAMPO[c.campo]}</p>
                {c.estado === "em_conflito" && atual ? (
                  <p className="text-[15px] text-[var(--color-ink)]">
                    Tem registado <strong>{formatarValorCampo(c.campo, atual.valor)}</strong>; o documento indica{" "}
                    <strong>{formatarValorCampo(c.campo, c.valor)}</strong>.
                  </p>
                ) : (
                  <p className="text-[15px] font-semibold text-[var(--color-ink)]">{formatarValorCampo(c.campo, c.valor)}</p>
                )}
                <Origem c={c} />
                {c.evidencia && <p className="text-[13px] italic text-[var(--color-ink-faint)]">“{c.evidencia}”</p>}
                <div className="flex flex-wrap gap-2">
                  <form action={confirmarValor}>
                    <input type="hidden" name="campo_id" value={c.id} />
                    <button type="submit" className={BOTAO_PRIMARIO}>
                      {c.estado === "em_conflito" ? "Usar o valor do documento" : "Está correto"}
                    </button>
                  </form>
                  <form action={rejeitarValor}>
                    <input type="hidden" name="campo_id" value={c.id} />
                    <button type="submit" className={BOTAO_SECUNDARIO}>
                      {c.estado === "em_conflito" ? "Manter o meu" : "Não está correto"}
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ===== Situações comunicadas pela DoLado ===== */}
      {(achados ?? []).length > 0 && (
        <section className={`${CARTAO} flex flex-col gap-3`}>
          <h2 className={TITULO_SECCAO}>Situações que merecem ser verificadas</h2>
          {achados!.map((a) => (
            <div key={a.id} className="flex flex-col gap-1">
              <p className="text-sm text-[var(--color-ink)]">{a.texto_cliente}</p>
              <span className="text-[12.5px] text-[var(--color-ink-faint)]">{formatarDataPt(a.comunicado_em)}</span>
            </div>
          ))}
          <a href={hrefCaso} className={`${BOTAO_PRIMARIO} self-start`}>
            Tratar o meu caso
          </a>
        </section>
      )}

      {/* ===== Dados do contrato ===== */}
      <section className={`${CARTAO} flex flex-col gap-3`}>
        <h2 className={TITULO_SECCAO}>Dados do contrato</h2>
        <dl className="flex flex-col">
          {ORDEM.filter((campo) => atuais.has(campo)).map((campo) => {
            const c = atuais.get(campo)!;
            return (
              <div key={campo} className="flex flex-col gap-0.5 border-b border-[var(--color-hairline)] py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <dt className="text-sm text-[var(--color-ink-muted)]">{ROTULO_CAMPO[campo]}</dt>
                <dd className="flex flex-col sm:items-end">
                  <span className="text-[15px] text-[var(--color-ink)]">{formatarValorCampo(campo, c.valor)}</span>
                  <Origem c={c} />
                </dd>
              </div>
            );
          })}
          {atuais.size === 0 && <p className="text-sm text-[var(--color-ink-muted)]">Ainda não temos dados confirmados deste contrato.</p>}
        </dl>
        <details open={Boolean(query.editar)} className="pt-1">
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-brand)]">Corrigir ou acrescentar dados</summary>
          <form action={corrigirContrato} className="mt-4 flex flex-col gap-4">
            <input type="hidden" name="contrato_id" value={contrato.id} />
            <CamposContrato valores={contrato} />
            <p className="text-[12.5px] text-[var(--color-ink-faint)]">
              Os valores que corrigir passam a ser os registados; os anteriores ficam guardados no histórico.
            </p>
            <button type="submit" className={`${BOTAO_PRIMARIO} self-start`}>
              Guardar
            </button>
          </form>
        </details>
      </section>

      <CustoSaida contrato={contrato} hoje={hoje} />

      {/* ===== Documentos ===== */}
      <section className={`${CARTAO} flex flex-col gap-4`}>
        <h2 className={TITULO_SECCAO}>Documentos</h2>
        {(documentos ?? []).length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {documentos!.map((d) => (
              <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <a href={`/api/monitor/documentos/${d.id}`} target="_blank" rel="noopener noreferrer" className="text-[var(--color-ink)] underline decoration-[var(--color-hairline-strong)] underline-offset-2 hover:text-[var(--color-brand)]">
                  {d.tipo === "contrato" ? "Contrato" : "Fatura"} · {formatarDataPt(d.created_at)}
                  {d.nome_ficheiro && <span className="text-[var(--color-ink-faint)]"> · {d.nome_ficheiro}</span>}
                </a>
                <span className="text-[12.5px] text-[var(--color-ink-faint)]">{ESTADO_DOCUMENTO[d.estado] ?? d.estado}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-ink-muted)]">Ainda não carregou documentos deste contrato.</p>
        )}
        <details>
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-brand)]">Carregar uma fatura ou o contrato</summary>
          <div className="mt-4">
            <UploadDocumento contratoId={contrato.id} />
          </div>
        </details>
      </section>

      {/* ===== Ações ===== */}
      <section className="flex flex-col gap-3">
        <p className="text-sm text-[var(--color-ink-muted)]">Está a ter um problema com este contrato?</p>
        <a href={hrefCaso} className={`${BOTAO_SECUNDARIO} self-start`}>
          Tratar o meu caso
        </a>
      </section>

      <details className="text-sm">
        <summary className="cursor-pointer text-[var(--color-status-danger)]">Deixar de acompanhar este contrato</summary>
        <form action={deixarDeAcompanhar} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="contrato_id" value={contrato.id} />
          <p className="text-[var(--color-ink-muted)]">
            Deixamos de enviar avisos e apagamos os documentos e os dados deste contrato. Esta ação não pode ser desfeita.
          </p>
          <label className="flex items-center gap-2 text-[var(--color-ink)]">
            <input type="checkbox" name="confirmar" value="sim" required /> Quero deixar de acompanhar e apagar os dados
          </label>
          <button type="submit" className="self-start text-[var(--color-status-danger)] underline">
            Deixar de acompanhar
          </button>
        </form>
      </details>
    </div>
  );
}
