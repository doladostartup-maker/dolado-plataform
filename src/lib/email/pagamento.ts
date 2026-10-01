// Extensões .ts explícitas: o módulo é testado diretamente com `node --test`.
import { IVA_INCLUIDO, PLANOS, formatarPreco, precoComUnidade } from "../planos.ts";
import {
  COMO_EXERCER_LIVRE_RESOLUCAO,
  RESUMO_LIVRE_RESOLUCAO,
  ROTAS_LEGAIS,
  rotaTermosVersao,
} from "../legal.ts";
import { CONTACTO_EMAIL, MARKETING_SITE_URL } from "../site.ts";

export type PlanoEmail = "avulso" | "protecao" | "caso_protecao";

export type DadosEmailPagamento = {
  /** /criar-conta?session_id=… quando a conta ainda não existe; /entrar quando já existe. */
  ligacao: string;
  contaExiste: boolean;
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

const P = 'style="margin:0 0 16px 0;"';
const LINK = 'style="color:#0E6B5C;"';
const TD_L = 'style="padding:4px 12px 4px 0; color:#5B6270; font-size:14px; vertical-align:top;"';
const TD_V = 'style="padding:4px 0; color:#171A21; font-size:14px; font-weight:600;"';

/**
 * Confirmação da contratação em suporte duradouro: produto, valor, tipo,
 * renovação, como gerir/cancelar, início imediato pedido, livre resolução e
 * como a exercer, e ligações para os Termos aceites e a Política de
 * Privacidade. Textos legais vêm de src/lib/legal.ts; preços de planos.ts.
 */
export function montarHtmlBoasVindasPagamento(plano: PlanoEmail, dados: DadosEmailPagamento) {
  const { contaExiste, ligacao, valorPagoCentimos, renovacao, consentimento, portalUrl } = dados;
  const info = PLANOS[plano];
  const nomePlano = info.nome;
  const passo = contaExiste
    ? "Já pode iniciar sessão no portal: o seu acesso já está ativo."
    : plano === "protecao"
      ? "Falta só um passo: crie a sua palavra-passe para aceder ao portal."
      : "Falta só um passo: crie a sua palavra-passe para aceder ao portal e abrir o seu caso.";
  const botao = contaExiste ? "Iniciar sessão" : "Criar a minha conta";

  const linhas: [string, string][] = [["Produto", nomePlano]];
  if (valorPagoCentimos !== null) linhas.push(["Valor pago", `${formatarPreco(valorPagoCentimos)} (${IVA_INCLUIDO})`]);
  if (info.subscricao) {
    linhas.push(["Tipo", "Subscrição mensal com renovação automática"]);
    linhas.push(["Preço do plano", `${precoComUnidade(plano)} (${IVA_INCLUIDO})`]);
    if (renovacao) linhas.push(["Próxima renovação", formatarData(renovacao)]);
  } else {
    linhas.push(["Tipo", "Pagamento único"]);
  }
  const tabela = linhas
    .map(([l, v]) => `<tr><td ${TD_L}>${l}</td><td ${TD_V}>${v}</td></tr>`)
    .join("");

  const termosUrl = `${MARKETING_SITE_URL}${consentimento ? rotaTermosVersao(consentimento.termos_versao) : ROTAS_LEGAIS.termos}`;
  const privacidadeUrl = `${MARKETING_SITE_URL}${ROTAS_LEGAIS.privacidade}`;
  const livreResolucaoUrl = `${MARKETING_SITE_URL}${ROTAS_LEGAIS.livreResolucao}`;
  const gestaoUrl = `${portalUrl}${ROTAS_LEGAIS.gestaoSubscricao}`;

  const blocoSubscricao = info.subscricao
    ? `<p ${P}><strong>Renovação e cancelamento.</strong> A subscrição renova-se automaticamente todos os meses${
        valorPagoCentimos !== null && valorPagoCentimos !== info.precoCentimos
          ? ", com os descontos aplicados nas condições do código usado no pagamento"
          : ""
      }, até a cancelar. Pode cancelar a qualquer momento em <a href="${gestaoUrl}" ${LINK}>Gestão de Subscrição</a>, na sua área de cliente; o cancelamento produz efeitos no fim do período já pago.</p>`
    : "";

  const blocoInicio = consentimento?.pediu_inicio_imediato
    ? `<p ${P}><strong>Início imediato.</strong> Antes do pagamento, pediu expressamente que a DoLado iniciasse a prestação do serviço de imediato, antes do fim do prazo de 14 dias de livre resolução.</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pagamento confirmado — DoLado</title>
</head>
<body style="margin:0; padding:0; background-color:#F7F6F2; font-family: 'Inter', Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F6F2; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#FFFFFF; border-radius:12px; border:1px solid #E4E2DB; overflow:hidden;">
          <tr>
            <td style="padding: 32px 32px 0 32px;">
              <span style="font-family:'Inter', Arial, Helvetica, sans-serif; font-size:20px; font-weight:600; color:#0E6B5C;">DoLado</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 8px 32px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:16px; line-height:1.6;">
              <p ${P}>Olá,</p>
              <p ${P}>O seu pagamento foi confirmado. Obrigado por confiar na DoLado. Guarde este e-mail como confirmação da sua contratação.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">${tabela}</table>
              <p ${P}>${passo}</p>
              <p ${P}><a href="${ligacao}" style="display:inline-block; background-color:#0E6B5C; color:#FFFFFF; text-decoration:none; font-weight:600; padding:10px 18px; border-radius:8px;">${botao}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 32px 8px 32px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:14px; line-height:1.6;">
              ${blocoSubscricao}
              ${blocoInicio}
              <p ${P}><strong>Direito de livre resolução.</strong> ${RESUMO_LIVRE_RESOLUCAO} ${COMO_EXERCER_LIVRE_RESOLUCAO} <a href="${livreResolucaoUrl}" ${LINK}>Saiba mais</a>.</p>
              <p ${P}>Documentos: <a href="${termosUrl}" ${LINK}>Termos e Condições${consentimento ? ` (versão ${consentimento.termos_versao})` : ""}</a> · <a href="${privacidadeUrl}" ${LINK}>Política de Privacidade</a>.</p>
              <p ${P}>Para qualquer questão: <a href="mailto:${CONTACTO_EMAIL}" ${LINK}>${CONTACTO_EMAIL}</a>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 32px 24px 32px; font-family:'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:16px; line-height:1.6;">
              <p style="margin:0 0 4px 0;">Estamos juntos nisto.</p>
              <p style="margin:0; font-weight:600;">Thiago<br><span style="font-weight:400; color:#5B6270; font-size:14px;">DoLado</span></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color:#EFEDE7; font-family:'Inter', Arial, Helvetica, sans-serif; font-size:13px; color:#5B6270;">
              <a href="https://www.dolado.pt" style="color:#0E6B5C; text-decoration:none;">www.dolado.pt</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function montarHtmlNotificacaoNovoPagamento(email: string, plano: PlanoEmail) {
  const nomePlano = PLANOS[plano].nome;

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
