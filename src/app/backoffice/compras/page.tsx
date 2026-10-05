import { requireAdmin } from "@/lib/auth";
import { resolverSubscricaoDuplicada } from "./actions";
import { CabecalhoPagina, TituloSeccao } from "@/components/backoffice/Cabecalho";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import { IconeCirculoVisto } from "@/components/backoffice/Icones";
import { Aviso } from "@/components/portal/Aviso";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import {
  BOTAO_PEQUENO,
  BOTAO_SECUNDARIO,
  CAMPO,
  CODIGO,
  TABELA,
  TABELA_MOLDURA,
  TABELA_TD,
  TABELA_TH,
  TABELA_TR,
} from "@/components/backoffice/ui";

// Estado operacional das compras: pagas sem conta associada (lembretes a 1
// e 3 dias) e subscrições duplicadas por rever. Nada aqui cancela ou
// reembolsa — isso é decidido e feito no Stripe Dashboard; aqui só se
// regista a resolução.

function data(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" }) : "—";
}

type Duplicada = {
  nova_subscription_id: string;
  user_id: string | null;
  subscricao_existente_id: string;
  stripe_session_id: string | null;
  origem: string;
  detetado_em: string;
};

type SemConta = {
  stripe_session_id: string;
  email: string;
  plano: string;
  confirmado_em: string;
  lembrete_1d_em: string | null;
  lembrete_3d_em: string | null;
};

export default async function ComprasBackofficePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; resolvida?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const [{ data: duplicadas }, { data: semConta }] = await Promise.all([
    supabase
      .from("subscricoes_duplicadas")
      .select("nova_subscription_id, user_id, subscricao_existente_id, stripe_session_id, origem, detetado_em")
      .eq("estado", "por_rever")
      .order("detetado_em", { ascending: true }),
    supabase
      .from("compras_sem_conta")
      .select("stripe_session_id, email, plano, confirmado_em, lembrete_1d_em, lembrete_3d_em")
      .is("resolvido_em", null)
      .order("confirmado_em", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        contexto="Pagamentos"
        titulo="Compras por rever"
        descricao="Subscrições duplicadas e compras pagas sem conta. Cancelamentos e reembolsos são sempre decididos e feitos à mão no Stripe Dashboard; aqui só se regista a resolução."
      />
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}
      {params.resolvida && <Aviso tom="sucesso">Resolução registada.</Aviso>}

      <section aria-labelledby="duplicadas" className="flex flex-col gap-3">
        <TituloSeccao
          id="duplicadas"
          titulo="Subscrições duplicadas"
          contagem={(duplicadas ?? []).length}
          descricao="A segunda subscrição não foi aplicada. Resolva no Stripe e registe o que foi feito."
        />
        {(duplicadas ?? []).length === 0 ? (
          <EstadoVazio icone={<IconeCirculoVisto tamanho={20} />} titulo="Nenhuma por rever." />
        ) : (
          <div className={TABELA_MOLDURA}>
            <table className={TABELA}>
              <thead>
                <tr>
                  <th scope="col" className={TABELA_TH}>Conta</th>
                  <th scope="col" className={TABELA_TH}>Subscrição existente</th>
                  <th scope="col" className={TABELA_TH}>Nova subscrição</th>
                  <th scope="col" className={TABELA_TH}>Detetada</th>
                  <th scope="col" className={TABELA_TH}>Resolução</th>
                </tr>
              </thead>
              <tbody>
                {(duplicadas as Duplicada[]).map((d) => (
                  <tr key={d.nova_subscription_id} className={TABELA_TR}>
                    <td className={TABELA_TD}>
                      <span className={CODIGO}>{d.user_id ?? "—"}</span>
                    </td>
                    <td className={TABELA_TD}>
                      <span className={CODIGO}>{d.subscricao_existente_id}</span>
                    </td>
                    <td className={TABELA_TD}>
                      <span className={CODIGO}>{d.nova_subscription_id}</span>
                      {d.stripe_session_id && <span className={`${CODIGO} block`}>{d.stripe_session_id}</span>}
                    </td>
                    <td className={`${TABELA_TD} text-[13px]`}>
                      {data(d.detetado_em)}
                      <span className="block text-[12.5px] text-[var(--v2-muted)]">{d.origem}</span>
                    </td>
                    <td className={TABELA_TD}>
                      <form action={resolverSubscricaoDuplicada.bind(null, d.nova_subscription_id)} className="flex min-w-[240px] flex-col gap-2">
                        <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
                          O que foi feito no Stripe
                          <textarea name="nota" required rows={2} className={CAMPO} />
                        </label>
                        <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO} self-start`}>Marcar como resolvida</BotaoSubmeter>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="sem-conta" className="flex flex-col gap-3">
        <TituloSeccao
          id="sem-conta"
          titulo="Compras pagas sem conta"
          contagem={(semConta ?? []).length}
          descricao="O cliente recebe lembretes a 1 e 3 dias para criar conta ou associar a compra."
        />
        {(semConta ?? []).length === 0 ? (
          <EstadoVazio icone={<IconeCirculoVisto tamanho={20} />} titulo="Nenhuma." />
        ) : (
          <div className={TABELA_MOLDURA}>
            <table className={TABELA}>
              <thead>
                <tr>
                  <th scope="col" className={TABELA_TH}>E-mail</th>
                  <th scope="col" className={TABELA_TH}>Plano</th>
                  <th scope="col" className={TABELA_TH}>Confirmada</th>
                  <th scope="col" className={TABELA_TH}>Lembrete 1 dia</th>
                  <th scope="col" className={TABELA_TH}>Lembrete 3 dias</th>
                </tr>
              </thead>
              <tbody>
                {(semConta as SemConta[]).map((c) => (
                  <tr key={c.stripe_session_id} className={TABELA_TR}>
                    <td className={TABELA_TD}>
                      <span className="block font-semibold">{c.email}</span>
                      <span className={`${CODIGO} block`}>{c.stripe_session_id}</span>
                    </td>
                    <td className={TABELA_TD}>{c.plano}</td>
                    <td className={`${TABELA_TD} text-[13px]`}>{data(c.confirmado_em)}</td>
                    <td className={`${TABELA_TD} text-[13px]`}>{data(c.lembrete_1d_em)}</td>
                    <td className={`${TABELA_TD} text-[13px]`}>{data(c.lembrete_3d_em)}</td>
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
