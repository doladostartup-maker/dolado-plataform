import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { acessosPatrocinadosDisponiveis } from "@/lib/acessoPatrocinadoServidor";
import { criarParceiro } from "./actions";
import { ESTADOS_PARCEIRO_PT } from "./estados";
import { formatarPreco } from "@/lib/planos";
import { parceirosAtivos } from "@/lib/parceiros/regras";
import { Metrica } from "@/components/backoffice/Blocos";
import { CabecalhoPagina, TituloSeccao } from "@/components/backoffice/Cabecalho";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import { IconePasta } from "@/components/backoffice/Icones";
import { Aviso } from "@/components/portal/Aviso";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import {
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CAIXA_SELECAO,
  CAMPO,
  CAMPO_TEXTO_LONGO,
  LIGACAO,
  LINHA_SELECAO,
  METADADOS,
  PAINEL,
  PAINEL_CORPO,
  ROTULO,
  TABELA,
  TABELA_MOLDURA,
  TABELA_TD,
  TABELA_TH,
  TABELA_TR,
} from "@/components/backoffice/ui";

// Programa de Parceiros — lista. Fase 1: Parceiro de Distribuição (pacotes
// pré-pagos e códigos de Protecção oferecida). Os parceiros nunca têm acesso
// à plataforma; os dados dos beneficiários nunca aparecem aqui.

async function visaoGeral(parceiros: { estado: string }[]) {
  const admin = createAdminClient();
  const ha30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [cand, atrib, ganhas, comissoes, acessos] = await Promise.all([
    admin.from("parceiros_candidaturas").select("id", { count: "exact", head: true }).eq("estado", "pendente"),
    admin.from("parceiros_atribuicoes").select("id", { count: "exact", head: true }).gte("atribuido_em", ha30),
    admin.from("parceiros_oportunidades").select("id", { count: "exact", head: true }).eq("estado", "ganha"),
    admin.from("parceiros_comissoes").select("estado, valor_cents").in("estado", ["elegivel", "aprovada", "em_validacao"]),
    admin.from("acessos_patrocinados").select("id", { count: "exact", head: true }).eq("estado", "ativo").gt("termina_em", new Date().toISOString()),
  ]);
  const linhas = (comissoes.data ?? []) as { estado: string; valor_cents: number }[];
  const soma = (e: string) => linhas.filter((c) => c.estado === e).reduce((n, c) => n + Number(c.valor_cents), 0);
  return {
    ativos: parceiros.filter((p) => p.estado === "ativo").length,
    candidaturas: cand.count ?? 0,
    atribuicoes30: atrib.count ?? 0,
    ganhas: ganhas.count ?? 0,
    elegiveis: soma("elegivel"),
    porPagar: soma("aprovada"),
    emValidacao: linhas.filter((c) => c.estado === "em_validacao").length,
    acessosAtivos: acessos.count ?? 0,
  };
}

type Linha = {
  id: string;
  nome: string;
  indicacao: boolean;
  distribuicao: boolean;
  estado: string;
  data_inicio: string | null;
  parceiros_pacotes: { quantidade: number; estado: string }[];
};

