import {
  iniciarCompraAvulsoComConta,
  iniciarUpgradeParaAssinatura,
  iniciarUpgradeParaProtecao,
} from "@/app/actions/stripe";
import { avisoDoPortal, estadoReembolsoCliente, resumoPlanoPortal } from "@/lib/acesso";
import { obterAcesso, requireUser } from "@/lib/auth";
import {
  escolherAvulsoParaConversao,
  mensagemConversao,
  type ConversaoExistente,
  type PagamentoAvulso,
  type PlanoDestino,
} from "@/lib/stripe/conversao";
import { PLANOS } from "@/lib/planos";
import { PortalDashboard } from "./_components/PortalDashboard";

const MENSAGENS_ERRO: Record<string, string> = {
  "upgrade-sem-pagamento":
    "Não encontrámos nenhum pagamento Avulso associado à sua conta.",
  "conversao-indisponivel": "Não foi possível iniciar a adesão. Atualize a página e tente novamente.",
};

const CAIXA_INFO =
  "rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-brand-wash)] px-5 py-4 text-[13.5px] text-[var(--color-ink)]";
const BOTAO =
  "rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";
const CAIXA_ERRO =
  "rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-status-danger)] bg-[var(--color-surface-sunken)] px-5 py-4 text-[13.5px] text-[var(--color-ink)]";

const TRINTA_DIAS_MS = 30 * 24 * 3600 * 1000;

function convertidaRecentemente(convertidoEm: string | null) {
  return !!convertidoEm && Date.now() - new Date(convertidoEm).getTime() < TRINTA_DIAS_MS;
}

