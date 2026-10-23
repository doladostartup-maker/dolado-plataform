// E-mails da DoLado Empresas (Fase 4): pedido recebido, aprovado, lista de
// espera, não aprovado e MFA reposto. Só em português (D1). Extensões .ts
// explícitas: testado com `node --test`.
//
// Ao cliente: sem dados da organização além do nome escrito no registo
// (escapado). O motivo de uma rejeição só vai quando o admin o escreve para
// o cliente. À equipa: avisos internos sem dados do registo além do nome.
import { escaparHtml } from "./textoRevisao.ts";
import { P_EMAIL, P_NOTA, botaoEmail, emailV2 } from "./molduraEmail.ts";

const PORTAL = "https://portal.dolado.pt";

export type MomentoEmpresa = "pedidoRecebido" | "aprovada" | "listaEspera" | "rejeitada" | "mfaReposto";

export const ASSUNTOS_EMPRESA: Record<MomentoEmpresa, string> = {
  pedidoRecebido: "Recebemos o pedido de adesão da sua empresa",
  aprovada: "O pedido da sua empresa foi aprovado",
  listaEspera: "O pedido da sua empresa está em lista de espera",
  rejeitada: "Sobre o pedido de adesão da sua empresa",
  mfaReposto: "O acesso à conta da sua empresa foi reposto",
};

function montar(titulo: string, paragrafos: string[], botao?: { href: string; texto: string }, nota?: string) {
  return emailV2({
    titulo,
    preheader: titulo,
    corpo: [
      `<p ${P_EMAIL}>Olá,</p>`,
      ...paragrafos.map((p) => `<p ${P_EMAIL}>${p}</p>`),
      botao ? botaoEmail(botao.href, botao.texto) : "",
      nota ? `<p ${P_NOTA}>${nota}</p>` : "",
    ]
      .filter(Boolean)
      .join("\n          "),
  });
}

export function montarHtmlEmpresa(momento: MomentoEmpresa, dados: { nome: string; motivo?: string | null }): string {
  const nome = escaparHtml(dados.nome);
  switch (momento) {
    case "pedidoRecebido":
      return montar(
        ASSUNTOS_EMPRESA.pedidoRecebido,
        [
          `Recebemos o pedido de adesão de <strong>${nome}</strong> à Protecção Empresas da DoLado.`,
          "Analisamos cada pedido e respondemos por e-mail no prazo máximo de 2 dias úteis. Não precisa de fazer mais nada até lá.",
        ],
        { href: `${PORTAL}/empresa`, texto: "Ver o estado do pedido" },
      );
    case "aprovada":
      return montar(
        ASSUNTOS_EMPRESA.aprovada,
        [
          `O pedido de adesão de <strong>${nome}</strong> foi aprovado.`,
          "Vamos enviar-lhe os dados para o pagamento por transferência. A Protecção Empresas fica activa quando o pagamento for confirmado.",
        ],
        { href: `${PORTAL}/empresa`, texto: "Ver o estado da conta" },
      );
    case "listaEspera":
      return montar(ASSUNTOS_EMPRESA.listaEspera, [
        `Obrigado pelo pedido de adesão de <strong>${nome}</strong>.`,
        "Nesta fase acompanhamos um número limitado de empresas e as vagas estão preenchidas. Mantemos o seu pedido e avisamos por e-mail quando houver vaga.",
      ]);
    case "rejeitada":
      return montar(
        ASSUNTOS_EMPRESA.rejeitada,
        [
          `Analisámos o pedido de adesão de <strong>${nome}</strong> e, de momento, não o podemos aprovar.`,
          ...(dados.motivo ? [escaparHtml(dados.motivo)] : []),
        ],
        undefined,
        "Se tiver dúvidas, responda a este e-mail.",
      );
    case "mfaReposto":
      return montar(
        ASSUNTOS_EMPRESA.mfaReposto,
        [
          `Depois de confirmarmos a identidade, retirámos os factores da autenticação em dois passos da conta de <strong>${nome}</strong>.`,
          "Ao entrar, inscreva de novo os dois factores: o principal e o de reserva, noutro dispositivo ou num gestor de palavras-passe.",
        ],
        { href: `${PORTAL}/empresas/entrar`, texto: "Entrar na conta" },
        "Se não pediu esta reposição, contacte-nos de imediato.",
      );
  }
}

/** Aviso interno à equipa (nome da organização e o que aconteceu; sem outros dados). */
export function montarHtmlAvisoEquipaEmpresa(texto: string): string {
  return `<p>${escaparHtml(texto)}</p><p><a href="${PORTAL}/backoffice/empresas">Abrir o backoffice — Empresas</a></p>`;
}

// ---------------------------------------------------------------------------
// Ciclo de pagamento (Fase 5): um e-mail por aviso de empresa_avisos.
// ---------------------------------------------------------------------------

export type DadosAvisoCiclo = {
  nome: string;
  /** Período do aviso (vencimento = início). */
  periodo?: { inicio: string; fim: string; valor: string; referencia: string | null } | null;
  /** Datas já por extenso ("23 de Outubro de 2026"). */
  suspensaEm?: string;
  canceladaEm?: string;
  consultaAte?: string | null;
  eliminacaoEm?: string | null;
};

