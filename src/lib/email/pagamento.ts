// Extensões .ts explícitas: o módulo é testado diretamente com `node --test`.
import { CASO_EXTRA, IVA_INCLUIDO, PLANOS, TEXTO_BENEFICIO_SUBSCRITOR, formatarPreco, precoComUnidade } from "../planos.ts";
import {
  COMO_EXERCER_LIVRE_RESOLUCAO,
  RESUMO_LIVRE_RESOLUCAO,
  ROTAS_LEGAIS,
  rotaTermosVersao,
} from "../legal.ts";
import { CONTACTO_EMAIL, MARKETING_SITE_URL } from "../site.ts";
import { LIGACAO_EMAIL, P_EMAIL, botaoEmail, emailV2, tabelaEmail } from "./molduraEmail.ts";

export type PlanoEmail = "avulso" | "protecao" | "caso_protecao" | "caso_extra";

/** Nome, preço e tipo do produto (o Caso Extra não é um plano de PLANOS). */
function produtoDoEmail(plano: PlanoEmail) {
  if (plano === "caso_extra") {
    return { nome: CASO_EXTRA.nome, precoCentimos: CASO_EXTRA.precoCentimos, subscricao: false };
  }
  return PLANOS[plano];
}

export type DadosEmailPagamento = {
  /** /criar-conta?session_id=… quando a conta ainda não existe; /entrar quando já existe. */
  ligacao: string;
  contaExiste: boolean;
  /**
   * Compra sem conta ligada, mas o e-mail do Checkout já tem conta: o passo
   * é iniciar sessão e associar a compra (nunca criar outra conta).
   */
  associarCompra?: boolean;
  /** Valor efetivamente pago agora (com descontos/cupões), em cêntimos. */
  valorPagoCentimos: number | null;
  /** Próxima renovação (ISO) nas subscrições, se conhecida. */
  renovacao: string | null;
  /** Registo de consentimento ligado a esta compra (null em compras sem registo). */
  consentimento: { termos_versao: string; pediu_inicio_imediato: boolean } | null;
  /** https://portal.dolado.pt — para a Gestão de Subscrição. */
  portalUrl: string;
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Lisbon",
  });
}

const P = P_EMAIL;
const LINK = LIGACAO_EMAIL;
/** Textos legais e documentos: um pouco mais pequenos do que o corpo. */
const P_LEGAL = 'style="margin:0 0 16px 0; font-size:14px; line-height:1.6;"';

/**
 * Confirmação da contratação em suporte duradouro: produto, valor, tipo,
 * renovação, como gerir/cancelar, início imediato pedido, livre resolução e
 * como a exercer, e ligações para os Termos aceites e a Política de
 * Privacidade. Textos legais vêm de src/lib/legal.ts; preços de planos.ts.
 */
