import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { acessosPatrocinadosDisponiveis } from "@/lib/acessoPatrocinadoServidor";
import { criarParceiroDistribuicao } from "./actions";
import { ESTADOS_PARCEIRO_PT } from "./estados";
import { CabecalhoPagina, TituloSeccao } from "@/components/backoffice/Cabecalho";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import { IconePasta } from "@/components/backoffice/Icones";
import { Aviso } from "@/components/portal/Aviso";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import {
  BOTAO_PRIMARIO,
  CAMPO,
  CAMPO_TEXTO_LONGO,
  LIGACAO,
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

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        contexto="Pagamentos"
        titulo="Parceiros"
        descricao="Parceiros de Distribuição: empresas que oferecem a Protecção aos seus clientes ou colaboradores com acessos pré-pagos. Os códigos só são emitidos depois de confirmado o pagamento do pacote; as empresas só recebem contagens agregadas."
      />
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
        <TituloSeccao id="novo" titulo="Novo Parceiro de Distribuição" descricao="Fica em negociação até o activar no detalhe." />
        <form action={criarParceiroDistribuicao} className={`${PAINEL} ${PAINEL_CORPO} grid gap-3 sm:grid-cols-2`}>
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
