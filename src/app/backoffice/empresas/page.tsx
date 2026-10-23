import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { CabecalhoPagina, TituloSeccao } from "@/components/backoffice/Cabecalho";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import { IconeCirculoVisto } from "@/components/backoffice/Icones";
import { Aviso } from "@/components/portal/Aviso";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import {
  AJUDA_CAMPO,
  BOTAO_DESTRUTIVO,
  BOTAO_PEQUENO,
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CAIXA_SELECAO,
  CAMPO,
  CODIGO,
  LIGACAO,
  LINHA_SELECAO,
  METADADOS,
  TABELA,
  TABELA_MOLDURA,
  TABELA_TD,
  TABELA_TH,
  TABELA_TR,
} from "@/components/backoffice/ui";
import {
  APRESENTACAO_ESTADO,
  ESTADOS_APROVAVEIS,
  ESTADOS_REJEITAVEIS,
  TIPOS_ENTIDADE,
  ehEstadoOrganizacao,
  ehTipoEntidade,
} from "@/lib/empresas/registo";
import { aprovarEmpresa, recusarPedidoRecuperacao, rejeitarEmpresa, reporMfaEmpresa } from "./actions";

// DoLado Empresas (Fase 4): pedidos de adesão, lista de espera, todas as
// organizações e pedidos de recuperação assistida do MFA. Leitura com a
// sessão do admin (RLS); decisões pelas funções da base de dados.

export const dynamic = "force-dynamic";

type Organizacao = {
  id: string;
  nome: string;
  tipo_entidade: string;
  nif: string;
  responsavel_nome: string | null;
  estado: string;
  created_at: string;
};

type Pedido = {
  id: string;
  email: string;
  nif: string | null;
  mensagem: string | null;
  organizacao_id: string | null;
  created_at: string;
};

type Historico = { organizacao_id: string; estado_depois: string; created_at: string };

function data(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" }) : "—";
}

function rotuloEstado(estado: string) {
  return ehEstadoOrganizacao(estado) ? APRESENTACAO_ESTADO[estado].titulo : estado;
}

/** Horas entre o registo e a primeira aprovação (ou lista de espera), por organização decidida. */
function tempoMedioDecisao(orgs: Organizacao[], historico: Historico[]): string {
  const horas = orgs
    .map((o) => {
      const decisao = historico
        .filter((h) => h.organizacao_id === o.id && (h.estado_depois === "aprovada" || h.estado_depois === "lista_espera"))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
      return decisao ? (Date.parse(decisao.created_at) - Date.parse(o.created_at)) / 3_600_000 : null;
    })
    .filter((h): h is number => h !== null);
  if (horas.length === 0) return "—";
  const media = horas.reduce((s, h) => s + h, 0) / horas.length;
  return media < 48 ? `${media.toFixed(1)} h` : `${(media / 24).toFixed(1)} dias`;
}

