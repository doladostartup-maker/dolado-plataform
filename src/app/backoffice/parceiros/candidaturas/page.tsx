import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { decidirCandidaturaParceiro } from "../actions";
import { CabecalhoPagina, TituloSeccao } from "@/components/backoffice/Cabecalho";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import { IconeCirculoVisto } from "@/components/backoffice/Icones";
import { Aviso } from "@/components/portal/Aviso";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import {
  BOTAO_PEQUENO,
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CAMPO,
  METADADOS,
  PAINEL,
  PAINEL_CORPO,
  TEXTO_SECUNDARIO,
  TITULO_BLOCO,
} from "@/components/backoffice/ui";

// Candidaturas ao Programa de Parceiros (/parceiros). Aprovar cria o
// parceiro (indicação: activo, com as condições iniciais e um código; só
// distribuição: em negociação) e envia o e-mail com o código. Rejeitar exige
// motivo (interno). As rejeitadas são apagadas 12 meses depois da decisão.

const TIPOS: Record<string, string> = { indicacao: "Indicação", distribuicao: "Distribuição", ambos: "Indicação e distribuição" };

type Candidatura = {
  id: string;
  nome: string;
  email: string;
  empresa: string | null;
  tipo_pretendido: string;
  descricao: string;
  estado: string;
  motivo: string | null;
  created_at: string;
  decidido_em: string | null;
};

const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });

export default async function CandidaturasPage({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  await requireAdmin();
  const avisos = await searchParams;
  const admin = createAdminClient();
  const [{ data: pendentes }, { data: decididas }] = await Promise.all([
    admin.from("parceiros_candidaturas").select("*").eq("estado", "pendente").order("created_at", { ascending: true }),
    admin.from("parceiros_candidaturas").select("*").neq("estado", "pendente").order("decidido_em", { ascending: false }).limit(20),
  ]);
  const lista = (pendentes ?? []) as Candidatura[];

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        voltar={{ href: "/backoffice/parceiros", texto: "Parceiros" }}
        titulo="Candidaturas"
        descricao="Candidaturas recebidas em /parceiros. O texto é o que o candidato escreveu: dado não verificado."
      />
      {avisos.erro && <Aviso tom="erro">{avisos.erro}</Aviso>}
      {avisos.ok && <Aviso tom="sucesso">{avisos.ok}</Aviso>}

      <section aria-labelledby="pendentes" className="flex flex-col gap-3">
        <TituloSeccao id="pendentes" titulo="Por decidir" contagem={lista.length} />
        {lista.length === 0 ? (
          <EstadoVazio icone={<IconeCirculoVisto tamanho={20} />} titulo="Nenhuma candidatura por decidir." />
        ) : (
          lista.map((c) => (
            <div key={c.id} className={`${PAINEL} ${PAINEL_CORPO} flex flex-col gap-3`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className={TITULO_BLOCO}>
                  {c.nome}
                  {c.empresa ? ` · ${c.empresa}` : ""}
                </p>
                <span className={METADADOS}>
                  {TIPOS[c.tipo_pretendido] ?? c.tipo_pretendido} · {dataHora(c.created_at)}
                </span>
              </div>
              <p className={METADADOS}>{c.email}</p>
              <p className={`${TEXTO_SECUNDARIO} whitespace-pre-line`}>{c.descricao}</p>
              <div className="flex flex-wrap items-end gap-3">
                <form action={decidirCandidaturaParceiro.bind(null, c.id, true)}>
                  <BotaoSubmeter className={`${BOTAO_PRIMARIO} ${BOTAO_PEQUENO}`} aDecorrer="A aprovar…">
                    Aprovar e enviar o código
                  </BotaoSubmeter>
                </form>
                <form action={decidirCandidaturaParceiro.bind(null, c.id, false)} className="flex flex-wrap items-end gap-2">
                  <input name="motivo" required maxLength={1000} placeholder="Motivo da rejeição (interno)" className={`${CAMPO} w-64`} />
                  <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>Rejeitar</BotaoSubmeter>
                </form>
              </div>
            </div>
          ))
        )}
      </section>

      <section aria-labelledby="decididas" className="flex flex-col gap-2">
        <TituloSeccao id="decididas" titulo="Decididas recentemente" />
        <ul className="flex flex-col gap-1">
          {((decididas ?? []) as Candidatura[]).map((c) => (
            <li key={c.id} className={METADADOS}>
              {c.decidido_em ? dataHora(c.decidido_em) : "—"} · {c.estado === "aprovada" ? "Aprovada" : "Rejeitada"} · {c.nome}
              {c.empresa ? ` (${c.empresa})` : ""}
              {c.motivo ? ` — ${c.motivo}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