export function montarHtmlBoasVindasPagamento(plano: PlanoEmail, dados: DadosEmailPagamento) {
  const { contaExiste, associarCompra = false, ligacao, valorPagoCentimos, renovacao, consentimento, portalUrl } = dados;
  const info = produtoDoEmail(plano);
  const casoExtra = plano === "caso_extra";
  const nomePlano = info.nome;
  // O Caso Extra é sempre comprado com sessão iniciada (contaExiste).
  const passo = casoExtra
    ? "Tem 1 Caso Extra na sua conta. Se pagou um caso que já tinha descrito, esse caso segue para tratamento; acompanhe-o em Os meus casos."
    : contaExiste
      ? "Já pode iniciar sessão no portal: o seu acesso já está ativo."
      : associarCompra
        ? "Já existe uma conta na DoLado com este e-mail. Falta só um passo: inicie sessão e associe esta compra à sua conta."
        : plano === "protecao"
          ? "Falta só um passo: crie a sua palavra-passe para aceder ao portal."
          : "Falta só um passo: crie a sua palavra-passe para aceder ao portal e abrir o seu caso.";
  const botao = casoExtra
    ? "Ver os meus casos"
    : contaExiste
      ? "Iniciar sessão"
      : associarCompra
        ? "Associar a compra"
        : "Criar a minha conta";
  const destinoBotao = casoExtra ? `${portalUrl}/portal/casos` : ligacao;

  const linhas: [string, string][] = [["Produto", casoExtra ? `${nomePlano} (${TEXTO_BENEFICIO_SUBSCRITOR})` : nomePlano]];
  if (valorPagoCentimos !== null) linhas.push(["Valor pago", `${formatarPreco(valorPagoCentimos)} (${IVA_INCLUIDO})`]);
  if (info.subscricao) {
    linhas.push(["Tipo", "Subscrição mensal com renovação automática"]);
    linhas.push(["Preço do plano", `${precoComUnidade(plano as "protecao" | "caso_protecao")} (${IVA_INCLUIDO})`]);
    if (renovacao) linhas.push(["Próxima renovação", formatarData(renovacao)]);
  } else {
    linhas.push(["Tipo", "Pagamento único"]);
  }
  if (casoExtra) linhas.push(["A sua subscrição", "Continua ativa e não foi alterada"]);
  const tabela = tabelaEmail(linhas);

  const termosUrl = `${MARKETING_SITE_URL}${consentimento ? rotaTermosVersao(consentimento.termos_versao) : ROTAS_LEGAIS.termos}`;
  const privacidadeUrl = `${MARKETING_SITE_URL}${ROTAS_LEGAIS.privacidade}`;
  const livreResolucaoUrl = `${MARKETING_SITE_URL}${ROTAS_LEGAIS.livreResolucao}`;
  const gestaoUrl = `${portalUrl}${ROTAS_LEGAIS.gestaoSubscricao}`;

  const blocoSubscricao = info.subscricao
    ? `<p ${P_LEGAL}><strong>Renovação e cancelamento.</strong> A subscrição renova-se automaticamente todos os meses${
        valorPagoCentimos !== null && valorPagoCentimos !== info.precoCentimos
          ? ", com os descontos aplicados nas condições do código usado no pagamento"
          : ""
      }, até a cancelar. Pode cancelar a qualquer momento em <a href="${gestaoUrl}" ${LINK}>Gestão de Subscrição</a>, na sua área de cliente; o cancelamento produz efeitos no fim do período já pago.</p>`
    : "";

  const blocoInicio = consentimento?.pediu_inicio_imediato
    ? `<p ${P_LEGAL}><strong>Início imediato.</strong> Antes do pagamento, pediu expressamente que a DoLado iniciasse a prestação do serviço de imediato, antes do fim do prazo de 14 dias de livre resolução.</p>`
    : "";

  return emailV2({
    titulo: "Pagamento confirmado — DoLado",
    corpo: `<p ${P}>Olá,</p>
              <p ${P}>O seu pagamento foi confirmado. Obrigado por confiar na DoLado. Guarde este e-mail como confirmação da sua contratação.</p>
              ${tabela}
              <p ${P}>${passo}</p>
              ${botaoEmail(destinoBotao, botao)}
              ${blocoSubscricao}
              ${blocoInicio}
              <p ${P_LEGAL}><strong>Direito de livre resolução.</strong> ${RESUMO_LIVRE_RESOLUCAO} ${COMO_EXERCER_LIVRE_RESOLUCAO} <a href="${livreResolucaoUrl}" ${LINK}>Saiba mais</a>.</p>
              <p ${P_LEGAL}>Documentos: <a href="${termosUrl}" ${LINK}>Termos e Condições${consentimento ? ` (versão ${consentimento.termos_versao})` : ""}</a> · <a href="${privacidadeUrl}" ${LINK}>Política de Privacidade</a>.</p>
              <p ${P_LEGAL}>Para qualquer questão: <a href="mailto:${CONTACTO_EMAIL}" ${LINK}>${CONTACTO_EMAIL}</a>.</p>`,
  });
}

export function montarHtmlNotificacaoNovoPagamento(email: string, plano: PlanoEmail) {
  const nomePlano = produtoDoEmail(plano).nome;

  return `<!DOCTYPE html>
<html lang="pt-PT">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, Helvetica, sans-serif; color:#171A21;">
  <p>Novo pagamento recebido.</p>
  <p><strong>E-mail:</strong> ${email}<br>
  <strong>Plano:</strong> ${nomePlano}</p>
</body>
</html>`;
}
