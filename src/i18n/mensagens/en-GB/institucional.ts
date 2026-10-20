import type { Traducao } from "../../dicionario.ts";
import type { institucional as pt } from "../pt-PT/institucional.ts";

export const institucional: Traducao<typeof pt> = {
  sobreNos: {
    metadados: {
      titulo: "About Us | DoLado",
      descricao:
        "DoLado is a financial wellbeing company specialising in consumer support: it keeps track of bills and contracts and helps sort out consumer problems, with clear prices and nothing sent without your authorisation.",
    },
    eyebrow: "About us",
    titulo: "On the consumer's side.",
    hero: [
      "DoLado is a financial wellbeing company specialising in consumer support.",
      "We keep track of bills and contracts and help sort out consumer problems, so that people have more control over their spending and fewer worries about charges, deadlines and complaints.",
    ],
    heroDestaque: "We believe nobody should lose out for lack of time, information or support to act.",
    compromissos: {
      titulo: "Our commitments",
      itens: [
        {
          titulo: "Clear prices",
          texto: "You see the price before paying, VAT included. We never charge a percentage of what you recover.",
        },
        {
          titulo: "Authorisation before sending",
          texto: "We show you the complaint text and only send it once you have authorised it.",
        },
        {
          titulo: "Follow-up",
          texto: "We follow up the company's reply and keep you informed about where your case stands.",
        },
        {
          titulo: "Next steps, explained",
          texto: "When there are options, we explain them. The decision is always yours.",
        },
      ],
    },
    secoes: [
      {
        titulo: "We are on your side",
        paragrafos: [
          "Our name says exactly what we believe in.",
          "“DoLado” is Portuguese for “on the side” — being on the consumer's side.",
          "When a problem comes up with a telecoms provider, an energy, gas or water supplier, a shop or a gym, it is not always easy to work out who to contact, how to present the situation, which rules apply or how long the company has to reply.",
          "With DoLado, consumers don't have to work it all out on their own.",
          "We help you understand the situation, prepare the complaint and follow up the company's reply, within the service you have bought. We keep everyone informed about where their process stands and what comes next. The outcome depends on the company, but nobody is left to deal with it alone.",
          "Because making a complaint shouldn't mean spending hours searching for legislation, contacts or procedures.",
        ],
      },
      {
        titulo: "More than solving problems, we want to help prevent them",
        paragrafos: [
          "Many of the problems consumers face could be avoided if the right information arrived at the right time.",
          "That is why DoLado isn't only there for when something goes wrong.",
          "With Protection, DoLado helps you spot situations that could turn into a problem and warns you in advance — such as the end of promotional periods, the end of minimum-term periods or significant changes in your bills — so you can act in time.",
          "Fewer surprises and more time to decide.",
        ],
      },
      {
        titulo: "Simple to use. Rigorous at every stage.",
        paragrafos: [
          "We don't expect our customers to know legislation, procedures or regulators.",
          "We want our customers not to have to worry about any of that.",
          "Our aim is to turn processes that can seem complex into a simple, clear experience, without giving up what we see as essential: transparency, speed and an affordable price.",
          "Everyone should know where their process stands, what is being done and what the next steps are.",
          "No needlessly complicated language. No having to find every answer on your own.",
        ],
      },
    ],
    proximidade: {
      titulo: "Closeness and trust",
      intro: "We want using DoLado to feel like having someone by your side who knows the way and the steps to take.",
      linhas: [
        "Someone who follows things up.",
        "Who explains.",
        "Who keeps an eye on the deadlines.",
        "And who stays by your side throughout the whole process.",
      ],
      fecho: [
        "Whatever the amount involved, we want everyone to know what is happening and what they can do next.",
        "That is why we are here.",
      ],
    },
    ctaFinal: {
      titulo: "Got a problem with a company?",
      texto: "Tell us what happened. DoLado deals with it with you.",
      acao: "Start my case",
    },
  },
  transparencia: {
    metadados: {
      titulo: "Transparency - DoLado",
      descricao:
        "What DoLado does for you and what it doesn't, with no small print: we identify the applicable law, prepare the complaint and track the deadline — we never give individual legal advice or represent you in court.",
    },
    eyebrow: "Transparency",
    titulo: "What we do for you — and what we don't. No small print.",
    texto:
      "We know it is hard to trust someone with your case when you don't know exactly what you are paying for. So here we explain, in plain language, the limits of what DoLado can do.",
    fazemosTitulo: "What we do for you",
    fazemos: [
      {
        titulo: "We organise the information",
        descricao: "We read what you tell us and the documents you send, and confirm the facts with you. Where there are rules that apply to your sector, we set them out in the text.",
      },
      {
        titulo: "We prepare the complaint",
        descricao: "With the facts, the applicable rules where there are any, and a clear request. We show you the text before it is sent — we only go ahead once you confirm.",
      },
      {
        titulo: "We follow up the reply",
        descricao: "We analyse the company's reply and e-mail you when there is news. Where a response deadline applies, it is recorded in your case.",
      },
      {
        titulo: "We only send it with your authorisation",
        descricao: "Once you have reviewed and confirmed the text, we send the complaint on your behalf through the right channel — for example, the Electronic Complaints Book (Livro de Reclamações Eletrónico), e-mail or the company's complaints form.",
      },
    ],
    naoFazemosTitulo: "What we don't do",
    naoFazemos: [
      {
        titulo: "We don't give individual legal advice",
        descricao: "We organise the facts and set out the applicable rules — we don't tell you which legal route to take.",
      },
      {
        titulo: "We don't represent you in court, arbitration or before other bodies",
        descricao: "If your case moves to one of those routes, we tell you. The decision to go ahead is yours and, depending on the case, you may need legal support.",
      },
      {
        titulo: "We never charge a percentage of what you recover",
        descricao: "No success fee, by choice — it avoids any conflict of interest in your case.",
      },
    ],
    garantia: "<b>Nothing goes out without your explicit authorisation.</b> Every case is confirmed with you before any contact with the company.",
    perguntas: {
      eyebrow: "Frequently asked questions",
      titulo: "What DoLado is — and isn't.",
      lista: [
        {
          q: "Does this replace a lawyer?",
          a: "No. We provide administrative support: we organise the facts, prepare the complaint and follow up the reply. If you need legal advice on your specific case or to be represented, you should see a lawyer.",
        },
        {
          q: "What if the company doesn't respond?",
          a: "We follow up the reply and, where it makes sense, prepare a new message. If the problem remains after what the service covers, we close the case on our side and give you a case file with what has been done and a list of consumer dispute resolution bodies you can consult.",
        },
        {
          q: "Does DoLado sign for me or represent me legally?",
          a: "No. We always identify ourselves as acting on your behalf in an administrative complaint — never as your legal representatives.",
        },
      ],
    },
    ctaFinal: {
      titulo: "Got a problem with a company?",
      texto: "Tell us what happened. You receive the complaint text before anything is sent.",
      acao: "Start my case",
    },
  },
  contacto: {
    metadados: {
      titulo: "Contact - DoLado",
      descricao: "Get in touch with questions, partnerships, press or other matters. To ask DoLado to deal with a problem, use the step-by-step form.",
    },
    eyebrow: "Contact",
    titulo: "Talk to us.",
    texto: "Use the form or write to us at <email/>.",
    caminhos: {
      eyebrow: "Before you write",
      titulo: "What is it about?",
      caso: {
        titulo: "Got a problem with a company?",
        texto: "To ask DoLado to deal with a problem, use the step-by-step form. It takes about 5 minutes and you see the price before paying.",
        acao: "Start my case",
      },
      casoAberto: {
        titulo: "Already have an open case?",
        texto: "Follow its status, the complaint text and the proof of submission in your account.",
        acao: "Sign in",
      },
      privacidade: {
        titulo: "Privacy and personal data",
        texto: "To exercise your rights over your personal data, write to <email/>.",
        acao: "Privacy Policy",
      },
    },
    formulario: {
      eyebrow: "Questions, partnerships and other matters",
      titulo: "Send us a message.",
      texto:
        "You can also write to <email/>. Complaints about DoLado itself: please also see the <litigios>Dispute resolution</litigios> page.",
      aviso:
        "<b>A message sent here does not open a case or sign you up for the service.</b> This form is for questions, partnerships and other matters. To ask DoLado to deal with a problem, use the step-by-step form: that is where we collect the information we need and where you can follow your case.",
      avisoAcao: "Go to the step-by-step form",
      enviada: "Message sent.",
      obrigado: "Thank you for getting in touch — we will reply as soon as we can.",
      nome: "Name",
      nomePlaceholder: "Your name",
      email: "Email",
      emailPlaceholder: "name@example.com",
      assunto: "Subject",
      assuntoPlaceholder: "What would you like to talk about?",
      mensagem: "Message",
      mensagemPlaceholder: "Write here — questions, partnerships, press…",
      aEnviar: "Sending…",
      enviar: "Send message",
    },
    erros: {
      limite: "Too many requests. Please try again in a few minutes.",
      nome: "Please enter your name.",
      email: "Please enter a valid email address.",
      assunto: "Please enter a subject.",
      mensagem: "Please write your message.",
      envio: "Something went wrong while sending. Please try again.",
    },
  },
  empresas: {
    metadados: {
      titulo: "Financial wellbeing for employees | DoLado for businesses",
      descricao:
        "Give your employees practical support to keep track of bills and contracts and deal with consumer problems. Each case stays between the person and DoLado.",
    },
    falar: "Request a proposal",
    eyebrow: "DoLado for businesses",
    titulo: "Financial wellbeing for your employees.",
    texto:
      "Practical support to keep track of bills and contracts and deal with consumer problems, with someone by their side at every stage.",
    conhecer: "Find out about the solution for my team",
    verComoFunciona: "See how it works",
    formatosNota: "Format and terms agreed in a conversation, based on your team and your company's goals.",
    situacoesCabecalho: {
      eyebrow: "Day to day",
      titulo: "Three situations where DoLado helps.",
      texto: "Common consumer problems that weigh on the budget and take up time. This is how DoLado helps with each one.",
    },
    situacoes: [
      {
        titulo: "An unexpected charge",
        situacao: "The broadband bill arrives higher than usual and nobody said why.",
        apoio:
          "With Protection, we compare each bill with the previous ones and with the contract, and let the person know when a change is worth checking, after it has been reviewed by someone at DoLado. If a complaint is needed, we prepare it and follow up the reply.",
        servico: "Protection · case handling",
      },
      {
        titulo: "A late refund",
        situacao: "The return was accepted weeks ago, but the money still hasn't arrived.",
        apoio:
          "We organise the facts and documents, prepare the complaint with a clear request and only send it once the person has reviewed and authorised it. Then we follow up the company's reply.",
        servico: "Case handling",
      },
      {
        titulo: "A promotion about to end",
        situacao: "The discount on the electricity or telecoms contract ends soon and the price is going to change.",
        apoio:
          "With Protection, we send a reminder 60 and 30 days before the promotion or minimum term ends, and on the day itself, so the person can check the next price and decide in time.",
        servico: "Protection",
      },
    ],
    solucao: {
      eyebrow: "Employees or customers",
      titulo: "Two ways to bring DoLado to the people who count on you.",
      texto:
        "The solution for employees is a benefit for your team. The offer for customers adds support to the relationship your company already has with them. The support is the same; what changes is the audience and how it is presented.",
    },
    publicos: [
      {
        titulo: "For your employees",
        texto:
          "A financial wellbeing benefit for your team: when a problem comes up with a bill, a contract or a purchase, employees have someone to turn to and don't have to work it all out alone.",
        pontos: [
          "Tracking of bills and contract dates, with Protection",
          "Support preparing and following up complaints",
          "Each person deals with their case directly with DoLado",
          "The company does not see individual cases",
        ],
      },
      {
        titulo: "For your customers",
        texto:
          "An offer for your company's customers — for example, Protection to keep track of new broadband, electricity, gas or water contracts after moving home.",
        pontos: [
          "A concrete service, applied to real situations",
          "Added value in the relationship you already have with customers",
          "Form of access agreed together",
          "Each customer's data stays with DoLado",
        ],
      },
    ],
    comoFunciona: {
      eyebrow: "Access and use",
      titulo: "How it works.",
      texto: "The company provides access. Each person uses DoLado directly, at their own pace.",
    },
    passos: [
      {
        titulo: "We agree the format with you",
        texto:
          "In a conversation, we agree the audience, what is included — tracking of bills and contracts, case handling or both — and the form of access.",
        rotulo: "Together",
      },
      {
        titulo: "The company provides access",
        texto:
          "For example, with individual activation codes that the company hands to each person. DoLado does not need to receive a list of employees.",
        rotulo: "The company",
      },
      {
        titulo: "Each person creates their account",
        texto:
          "They activate access, send the bills and contracts they want tracked or tell us about the problem they have. They decide what they share.",
        rotulo: "The person",
      },
      {
        titulo: "DoLado follows every stage",
        texto:
          "It flags when something needs attention, prepares the complaint, which the person reviews and authorises before it is sent, and follows up the reply from the company complained about.",
        rotulo: "DoLado",
      },
    ],
    formatosCabecalho: {
      eyebrow: "Formats to explore",
      titulo: "A conversation to find the right format.",
      texto:
        "The audience, form of access and terms are agreed together, based on your company's goals. These are starting points, not fixed packages.",
    },
    formatos: [
      { titulo: "For employees", texto: "Give your team a simple way to find out about and access DoLado's support." },
      { titulo: "For customers", texto: "Present DoLado as an additional resource in your relationship with your customers." },
      { titulo: "For both audiences", texto: "Combine employees and customers, with the right communication for each group." },
      {
        titulo: "A first, limited trial",
        texto: "Start with a defined scope, learn from how it is used and decide the next steps.",
      },
    ],
    parceiros: {
      texto: "Would you like to refer customers or offer DoLado Protection through your business?",
      ligacao: "Find out about our partner programme.",
    },
    clarezaCabecalho: {
      eyebrow: "Confidentiality",
      titulo: "Each person's cases stay between them and DoLado.",
      texto:
        "The company provides access, but does not follow anyone's personal finances. Each person stays in control of what they share and of what is sent on their behalf.",
    },
    clareza: [
      {
        titulo: "The company does not see individual cases",
        texto: "Each person's problems, bills, contracts, documents and messages are not shared with the company.",
      },
      {
        titulo: "Aggregate figures only",
        texto:
          "When access is given with activation codes, the company may receive counts only — for example, how many codes have been activated — never names, e-mails or activity. For small groups, we only show “fewer than 5”.",
      },
      {
        titulo: "Nothing is sent without authorisation",
        texto: "The person sees the complaint text prepared by DoLado and only authorises it to be sent if they agree with it.",
      },
      {
        titulo: "The outcome depends on the company complained about",
        texto: "DoLado prepares and follows up the process, but does not promise a particular reply or outcome.",
      },
    ],
    perguntasCabecalho: {
      eyebrow: "Frequently asked questions",
      titulo: "Before we start.",
      texto: "A first conversation helps clarify what makes sense for your company.",
    },
    perguntas: [
      {
        pergunta: "What does “financial wellbeing” mean at DoLado?",
        resposta:
          "It means helping people gain more control over their spending and worry less about consumer problems: keeping track of bills and contracts, flagging changes and important dates, and supporting them in preparing and following up complaints. DoLado does not give financial advice, manage budgets or broker credit.",
      },
      {
        pergunta: "Who can a company offer DoLado to?",
        resposta:
          "To employees, to customers or to both. The audience, form of access and communication are agreed together, based on your company's goals.",
      },
      {
        pergunta: "What kind of support does DoLado provide?",
        resposta:
          "DoLado helps sort out problems with companies — for example in telecoms, energy, water, shopping or gyms: it organises the situation, prepares the complaint, which the person reviews before it is sent, and follows up the next steps. Protection is a separate service that doesn't require a problem: it keeps track of the bills and contract dates the person sends and flags when something needs attention.",
      },
      {
        pergunta: "Does the company have access to individual cases?",
        resposta:
          "No. Each case is handled directly between the person and DoLado. When access is given with activation codes, the company may only receive aggregate figures, such as how many codes have been activated — never names, e-mails, documents or anyone's activity.",
      },
      {
        pergunta: "What are the prices and terms for businesses?",
        resposta:
          "They depend on the audience, format and intended use, and are agreed in a conversation with DoLado. Get in touch so we can explore what makes sense for your company.",
      },
      {
        pergunta: "Does DoLado guarantee the complaint will be resolved?",
        resposta: "No. DoLado prepares and follows up the process, but the reply and the outcome depend on the company complained about.",
      },
    ],
    ctaFinal: {
      eyebrow: "Let's talk",
      titulo: "Want to bring DoLado to your team? Request a proposal.",
      texto:
        "Tell us what you have in mind — employees, customers or both — and we'll explore the next step with you. You can also write to <email/>.",
    },
  },
};
