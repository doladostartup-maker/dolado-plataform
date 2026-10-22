import type { Traducao } from "../../dicionario.ts";
import type { perguntas as pt } from "../pt-PT/perguntas.ts";

type Precos = { protecao: string; casoProtecao: string; avulso: string; limite: number };

export const perguntas: Traducao<typeof pt> = {
  oQueE: {
    pergunta: "What is DoLado?",
    resposta:
      "DoLado helps consumers understand their bills and contracts, keep an eye on what needs attention and deal with problems with companies — telecoms, energy, gas and water providers, as well as purchases, refunds and gyms. With Protection, we follow your bills and the important dates in your contracts and let you know in time. When a complaint is needed, we prepare it with you and follow the process through.",
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
    resposta: (p: Precos): string[] => [
      `Single Case: ${p.avulso} per case, a one-off payment with no subscription. Case + Protection: ${p.casoProtecao}, with 1 case per month plus Protection. Protection: ${p.protecao}, just for keeping an eye on bills and contracts, without handling cases. All prices include VAT.`,
      "To have a case handled, you fill in the form first and only choose the option and pay at the end. We only start working on the case once the payment is confirmed.",
    ],
  },
  diferencaPlanos: {
    pergunta: "What is the difference between Protection, Case + Protection and Single Case?",
    resposta:
      "Protection helps you spot changes in your bills, important dates and relevant changes in your sector that could turn into a problem, without handling cases. Case + Protection combines that prevention with handling problems, with 1 new case per month. Single Case is for dealing with one problem, with a one-off payment, no subscription and no Protection features.",
    complementoLimite: (p: Precos) => `With Case + Protection, unused cases build up to a maximum of ${p.limite}.`,
  },
  prazo: {
    pergunta: "How long does it take?",
    resposta: [
      "Once your case is opened (that is, once the payment is confirmed), we contact you within a maximum of 2 working days to confirm the facts. The complaint is prepared on the basis of that confirmation.",
      "How long the preparation takes depends on the information available and on any clarifications needed. How long the company takes to reply does not depend on DoLado: it varies with the sector, the company and the channel used.",
    ],
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
      "Yes. Before it is sent, you receive the text prepared by DoLado to review. Only after your explicit authorisation do we submit the complaint on your behalf, through the right channel for the case — for example, Portugal's official Electronic Complaints Book (Livro de Reclamações Eletrónico), e-mail or the company's complaints form.",
  },
  naoConcordo: {
    pergunta: "What if I don't agree with the text you prepare?",
    resposta:
      "Before anything is sent, you can review the text prepared by DoLado using the link we email you. If you would like something changed, select “Request changes” and tell us what you would like us to review. DoLado only sends the complaint once it has received your explicit authorisation.",
  },
  documentos: {
    pergunta: "What information or documents might I need to send?",
    resposta:
      "It depends on the case. The most useful ones are usually the bill in question, the contract, e-mails or messages exchanged with the company, the order or previous complaint number and screenshots. Dates and amounts also help. You do not need to have everything: tell us what you have and, if anything is missing, we will ask you for it.",
  },
  precisaEscrever: {
    pergunta: "Do I need to know how to write the complaint?",
    resposta:
      "No. Just tell us what happened, in your own words, as you would tell a friend. DoLado writes the complaint and shows it to you before anything is sent.",
  },
  informacaoComecar: {
    pergunta: "What information do I need to get started?",
    resposta:
      "The type of company and its name, what happened, whether you have already complained and your name. If you have a bill, a contract, an e-mail or a screenshot, you can attach it straight away, but it is not required. It takes about 5 minutes.",
  },
  documentosInicio: {
    pergunta: "Do I have to send all the documents at the start?",
    resposta:
      "No. Documents are optional in the form. If we need anything else, we will ask you by e-mail and you can reply and attach files in your account.",
  },
  atualizacoes: {
    pergunta: "How will I get updates on my case?",
    resposta:
      "By e-mail, whenever there is news or we need you — for example, when the text is ready to review, when we are analysing the company's reply, when we need more information and when the case is closed. In your account you can check the status of the case, the next step and the history whenever you like.",
  },
  entrarRegularmente: {
    pergunta: "Do I need to log in to my account regularly?",
    resposta:
      "No. Whenever we need you to do something — review the text, answer a request for information or confirm a solution — we e-mail you. Your account is there to check the case, the text sent, the proofs of submission and the history whenever it suits you.",
  },
  oQueIncluiProtecao: {
    pergunta: "What does the Protection plan include?",
    resposta:
      "Protection helps you spot situations that could turn into a problem. We compare each bill with the previous ones to identify changes, keep an eye on important dates such as the end of promotions and minimum-term periods, and let you know before those dates. We also let you know about relevant changes in the sectors you choose, such as announced price rises, and at the start of each month we send you a summary of what we kept an eye on. Protection does not include handling complaints.",
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
      "If you have a subscription case still being followed up, we show you the choice before you cancel: you can keep your subscription until the case is finished, or cancel — in which case follow-up on that case also ends at the end of the period already paid. Cases handled with Single Case or Extra Case are not affected.",
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
    resposta: [
      "DoLado waits for the company's reply and analyses it when it arrives. We e-mail you when we are analysing a reply, when we need more information from you and when the company offers a solution that you need to confirm.",
      "The case is only marked “Resolved” once you confirm that the problem has been solved. In your account you can always see the status of the case, the next step and the history.",
    ],
  },
  empresaNaoResolve: {
    pergunta: "What if the company doesn't solve the problem?",
    resposta: [
      "A complaint does not always end with the first reply. Where it makes sense and falls within the service you have bought, we prepare a new message to the company, which you also review and authorise before it is sent.",
      "When DoLado has done what the service covers and the problem remains, we close the case on our side — which does not mean it has been solved. At that point we give you a case file with what has been done and a list of consumer dispute resolution bodies you can consult. DoLado does not represent you before those bodies.",
    ],
  },
  copia: {
    pergunta: "Do I get a copy of the complaint that was sent?",
    resposta:
      "Yes. After it has been sent, you can see in your case, in your account, the exact text of the complaint submitted and, where available, the proof of submission, together with the case history. If the case is closed without a solution from the company, we also provide a case file with what has been done.",
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
  oQueDescobrir: {
    pergunta: "What can I find out from a check?",
    resposta:
      "We show you what is written in the bill or contract: the total and where it comes from, what you pay every month and what was charged just this once, when your minimum term or promotion ends and the terms of the contract. We do simple sums with those amounts, such as the days left until a date, and tell you what we couldn't confirm in the document.",
  },
  analiseGratuita: {
    pergunta: "Is the initial check free?",
    resposta:
      "Yes. Checking a document needs no account, e-mail address or bank card, and does not start any subscription. Protection, which keeps an eye on your bills and contracts over time, is a separate service.",
  },
  analiseConta: {
    pergunta: "Do I need to create an account?",
    resposta:
      "Not to see the result: you upload the document and see it straight away. You only create an account if you want to save the result or carry on with Protection.",
  },
  analiseDocumentos: {
    pergunta: "Which documents can I send?",
    resposta:
      "Telecoms, electricity, gas and water bills and contracts. For the free check, as a PDF of up to 10 MB. With Protection, you can also send bills as images. Only send documents that are yours or that you are authorised to use.",
  },
  analiseDados: {
    pergunta: "What information is taken from the document?",
    resposta:
      "The company, the sector, the total, the monthly fee, the lines charged, the important dates and the terms of the contract. The account holder's tax number and name are not stored as text: they are replaced by a code before being stored.",
  },
  analiseDocumento: {
    pergunta: "What happens to my document?",
    resposta:
      "Your document is private: we only read it to show you the result. If you don't create an account, DoLado deletes the document and the result after 7 days; if you create one, 30 days later, unless you ask us to keep following it with Protection. The <privacidade>Privacy Policy</privacidade> explains how the reading is done and which providers help us.",
  },
  analiseProblemas: {
    pergunta: "Does the check find problems automatically?",
    resposta:
      "No. The free check shows what is in the document and does simple sums; it does not assess whether a charge is owed or draw conclusions about the company. With Protection, when comparing your bills turns up a change that needs attention, a person at DoLado reviews it before we tell you.",
  },
  novasFacturas: {
    pergunta: "Do I need to send new bills?",
    resposta:
      "Yes, to keep Protection up to date. DoLado does not access your accounts with your providers: we compare each bill you send us with the previous ones and with your contract. Date reminders work with the dates we already know, but the comparison only includes the bills you send us.",
  },
  ajudaReclamacoes: {
    pergunta: "Can I still get help with complaints?",
    resposta:
      "Yes. If you have a problem with a company, DoLado prepares the complaint with you, only sends it with your authorisation and follows up the reply. Cases are handled with the Single Case or Case + Protection; they are not included in Protection on its own.",
  },
  categorias: {
    sobre: "About DoLado",
    comoFunciona: "How it works",
    analise: "Free check",
    reclamacoes: "Sorting out a problem",
    planos: "Protection and plans",
    depoisEnvio: "After sending",
    privacidade: "Privacy and security",
  },
};