export default async function ParceirosPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const { data } = await createAdminClient()
    .from("parceiros")
    .select("id, nome, indicacao, distribuicao, estado, data_inicio, parceiros_pacotes(quantidade, estado)")
    .order("created_at", { ascending: false });
  const parceiros = (data ?? []) as Linha[];
  const visao = await visaoGeral(parceiros);

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        contexto="Pagamentos"
        titulo="Parceiros"
        descricao="Parceiros de Indicação (comissão por clientes adquiridos, pagamento manual) e de Distribuição (Protecção oferecida com acessos pré-pagos). Os parceiros nunca vêem dados dos clientes."
        acoes={
          <Link href="/backoffice/parceiros/candidaturas" prefetch={false} className={BOTAO_SECUNDARIO}>
            Candidaturas{visao.candidaturas > 0 ? ` (${visao.candidaturas})` : ""}
          </Link>
        }
      />
      {!parceirosAtivos() && (
        <Aviso tom="info">
          O Programa de Parceiros está desligado (PARCEIROS_ATIVO): a página /parceiros leva a /empresas, as ligações /r/ de parceiros e o
          campo &quot;Código de parceiro&quot; não funcionam. As contas já atribuídas continuam a contar mensalidades.
        </Aviso>
      )}
      <section aria-labelledby="visao" className="flex flex-col gap-3">
        <TituloSeccao id="visao" titulo="Visão geral" />
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-7">
          <Metrica rotulo="Parceiros activos" valor={visao.ativos} />
          <Metrica rotulo="Candidaturas pendentes" valor={visao.candidaturas} tom={visao.candidaturas > 0 ? "erro" : "normal"} />
          <Metrica rotulo="Contas atribuídas (30 dias)" valor={visao.atribuicoes30} />
          <Metrica rotulo="Contratos empresariais ganhos" valor={visao.ganhas} />
          <Metrica rotulo="Comissões elegíveis" valor={formatarPreco(visao.elegiveis)} detalhe={visao.emValidacao ? `${visao.emValidacao} em validação` : undefined} />
          <Metrica rotulo="Comissões por pagar" valor={formatarPreco(visao.porPagar)} detalhe="aprovadas, sem IVA" />
          <Metrica rotulo="Acessos patrocinados activos" valor={visao.acessosAtivos} />
        </div>
      </section>
      {!acessosPatrocinadosDisponiveis() && (
        <Aviso tom="info">
          A activação de códigos está desligada (ACESSOS_PATROCINADOS_ATIVO). Pode preparar parceiros e pacotes; os beneficiários só
          conseguem activar depois de a funcionalidade ser ligada (nova versão dos Termos).
        </Aviso>
      )}
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}

      <section aria-labelledby="lista" className="flex flex-col gap-3">
        <TituloSeccao id="lista" titulo="Parceiros" contagem={parceiros.length} />
        {parceiros.length === 0 ? (
          <EstadoVazio icone={<IconePasta tamanho={20} />} titulo="Ainda não há parceiros." />
        ) : (
          <div className={TABELA_MOLDURA}>
            <table className={TABELA}>
              <thead>
                <tr>
                  <th scope="col" className={TABELA_TH}>Parceiro</th>
                  <th scope="col" className={TABELA_TH}>Tipo</th>
                  <th scope="col" className={TABELA_TH}>Estado</th>
                  <th scope="col" className={TABELA_TH}>Acessos contratados</th>
                </tr>
              </thead>
              <tbody>
                {parceiros.map((p) => (
                  <tr key={p.id} className={TABELA_TR}>
                    <td className={TABELA_TD}>
                      <Link href={`/backoffice/parceiros/${p.id}`} prefetch={false} className={LIGACAO}>
                        {p.nome}
                      </Link>
                    </td>
                    <td className={TABELA_TD}>{[p.indicacao && "Indicação", p.distribuicao && "Distribuição"].filter(Boolean).join(" · ")}</td>
                    <td className={TABELA_TD}>
                      {ESTADOS_PARCEIRO_PT[p.estado] ?? p.estado}
                      {p.data_inicio && <span className={`${METADADOS} block`}>desde {p.data_inicio}</span>}
                    </td>
                    <td className={TABELA_TD}>
                      {p.parceiros_pacotes.filter((k) => k.estado === "ativo").reduce((n, k) => n + k.quantidade, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="novo" className="flex flex-col gap-3">
        <TituloSeccao
          id="novo"
          titulo="Novo parceiro"
          descricao="Para parceiros que não vieram de uma candidatura. Fica em negociação até o activar no detalhe."
        />
        <form action={criarParceiro} className={`${PAINEL} ${PAINEL_CORPO} grid gap-3 sm:grid-cols-2`}>
          <div className="flex flex-wrap gap-5 sm:col-span-2">
            <label className={LINHA_SELECAO}>
              <input type="checkbox" name="indicacao" value="sim" className={CAIXA_SELECAO} />
              Parceiro de Indicação
            </label>
            <label className={LINHA_SELECAO}>
              <input type="checkbox" name="distribuicao" value="sim" defaultChecked className={CAIXA_SELECAO} />
              Parceiro de Distribuição
            </label>
          </div>
          <label className={ROTULO}>
            Empresa
            <input name="nome" required maxLength={160} className={CAMPO} />
          </label>
          <label className={ROTULO}>
            Contacto administrativo (nome)
            <input name="contacto_nome" maxLength={120} className={CAMPO} />
          </label>
          <label className={ROTULO}>
            Contacto administrativo (e-mail)
            <input name="contacto_email" type="email" maxLength={254} className={CAMPO} />
          </label>
          <label className={`${ROTULO} sm:col-span-2`}>
            Notas internas
            <textarea name="notas" rows={3} maxLength={4000} className={CAMPO_TEXTO_LONGO} />
          </label>
          <div className="sm:col-span-2">
            <BotaoSubmeter className={BOTAO_PRIMARIO}>Criar parceiro</BotaoSubmeter>
          </div>
        </form>
      </section>
    </div>
  );
}
