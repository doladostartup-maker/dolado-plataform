// Programa de indicação: link /r/<código>, área "Indique a DoLado" no
// portal e textos da compra. O português vem de src/lib/indicacoes/regras.ts
// (fonte única, alinhada com os Termos — secção 22).

import { INDICACAO_PERCENTAGEM, REGRA_CASO_PROTECAO, TEXTOS_INDICACAO } from "../../../lib/indicacoes/regras.ts";

const P = INDICACAO_PERCENTAGEM;

export const indicacoes = {
  textos: { ...TEXTOS_INDICACAO },
  regraCasoProtecao: REGRA_CASO_PROTECAO,
  descontosDisponiveis: (n: number) =>
    n <= 0 ? "Sem descontos disponíveis" : n === 1 ? `1 desconto de ${P}% disponível` : `${n} descontos de ${P}% disponíveis`,
  validade: (data: string) => `válido até ${data}`,
  descontoNaCompra: {
    novoClienteSubscricao: `Desconto de indicação: ${P}% na primeira mensalidade, aplicado automaticamente no pagamento. A partir do mês seguinte, é cobrado o preço do plano.`,
    novoClienteCompra: `Desconto de indicação: ${P}% na primeira compra, aplicado automaticamente no pagamento.`,
    recompensaSubscricao: `Usamos 1 dos seus descontos de indicação: ${P}% na primeira mensalidade. A partir do mês seguinte, é cobrado o preço do plano.`,
    recompensaCompra: `Usamos 1 dos seus descontos de indicação: ${P}% nesta compra.`,
  },
  area: {
    desconto: (validade: string) => `Desconto de ${P}% — ${validade}`,
    concluidas: (n: number) => (n === 1 ? "1 indicação concluída" : `${n} indicações concluídas`),
    usados: (n: number) => (n === 1 ? "1 desconto já utilizado" : `${n} descontos já utilizados`),
    expirados: (n: number) => (n === 1 ? "1 desconto expirado" : `${n} descontos expirados`),
    emVerificacao: (n: number) => `${n} em verificação pela DoLado`,
  },
  partilhar: {
    oSeuLink: "O seu link",
    copiado: "Link copiado",
    copiadoAnuncio: "Link copiado.",
    copiar: "Copiar link",
    partilhar: "Partilhar",
  },
  pagina: {
    titulo: "Ligação de indicação — DoLado",
    h1: "Uma pessoa recomendou a DoLado",
    aguardar:
      "A associar a indicação apenas se o Cookiebot confirmar que autorizou cookies de marketing. Pode alterar a escolha no banner ou continuar sem associar esta visita.",
    aAssociar: "A registar a indicação…",
    associada: "A indicação foi associada. A redirecionar…",
    semConsentimento:
      "Para associar esta visita à indicação, é necessário consentir em cookies de marketing no Cookiebot. Se não consentir, pode continuar a usar a DoLado, mas esta visita não será associada e não dará acesso aos descontos do programa.",
    reverCookies: "Rever escolhas de cookies",
    erro: "Não foi possível associar esta visita. Pode continuar para o site sem essa associação.",
    continuarSem: "Continuar sem associar a indicação",
  },
};