export default async function EmpresasBackofficePage({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const [{ data: orgsBrutas }, { data: pedidosBrutos }, { data: historicoBruto }] = await Promise.all([
    supabase
      .from("organizacoes")
      .select("id, nome, tipo_entidade, nif, responsavel_nome, estado, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("empresa_pedidos_recuperacao")
      .select("id, email, nif, mensagem, organizacao_id, created_at")
      .eq("estado", "pendente")
      .order("created_at", { ascending: true }),
    supabase.from("organizacoes_historico").select("organizacao_id, estado_depois, created_at"),
  ]);
  const orgs = (orgsBrutas ?? []) as Organizacao[];
  const pedidos = (pedidosBrutos ?? []) as Pedido[];
  const porDecidir = orgs.filter((o) => (ESTADOS_APROVAVEIS as readonly string[]).includes(o.estado));
  const nomePorId = new Map(orgs.map((o) => [o.id, o.nome]));
  const contagens = orgs.reduce<Record<string, number>>((c, o) => ({ ...c, [o.estado]: (c[o.estado] ?? 0) + 1 }), {});

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        contexto="DoLado Empresas"
        titulo="Empresas"
        descricao="Pedidos de adesão, lista de espera e recuperação do acesso. A aprovação verifica as vagas do piloto: sem vaga, a organização fica em lista de espera."
      />
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}
      {params.ok && <Aviso tom="sucesso">{params.ok}</Aviso>}

      <section aria-labelledby="recuperacao" className="flex flex-col gap-3">
        <TituloSeccao
          id="recuperacao"
          titulo="Recuperação do acesso (MFA)"
          contagem={pedidos.length}
          descricao="Antes de repor: contactar a empresa pelo telefone oficial ou pela morada fiscal e confirmar os dados do registo e a última factura paga. Nunca pelos contactos escritos no pedido."
        />
        {pedidos.length === 0 ? (
          <EstadoVazio icone={<IconeCirculoVisto tamanho={20} />} titulo="Nenhum pedido pendente." />
        ) : (
          <div className={TABELA_MOLDURA}>
            <table className={TABELA}>
              <thead>
                <tr>
                  <th scope="col" className={TABELA_TH}>Pedido</th>
                  <th scope="col" className={TABELA_TH}>Organização</th>
                  <th scope="col" className={TABELA_TH}>Decisão</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id} className={TABELA_TR}>
                    <td className={TABELA_TD}>
                      <span className="block font-semibold">{p.email}</span>
                      {p.nif && <span className={`${CODIGO} block`}>NIPC/NIF {p.nif}</span>}
                      {p.mensagem && <span className="mt-1 block whitespace-pre-wrap text-[13px]">{p.mensagem}</span>}
                      <span className={`${METADADOS} block`}>{data(p.created_at)}</span>
                    </td>
                    <td className={TABELA_TD}>{p.organizacao_id ? nomePorId.get(p.organizacao_id) ?? "—" : "Sem conta de empresa"}</td>
                    <td className={TABELA_TD}>
                      {p.organizacao_id && (
                        <form action={reporMfaEmpresa.bind(null, p.organizacao_id, p.id)} className="flex min-w-[260px] flex-col gap-2">
                          <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
                            Como confirmou a identidade
                            <textarea name="nota" required rows={2} maxLength={450} className={CAMPO} />
                          </label>
                          <label className={LINHA_SELECAO}>
                            <input type="checkbox" name="confirmar" required className={CAIXA_SELECAO} />
                            Confirmei pelos contactos oficiais da empresa
                          </label>
                          <BotaoSubmeter className={`${BOTAO_PRIMARIO} ${BOTAO_PEQUENO} self-start`} aDecorrer="A repor…">
                            Repor o MFA
                          </BotaoSubmeter>
                        </form>
                      )}
                      <form action={recusarPedidoRecuperacao.bind(null, p.id)} className="mt-3 flex min-w-[260px] flex-col gap-2">
                        <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
                          Motivo para recusar
                          <input name="nota" required maxLength={1000} className={CAMPO} />
                        </label>
                        <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO} self-start`}>Recusar o pedido</BotaoSubmeter>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="por-decidir" className="flex flex-col gap-3">
        <TituloSeccao
          id="por-decidir"
          titulo="À espera de decisão"
          contagem={porDecidir.length}
          descricao="Organizações com o e-mail confirmado e os dois factores inscritos, e as que estão em lista de espera."
        />
        {porDecidir.length === 0 ? (
          <EstadoVazio icone={<IconeCirculoVisto tamanho={20} />} titulo="Nenhum pedido à espera." />
        ) : (
          <div className={TABELA_MOLDURA}>
            <table className={TABELA}>
              <thead>
                <tr>
                  <th scope="col" className={TABELA_TH}>Organização</th>
                  <th scope="col" className={TABELA_TH}>Estado</th>
                  <th scope="col" className={TABELA_TH}>Decisão</th>
                </tr>
              </thead>
              <tbody>
                {porDecidir.map((o) => (
                  <tr key={o.id} className={TABELA_TR}>
                    <td className={TABELA_TD}>
                      <Link href={`/backoffice/empresas/${o.id}`} prefetch={false} className={`${LIGACAO} block font-semibold`}>
                        {o.nome}
                      </Link>
                      <span className="block text-[13px]">{ehTipoEntidade(o.tipo_entidade) ? TIPOS_ENTIDADE[o.tipo_entidade] : o.tipo_entidade}</span>
                      <span className={`${CODIGO} block`}>NIPC/NIF {o.nif}</span>
                      {o.responsavel_nome && <span className="block text-[13px]">Responsável: {o.responsavel_nome}</span>}
                      <span className={`${METADADOS} block`}>Registo: {data(o.created_at)}</span>
                    </td>
                    <td className={TABELA_TD}>{rotuloEstado(o.estado)}</td>
                    <td className={TABELA_TD}>
                      <form action={aprovarEmpresa.bind(null, o.id)}>
                        <BotaoSubmeter className={`${BOTAO_PRIMARIO} ${BOTAO_PEQUENO}`} aDecorrer="A aprovar…">
                          Aprovar
                        </BotaoSubmeter>
                      </form>
                      <FormRejeitar organizacaoId={o.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="todas" className="flex flex-col gap-3">
        <TituloSeccao
          id="todas"
          titulo="Todas as organizações"
          contagem={orgs.length}
          descricao={`Tempo médio entre o registo e a decisão: ${tempoMedioDecisao(orgs, (historicoBruto ?? []) as Historico[])}.`}
        />
        {orgs.length > 0 && (
          <p className={METADADOS}>
            {Object.entries(contagens)
              .map(([estado, n]) => `${rotuloEstado(estado)}: ${n}`)
              .join(" · ")}
          </p>
        )}
        {orgs.length === 0 ? (
          <EstadoVazio icone={<IconeCirculoVisto tamanho={20} />} titulo="Ainda não há organizações." />
        ) : (
          <div className={TABELA_MOLDURA}>
            <table className={TABELA}>
              <thead>
                <tr>
                  <th scope="col" className={TABELA_TH}>Organização</th>
                  <th scope="col" className={TABELA_TH}>Estado</th>
                  <th scope="col" className={TABELA_TH}>Registo</th>
                  <th scope="col" className={TABELA_TH}>Decisão</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.id} className={TABELA_TR}>
                    <td className={TABELA_TD}>
                      <Link href={`/backoffice/empresas/${o.id}`} prefetch={false} className={`${LIGACAO} block font-semibold`}>
                        {o.nome}
                      </Link>
                      <span className={`${CODIGO} block`}>NIPC/NIF {o.nif}</span>
                    </td>
                    <td className={TABELA_TD}>{rotuloEstado(o.estado)}</td>
                    <td className={`${TABELA_TD} text-[13px]`}>{data(o.created_at)}</td>
                    <td className={TABELA_TD}>
                      {(ESTADOS_REJEITAVEIS as readonly string[]).includes(o.estado) &&
                      !(ESTADOS_APROVAVEIS as readonly string[]).includes(o.estado) ? (
                        <FormRejeitar organizacaoId={o.id} />
                      ) : (
                        <span className={METADADOS}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function FormRejeitar({ organizacaoId }: { organizacaoId: string }) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-[13px] font-semibold text-[var(--v2-erro)]">Rejeitar</summary>
      <form action={rejeitarEmpresa.bind(null, organizacaoId)} className="mt-2 flex min-w-[260px] flex-col gap-2">
        <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
          Motivo (interno, fica no histórico)
          <input name="motivo" required maxLength={500} className={CAMPO} />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
          Mensagem ao cliente (opcional)
          <textarea name="mensagem_cliente" rows={2} maxLength={1000} className={CAMPO} />
          <span className={AJUDA_CAMPO}>Vai no e-mail. Sem ela, o e-mail diz só que o pedido não foi aprovado.</span>
        </label>
        <BotaoSubmeter className={`${BOTAO_DESTRUTIVO} ${BOTAO_PEQUENO} self-start`}>Rejeitar o pedido</BotaoSubmeter>
      </form>
    </details>
  );
}

