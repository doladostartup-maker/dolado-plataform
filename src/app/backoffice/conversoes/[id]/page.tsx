import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { estadoReembolsoPt, formatarEuros, NOME_PLANO, type PlanoDestino } from "@/lib/stripe/conversao";
import { resolverIntervencao } from "../actions";
import { CabecalhoPagina } from "@/components/backoffice/Cabecalho";
import { Dado, ListaDados, Seccao } from "@/components/backoffice/Blocos";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import { Etiqueta } from "@/components/backoffice/Estado";
import { Aviso } from "@/components/portal/Aviso";
import { BOTAO_PRIMARIO, CAMPO, CODIGO, LIGACAO, ROTULO } from "@/components/backoffice/ui";

// Os ids vêm da nossa base de dados (gravados pelo webhook), não do browser.
const STRIPE_DASHBOARD = "https://dashboard.stripe.com";

type Um<T> = T | T[] | null;
const um = <T,>(v: Um<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

type Conversao = {
  id: string;
  plano_destino: PlanoDestino;
  estado: string;
  valor_avulso_centimos: number;
  valor_primeira_mensalidade_centimos: number;
  refund_montante_centimos: number;
  checkout_session_id: string | null;
  stripe_subscription_id: string | null;
  payment_intent_id: string | null;
  refund_id: string | null;
  refund_estado: string | null;
  requer_intervencao: boolean;
  intervencao_motivo: string | null;
  intervencao_resolvida_em: string | null;
  intervencao_nota: string | null;
  convertido_em: string | null;
  refund_atualizado_em: string | null;
  stripe_payments: Um<{ email: string; stripe_session_id: string; created_at: string }>;
  cliente: Um<{ nome: string | null }>;
  resolvida_por: Um<{ nome: string | null }>;
};

function data(valor: string | null) {
  return valor ? new Date(valor).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" }) : "—";
}

function LigacaoStripe({ caminho, id }: { caminho: string; id: string | null }) {
  if (!id) return <>—</>;
  return (
    <a href={`${STRIPE_DASHBOARD}/${caminho}/${id}`} target="_blank" rel="noreferrer" className={`${LIGACAO} break-all font-mono text-[12.5px]`}>
      {id}
    </a>
  );
}

export default async function ConversaoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: linha } = await supabase
    .from("conversoes_avulso")
    .select(
      `id, plano_destino, estado, valor_avulso_centimos, valor_primeira_mensalidade_centimos, refund_montante_centimos,
       checkout_session_id, stripe_subscription_id, payment_intent_id, refund_id, refund_estado,
       requer_intervencao, intervencao_motivo, intervencao_resolvida_em, intervencao_nota, convertido_em, refund_atualizado_em,
       stripe_payments(email, stripe_session_id, created_at),
       cliente:utilizadores!conversoes_avulso_user_id_fkey(nome),
       resolvida_por:utilizadores!conversoes_avulso_intervencao_resolvida_por_fkey(nome)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!linha) notFound();
  const c = linha as unknown as Conversao;
  const avulso = um(c.stripe_payments);

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        voltar={{ href: "/backoffice/conversoes", texto: "Conversões com intervenção" }}
        contexto="Pagamentos · conversão"
        titulo={`Conversão para ${NOME_PLANO[c.plano_destino]}`}
        estado={
          c.requer_intervencao ? (
            <Etiqueta tom="erro">Requer intervenção</Etiqueta>
          ) : c.intervencao_resolvida_em ? (
            <Etiqueta tom="sucesso">Resolvida</Etiqueta>
          ) : (
            <Etiqueta tom="neutro">{c.estado}</Etiqueta>
          )
        }
        meta={avulso?.email ?? undefined}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Seccao titulo="Detalhe">
          <ListaDados>
            <Dado rotulo="Cliente">
              {um(c.cliente)?.nome ?? "—"}
              <span className="block text-[12.5px] text-[var(--v2-muted)]">{avulso?.email ?? "—"}</span>
            </Dado>
            <Dado rotulo="Avulso pago">
              {formatarEuros(c.valor_avulso_centimos)} em {data(avulso?.created_at ?? null)}
            </Dado>
            <Dado rotulo="1.ª mensalidade coberta">{formatarEuros(c.valor_primeira_mensalidade_centimos)}</Dado>
            <Dado rotulo="Reembolso devido">
              <strong>{formatarEuros(c.refund_montante_centimos)}</strong>
            </Dado>
            <Dado rotulo="Estado do reembolso">
              {estadoReembolsoPt(c.refund_estado) ?? "não criado"}
              {c.refund_atualizado_em && <span className="block text-[12.5px] text-[var(--v2-muted)]">atualizado em {data(c.refund_atualizado_em)}</span>}
            </Dado>
            <Dado rotulo="Refund">
              <span className={CODIGO}>{c.refund_id ?? "—"}</span>
            </Dado>
            <Dado rotulo="Pagamento Avulso">
              <LigacaoStripe caminho="payments" id={c.payment_intent_id} />
            </Dado>
            <Dado rotulo="Subscrição">
              <LigacaoStripe caminho="subscriptions" id={c.stripe_subscription_id} />
            </Dado>
            <Dado rotulo="Checkout do Avulso">
              <span className={CODIGO}>{avulso?.stripe_session_id ?? "—"}</span>
            </Dado>
            <Dado rotulo="Checkout da adesão">
              <span className={CODIGO}>{c.checkout_session_id ?? "—"}</span>
            </Dado>
            <Dado rotulo="Convertida em">{data(c.convertido_em)}</Dado>
          </ListaDados>
        </Seccao>

        {c.requer_intervencao ? (
          <Seccao titulo="Resolver" destaque descricao={`Motivo: ${c.intervencao_motivo ?? "—"}`}>
            <ol className="list-decimal pl-5 text-[14px] leading-relaxed text-[var(--v2-navy)]">
              <li>Abra o pagamento Avulso no Stripe e confirme se já existe algum reembolso.</li>
              <li>
                Se não existir nenhum reembolso concluído, crie um de <strong>{formatarEuros(c.refund_montante_centimos)}</strong> nesse pagamento.
              </li>
              <li>Se o método de pagamento original não aceitar o reembolso, contacte o cliente.</li>
              <li>Registe abaixo o que foi feito. A subscrição não é alterada por esta página.</li>
            </ol>
            {erro && <Aviso tom="erro">{erro}</Aviso>}
            <form action={resolverIntervencao.bind(null, c.id)} className="flex flex-col gap-3">
              <label className={ROTULO}>
                O que foi feito
                <textarea
                  name="nota"
                  required
                  rows={3}
                  placeholder="Ex.: reembolso de 10,00 € criado manualmente no Stripe (re_…) em 02/10."
                  className={CAMPO}
                />
              </label>
              <div>
                <BotaoSubmeter className={BOTAO_PRIMARIO}>Marcar como resolvida</BotaoSubmeter>
              </div>
            </form>
          </Seccao>
        ) : (
          c.intervencao_resolvida_em && (
            <Seccao titulo="Resolução">
              <Aviso
                tom="sucesso"
                titulo={`Resolvida em ${data(c.intervencao_resolvida_em)}${um(c.resolvida_por)?.nome ? ` por ${um(c.resolvida_por)?.nome}` : ""}`}
              >
                <p className="whitespace-pre-wrap">{c.intervencao_nota}</p>
              </Aviso>
              {c.intervencao_motivo && <p className="text-[12.5px] text-[var(--v2-muted)]">Motivo original: {c.intervencao_motivo}</p>}
            </Seccao>
          )
        )}
      </div>
    </div>
  );
}
