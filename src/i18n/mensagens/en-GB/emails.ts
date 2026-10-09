import type { Traducao } from "../../dicionario.ts";
import type { emails as pt } from "../pt-PT/emails.ts";

// Transactional emails to the customer, in British English. Same structure as
// the Portuguese file; `html` arguments arrive already escaped.

export const emails: Traducao<typeof pt> = {
  comum: {
    ola: "Hello,",
    olaNome: (nomeHtml: string) => `Hello ${nomeHtml},`,
    sobre: (html: string) => ` about <strong>${html}</strong>`,
    notaDocumentosPortugues:
      "Our Terms and Conditions and Privacy Policy are available in Portuguese only; the Portuguese version is the binding one.",
  },

  pagamento: {
    titulo: "Payment confirmed — DoLado",
    assuntoContaExiste: "Payment confirmed — your access is active ✓",
    assuntoAssociar: "Payment confirmed — Link this purchase to your account ✓",
    assuntoCriarConta: "Payment confirmed — Create your password ✓",
    introducao: "Your payment has been confirmed. Thank you for trusting DoLado. Please keep this email as confirmation of your purchase.",
    passoCasoExtra:
      "You now have 1 Extra Case in your account. If you paid for a case you had already described, that case is now being handled; you can follow it in My cases.",
    passoContaExiste: "You can now sign in to the portal: your access is already active.",
    passoAssociar: "There is already a DoLado account with this email. Just one more step: sign in and link this purchase to your account.",
    passoCriarProtecao: "Just one more step: create your password to access the portal.",
    passoCriarCaso: "Just one more step: create your password to access the portal and open your case.",
    botaoCasoExtra: "View my cases",
    botaoIniciarSessao: "Sign in",
    botaoAssociar: "Link the purchase",
    botaoCriarConta: "Create my account",
    rotuloProduto: "Product",
    rotuloValorPago: "Amount paid",
    rotuloTipo: "Type",
    rotuloPrecoPlano: "Plan price",
    rotuloRenovacao: "Next renewal",
    rotuloSubscricao: "Your subscription",
    tipoSubscricao: "Monthly subscription with automatic renewal",
    tipoUnico: "One-off payment",
    subscricaoInalterada: "Still active and unchanged",
    renovacao: (comDesconto: boolean, gestaoHtml: (texto: string) => string) =>
      `<strong>Renewal and cancellation.</strong> The subscription renews automatically every month${
        comDesconto ? ", with the discounts applied under the conditions of the code used at payment" : ""
      }, until you cancel it. You can cancel at any time in ${gestaoHtml("Manage subscription")}, in your customer area; cancellation takes effect at the end of the period already paid for.`,
    inicioImediato:
      "<strong>Immediate start.</strong> Before paying, you expressly asked DoLado to start providing the service immediately, before the end of the 14-day withdrawal period.",
    livreResolucao: "Right of withdrawal.",
    saibaMais: "Find out more",
    documentos: "Documents:",
    termos: "Terms and Conditions",
    versao: (v: string) => ` (version ${v})`,
    privacidade: "Privacy Policy",
    questoes: "For any questions:",
  },

  lembreteCompra: {
    assunto1d: "Finish setting up access to your DoLado purchase",
    assunto3d: "Final reminder: finish setting up access to your DoLado purchase",
    pagamentoConfirmado: (plano: string) =>
      `The payment for your purchase (${plano}) has been confirmed, but the purchase is not yet linked to a DoLado account.`,
    passoAssociar: "There is already a DoLado account with this email. Sign in and link this purchase to your account.",
    passoCriar: "Create your account to access the portal and use what you bought.",
    botaoAssociar: "Link the purchase",
    botaoCriar: "Create my account",
    ultimo: (contactoHtml: string) => `This is the final reminder. If you need help, contact us at ${contactoHtml}.`,
  },

  textoRevisao: {
    assunto: "Your complaint text is ready for review",
    assuntoNovaComunicacao: "A new message about your case is ready for review",
    novoLink: (seguimento: boolean, sobreHtml: string) =>
      `As requested, here is a new link to review the text${seguimento ? " of the new message" : " of your complaint"}${sobreHtml}.`,
    seguimento: (sobreHtml: string) =>
      `Following the company's response to your complaint${sobreHtml}, we have prepared a new message. Before we send it on your behalf, please review it.`,
    primeiro: (sobreHtml: string) =>
      `The text of your complaint${sobreHtml} is ready. Before we send it on your behalf, please review it.`,
    nadaSemAutorizacao: "Nothing is sent without your explicit authorisation. If you would like to change anything, you can request changes.",
    botaoRever: "Review and authorise sending",
    pedirAlteracoes: "Request changes",
    seguranca: (dias: number) =>
      `For security, these links are personal and valid for ${dias} days. Please do not share them. You can also review the text in your customer area, if you have an account.`,
    naoReconhece: (contactoHtml: string) => `If you do not recognise this request, ignore this email or write to ${contactoHtml}.`,
  },

  acompanhamento: {
    respostaRecebida: {
      assunto: "We have received a response about your case",
      preheader: "We are reviewing it. You don't need to do anything right now.",
      p1: (sobreHtml: string) => `We have received a message about your complaint${sobreHtml} and we are reviewing it.`,
      p2: "You don't need to do anything right now. We will get in touch if any action is needed.",
      botao: "View my case",
      nota: "You can follow your case at any time in your customer area.",
    },
    pedidoInformacao: {
      assunto: "We need some information from you to continue your case",
      preheader: "See in the portal what we need and send us the information.",
      p1: (sobreHtml: string) => `To continue handling your complaint${sobreHtml}, we need some information or documents from you.`,
      p2: "We have set out in your case, in the portal, exactly what we need and how you can send it to us.",
      botao: "See what we need",
    },
    solucaoApresentada: {
      assunto: "The company has offered a solution for your case",
      preheader: "Let us know whether the problem has been resolved.",
      p1: (sobreHtml: string) => `The company has offered a solution to your complaint${sobreHtml}. We have explained the outcome in your case, in the portal.`,
      p2: "We only mark the case as resolved once you confirm that the problem really has been resolved.",
      botao: "See the solution and reply",
    },
    casoEncerradoExterno: {
      assunto: "DoLado has finished following up your case",
      preheader: "We have prepared your case file and information on how you can continue.",
      p1: (sobreHtml: string) =>
        `DoLado has finished following up your complaint${sobreHtml}. This does not necessarily mean that the problem has been resolved.`,
      p2: "We have prepared your case file with the history and documents of the case. If you wish to continue, you can consult, in the portal, the list (for information only) of official Alternative Consumer Dispute Resolution bodies.",
      botao: "View the case and download the case file",
      nota: "DoLado does not represent consumers in mediation, conciliation or arbitration proceedings, does not submit requests on your behalf and does not determine or indicate which body is competent for this case. Please check directly with the body whether it can consider the dispute.",
    },
  },

  achadoMonitor: {
    assunto: "We have spotted a change in your bill that is worth checking",
    sobre: (fornecedorHtml: string) => ` for your contract with <strong>${fornecedorHtml}</strong>`,
    introducao: (sobreHtml: string) => `When comparing the bills${sobreHtml}, we spotted a change that is worth checking:`,
    botao: "View in the portal",
    nota: (contactoHtml: string) =>
      `If you would like DoLado to deal with this with the provider, you can ask in the portal under "Start my case". For any questions, write to ${contactoHtml}.`,
  },

  boasVindas: {
    assunto: "We have received your submission — We'll handle it personally ✓",
    titulo: "We have received your submission — DoLado",
    obrigado: "Thank you for trusting DoLado with your complaint.",
    pessoal:
      "We have received your submission and it is here with me to be handled personally. It is not a form that disappears into an endless inbox. I will review your case, contact the provider with your authorisation and follow it through to resolution.",
    agora: "What happens now:",
    passos: [
      "1. I read the details you provided",
      "2. I contact you in the next few days to confirm everything",
      "3. I contact the provider and set out the necessary grounds",
      "4. I follow it through to the end",
    ],
    preciso: "What I need from you:",
    tenhaAMao: "When I get in touch, please have to hand:",
    itens: [
      "— The bill or proof of the problem",
      "— Any email/text message from the company concerned",
      "— Availability for a short call (5-10 minutes), in case anything still needs clarifying beyond what you have already sent",
    ],
    espere: "Expect to hear from me within the next 1-2 working days. If you have any questions in the meantime, reply to this email.",
  },

  livreResolucao: {
    assunto: "We have received your withdrawal request",
    rotuloReferencia: "Reference",
    rotuloRecebido: "Received on",
    rotuloEmail: "Email",
    rotuloPlano: "Plan",
    rotuloDataCompra: "Purchase date",
    planoNaoSei: "Not sure / more than one",
    p1: "We confirm that we have received your request to withdraw from the contract, made through the form at dolado.pt/livre-resolucao.",
    p2: "DoLado will review the request and reply to you by email. If a refund is due, it is made to the same payment method you used, within 14 days of the date on which we were informed of your decision, as required by law.",
    naoFez: (contactoHtml: string) => `If you did not make this request, reply to this email or write to ${contactoHtml}.`,
  },

  avisoSetorial: {
    assunto: (setor: string) => `[DoLado notice] News in the ${setor} sector`,
    titulo: (setorHtml: string) => `Sector notice: ${setorHtml} — DoLado`,
    rotulo: (setorHtml: string) => `Sector notice · ${setorHtml}`,
    enviadoA: (data: string) => `Sent on ${data}`,
    publicamos: (setorHtml: string) =>
      `We have published a notice about the ${setorHtml} sector, one of the sectors you chose to follow with DoLado. The notice is written in Portuguese.`,
    nota: "DoLado keeps track of news that may affect your services and lets you know when there is something relevant in the sector you chose.",
    rodape: (setorHtml: string, ligacaoHtml: (texto: string) => string) =>
      `You are receiving this email because you chose to receive notices about the ${setorHtml} sector. You can change your sectors in ${ligacaoHtml("Profile and alerts")}, in the portal.`,
  },

  resumoMensal: {
    assunto: (mes: string) => `Your Protection in ${mes}`,
    acompanhamosEm: (mes: string) => `What we kept track of in ${mes}`,
    alteracoes: "Changes spotted",
    continuaAtiva: "Your Protection remains active",
    proximaData: "Next relevant date",
    botaoAdicionar: "Add a document",
    botaoVer: "View my Protection",
    verTexto: (url: string) => `View your Protection: ${url}`,
    baseiaSe: "This summary is based on the documents and dates you have given us. If any service has changed, add the latest bill in the portal.",
    duvidas: (contacto: string) => `For any questions, write to ${contacto}.`,
    rodape: "You receive this summary once a month because you have Protection active with DoLado.",
  },
  resumoConteudo: {
    meses: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    mesAno: (mes: string, ano: string) => `${mes} ${ano}`,
    e: "and",
    fimDe: (servico: string, promocao: boolean, data: string) => `${servico} — end of the ${promocao ? "promotion" : "minimum term"} on ${data}`,
    comparacaoFaturas: (servicos: string) => `Bill comparison — ${servicos}`,
    situacao: (servico: string, curto: string, data: string) => `${servico}: ${curto} (notified on ${data})`,
    estados: {
      tudo_acompanhado: [
        "Everything is being tracked",
        "Based on the documents and dates you have given us, there is nothing that needs your attention right now. We are still keeping an eye out for you.",
      ],
      atencaoUma: ["Something needs your attention", "DoLado reviewed this situation before telling you about it. See the details in the portal."],
      atencaoVarias: ["Something needs your attention", "DoLado reviewed these situations before telling you about them. See the details in the portal."],
      por_confirmar: ["We need your confirmation", "We have read the conditions in a document. Confirm them in the portal so that we can start tracking them."],
      em_verificacao: [
        "We are checking a change",
        "We found a difference in a bill and DoLado is reviewing it. If it needs your attention, we will let you know by email. You don't need to do anything for now.",
      ],
      sem_servicos: [
        "Your Protection is active",
        "Add a bill or a contract in the portal: we check your current situation and, from then on, keep an eye out for you.",
      ],
    },
    faturas: (n: number) => (n === 1 ? "1 bill" : `${n} bills`),
    contratos: (n: number) => (n === 1 ? "1 contract" : `${n} contracts`),
    alertasDatas: (n: number) => (n === 1 ? "1 date alert" : `${n} date alerts`),
    ativos: () => "active",
    introSemServicos: (mes: string) => `In ${mes}, your Protection was active, but you have not yet given us any service to track.`,
    introDocumentos: (mes: string, documentos: string, alertas: string | null) =>
      `In ${mes}, DoLado checked ${documentos}${alertas ? ` and kept ${alertas}` : ""}.`,
    introSemDocumentos: (mes: string, servicos: number, alertas: string | null) =>
      `In ${mes} we did not receive any new documents, but DoLado kept tracking ${
        servicos === 1 ? "your service" : servicos > 1 ? `your ${servicos} services` : "your services"
      }${alertas ? ` and kept ${alertas}` : ""}.`,
    introTudoAcompanhado: " We did not spot any change that needs your attention.",
    introAtencao: (n: number) => ` We spotted ${n === 1 ? "1 situation that needs" : `${n} situations that need`} your attention.`,
    atividadeFaturas: (n: number) => (n === 1 ? "1 bill checked" : `${n} bills checked`),
    atividadeContratos: (n: number) => (n === 1 ? "1 contract read" : `${n} contracts read`),
    atividadeAvisos: (n: number) => `${n === 1 ? "1 date reminder sent" : `${n} date reminders sent`} by email`,
    atividadeServicos: (n: number) => (n === 1 ? "1 service tracked" : `${n} services tracked`),
    atividadeAlertas: (n: number) => (n === 1 ? "1 active date alert" : `${n} active date alerts`),
    semAlteracoesVerificacao: "We are checking a change in a bill. If it needs your attention, we will let you know by email.",
    semAlteracoes: (mes: string) => `We did not spot any changes that need your attention in ${mes}.`,
    semProximaData: "There is currently no date that needs your attention.",
    terminaHoje: (servico: string, promocao: boolean) => `${servico}: the ${promocao ? "promotion" : "minimum term"} ends today.`,
    terminaA: (servico: string, promocao: boolean, data: string, antes: boolean) =>
      `${servico}: the ${promocao ? "promotion" : "minimum term"} ends on ${data}. ${antes ? "We will let you know by email before that date." : "We will let you know by email on that date."}`,
  },
};
