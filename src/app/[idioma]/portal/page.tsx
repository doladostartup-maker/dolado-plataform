import { BotaoComprar } from "@/components/compra/BotaoComprar";
import { avisoDoPortal, estadoReembolsoCliente, resumoPlanoPortal } from "@/lib/acesso";
import { obterAcesso, requireUser } from "@/lib/auth";
import { casosDoMes } from "@/lib/casoExtra";
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
import { textoProximaData } from "@/lib/monitor/contratos";
import { carregarProtecao, hojeLisboa } from "@/lib/monitor/protecaoCliente";
import { dataExtenso } from "@/lib/monitor/resultadoProtecao";
import { estadoCasoCliente, type EstadoTextoRelevante } from "@/lib/portal/estadoCaso";
import { Aviso } from "@/components/portal/Aviso";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "@/components/portal/ui";
import { PortalDashboard, type ItemAtencao, type ResumoCaso, type ResumoProtecao } from "./_components/PortalDashboard";
import { tEstadoCaso } from "@/i18n/mensagens/estadoCaso";
import { tPlanos } from "@/i18n/mensagens/planos";
import { tPortal } from "@/i18n/mensagens/portal";
import { rotulo } from "@/i18n/mensagens/rotulos";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";


const TRINTA_DIAS_MS = 30 * 24 * 3600 * 1000;

function convertidaRecentemente(convertidoEm: string | null) {
  return !!convertidoEm && Date.now() - new Date(convertidoEm).getTime() < TRINTA_DIAS_MS;
}

