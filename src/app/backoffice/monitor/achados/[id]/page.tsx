import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROTULO_ACHADO } from "@/lib/monitor/achados";
import { ROTULO_CAMPO, formatarDataPt, formatarEurosCents, formatarValorCampo } from "@/lib/monitor/contratos";
import type { CampoContrato } from "@/lib/monitor/extracaoFatura";
import { comunicarAchado, decidirAchado } from "../actions";
import { CabecalhoPagina } from "@/components/backoffice/Cabecalho";
import { Dado, Historico, ListaDados, Seccao } from "@/components/backoffice/Blocos";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import { ConfirmarAcao } from "@/components/backoffice/ConfirmarAcao";
import { Etiqueta } from "@/components/backoffice/Estado";
import { Aviso } from "@/components/portal/Aviso";
import {
  AJUDA_CAMPO,
  BLOCO_LEITURA,
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CAIXA_SELECAO,
  CAMPO,
  CAMPO_TEXTO_LONGO,
  LIGACAO,
  LINHA_SELECAO,
  ROTULO,
} from "@/components/backoffice/ui";

type Fatura = {
  id: string;
  documento_id: string;
  data_emissao: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  total_cents: number | null;
  recorrente_cents: number | null;
  cessacao_operador_cents: number | null;
  linhas: { descricao: string; categoria: string; valorCents: number; recorrente: boolean | null }[];
};

function data(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Lisbon" });
}