export default async function PortalIndex({
  searchParams,
}: {
  searchParams: Promise<{ bloqueado?: string; upgraded?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();

  // Só leitura: o acesso é dado pelo webhook Stripe quando o pagamento é
  // confirmado. ?upgraded=true apenas escolhe a mensagem de regresso.
  const acesso = await obterAcesso(supabase, user.id);

  const [{ data: pagamentos }, { data: conversoes }] = await Promise.all([
    supabase
      .from("stripe_payments")
      .select("id, stripe_session_id, user_id, plano, estado, valor_total_centimos, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("conversoes_avulso")
      .select(
        "id, stripe_payment_id, estado, checkout_session_id, plano_destino, valor_primeira_mensalidade_centimos, refund_montante_centimos, refund_estado, requer_intervencao, intervencao_resolvida_em, convertido_em",
      )
      .eq("user_id", user.id)
      .order("convertido_em", { ascending: false, nullsFirst: false }),
  ]);
  const lista = (pagamentos ?? []) as PagamentoAvulso[];
  const listaConversoes = (conversoes ?? []) as (ConversaoExistente & {
    plano_destino: PlanoDestino;
    valor_primeira_mensalidade_centimos: number;
    refund_montante_centimos: number;
    refund_estado: string | null;
    requer_intervencao: boolean;
    intervencao_resolvida_em: string | null;
    convertido_em: string | null;
  })[];
  const ultimo = lista[0] ?? null;

  // Plano apresentado: só estado real gravado pelo webhook.
  const resumo = resumoPlanoPortal(acesso);

  const aviso = avisoDoPortal({
    regressoDoCheckout: params.upgraded === "true",
    acesso,
    ultimoPagamentoEstado: ultimo?.estado ?? null,
  });

  // O que o Avulso cobre em cada plano, para o cliente ver antes de aderir.
  const ofertaConversao = (plano: PlanoDestino) => {
    const escolha = escolherAvulsoParaConversao(lista, listaConversoes, user.id, plano);
    return escolha ? { mensalidade: escolha.calculo.mensalidade, reembolso: escolha.calculo.reembolso } : null;
  };

  // Conversão feita nos últimos 30 dias: explica o que aconteceu ao valor.
  const conversaoRecente = listaConversoes.find(
    (c) => c.estado === "convertido" && convertidaRecentemente(c.convertido_em),
  );
  const reembolso = conversaoRecente
    ? estadoReembolsoCliente({
        refundEstado: conversaoRecente.refund_estado,
        requerIntervencao: conversaoRecente.requer_intervencao,
        intervencaoResolvida: !!conversaoRecente.intervencao_resolvida_em,
        montanteCentimos: conversaoRecente.refund_montante_centimos,
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      {aviso === "plano_ativo" && (resumo.plano === "protecao" || resumo.plano === "caso_protecao") && (
        <div className={`${CAIXA_INFO} font-medium text-[var(--color-brand)]`}>
          Plano {PLANOS[resumo.plano].nome} ativado! As funcionalidades de proteção já estão desbloqueadas.
        </div>
      )}
      {conversaoRecente && (
        <div className={CAIXA_INFO}>
          <p className="leading-relaxed">
            {mensagemConversao(
              conversaoRecente.plano_destino,
              conversaoRecente.valor_primeira_mensalidade_centimos,
              conversaoRecente.refund_montante_centimos,
            )}
          </p>
          {reembolso && (
            <div className="mt-3">
              <p className="font-semibold">{reembolso.titulo}</p>
              <p className="leading-relaxed text-[var(--color-ink-muted)]">{reembolso.texto}</p>
            </div>
          )}
        </div>
      )}
      {aviso === "pagamento_pendente" && (
        <div className={CAIXA_INFO}>
          <p className="mb-1 font-semibold">Pagamento em confirmação</p>
          <p className="leading-relaxed text-[var(--color-ink-muted)]">
            O pagamento ainda está a ser confirmado. Não precisa de voltar a pagar. Alguns métodos,
            como o débito direto SEPA, podem demorar alguns dias úteis; assim que o pagamento for
            confirmado, o acesso é ativado automaticamente e avisamos por e-mail.
          </p>
        </div>
      )}
      {aviso === "pagamento_falhado" && ultimo && (
        <div className={CAIXA_ERRO}>
          <p className="mb-1 font-semibold text-[var(--color-status-danger)]">Pagamento não concluído</p>
          <p className="mb-3 leading-relaxed text-[var(--color-ink-muted)]">
            O banco não confirmou o seu último pagamento, por isso o acesso não foi ativado. A sua
            conta e os seus dados continuam guardados. Pode tentar pagar de novo, com o mesmo ou
            com outro método de pagamento.
          </p>
          {ultimo.plano === "avulso" ? (
            <form action={iniciarCompraAvulsoComConta}>
              <button type="submit" className={BOTAO}>
                Tentar pagar novamente
              </button>
            </form>
          ) : (
            // O registo do pagamento não guarda qual das subscrições era:
            // o cliente escolhe de novo.
            <div className="flex flex-wrap gap-3">
              <form action={iniciarUpgradeParaProtecao}>
                <button type="submit" className={BOTAO}>
                  Tentar novamente — {PLANOS.protecao.nome}
                </button>
              </form>
              <form action={iniciarUpgradeParaAssinatura}>
                <button type="submit" className={BOTAO}>
                  Tentar novamente — {PLANOS.caso_protecao.nome}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
      {params.erro && (
        <div className={`${CAIXA_ERRO} font-medium text-[var(--color-status-danger)]`}>
          {MENSAGENS_ERRO[params.erro] ?? "Não foi possível concluir o pedido. Tente novamente."}
        </div>
      )}
      <PortalDashboard
        resumo={resumo}
        temProtecao={acesso.temProtecao}
        temPlanoStripe={acesso.temPlanoStripe}
        pagamentoPendente={aviso === "pagamento_pendente"}
        conversaoProtecao={ofertaConversao("protecao")}
        conversaoCasoProtecao={ofertaConversao("caso_protecao")}
        bloqueadoInicial={params.bloqueado}
      />
    </div>
  );
}
