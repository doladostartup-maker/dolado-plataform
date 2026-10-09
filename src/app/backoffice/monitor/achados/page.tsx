import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ESTADOS_ACHADO_POR_DECIDIR, ROTULO_ACHADO, achadoPorDecidir } from "@/lib/monitor/achados";
import type { TomBackoffice } from "@/lib/backoffice/triagem";
import { CabecalhoPagina } from "@/components/backoffice/Cabecalho";
import { Etiqueta } from "@/components/backoffice/Estado";
import { IconeCirculoVisto } from "@/components/backoffice/Icones";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import { BOTAO_PEQUENO, BOTAO_SECUNDARIO, TABELA, TABELA_MOLDURA, TABELA_TD, TABELA_TH, TABELA_TR } from "@/components/backoffice/ui";

const ESTADO: Record<string, { rotulo: string; tom: TomBackoffice }> = {
  detetado: { rotulo: "Por rever", tom: "acao" },
  em_revisao: { rotulo: "Em revisão", tom: "curso" },
  confirmado: { rotulo: "Confirmado", tom: "aviso" },
  comunicado: { rotulo: "Comunicado", tom: "sucesso" },
  descartado: { rotulo: "Descartado", tom: "neutro" },
  obsoleto: { rotulo: "Já não se verifica (reanálise)", tom: "neutro" },
};

export default async function AchadosPage({ searchParams }: { searchParams: Promise<{ todos?: string }> }) {
  const params = await searchParams;
  await requireAdmin();
  const admin = createAdminClient();

  let consulta = admin
    .from("achados_monitor")
    .select("id, tipo, estado, created_at, contrato_id, utilizador_id")
    .order("created_at", { ascending: true })
    .limit(200);
  if (!params.todos) consulta = consulta.in("estado", ESTADOS_ACHADO_POR_DECIDIR);
  const { data: achados } = await consulta;

  const contratos = [...new Set((achados ?? []).map((a) => a.contrato_id))];
  const { data: dadosContratos } = contratos.length
    ? await admin.from("contratos_monitorizados").select("id, fornecedor").in("id", contratos)
    : { data: [] };
  const fornecedor = new Map((dadosContratos ?? []).map((c) => [c.id, c.fornecedor]));

  const separador = (ativo: boolean) =>
    `-mb-px flex min-h-10 items-center border-b-2 px-3 text-[14px] font-semibold ${
      ativo ? "border-[var(--v2-green)] text-[var(--v2-navy)]" : "border-transparent text-[var(--v2-muted)] hover:text-[var(--v2-navy)]"
    }`;

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        contexto="Proteção"
        titulo="Situações detetadas"
        descricao="Resultados das regras sobre as faturas. Nada chega ao cliente sem revisão: confirme os factos, ajuste o texto e comunique, ou descarte com o motivo."
      />

      <nav aria-label="Filtro das situações" className="flex gap-1 border-b border-[var(--v2-line)]">
        <Link href="/backoffice/monitor/achados" prefetch={false} aria-current={!params.todos ? "page" : undefined} className={separador(!params.todos)}>
          Por decidir
        </Link>
        <Link href="/backoffice/monitor/achados?todos=1" prefetch={false} aria-current={params.todos ? "page" : undefined} className={separador(!!params.todos)}>
          Todas
        </Link>
      </nav>

      {achados && achados.length > 0 ? (
        <div className={TABELA_MOLDURA}>
          <table className={TABELA}>
            <thead>
              <tr>
                <th scope="col" className={TABELA_TH}>Situação</th>
                <th scope="col" className={TABELA_TH}>Fornecedor</th>
                <th scope="col" className={TABELA_TH}>Estado</th>
                <th scope="col" className={TABELA_TH}>Detetada em</th>
                <th scope="col" className={TABELA_TH}>
                  <span className="sr-only">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {achados.map((a) => {
                const e = ESTADO[a.estado] ?? { rotulo: a.estado, tom: "neutro" as TomBackoffice };
                return (
                  <tr key={a.id} className={TABELA_TR}>
                    <td className={`${TABELA_TD} font-semibold`}>{ROTULO_ACHADO[a.tipo] ?? a.tipo}</td>
                    <td className={TABELA_TD}>{fornecedor.get(a.contrato_id) ?? "—"}</td>
                    <td className={TABELA_TD}>
                      <Etiqueta tom={e.tom}>{e.rotulo}</Etiqueta>
                    </td>
                    <td className={`${TABELA_TD} whitespace-nowrap text-[13px] text-[var(--v2-muted)]`}>
                      {new Date(a.created_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}
                    </td>
                    <td className={`${TABELA_TD} text-right`}>
                      <Link href={`/backoffice/monitor/achados/${a.id}`} prefetch={false} className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>
                        {achadoPorDecidir(a.estado) ? "Rever" : "Ver"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EstadoVazio icone={<IconeCirculoVisto tamanho={20} />} titulo="Sem situações por decidir.">
          As situações novas aparecem aqui depois de cada fatura analisada.
        </EstadoVazio>
      )}
    </div>
  );
}
