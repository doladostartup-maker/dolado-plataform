import { requireAdmin } from "@/lib/auth";
import { marcarRevista } from "./actions";
import { CabecalhoPagina } from "@/components/backoffice/Cabecalho";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import { IconeCirculoVisto } from "@/components/backoffice/Icones";
import { Aviso } from "@/components/portal/Aviso";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import { BOTAO_PEQUENO, BOTAO_SECUNDARIO, CODIGO, TABELA, TABELA_MOLDURA, TABELA_TD, TABELA_TH, TABELA_TR } from "@/components/backoffice/ui";

// Quarentena: e-mails recebidos em respostas.dolado.pt que não foi possível
// associar a um caso. Nunca associados por adivinhação: se forem de um caso,
// a DoLado regista a resposta à mão no próprio caso. Sem corpo nem anexos
// (ficam no Resend); apagados aos 90 dias.

const MOTIVO: Record<string, string> = {
  sem_endereco_de_caso: "Não foi enviado para um endereço de caso",
  endereco_inexistente: "Endereço de caso que não existe",
  endereco_desativado: "Endereço de caso desativado",
  caso_inexistente: "O caso já não existe",
};

function data(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Lisbon" }) : "—";
}

type Linha = {
  id: string;
  destinatarios: string[];
  remetente: string | null;
  assunto: string | null;
  recebida_em: string | null;
  created_at: string;
  motivo: string;
};

export default async function RespostasSemCasoPage({ searchParams }: { searchParams: Promise<{ erro?: string; revista?: string }> }) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const { data: linhas, error } = await supabase
    .from("comunicacoes_nao_associadas")
    .select("id, destinatarios, remetente, assunto, recebida_em, created_at, motivo")
    .is("revista_em", null)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        contexto="Casos"
        titulo="Respostas sem caso"
        descricao="E-mails recebidos em respostas.dolado.pt que não correspondem a nenhum caso. Nada foi associado. Se um destes e-mails for de um caso, registe a resposta à mão nesse caso (“Registar resposta da empresa”); o conteúdo completo está no Resend."
      />
      {params.revista && <Aviso tom="sucesso">Marcado como visto.</Aviso>}
      {(params.erro || error) && <Aviso tom="erro">Não foi possível concluir.</Aviso>}
      {!linhas?.length ? (
        <EstadoVazio icone={<IconeCirculoVisto tamanho={20} />} titulo="Nada por rever.">
          Todos os e-mails recebidos foram associados a um caso ou já foram vistos.
        </EstadoVazio>
      ) : (
        <div className={TABELA_MOLDURA}>
          <table className={TABELA}>
            <thead>
              <tr>
                <th className={TABELA_TH}>Recebido</th>
                <th className={TABELA_TH}>Remetente e assunto</th>
                <th className={TABELA_TH}>Para</th>
                <th className={TABELA_TH}>Motivo</th>
                <th className={TABELA_TH}>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(linhas as Linha[]).map((l) => (
                <tr key={l.id} className={TABELA_TR}>
                  <td className={`${TABELA_TD} whitespace-nowrap`}>{data(l.recebida_em ?? l.created_at)}</td>
                  <td className={TABELA_TD}>
                    <span className="block break-words font-semibold">{l.assunto || "(sem assunto)"}</span>
                    <span className="block break-all text-[13px] text-[var(--v2-muted)]">{l.remetente || "Remetente desconhecido"}</span>
                  </td>
                  <td className={TABELA_TD}>
                    {l.destinatarios.map((d) => (
                      <span key={d} className={`${CODIGO} block`}>
                        {d}
                      </span>
                    ))}
                  </td>
                  <td className={TABELA_TD}>{MOTIVO[l.motivo] ?? l.motivo}</td>
                  <td className={TABELA_TD}>
                    <form action={marcarRevista.bind(null, l.id)}>
                      <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>Marcar como visto</BotaoSubmeter>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