export default async function PortalIndex({
  searchParams,
  params: paramsPagina,
}: {
  searchParams: Promise<{ bloqueado?: string; upgraded?: string; erro?: string }>;
} & ComIdioma) {
  const idioma = await idiomaDaPagina(paramsPagina);
  const t = tPortal[idioma].painel;
  const tp = tPlanos[idioma];
  const MENSAGENS_ERRO: Record<string, string> = t.avisos.erros;
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
  const resumo = resumoPlanoPortal(acesso, idioma);
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
    ? estadoReembolsoCliente(
        {
          refundEstado: conversaoRecente.refund_estado,
          requerIntervencao: conversaoRecente.requer_intervencao,
          intervencaoResolvida: !!conversaoRecente.intervencao_resolvida_em,
          montanteCentimos: conversaoRecente.refund_montante_centimos,
        },
        idioma,
      )
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
    const e = estadoCasoCliente(c.status, textoDoCaso.get(c.id) ?? null, {}, idioma);
    return {
      id: c.id,
      empresa: c.empresa ?? c.empresa_parceira ?? t.oSeuCaso,
      problema: rotulo(idioma, "problemas", c.tipo_problema ?? c.problema_tipo) || null,
      setor: rotulo(idioma, "setores", c.sector) || null,
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
    const autorizacao = c.rotulo === tEstadoCaso[idioma].textoAguarda.rotulo;
    atencao.push({
      id: `caso-${c.id}`,
      titulo: autorizacao ? t.atencao.autorizarTitulo(c.empresa) : t.atencao.decidirTitulo(c.empresa),
      texto: autorizacao ? t.atencao.autorizarTexto : t.atencao.decidirTexto,
      href: `/portal/casos/${c.id}${autorizacao ? "#texto" : "#decisao"}`,
      cta: autorizacao ? t.atencao.autorizarCta : t.atencao.decidirCta,
    });
  }
  for (const p of pedidos ?? []) {
    atencao.push({
      id: `pedido-${p.id}`,
      titulo: t.atencao.pedidoTitulo(p.empresa),
      texto: t.atencao.pedidoTexto,
      href: `/tratar-caso/modalidade?pedido=${p.id}`,
      cta: t.atencao.pedidoCta,
    });
  }

  let protecao: ResumoProtecao | null = null;
  if (acesso.temProtecao) {
    const [{ servicos, geral }, { data: porAssociar }] = await Promise.all([
      carregarProtecao(supabase, user.id, undefined, idioma),
      supabase
        .from("documentos_monitor")
        .select("id")
        .eq("utilizador_id", user.id)
        .is("contrato_id", null)
        .in("associacao_estado", ["possivel", "conflito"]),
    ]);
    const hoje = hojeLisboa();
    const proxima = geral.proxima;
    protecao = {
      servicos: servicos.length,
      proximoEvento: proxima ? `${proxima.servico}: ${textoProximaData(proxima.proxima, idioma).toLowerCase()}` : null,
      resultado:
        servicos.length > 0
          ? {
              titulo: geral.titulo,
              texto: geral.texto,
              tom: geral.estado === "encontramos" ? "atencao" : geral.estado === "verificado" ? "ok" : "info",
              ultimaVerificacao: geral.ultimaVerificacao ? dataExtenso(geral.ultimaVerificacao, hoje, idioma) : null,
            }
          : null,
    };
    // O que a DoLado encontrou (revisto e comunicado) vem primeiro.
    for (const s of geral.situacoes) {
      atencao.push({
        id: `protecao-situacao-${s.id}`,
        titulo: t.atencao.situacaoTitulo(s.servicoNome),
        texto: s.resumo ?? t.atencao.situacaoTexto,
        href: `/portal/contratos/${s.servicoId}#resultado`,
        cta: t.atencao.situacaoCta,
      });
    }
    const servicosPorConfirmar = servicos.filter((s) => s.confirmar).length;
    if (servicosPorConfirmar > 0) {
      atencao.push({
        id: "protecao-confirmar",
        titulo: servicosPorConfirmar === 1 ? t.atencao.confirmarUm : t.atencao.confirmarVarios(servicosPorConfirmar),
        texto: t.atencao.confirmarTexto,
        href: "/portal/contratos",
        cta: t.atencao.confirmarCta,
      });
    }
    if ((porAssociar ?? []).length > 0) {
      atencao.push({
        id: "protecao-associar",
        titulo: t.atencao.associarTitulo,
        texto: t.atencao.associarTexto,
        href: `/portal/contratos/documentos/${porAssociar![0].id}`,
        cta: t.atencao.associarCta,
      });
    }
  }

  const cobranca = await cobrancaPromessa;

  return (
    <div className="flex flex-col gap-6">
      {aviso === "plano_ativo" && (resumo.plano === "protecao" || resumo.plano === "caso_protecao") && (
        <Aviso tom="sucesso" titulo={t.avisos.planoAtivado(tp.nome[resumo.plano])}>
          {t.avisos.planoAtivadoTexto}
        </Aviso>
      )}
      {conversaoRecente && (
        <Aviso tom="info" titulo={reembolso?.titulo}>
          <p>
            {mensagemConversao(
              conversaoRecente.plano_destino,
              conversaoRecente.valor_primeira_mensalidade_centimos,
              conversaoRecente.refund_montante_centimos,
              idioma,
            )}
          </p>
          {reembolso && <p className="mt-1">{reembolso.texto}</p>}
        </Aviso>
      )}
      {conversaoAnulada && !acesso.temProtecao && (
        <Aviso tom="info" titulo={t.avisos.adesaoNaoConcluida}>
          {t.avisos.adesaoNaoConcluidaTexto}
        </Aviso>
      )}
      {aviso === "pagamento_pendente" && (
        <Aviso tom="info" titulo={t.avisos.pagamentoConfirmacao}>
          {t.avisos.pagamentoConfirmacaoTexto}
        </Aviso>
      )}
      {aviso === "pagamento_falhado" && ultimo && (
        <Aviso
          tom="erro"
          titulo={t.avisos.pagamentoFalhado}
          acao={
            // Cada tentativa passa de novo pela confirmação da compra.
            ultimo.plano === "avulso" ? (
              <BotaoComprar plano="avulso" fluxo="avulso_conta" origem="repetir_pagamento" className={BOTAO_PRIMARIO}>
                {t.avisos.tentarNovamente}
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
                  {t.avisos.tentarNovamentePlano(tp.nome.protecao)}
                </BotaoComprar>
                <BotaoComprar
                  plano="caso_protecao"
                  fluxo="adesao"
                  origem="repetir_pagamento"
                  conversao={ofertaConversao("caso_protecao")}
                  className={BOTAO_SECUNDARIO}
                >
                  {t.avisos.tentarNovamentePlano(tp.nome.caso_protecao)}
                </BotaoComprar>
              </>
            )
          }
        >
          {t.avisos.pagamentoFalhadoTexto}
        </Aviso>
      )}
      {params.erro && (
        <Aviso tom="erro">{MENSAGENS_ERRO[params.erro] ?? t.avisos.erroGenerico}</Aviso>
      )}
      <PortalDashboard
        primeiroNome={perfil?.nome?.trim().split(/\s+/)[0] ?? null}
        atencao={atencao}
        casos={resumosCasos}
        protecao={protecao}
        resumo={resumo}
        casosDoMes={casosDoMes(acesso)}
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
