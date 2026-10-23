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
