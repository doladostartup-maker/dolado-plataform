import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { gastoApiUsd, tetoOrcamentoUsd } from "@/lib/monitor/servidor";
import { estadoOrcamento } from "@/lib/monitor/custos";
import { MODELO_DOCUMENTOS } from "@/lib/claude";
import { ROTULO_TIPO_DOCUMENTO } from "@/lib/monitor/tipoDocumento";
import { ROTULO_SITUACAO_ADMIN, SITUACOES_ADMIN_COM_ACAO, TOM_SITUACAO_ADMIN, situacaoDocumentoAdmin } from "@/lib/monitor/processamento";
import { ESTADOS_ACHADO_POR_DECIDIR } from "@/lib/monitor/achados";
import { CabecalhoPagina, TituloSeccao } from "@/components/backoffice/Cabecalho";
import { Metrica } from "@/components/backoffice/Blocos";
import { Etiqueta } from "@/components/backoffice/Estado";
import { IconeCirculoVisto } from "@/components/backoffice/Icones";
import { Aviso } from "@/components/portal/Aviso";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import {
  BOTAO_PEQUENO,
  BOTAO_SECUNDARIO,
  TABELA,
  TABELA_MOLDURA,
  TABELA_TD,
  TABELA_TH,
  TABELA_TR,
} from "@/components/backoffice/ui";

function classificar<T extends { estado: string; etapa: string | null; etapa_atualizada_em: string | null }>(documentos: T[]) {
  const agora = Date.now();
  return documentos.flatMap((d) => {
    const situacao = situacaoDocumentoAdmin(d, agora);
    return situacao ? [{ ...d, situacao }] : [];
  });
}

