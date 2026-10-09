// Confirmação da compra (modal ConfirmarCompra), /comprar e mensagens da
// Server Action de checkout. Os textos jurídicos com prova (Termos, início
// imediato) NÃO estão aqui: ver juridico.ts e TextoVinculativo.

import { MENSAGENS_ERRO_CONSENTIMENTO } from "../../../lib/consentimentoCompra.ts";
import { MENSAGEM_MESMA_SUBSCRICAO, MENSAGEM_OUTRA_SUBSCRICAO } from "../../../lib/compra/decisao.ts";

export const compra = {
  modal: {
    titulo: "Confirmar compra",
    precoNormal: "Preço normal: ",
    noPrimeiroMes: " no primeiro mês",
    porMes: " por mês",
    pagamentoUnico: " — pagamento único",
    renovacao: "Subscrição mensal com renovação automática todos os meses, até a cancelar.",
    semRenovacao: "Pagamento único, sem renovação.",
    conversao: (mensalidade: string) => `Utilizamos ${mensalidade} do seu pagamento Avulso para cobrir o primeiro mês`,
    conversaoReembolso: (reembolso: string) => ` e reembolsamos os restantes ${reembolso} para o método de pagamento original`,
    conversaoFim: ". A partir do mês seguinte, é cobrado o preço do plano.",
    cancelar:
      "Pode cancelar a qualquer momento em Gestão de Subscrição, na sua área de cliente. O cancelamento produz efeitos no fim do período já pago.",
    descontoSubscritor: "O desconto de subscritor já está aplicado no preço e não acumula com códigos promocionais.",
    naoAcumula: "O desconto de indicação não acumula com códigos promocionais.",
    prefiroCodigo: "Prefiro usar um código promocional",
    semDescontoIndicacao:
      "Não aplicamos o desconto de indicação nesta compra: pode introduzir o seu código promocional no passo de pagamento.",
    usarDesconto: "Usar o desconto de indicação",
    codigoSubscricao:
      "Se tiver um código promocional, pode aplicá-lo no passo de pagamento. Mesmo com desconto ou com valor de 0 €, a subscrição renova-se todos os meses, ao preço do plano ou nas condições do código aplicado, até a cancelar.",
    codigoCompra: "Se tiver um código promocional, pode aplicá-lo no passo de pagamento.",
    livreResolucao: "Direito de livre resolução",
    informacaoCompleta: "Informação completa sobre livre resolução",
    termos: "Termos e Condições",
    dados: "Para saber como tratamos os seus dados, consulte a <privacidade>Política de Privacidade</privacidade>.",
    voltar: "Voltar",
    aAbrir: "A abrir pagamento…",
    continuar: "Continuar para pagamento",
  },
  comprar: {
    metadados: "Comprar — DoLado",
    eyebrow: "Preçário",
    verSubscricao: "Ver a minha subscrição",
    irPortal: "Ir para o portal",
    jaTemConta: "Se já tem conta na DoLado, inicie sessão antes de comprar: a compra fica logo associada à sua conta.",
    iniciarSessao: "Iniciar sessão",
    semConta: "Ainda não tenho conta — continuar",
    criarDepois:
      "Sem conta, cria a sua conta depois do pagamento. Prefere criá-la já? <registo>Criar conta e continuar</registo>. <precario>Voltar ao preçário</precario>",
  },
  mensagens: {
    ...MENSAGENS_ERRO_CONSENTIMENTO,
    abrir: "Não foi possível abrir o pagamento. Tente novamente dentro de alguns minutos.",
    mesmaSubscricao: MENSAGEM_MESMA_SUBSCRICAO,
    outraSubscricao: MENSAGEM_OUTRA_SUBSCRICAO,
  },
};
