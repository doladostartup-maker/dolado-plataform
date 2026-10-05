import { BotaoComprar } from "@/components/compra/BotaoComprar";
import { avisoDoPortal, estadoReembolsoCliente, resumoPlanoPortal } from "@/lib/acesso";
import { obterAcesso, requireUser } from "@/lib/auth";
import { obterResumoCobranca } from "@/lib/stripe/proximaCobranca";
import {
  escolherAvulsoParaConversao,
  mensagemConversao,
  sessoesAvulsoDisponiveis,
  type ConversaoExistente,
  type CreditoConcedido,
  type PagamentoAvulso,
  type PlanoDestino,
} from "@/lib/stripe/conversao";
import { PLANOS } from "@/lib/planos";
import { proximaData, textoProximaData } from "@/lib/monitor/contratos";
import { nomeComercial } from "@/lib/monitor/fornecedores";
import { listaFornecedores } from "@/lib/monitor/servidor";
import { estadoCasoCliente, type EstadoTextoRelevante } from "@/lib/portal/estadoCaso";
import { Aviso } from "@/components/portal/Aviso";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "@/components/portal/ui";
import { PortalDashboard, type ItemAtencao, type ResumoCaso, type ResumoProtecao } from "./_components/PortalDashboard";

const MENSAGENS_ERRO: Record<string, string> = {
  "upgrade-sem-pagamento":
    "Não encontrámos nenhum pagamento Avulso associado à sua conta.",
  "conversao-indisponivel": "Não foi possível iniciar a adesão. Atualize a página e tente novamente.",
};