function CartaoFatura({ titulo, f, atual = false }: { titulo: string; f: Fatura; atual?: boolean }) {
  return (
    <div className={`flex flex-col gap-2 rounded-[12px] border p-4 ${atual ? "border-[var(--v2-line-strong)] bg-white" : "border-[var(--v2-line)] bg-[var(--v2-surface)]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] font-bold">
          {titulo} · {formatarDataPt(f.periodo_inicio)} a {formatarDataPt(f.periodo_fim)}
        </p>
        <Link href={`/backoffice/monitor/${f.documento_id}`} prefetch={false} className={`${LIGACAO} text-[13px]`}>
          Abrir documento
        </Link>
      </div>
      <p className="text-[13px] text-[var(--v2-muted)]">Emitida {formatarDataPt(f.data_emissao)}</p>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div>
          <dt className="text-[12.5px] text-[var(--v2-muted)]">Total</dt>
          <dd className="font-semibold tabular-nums">{formatarEurosCents(f.total_cents)}</dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-[var(--v2-muted)]">Recorrente</dt>
          <dd className="font-semibold tabular-nums">{formatarEurosCents(f.recorrente_cents)}</dd>
        </div>
        {f.cessacao_operador_cents != null && (
          <div>
            <dt className="text-[12.5px] text-[var(--v2-muted)]">Cessação</dt>
            <dd className="font-semibold tabular-nums">{formatarEurosCents(f.cessacao_operador_cents)}</dd>
          </div>
        )}
      </dl>
      {(f.linhas ?? []).length > 0 && (
        <ul className="flex flex-col divide-y divide-[var(--v2-line)] border-t border-[var(--v2-line)] text-[13px]">
          {(f.linhas ?? []).map((l, i) => (
            <li key={i} className="flex justify-between gap-3 py-1.5">
              <span>
                {l.descricao}{" "}
                <span className="text-[var(--v2-muted)]">
                  ({l.categoria}
                  {l.recorrente === true ? ", recorrente" : l.recorrente === false ? ", pontual" : ""})
                </span>
              </span>
              <span className="shrink-0 tabular-nums">{formatarEurosCents(l.valorCents)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function AchadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; guardado?: string; comunicado?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  await requireAdmin();
  const admin = createAdminClient();

  const { data: a } = await admin.from("achados_monitor").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();

  const evidencia = (a.evidencia ?? {}) as Record<string, unknown>;
  const idsFaturas = [a.fatura_id, evidencia.fatura_anterior_id, ...((evidencia.faturas as string[]) ?? [])].filter(Boolean) as string[];

  const [{ data: contrato }, { data: campos }, { data: faturas }, { data: revisoes }] = await Promise.all([
    admin.from("contratos_monitorizados").select("id, fornecedor, setor, utilizador_id").eq("id", a.contrato_id).maybeSingle(),
    admin.from("contratos_campos").select("campo, valor, origem, confianca").eq("contrato_id", a.contrato_id).eq("estado", "atual"),
    // Acompanhamento (acomp_*): a fatura e as anteriores do mesmo serviço.
    String(a.versao_regra).startsWith("acomp_")
      ? admin
          .from("faturas_monitor")
          .select("id, documento_id, data_emissao, periodo_inicio, periodo_fim, total_cents, recorrente_cents, cessacao_operador_cents, linhas")
          .eq("contrato_id", a.contrato_id)
          .order("data_emissao", { ascending: false })
          .limit(6)
      : admin
          .from("faturas_monitor")
          .select("id, documento_id, data_emissao, periodo_inicio, periodo_fim, total_cents, recorrente_cents, cessacao_operador_cents, linhas")
          .in("id", [...new Set(idsFaturas)]),
    admin.from("achados_revisoes").select("decisao, notas, created_at").eq("achado_id", id).order("created_at"),
  ]);

  const porId = new Map(((faturas ?? []) as Fatura[]).map((f) => [f.id, f]));
  const atual = a.fatura_id ? porId.get(a.fatura_id) : undefined;
  const outras = [...porId.values()].filter((f) => f.id !== a.fatura_id);
  const decidido = ["comunicado", "descartado", "obsoleto"].includes(a.estado);
  const textoProposto = (a.texto_cliente as string | null) ?? (evidencia.texto_proposto as string | undefined) ?? "";

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        voltar={{ href: "/backoffice/monitor/achados", texto: "Situações detetadas" }}
        contexto="Proteção · situação detetada"
        titulo={ROTULO_ACHADO[a.tipo] ?? a.tipo}
        estado={<Etiqueta tom={decidido ? "neutro" : "acao"}>{decidido ? a.estado : "Por decidir"}</Etiqueta>}
        meta={
          <>
            {contrato?.fornecedor ?? "—"} ({contrato?.setor}) · regra {a.versao_regra}
          </>
        }
      />

      {query.comunicado === "email" && <Aviso tom="sucesso">Comunicado ao cliente (portal e e-mail).</Aviso>}
      {query.comunicado === "portal" && (
        <Aviso tom="sucesso">Comunicado no portal (sem e-mail: conta sem e-mail confirmado ou falha no envio).</Aviso>
      )}
      {query.guardado && <Aviso tom="sucesso">Decisão registada.</Aviso>}
      {query.erro && <Aviso tom="erro">{query.erro}</Aviso>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Seccao titulo="Faturas" descricao="A fatura que originou a situação e as comparadas.">
            {atual && <CartaoFatura titulo="Fatura atual" f={atual} atual />}
            {outras.map((f) => (
              <CartaoFatura key={f.id} titulo="Fatura comparada" f={f} />
            ))}
            {!atual && outras.length === 0 && <p className="text-[14px] text-[var(--v2-muted)]">Sem faturas associadas.</p>}
          </Seccao>

          <Seccao titulo="Dados do serviço registados">
            {(campos ?? []).length === 0 ? (
              <p className="text-[14px] text-[var(--v2-muted)]">Sem dados registados.</p>
            ) : (
              <ListaDados>
                {(campos ?? []).map((c) => (
                  <Dado key={c.campo} rotulo={ROTULO_CAMPO[c.campo as CampoContrato]}>
                    {formatarValorCampo(c.campo as CampoContrato, c.valor)}{" "}
                    <span className="text-[12.5px] text-[var(--v2-muted)]">
                      ({c.origem}
                      {c.confianca ? ` · ${c.confianca}` : ""})
                    </span>
                  </Dado>
                ))}
              </ListaDados>
            )}
            <details className="rounded-[12px] border border-[var(--v2-line)]">
              <summary className="flex min-h-10 cursor-pointer items-center px-4 text-[14px] font-semibold">Evidência da regra</summary>
              <pre className="overflow-auto whitespace-pre-wrap break-words border-t border-[var(--v2-line)] bg-[var(--v2-surface)] p-4 font-mono text-[12px]">
                {JSON.stringify(evidencia, null, 2)}
              </pre>
            </details>
          </Seccao>

          {(revisoes ?? []).length > 0 && (
            <Seccao titulo="Revisões" descricao="Decisões registadas. Só leitura.">
              <Historico
                eventos={revisoes!.map((r, i) => ({
                  id: String(i),
                  quando: data(r.created_at),
                  titulo: r.decisao,
                  detalhe: r.notas ?? undefined,
                }))}
              />
            </Seccao>
          )}
        </div>

        <aside aria-label="Decisão" className="flex flex-col gap-5 xl:sticky xl:top-6">
          {decidido ? (
            a.texto_cliente ? (
              <Seccao titulo="Texto comunicado">
                <div className={`${BLOCO_LEITURA} whitespace-pre-wrap`}>{a.texto_cliente}</div>
              </Seccao>
            ) : (
              <Seccao titulo="Decisão tomada">
                <p className="text-[14px] text-[var(--v2-muted)]">Esta situação já foi decidida ({a.estado}).</p>
              </Seccao>
            )
          ) : (
            <>
              <Seccao titulo="Comunicar ao cliente" destaque>
                <form action={comunicarAchado} className="flex flex-col gap-3">
                  <input type="hidden" name="achado_id" value={a.id} />
                  <p className={AJUDA_CAMPO}>
                    Descreva o facto e o que merece ser verificado. Nunca conclua que a empresa errou ou violou a lei. O cliente vê este texto no portal e
                    recebe-o por e-mail.
                  </p>
                  <label className={ROTULO}>
                    Texto para o cliente
                    <textarea name="texto" rows={7} defaultValue={textoProposto} className={CAMPO_TEXTO_LONGO} maxLength={1500} required />
                  </label>
                  <label className={ROTULO}>
                    Notas internas <span className={AJUDA_CAMPO}>(opcional)</span>
                    <textarea name="notas" rows={2} className={CAMPO} />
                  </label>
                  <label className={LINHA_SELECAO}>
                    <input type="checkbox" name="revisto" value="sim" required className={CAIXA_SELECAO} /> Revi a situação, as faturas e o texto
                  </label>
                  <div>
                    <ConfirmarAcao
                      className={BOTAO_PRIMARIO}
                      titulo="Comunicar ao cliente?"
                      descricao="O texto fica visível no portal do cliente e é enviado por e-mail para o endereço confirmado da conta. Não pode ser desfeito."
                      confirmar="Confirmar e comunicar"
                      aDecorrer="A comunicar…"
                    >
                      Confirmar e comunicar
                    </ConfirmarAcao>
                  </div>
                </form>
              </Seccao>

              <Seccao titulo="Outra decisão" descricao="Sem comunicação ao cliente.">
                <form action={decidirAchado} className="flex flex-col gap-3">
                  <input type="hidden" name="achado_id" value={a.id} />
                  <label className={ROTULO}>
                    Decisão
                    <select name="decisao" className={CAMPO} defaultValue="descartar">
                      <option value="descartar">Descartar (não comunicar)</option>
                      <option value="corrigir_dados">Os dados lidos estão errados — vou corrigir</option>
                      <option value="pedir_informacao">Pedir mais informação ou documentos ao cliente</option>
                    </select>
                  </label>
                  <label className={ROTULO}>
                    Motivo ou notas <span className={AJUDA_CAMPO}>(obrigatório para descartar)</span>
                    <textarea name="notas" rows={2} className={CAMPO} />
                  </label>
                  <div>
                    <BotaoSubmeter className={BOTAO_SECUNDARIO}>Registar decisão</BotaoSubmeter>
                  </div>
                </form>
              </Seccao>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
