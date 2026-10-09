import type { Traducao } from "../../dicionario.ts";
import type { perguntas as pt } from "../pt-PT/perguntas.ts";

type Precos = { protecao: string; casoProtecao: string; avulso: string; limite: number };

export const perguntas: Traducao<typeof pt> = {
  oQueE: {
    pergunta: "What is DoLado?",
    resposta:
      "DoLado helps consumers deal with problems with service providers such as telecoms, energy, gas and water companies, as well as with purchases, refunds and gyms. When a complaint is needed, we review your case, identify the relevant information, prepare the complaint and follow the process through. With Protection, we also help you spot situations that could turn into a problem, before it is too late to act.",
  },
  comoFunciona: {
    pergunta: "How does DoLado work?",
    resposta:
      "If you have a problem with a company, you can open a case: we look at what happened, prepare the complaint and only send it once you have authorised it. After it has been sent, we follow what happens next. With Protection, DoLado uses the information in your bills and contracts to identify changes or dates that could turn into a problem, and lets you know in time to act.",
  },
  semAutorizacao: {
    pergunta: "Does DoLado send anything without my authorisation?",
    resposta:
      "No. You always receive the content of the complaint first so you can review it. It is only sent once you have explicitly confirmed it.",
    respostaCompleta:
      "No. Nothing is sent on your behalf until you have seen the content and confirmed that you authorise it to be sent.",
  },
  quantoCusta: {
    pergunta: "How much does DoLado cost?",
    resposta: (p: Precos): string =>
      `DoLado has three options: Protection for ${p.protecao}, Case + Protection for ${p.casoProtecao} and the Single Case service for ${p.avulso} per case. All prices include VAT.`,
  },
  diferencaPlanos: {
    pergunta: "What is the difference between Protection, Case + Protection and Single Case?",
    resposta:
      "Protection helps you spot changes in your bills, important dates and relevant changes in your sector that could turn into a problem, without handling cases. Case + Protection combines that prevention with handling problems, with 1 new case per month. Single Case is for dealing with one problem, with a one-off payment, no subscription and no Protection features.",
    complementoLimite: (p: Precos) => `With Case + Protection, unused cases build up to a maximum of ${p.limite}.`,
  },
  prazo: {
    pergunta: "How long does it take?",
    resposta:
      "Once you have opened your case, we get back to you within 48 working hours at the latest to confirm the facts with you. The complaint is prepared on the basis of that confirmation.",
  },
  substituiAdvogado: {
    pergunta: "Does DoLado replace a lawyer?",
    resposta:
      "No. DoLado helps you prepare and follow up consumer complaints, but it does not replace legal advice or representation when these are needed.",
  },
  garanteResultado: {
    pergunta: "Does DoLado guarantee that my problem will be solved?",
    resposta:
      "The outcome of a complaint cannot be guaranteed. DoLado helps you present your case clearly and with solid grounds, follows the response and helps you understand the next steps available.",
  },
  escritorioAdvogados: {
    pergunta: "Is DoLado a law firm?",
    resposta:
      "No. DoLado is a consumer support service, not a law firm. We do not replace legal advice or representation when these are needed.",
  },
  garanteGanhar: {
    pergunta: "Does DoLado guarantee that my complaint will succeed?",
    resposta:
      "No. No complaint can have a guaranteed outcome. DoLado helps you present your case clearly and with solid grounds and follows the next steps, but the decision or response depends on the organisations involved and the circumstances of each case.",
  },
  comoFuncionaReclamacao: {
    pergunta: "How does a complaint with DoLado work?",
    resposta:
      "Tell us what happened and send us the information we need to review your case. DoLado prepares the complaint and shows you the content before anything is sent. Once you have reviewed and authorised it, we send it and follow the next steps.",
  },
  enviamPorMim: {
    pergunta: "Does DoLado send the complaint for me?",
    resposta:
      "Yes. Before it is sent, you receive the content prepared by DoLado to review. Only after your explicit authorisation do we submit the complaint on your behalf, through the right channel for the case — for example, Portugal's official Electronic Complaints Book (Livro de Reclamações Eletrónico) or the company's own complaints channel.",
  },
  naoConcordo: {
    pergunta: "What if I don't agree with the text you prepare?",
    resposta:
      "Before anything is sent, you can review the text prepared by DoLado using the link we email you. If you would like something changed, select “Request changes” and tell us what you would like us to review. DoLado only sends the complaint once it has received your explicit authorisation.",
  },
  documentos: {
    pergunta: "What information or documents might I need to send?",
    resposta:
      "It depends on the case. We may ask for information such as dates, amounts, correspondence with the company, bills, contracts or other documents that help us understand and support the complaint.",
  },
  oQueIncluiProtecao: {
    pergunta: "What does the Protection plan include?",
    resposta:
      "Protection helps you spot situations that could turn into a problem. We compare each bill with the previous ones to identify changes, keep an eye on important dates such as the end of promotions and minimum-term periods, and email you before those dates. We also let you know about relevant changes in the sectors you choose, such as announced price rises. Protection does not include handling complaints.",
  },
  comecarProtecao: {
    pergunta: "How do I start using Protection?",
    resposta:
      "Once you have subscribed, sign in to your account and open “My services”. Just upload a bill, as a PDF or image: DoLado starts following that service month by month. If you have the contract, you can add it so we can also check the agreed prices, promotions and minimum term. If you don't have the document to hand, you can enter the details yourself — the provider and one date, such as the end of the minimum term or promotion, is enough. To receive alerts about changes in your sector, choose the sectors you are interested in under “Profile settings”.",
  },
  oQueIncluiCasoProtecao: {
    pergunta: "What does the Case + Protection plan include?",
    resposta: (p: Precos): string =>
      `It includes the Protection plan features and 1 new case per month. Unused cases build up to a maximum of ${p.limite}.`,
  },
  semSubscricao: {
    pergunta: "Do I need a subscription to have a case handled?",
    resposta: (p: Precos): string =>
      `No. You can use the Single Case service for ${p.avulso} to have one case handled without taking out a subscription.`,
  },
  avulsoDepoisSubscricao: {
    pergunta: "I have already bought a Single Case. Can I take out a subscription later?",
    resposta:
      "Yes, from your account. If you have not used the case yet, part of what you paid covers the first month of the subscription and the rest is refunded to your original payment method. If you have already used it, the subscription is a new purchase.",
  },
  cancelarProtecao: {
    pergunta: "Can I cancel Protection?",
    resposta: [
      "Yes. You can cancel your subscription at any time under <b>Subscription settings</b>. After you cancel, Protection stays active until the end of the period you have already paid for and you will not be charged again. When that period ends, Protection alerts are switched off and no longer sent.",
      "A normal cancellation does not entitle you to a pro rata refund of the monthly fee already paid. This does not affect your statutory rights, in particular the right of withdrawal where it applies.",
      "Cases you have already opened remain available in your account. If you have built up cases on the Case + Protection plan, they are kept for 90 days after the subscription ends. If you subscribe to Case + Protection again within that period, you get back the cases you had available.",
    ],
  },
  livreResolucao: {
    pergunta: "What is the difference between cancelling and the right of withdrawal?",
    resposta: [
      "Cancelling your subscription stops future renewals and keeps the service running until the end of the period you have already paid for. The right of withdrawal is a legal right to withdraw from the contract within 14 days of purchase, under the conditions set out in law — including when you asked for the service to start straight away.",
      "You can exercise it online on the <livre>Right of withdrawal</livre> page, where you will also find the model form and a full explanation.",
    ],
  },
  depoisEnviada: {
    pergunta: "What happens after the complaint has been sent?",
    resposta:
      "DoLado follows the progress of your case and the response received. Depending on the outcome and the service that applies to your case, we help you understand the next steps available.",
  },
  empresaNaoResolve: {
    pergunta: "What if the company doesn't solve the problem?",
    resposta:
      "A complaint does not always end with the first response. Where the case allows and it falls within the service you have bought, DoLado helps you analyse the response and identify the next options available.",
  },
  copia: {
    pergunta: "Do I get a copy of the complaint that was sent?",
    resposta:
      "Yes. After it has been sent, you can see in your case the exact text of the complaint submitted and, where available, the proof of submission. These are available in your account, together with the case history. When we finish following up your case, we also provide the case file.",
  },
  dadosSeguros: {
    pergunta: "Is my data safe?",
    resposta:
      "Your data is stored in systems that only the DoLado team can access, with the database hosted in the European Union. Documents and case information are only shared where strictly necessary. For questions about your data or to exercise your rights, write to <email/>. Find out more in our <privacidade>Privacy Policy</privacidade>.",
  },
  partilhaDados: {
    pergunta: "Does DoLado share my data with other organisations?",
    resposta:
      "Only what is needed to provide the service. We use providers who process data on our behalf — for example, to host the platform and send emails — and, with your authorisation, the complaint includes the data strictly needed to file it with the company concerned. We do not sell or share data for third-party marketing. The full list is in our <privacidade>Privacy Policy</privacidade>.",
  },
  categorias: {
    sobre: "About DoLado",
    comoFunciona: "How it works",
    planos: "Plans and protection",
    depoisEnvio: "After sending",
    privacidade: "Privacy and security",
  },
};