export const ASSUNTOS_AVISO_CICLO = {
  ativada: "A Protecção Empresas está activa",
  a_vencer: "A próxima mensalidade da Protecção Empresas",
  pagamento_confirmado: "Pagamento confirmado",
  atraso: "Mensalidade por pagar",
  suspensa: "A Protecção Empresas está suspensa",
  reativada: "A Protecção Empresas voltou a estar activa",
  cancelada_falta_pagamento: "A Protecção Empresas foi cancelada",
  cancelamento_agendado: "Recebemos o pedido de cancelamento",
  cancelamento_retirado: "A Protecção Empresas continua activa",
  cancelada_pedido: "A Protecção Empresas terminou",
  cancelada_admin: "A Protecção Empresas foi cancelada",
  encerrada: "Terminou o período de consulta",
} as const;

export type TipoAvisoCiclo = keyof typeof ASSUNTOS_AVISO_CICLO;

const CONTA = { href: `${PORTAL}/empresa`, texto: "Ver a conta da empresa" };

export function montarHtmlAvisoCiclo(tipo: TipoAvisoCiclo, d: DadosAvisoCiclo): string {
  const nome = `<strong>${escaparHtml(d.nome)}</strong>`;
  const p = d.periodo;
  const ref = p?.referencia ? ` (factura ${escaparHtml(p.referencia)})` : "";
  const t = ASSUNTOS_AVISO_CICLO[tipo];
  switch (tipo) {
    case "ativada":
      return montar(t, [
        `Confirmámos o pagamento da primeira mensalidade${ref} e a Protecção Empresas de ${nome} está activa.`,
        p ? `O primeiro período vai de ${p.inicio} a ${p.fim}. A mensalidade seguinte vence a ${p.fim}; enviamos a factura antes, com os dados para a transferência.` : "",
      ].filter(Boolean), CONTA);
    case "a_vencer":
      return montar(t, [
        p ? `A próxima mensalidade da Protecção Empresas de ${nome} (${escaparHtml(p.valor)}) vence a ${p.inicio}.` : `A próxima mensalidade da Protecção Empresas de ${nome} está a vencer.`,
        "Vai receber a factura com os dados para a transferência. Se já fez o pagamento, não precisa de fazer mais nada.",
      ], CONTA);
    case "pagamento_confirmado":
      return montar(t, [
        p ? `Confirmámos o pagamento da mensalidade de ${nome} do período de ${p.inicio} a ${p.fim}${ref}.` : `Confirmámos o pagamento da mensalidade de ${nome}.`,
        "Obrigado.",
      ], CONTA);
    case "atraso":
      return montar(t, [
        p ? `A mensalidade da Protecção Empresas de ${nome} que venceu a ${p.inicio} ainda não está paga.` : `Há uma mensalidade de ${nome} por pagar.`,
        d.suspensaEm ? `Se o pagamento não for confirmado até ${d.suspensaEm}, a Protecção fica suspensa: pode continuar a consultar e exportar os dados, mas deixamos de analisar documentos novos.` : "",
      ].filter(Boolean), CONTA, "Se já fez a transferência, responda a este e-mail com o comprovativo.");
    case "suspensa":
      return montar(t, [
        `A Protecção Empresas de ${nome} está suspensa por falta de pagamento. Pode continuar a consultar e exportar os dados; não analisamos documentos novos.`,
        d.canceladaEm ? `Se o pagamento não for confirmado até ${d.canceladaEm}, a Protecção é cancelada.` : "",
      ].filter(Boolean), CONTA, "Se já fez a transferência, responda a este e-mail com o comprovativo.");
    case "reativada":
      return montar(t, [`A Protecção Empresas de ${nome} voltou a estar activa.`], CONTA);
    case "cancelada_falta_pagamento":
      return montar(t, [
        `A Protecção Empresas de ${nome} foi cancelada por falta de pagamento.`,
        d.eliminacaoEm ? `Os documentos guardados serão eliminados a partir de ${d.eliminacaoEm}.` : "",
      ].filter(Boolean), undefined, "Se quiser retomar a Protecção, responda a este e-mail.");
    case "cancelamento_agendado":
      return montar(t, [
        `Recebemos o pedido de cancelamento da Protecção Empresas de ${nome}.`,
        p ? `A Protecção continua activa até ${p.fim}. Depois, durante 30 dias, pode consultar e exportar os dados. Não há mais mensalidades.` : "",
      ].filter(Boolean), CONTA, "Se mudar de ideias antes dessa data, pode manter a Protecção na conta da empresa.");
    case "cancelamento_retirado":
      return montar(t, [`Retirou o pedido de cancelamento: a Protecção Empresas de ${nome} continua activa, com as mensalidades de sempre.`], CONTA);
    case "cancelada_pedido":
    case "cancelada_admin":
      return montar(t, [
        tipo === "cancelada_pedido"
          ? `Como pediu, a Protecção Empresas de ${nome} terminou.`
          : `A Protecção Empresas de ${nome} foi cancelada.`,
        d.consultaAte ? `Até ${d.consultaAte} pode consultar e exportar os dados na conta da empresa.` : "",
      ].filter(Boolean), CONTA);
    case "encerrada":
      return montar(t, [
        `Terminou o período de consulta da Protecção Empresas de ${nome}.`,
        d.eliminacaoEm ? `Os documentos guardados serão eliminados a partir de ${d.eliminacaoEm}.` : "",
      ].filter(Boolean), undefined, "Obrigado por ter confiado na DoLado.");
  }
}
