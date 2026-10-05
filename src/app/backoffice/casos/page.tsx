import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { COLUNAS_CASO_LISTA, juntarTextos, type CasoLista } from "@/lib/backoffice/filas";
import { ESTADOS_CASO, VISTAS_CASOS, estadoCaso, pertenceVista, prioridade, type VistaCasos } from "@/lib/backoffice/triagem";
import { SETORES } from "@/lib/pedidoCaso";
import { CabecalhoPagina } from "@/components/backoffice/Cabecalho";
import { TabelaCasos } from "@/components/backoffice/TabelaCasos";
import { IconeLupa, IconeMais } from "@/components/backoffice/Icones";
import { Aviso } from "@/components/portal/Aviso";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, BOTAO_TERCIARIO, CAMPO, ROTULO } from "@/components/backoffice/ui";

const ORDENS = {
  prioridade: "Prioridade",
  recentes: "Mais recentes",
  antigos: "Mais antigos",
  fidelizacao: "Fim da fidelização",
} as const;
type Ordem = keyof typeof ORDENS;

type Params = { q?: string; vista?: string; status?: string; sector?: string; empresa?: string; ordem?: string };

/** Termo de pesquisa sem os caracteres com significado no filtro do PostgREST. */
function termo(q: string | undefined) {
  return (q ?? "").replace(/[,()%*\\]/g, " ").trim().slice(0, 80);
}

function ordenar(casos: CasoLista[], ordem: Ordem) {
  const lista = [...casos];
  if (ordem === "recentes") return lista.sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (ordem === "antigos") return lista.sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (ordem === "fidelizacao") {
    return lista.sort((a, b) => (a.data_fim_fidelidade ?? "9999").localeCompare(b.data_fim_fidelidade ?? "9999"));
  }
  const hoje = new Date();
  return lista.sort((a, b) => prioridade(a, hoje) - prioridade(b, hoje));
}

export default async function CasosPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const vista: VistaCasos = params.vista && params.vista in VISTAS_CASOS ? (params.vista as VistaCasos) : "todos";
  const ordem: Ordem = params.ordem && params.ordem in ORDENS ? (params.ordem as Ordem) : "prioridade";
  const q = termo(params.q);

  let query = supabase.from("casos").select(COLUNAS_CASO_LISTA).order("created_at", { ascending: false });
  if (params.status) query = query.eq("status", params.status);
  if (params.sector) query = query.eq("sector", params.sector);
  if (params.empresa) query = query.ilike("empresa_parceira", `%${params.empresa}%`);
  if (q) query = query.or(`nome.ilike.%${q}%,email.ilike.%${q}%,empresa.ilike.%${q}%`);

  const { data, error } = await query;
  const todos = await juntarTextos(supabase, (data ?? []) as unknown as Omit<CasoLista, "texto">[]);
  const casos = ordenar(
    todos.filter((c) => pertenceVista(c, vista)),
    ordem,
  );

  const filtrosAtivos = !!(q || params.status || params.sector || params.empresa);
  const href = (mudar: Partial<Params>) => {
    const p = new URLSearchParams();
    const final = { ...params, ...mudar };
    for (const [k, v] of Object.entries(final)) if (v) p.set(k, v);
    const s = p.toString();
    return `/backoffice/casos${s ? `?${s}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        titulo="Casos"
        descricao="Todos os casos, ordenados pelo que precisa de intervenção primeiro."
        acoes={
          <Link href="/backoffice/casos/novo" prefetch={false} className={BOTAO_PRIMARIO}>
            <IconeMais tamanho={17} />
            Novo caso
          </Link>
        }
      />

      {/* Vistas (separadores) */}
      <nav aria-label="Vistas de casos" className="-mx-1 flex gap-1 overflow-x-auto border-b border-[var(--v2-line)] px-1">
        {(Object.keys(VISTAS_CASOS) as VistaCasos[]).map((v) => {
          const atual = v === vista;
          const n = todos.filter((c) => pertenceVista(c, v)).length;
          return (
            <Link
              key={v}
              href={href({ vista: v === "todos" ? undefined : v })}
              prefetch={false}
              aria-current={atual ? "page" : undefined}
              className={`-mb-px flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-[14px] font-semibold ${
                atual ? "border-[var(--v2-green)] text-[var(--v2-navy)]" : "border-transparent text-[var(--v2-muted)] hover:text-[var(--v2-navy)]"
              }`}
            >
              {VISTAS_CASOS[v]}
              <span className={`rounded-full px-1.5 text-[12px] font-bold tabular-nums ${atual ? "bg-[var(--v2-mint)] text-[var(--v2-green-dark)]" : "bg-[#EEF2F6]"}`}>
                {n}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Filtros (FilterBar): GET, sem JavaScript. */}
      <form role="search" aria-label="Filtrar casos" className="grid grid-cols-2 gap-3 rounded-[14px] border border-[var(--v2-line)] bg-white p-3 lg:grid-cols-[minmax(200px,1.6fr)_repeat(4,minmax(0,1fr))_auto]">
        {vista !== "todos" && <input type="hidden" name="vista" value={vista} />}
        <label className={`${ROTULO} col-span-2 lg:col-span-1`}>
          Pesquisar
          <span className="relative">
            <IconeLupa tamanho={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--v2-muted)]" />
            <input name="q" type="search" defaultValue={params.q ?? ""} placeholder="Nome, e-mail ou empresa" className={`${CAMPO} pl-9`} />
          </span>
        </label>
        <label className={ROTULO}>
          Estado
          <select name="status" defaultValue={params.status ?? ""} className={CAMPO}>
            <option value="">Todos</option>
            {ESTADOS_CASO.map((s) => (
              <option key={s} value={s}>
                {estadoCaso(s).rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className={ROTULO}>
          Setor
          <select name="sector" defaultValue={params.sector ?? ""} className={CAMPO}>
            <option value="">Todos</option>
            {SETORES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className={ROTULO}>
          Empresa parceira
          <input name="empresa" defaultValue={params.empresa ?? ""} placeholder="Ex.: Remax" className={CAMPO} />
        </label>
        <label className={ROTULO}>
          Ordenar por
          <select name="ordem" defaultValue={ordem} className={CAMPO}>
            {(Object.keys(ORDENS) as Ordem[]).map((o) => (
              <option key={o} value={o}>
                {ORDENS[o]}
              </option>
            ))}
          </select>
        </label>
        <div className="col-span-2 flex items-end gap-2 lg:col-span-1">
          <button type="submit" className={`${BOTAO_SECUNDARIO} flex-1 lg:flex-none`}>
            Aplicar
          </button>
          {filtrosAtivos && (
            <Link href={href({ q: undefined, status: undefined, sector: undefined, empresa: undefined })} prefetch={false} className={BOTAO_TERCIARIO}>
              Limpar
            </Link>
          )}
        </div>
      </form>

      {error && (
        <Aviso tom="erro" titulo="Não foi possível carregar os casos.">
          {error.message}
        </Aviso>
      )}

      <p className="text-[13px] text-[var(--v2-muted)]" aria-live="polite">
        {casos.length} {casos.length === 1 ? "caso" : "casos"}
        {filtrosAtivos ? " com os filtros aplicados" : ""}
      </p>

      <TabelaCasos
        casos={casos}
        vazio={
          filtrosAtivos
            ? { titulo: "Nenhum caso corresponde aos filtros.", texto: "Altere ou limpe os filtros para ver mais casos." }
            : vista === "acao"
              ? { titulo: "Nada precisa de intervenção agora.", texto: "Todos os casos em curso estão à espera do cliente ou da empresa." }
              : undefined
        }
      />
    </div>
  );
}
