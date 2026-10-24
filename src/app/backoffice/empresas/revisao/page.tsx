import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { CabecalhoPagina, TituloSeccao } from "@/components/backoffice/Cabecalho";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import { IconeCirculoVisto } from "@/components/backoffice/Icones";
import { Aviso } from "@/components/portal/Aviso";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import {
  BOTAO_PEQUENO,
  BOTAO_PRIMARIO,
  CAMPO,
  LIGACAO,
  METADADOS,
  TABELA,
  TABELA_MOLDURA,
  TABELA_TD,
  TABELA_TH,
  TABELA_TR,
} from "@/components/backoffice/ui";
import { RESULTADOS_REVISAO, TEXTO_MOTIVO_REVISAO, TIPOS_ERRO_REVISAO, type MotivoRevisao } from "@/lib/empresas/revisao";
import { registarRevisaoEmpresa } from "../actions";

// Fila de revisão humana dos documentos das empresas (D3, Fase 6B): nos
// primeiros 30 dias de cada empresa todos; depois, só por excepção (motivos
// gravados pelo pipeline). O documento abre-se na ficha do Monitor; aqui
// regista-se a revisão com os minutos e o tipo de erro.

export const dynamic = "force-dynamic";

type Linha = {
  documento_id: string;
  organizacao_id: string;
  instalacao_id: string;
  revisao_motivos: string[];
  created_at: string;
};

function data(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });
}

export default async function RevisaoEmpresasPage({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const { data: brutas } = await supabase
    .from("empresa_documentos")
    .select("documento_id, organizacao_id, instalacao_id, revisao_motivos, created_at")
    .eq("revisao_necessaria", true)
    .is("revisto_em", null)
    .order("created_at", { ascending: true })
    .limit(100);
  const linhas = (brutas ?? []) as Linha[];
  const [{ data: orgs }, { data: insts }, { data: docs }] = await Promise.all([
    supabase.from("organizacoes").select("id, nome").in("id", [...new Set(linhas.map((l) => l.organizacao_id))]),
    supabase.from("instalacoes").select("id, nome").in("id", [...new Set(linhas.map((l) => l.instalacao_id))]),
    supabase.from("documentos_monitor").select("id, tipo, nome_ficheiro, estado, contrato_id").in("id", linhas.map((l) => l.documento_id)),
  ]);
  const nome = (lista: { id: string; nome: string }[] | null, id: string) => lista?.find((x) => x.id === id)?.nome ?? "—";

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        contexto={
          <Link href="/backoffice/empresas" prefetch={false} className={LIGACAO}>
            Empresas
          </Link>
        }
        titulo="Revisão dos documentos"
        descricao="Enquanto não houver revisão, o resultado é provisório para a empresa («em verificação pela DoLado»). Registe sempre os minutos e, numa correcção, o tipo de erro."
      />
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}
      {params.ok && <Aviso tom="sucesso">{params.ok}</Aviso>}

      <section aria-labelledby="fila" className="flex flex-col gap-3">
        <TituloSeccao id="fila" titulo="Por rever" contagem={linhas.length} />
        {linhas.length === 0 ? (
          <EstadoVazio icone={<IconeCirculoVisto tamanho={20} />} titulo="Nenhum documento por rever." />
        ) : (
          <div className={TABELA_MOLDURA}>
            <table className={TABELA}>
              <thead>
                <tr>
                  <th scope="col" className={TABELA_TH}>Documento</th>
                  <th scope="col" className={TABELA_TH}>Porque precisa de revisão</th>
                  <th scope="col" className={TABELA_TH}>Revisão</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const d = docs?.find((x) => x.id === l.documento_id);
                  return (
                    <tr key={l.documento_id} className={TABELA_TR}>
                      <td className={TABELA_TD}>
                        <Link href={`/backoffice/monitor/${l.documento_id}`} prefetch={false} className={`${LIGACAO} block font-semibold`}>
                          {d?.nome_ficheiro ?? (d?.tipo === "contrato" ? "Contrato" : "Factura")}
                        </Link>
                        <span className="block text-[13px]">
                          {nome(orgs, l.organizacao_id)} · {nome(insts, l.instalacao_id)}
                        </span>
                        <span className={`${METADADOS} block`}>
                          {d?.contrato_id ? "Registado num serviço" : "Sem serviço (análise manual)"} · {data(l.created_at)}
                        </span>
                      </td>
                      <td className={TABELA_TD}>
                        <ul className="list-disc pl-4 text-[13px]">
                          {l.revisao_motivos.map((m) => (
                            <li key={m}>{TEXTO_MOTIVO_REVISAO[m as MotivoRevisao] ?? m}</li>
                          ))}
                        </ul>
                      </td>
                      <td className={TABELA_TD}>
                        <form action={registarRevisaoEmpresa.bind(null, l.documento_id)} className="flex min-w-[240px] flex-col gap-2">
                          <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
                            Minutos
                            <input name="minutos" type="number" min={0} max={600} required className={CAMPO} />
                          </label>
                          <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
                            Resultado
                            <select name="resultado" required className={CAMPO}>
                              {Object.entries(RESULTADOS_REVISAO).map(([v, t]) => (
                                <option key={v} value={v}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
                            Tipo de erro (numa correcção)
                            <select name="tipo_erro" className={CAMPO}>
                              <option value="">—</option>
                              {Object.entries(TIPOS_ERRO_REVISAO).map(([v, t]) => (
                                <option key={v} value={v}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
                            Nota (opcional)
                            <input name="nota" maxLength={1000} className={CAMPO} />
                          </label>
                          <BotaoSubmeter className={`${BOTAO_PRIMARIO} ${BOTAO_PEQUENO} self-start`}>Registar a revisão</BotaoSubmeter>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