function hojeLisboa() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

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

  const [{ data: pagamentos }, { data: conversoes }, { data: creditos }] = await Promise.all([
    supabase
      .from("stripe_payments")
      .select("id, stripe_session_id, user_id, plano, estado, valor_total_centimos, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("conversoes_avulso")
      .select(
        "id, stripe_payment_id, estado, checkout_session_id, plano_destino, valor_primeira_mensalidade_centimos, refund_montante_centimos, refund_estado, requer_intervencao, intervencao_resolvida_em, convertido_em, anulada_em",
      )
      .eq("user_id", user.id)
      .order("convertido_em", { ascending: false, nullsFirst: false }),
    supabase.from("case_credit_grants").select("origem, estado").eq("user_id", user.id).eq("estado", "disponivel"),
  ]);
  const avulsosDisponiveis = sessoesAvulsoDisponiveis((creditos ?? []) as CreditoConcedido[]);
  const lista = (pagamentos ?? []) as PagamentoAvulso[];
  const listaConversoes = (conversoes ?? []) as (ConversaoExistente & {
    plano_destino: PlanoDestino;
    valor_primeira_mensalidade_centimos: number;
    refund_montante_centimos: number;
    refund_estado: string | null;
    requer_intervencao: boolean;
    intervencao_resolvida_em: string | null;
    convertido_em: string | null;
    anulada_em: string | null;
  })[];
  const ultimo = lista[0] ?? null;

  // Plano apresentado: só estado real gravado pelo webhook.
  const resumo = resumoPlanoPortal(acesso);
  // Valor efetivo da próxima cobrança, com os descontos em vigor no Stripe.
  // Arranca já e só é esperado no fim, em paralelo com as leituras abaixo.
  const cobrancaPromessa = obterResumoCobranca(supabase, user.id, resumo);

  const aviso = avisoDoPortal({
    regressoDoCheckout: params.upgraded === "true",
    acesso,
    ultimoPagamentoEstado: ultimo?.estado ?? null,
  });

  // O que o Avulso cobre em cada plano, para o cliente ver antes de aderir.
  const ofertaConversao = (plano: PlanoDestino) => {
    const escolha = escolherAvulsoParaConversao(lista, listaConversoes, user.id, plano, avulsosDisponiveis);
    return escolha ? { mensalidade: escolha.calculo.mensalidade, reembolso: escolha.calculo.reembolso } : null;
  };

  // Conversão feita nos últimos 30 dias: explica o que aconteceu ao valor.
  const conversaoRecente = listaConversoes.find(
    (c) => c.estado === "convertido" && convertidaRecentemente(c.convertido_em),
  );
  // Adesão por conversão anulada nos últimos 30 dias (o caso do Avulso já
  // tinha sido usado quando o pagamento foi confirmado).
  const conversaoAnulada = listaConversoes.some((c) => c.estado === "anulada" && convertidaRecentemente(c.anulada_em));
  const reembolso = conversaoRecente
    ? estadoReembolsoCliente({
        refundEstado: conversaoRecente.refund_estado,
        requerIntervencao: conversaoRecente.requer_intervencao,
        intervencaoResolvida: !!conversaoRecente.intervencao_resolvida_em,
        montanteCentimos: conversaoRecente.refund_montante_centimos,
      })
    : null;

  // ---- Resumo do painel (só leituras com a sessão do cliente; RLS) --------
  const [{ data: perfil }, { data: casos }, { data: textosEmCurso }, { data: pedidos }] = await Promise.all([
    supabase.from("utilizadores").select("nome").eq("id", user.id).maybeSingle(),
    supabase
      .from("casos")
      .select("id, empresa, empresa_parceira, sector, tipo_problema, problema_tipo, status, created_at")
      .eq("utilizador_id", user.id)
      .order("created_at", { ascending: false }),
    // Texto em curso de cada caso (o RLS nunca devolve rascunhos).
    supabase
      .from("casos_textos")
      .select("caso_id, versao, estado")
      .in("estado", ["aguardando_aprovacao", "alteracoes_solicitadas", "autorizado"])
      .order("versao", { ascending: false }),
    supabase
      .from("pedidos_caso")
      .select("id, empresa, sector, problema_tipo")
      .eq("user_id", user.id)
      .in("estado", ["rascunho", "aguarda_pagamento"])
      .order("created_at", { ascending: false }),
  ]);
  const textoDoCaso = new Map<string, EstadoTextoRelevante>();
  for (const t of textosEmCurso ?? []) {
    if (!textoDoCaso.has(t.caso_id)) textoDoCaso.set(t.caso_id, t.estado as EstadoTextoRelevante);
  }
  const resumosCasos: ResumoCaso[] = (casos ?? []).map((c) => {
    const e = estadoCasoCliente(c.status, textoDoCaso.get(c.id) ?? null);
    return {
      id: c.id,
      empresa: c.empresa ?? c.empresa_parceira ?? "O seu caso",
      problema: c.tipo_problema ?? c.problema_tipo ?? null,
      setor: c.sector,
      rotulo: e.rotulo,
      tom: e.tom,
      proximoPasso: e.proximoPasso,
      requerAcao: e.requerAcao,
      concluido: c.status === "Resolvido",
      abertoEm: c.created_at,
    };
  });

  const atencao: ItemAtencao[] = [];
  for (const c of resumosCasos.filter((c) => c.requerAcao)) {
    const autorizacao = c.rotulo === "Precisamos da sua autorização";
    atencao.push({
      id: `caso-${c.id}`,
      titulo: autorizacao ? `Autorize o envio da reclamação · ${c.empresa}` : `Decida sobre a proposta · ${c.empresa}`,
      texto: autorizacao
        ? "Preparámos o texto da reclamação. Nada é enviado sem a sua autorização."
        : "Recebemos uma proposta para o seu caso. Diga-nos se a aceita.",
      href: `/portal/casos/${c.id}${autorizacao ? "#texto" : "#decisao"}`,
      cta: autorizacao ? "Rever e autorizar" : "Ver proposta",
    });
  }
  for (const p of pedidos ?? []) {
    atencao.push({
      id: `pedido-${p.id}`,
      titulo: `Pedido por concluir · ${p.empresa}`,
      texto: "O pedido está guardado. Só começamos a tratá-lo depois de escolher a modalidade e de o pagamento ser confirmado.",
      href: `/tratar-caso/modalidade?pedido=${p.id}`,
      cta: "Concluir pedido",
    });
  }

  let protecao: ResumoProtecao | null = null;
  if (acesso.temProtecao) {
    const [{ data: servicos }, { data: porConfirmar }, { data: porAssociar }, fornecedores] = await Promise.all([
      supabase
        .from("contratos_monitorizados")
        .select("id, fornecedor, data_fim_fidelizacao, data_fim_promocao")
        .eq("utilizador_id", user.id)
        .is("desativado_em", null),
      supabase.from("contratos_campos").select("contrato_id").eq("utilizador_id", user.id).in("estado", ["proposto", "em_conflito"]),
      supabase
        .from("documentos_monitor")
        .select("id")
        .eq("utilizador_id", user.id)
        .is("contrato_id", null)
        .in("associacao_estado", ["possivel", "conflito"]),
      listaFornecedores(),
    ]);
    const hoje = hojeLisboa();
    const proximas = (servicos ?? [])
      .map((s) => ({ s, p: proximaData(s, hoje) }))
      .filter((x) => x.p)
      .sort((a, b) => a.p!.dias - b.p!.dias);
    const proxima = proximas[0];
    protecao = {
      servicos: (servicos ?? []).length,
      proximoEvento: proxima
        ? `${nomeComercial(proxima.s.fornecedor, fornecedores) ?? "Serviço"}: ${textoProximaData(proxima.p).toLowerCase()}`
        : null,
    };
    const servicosPorConfirmar = new Set((porConfirmar ?? []).map((c) => c.contrato_id)).size;
    if (servicosPorConfirmar > 0) {
      atencao.push({
        id: "protecao-confirmar",
        titulo: servicosPorConfirmar === 1 ? "Confirme os dados de um serviço" : `Confirme os dados de ${servicosPorConfirmar} serviços`,
        texto: "Lemos os seus documentos. Só usamos estes dados depois de os confirmar.",
        href: "/portal/contratos",
        cta: "Rever dados",
      });
    }
    if ((porAssociar ?? []).length > 0) {
      atencao.push({
        id: "protecao-associar",
        titulo: "Um documento precisa da sua decisão",
        texto: "Não conseguimos confirmar a que serviço pertence. Não alterámos nada até decidir.",
        href: `/portal/contratos/documentos/${porAssociar![0].id}`,
        cta: "Decidir",
      });
    }
  }

  const cobranca = await cobrancaPromessa;

  return (
    <div className="flex flex-col gap-6">
      {aviso === "plano_ativo" && (resumo.plano === "protecao" || resumo.plano === "caso_protecao") && (
        <Aviso tom="sucesso" titulo={`Plano ${PLANOS[resumo.plano].nome} ativado`}>
          As funcionalidades de proteção já estão disponíveis.
        </Aviso>
      )}
      {conversaoRecente && (
        <Aviso tom="info" titulo={reembolso?.titulo}>
          <p>
            {mensagemConversao(
              conversaoRecente.plano_destino,
              conversaoRecente.valor_primeira_mensalidade_centimos,
              conversaoRecente.refund_montante_centimos,
            )}
          </p>
          {reembolso && <p className="mt-1">{reembolso.texto}</p>}
        </Aviso>
      )}
      {conversaoAnulada && !acesso.temProtecao && (
        <Aviso tom="info" titulo="A adesão não foi concluída">
          O caso do seu Avulso já tinha sido utilizado quando o pagamento foi confirmado, por isso o valor do Avulso não
          pode cobrir a primeira mensalidade. A subscrição foi cancelada sem qualquer cobrança. Pode aderir a uma
          subscrição como nova compra.
        </Aviso>
      )}
      {aviso === "pagamento_pendente" && (
        <Aviso tom="info" titulo="Pagamento em confirmação">
          O pagamento ainda está a ser confirmado. Não precisa de voltar a pagar. Alguns métodos, como o débito direto
          SEPA, podem demorar alguns dias úteis; assim que o pagamento for confirmado, o acesso é ativado
          automaticamente e avisamos por e-mail.
        </Aviso>
      )}
      {aviso === "pagamento_falhado" && ultimo && (
        <Aviso
          tom="erro"
          titulo="Pagamento não concluído"
          acao={
            // Cada tentativa passa de novo pela confirmação da compra.
            ultimo.plano === "avulso" ? (
              <BotaoComprar plano="avulso" fluxo="avulso_conta" origem="repetir_pagamento" className={BOTAO_PRIMARIO}>
                Tentar pagar novamente
              </BotaoComprar>
            ) : (
              // O registo do pagamento não guarda qual das subscrições era:
              // o cliente escolhe de novo.
              <>
                <BotaoComprar
                  plano="protecao"
                  fluxo="adesao"
                  origem="repetir_pagamento"
                  conversao={ofertaConversao("protecao")}
                  className={BOTAO_SECUNDARIO}
                >
                  Tentar novamente — {PLANOS.protecao.nome}
                </BotaoComprar>
                <BotaoComprar
                  plano="caso_protecao"
                  fluxo="adesao"
                  origem="repetir_pagamento"
                  conversao={ofertaConversao("caso_protecao")}
                  className={BOTAO_SECUNDARIO}
                >
                  Tentar novamente — {PLANOS.caso_protecao.nome}
                </BotaoComprar>
              </>
            )
          }
        >
          O banco não confirmou o seu último pagamento, por isso o acesso não foi ativado. A sua conta e os seus dados
          continuam guardados. Pode tentar pagar de novo, com o mesmo ou com outro método de pagamento.
        </Aviso>
      )}
      {params.erro && (
        <Aviso tom="erro">{MENSAGENS_ERRO[params.erro] ?? "Não foi possível concluir o pedido. Tente novamente."}</Aviso>
      )}
      <PortalDashboard
        primeiroNome={perfil?.nome?.trim().split(/\s+/)[0] ?? null}
        atencao={atencao}
        casos={resumosCasos}
        protecao={protecao}
        resumo={resumo}
        cobranca={cobranca}
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