export default async function MonitorBackofficePage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [gasto, { data: documentos }, { count: conflitos }, { count: contratos }, { count: chamadas }, { count: achados }] = await Promise.all([
    gastoApiUsd(admin),
    admin
      .from("documentos_monitor")
      .select("id, utilizador_id, tipo, tipo_indicado, estado, etapa, etapa_atualizada_em, created_at, contrato_id")
      .in("estado", ["pendente", "a_rever"])
      .is("desativado_em", null)
      .order("created_at", { ascending: true }),
    admin.from("contratos_campos").select("id", { count: "exact", head: true }).eq("estado", "em_conflito"),
    admin.from("contratos_monitorizados").select("id", { count: "exact", head: true }).is("desativado_em", null),
    admin.from("uso_api_claude").select("id", { count: "exact", head: true }),
    admin.from("achados_monitor").select("id", { count: "exact", head: true }).in("estado", ESTADOS_ACHADO_POR_DECIDIR),
  ]);

  // "pendente" cobre também documentos ainda em leitura automática (sem ação
  // possível) e repetidos à espera de o cliente ver o aviso (não contam).
  const classificados = classificar(documentos ?? []);
  const porTratar = classificados.filter((d) => SITUACOES_ADMIN_COM_ACAO.includes(d.situacao));
  const emLeitura = classificados.filter((d) => d.situacao === "em_leitura").length;

  const ids = [...new Set(porTratar.map((d) => d.utilizador_id))];
  const { data: contas } = ids.length ? await admin.from("utilizadores").select("id, nome, email").in("id", ids) : { data: [] };
  const conta = new Map((contas ?? []).map((c) => [c.id, c]));

  const teto = tetoOrcamentoUsd();
  const orcamento = estadoOrcamento(gasto, teto);

  const semChave = !process.env.ANTHROPIC_API_KEY;

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        contexto="Proteção"
        titulo="Documentos por tratar"
        descricao="Documentos que precisam da DoLado: leituras que falharam ou pararam, leituras por fazer à mão e dados por rever. A leitura automática nunca decide sozinha: os casos duvidosos ficam aqui."
        acoes={
          <Link href="/backoffice/monitor/achados" prefetch={false} className={BOTAO_SECUNDARIO}>
            Situações detetadas
            {!!achados && <span className="rounded-full bg-[var(--v2-navy)] px-1.5 text-[12px] font-bold text-white">{achados}</span>}
          </Link>
        }
      />

      {orcamento.bloqueado && (
        <Aviso tom="erro" titulo="Orçamento da Claude API atingido.">
          Nenhum documento é lido automaticamente até o teto (ANTHROPIC_ORCAMENTO_USD) ser aumentado. Os documentos ficam pendentes, sem erro para o cliente.
        </Aviso>
      )}
      {semChave && (
        <Aviso tom="atencao" titulo="Chave da Claude API por configurar neste ambiente.">
          Os documentos ficam pendentes até haver chave.
        </Aviso>
      )}

      {porTratar.length > 0 ? (
        <div className={TABELA_MOLDURA}>
          <table className={TABELA}>
            <thead>
              <tr>
                <th scope="col" className={TABELA_TH}>Cliente</th>
                <th scope="col" className={TABELA_TH}>Documento</th>
                <th scope="col" className={TABELA_TH}>Situação</th>
                <th scope="col" className={TABELA_TH}>Recebido em</th>
                <th scope="col" className={TABELA_TH}>
                  <span className="sr-only">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {porTratar.map((d) => {
                const c = conta.get(d.utilizador_id);
                return (
                  <tr key={d.id} className={TABELA_TR}>
                    <td className={TABELA_TD}>
                      <span className="block font-semibold">{c?.nome ?? "—"}</span>
                      <span className="block text-[12.5px] text-[var(--v2-muted)]">{c?.email}</span>
                    </td>
                    <td className={TABELA_TD}>
                      {ROTULO_TIPO_DOCUMENTO[d.tipo] ?? d.tipo}
                      {d.tipo !== d.tipo_indicado && (
                        <span className="block text-[12.5px] text-[var(--v2-muted)]">enviado como {ROTULO_TIPO_DOCUMENTO[d.tipo_indicado]?.toLowerCase()}</span>
                      )}
                    </td>
                    <td className={TABELA_TD}>
                      <Etiqueta tom={TOM_SITUACAO_ADMIN[d.situacao]}>{ROTULO_SITUACAO_ADMIN[d.situacao]}</Etiqueta>
                    </td>
                    <td className={`${TABELA_TD} whitespace-nowrap text-[13px] text-[var(--v2-muted)]`}>
                      {new Date(d.created_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}
                    </td>
                    <td className={`${TABELA_TD} text-right`}>
                      <Link href={`/backoffice/monitor/${d.id}`} prefetch={false} className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>
                        Rever
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EstadoVazio icone={<IconeCirculoVisto tamanho={20} />} titulo="Sem documentos por tratar.">
          Nenhum documento precisa da DoLado neste momento.
        </EstadoVazio>
      )}
      {emLeitura > 0 && (
        <p className="text-[13px] text-[var(--v2-muted)]">
          {emLeitura === 1 ? "1 documento em leitura automática" : `${emLeitura} documentos em leitura automática`} (sem ação necessária; se a
          leitura parar, o documento aparece acima).
        </p>
      )}

      <section aria-labelledby="indicadores" className="flex flex-col gap-3">
        <TituloSeccao id="indicadores" titulo="Indicadores" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Metrica
            rotulo="Claude API (estimado)"
            valor={`${gasto.toFixed(4)} / ${teto} USD`}
            tom={orcamento.bloqueado ? "erro" : "normal"}
            detalhe={`${orcamento.percentagem.toFixed(1)}% · ${chamadas ?? 0} chamadas · ${MODELO_DOCUMENTOS}`}
          />
          <Metrica rotulo="Serviços acompanhados" valor={contratos ?? 0} />
          <Metrica rotulo="Valores em conflito" valor={conflitos ?? 0} detalhe="O cliente decide" />
        </div>
      </section>
    </div>
  );
}
