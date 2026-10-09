import type { Traducao } from "../../dicionario.ts";
import type { institucional as pt } from "../pt-PT/institucional.ts";

export const institucional: Traducao<typeof pt> = {
  sobreNos: {
    metadados: {
      titulo: "About Us | DoLado",
      descricao:
        "Meet DoLado, a platform built to help consumers make complaints, follow up processes and avoid losses, with information, protection and support.",
    },
    eyebrow: "About us",
    titulo: "On the consumer's side.",
    hero: [
      "DoLado was born from a simple idea: no consumer should lose out because they don't know their rights, the deadlines that apply or the steps needed to solve a problem.",
      "Every day, people pay more than they should, stay in contracts they could end, miss important deadlines or give up on complaining because they don't know where to start.",
    ],
    heroDestaque: "We created DoLado to help change that.",
    secoes: [
      {
        titulo: "We are on your side",
        paragrafos: [
          "Our name says exactly what we believe in.",
          "“DoLado” is Portuguese for “on the side” — being on the consumer's side.",
          "When a problem comes up with a telecoms provider or an energy or water supplier, it is not always easy to work out who to contact, how to present the situation, which rights apply or how long they have to reply.",
          "With DoLado, consumers don't have to work it all out on their own.",
          "We help you understand the situation, prepare the complaint and follow the whole process, from the first step to its resolution. We keep everyone informed about where their process stands, what comes next and which deadlines to bear in mind.",
          "Because making a complaint shouldn't mean spending hours searching for legislation, contacts or procedures.",
        ],
      },
      {
        titulo: "More than solving problems, we want to help prevent them",
        paragrafos: [
          "Many of the problems consumers face could be avoided if the right information arrived at the right time.",
          "That is why DoLado isn't only there for when something goes wrong.",
          "With Protection, DoLado helps you spot situations that could turn into a problem and warns you in advance — such as the end of promotional periods, the end of minimum-term periods or significant changes in your bills — so you can act in time.",
          "We want every consumer to have more control and fewer surprises.",
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
        "Because, whatever the amount involved, we believe no consumer should lose out simply because they didn't have the right information.",
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
      { titulo: "We identify the applicable law", descricao: "We read your case and identify the legislation that applies to your sector." },
      {
        titulo: "We prepare the formal complaint",
        descricao: "Citing the law and with a clear request. We show you the text before it is sent — we only go ahead once you confirm.",
      },
      {
        titulo: "We track the deadline",
        descricao: "We know exactly when the response deadline ends and keep you informed at every step.",
      },
      {
        titulo: "We only send it with your authorisation",
        descricao: "Once you have reviewed and confirmed the text, we submit the complaint to the Complaints Book (Livro de Reclamações) on your behalf.",
      },
    ],
    naoFazemosTitulo: "What we don't do",
    naoFazemos: [
      {
        titulo: "We don't give individual legal advice",
        descricao: "We organise the facts and cite the law — we don't decide your legal strategy.",
      },
      {
        titulo: "We don't represent you in court or arbitration",
        descricao: "If your case gets to that point, you need a lawyer — and we will tell you that in advance.",
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
          a: "No. We provide administrative support — organising your case and citing the law. For legal strategy or formal representation, you need a lawyer.",
        },
        {
          q: "What if the company doesn't respond?",
          a: "We track the response deadline and, if there is no useful response, we tell you the possible next routes — such as the regulator or an arbitration centre — with the full case file.",
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
      descricao: 'Get in touch for press, partnerships or general questions. To open a case, use "Start my case".',
    },
    eyebrow: "Contact",
    titulo: "Talk to us.",
    texto: "Use the form or write to us at <email/>.",
    caminhos: {
      eyebrow: "Before you write",
      titulo: "What is it about?",
      caso: {
        titulo: "Got a problem with a company?",
        texto: "Cases can only be opened through the guided process: tell us what happened, step by step.",
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
      eyebrow: "Press, partnerships and other matters",
      titulo: "Send us a message.",
      texto:
        "You can also write to <email/>. Complaints about DoLado itself: please also see the <litigios>Dispute resolution</litigios> page.",
      aviso:
        "<b>This form does not open cases.</b> Complaints sent by email or through this form are not processed. To open a case, always use the guided process under “Start my case”.",
      enviada: "Message sent.",
      obrigado: "Thank you for getting in touch — we will reply as soon as we can.",
      nome: "Name",
      nomePlaceholder: "Your name",
      email: "Email",
      emailPlaceholder: "name@example.com",
      assunto: "Subject",
      assuntoPlaceholder: "What would you like to talk about?",
      mensagem: "Message",
      mensagemPlaceholder: "Write here — press, partnerships, general questions…",
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
      titulo: "DoLado for businesses | DoLado",
      descricao:
        "Run a business? Talk to DoLado about a consumer support solution for your employees or customers: organising the problem, preparing the complaint and following the next steps.",
    },
    falar: "Talk to DoLado",
    eyebrow: "DoLado for businesses",
    titulo1: "Run a business?",
    titulo2: "Talk to DoLado about a solution for your employees or customers.",
    texto:
      "When someone has a problem with a company — a charge, a cancellation, a refund — DoLado helps organise the situation, prepares the complaint and follows the next steps. Your business can offer that support to the people who rely on you.",
    verComoFunciona: "See how it works",
    formatosNota: "Formats and terms agreed in a conversation, depending on your audience and your business's goals.",
    solucao: {
      eyebrow: "One solution, two audiences",
      titulo: "Support for real problems.",
      texto: "It isn't a list of features: it is a service that supports the person from the problem through to the next steps.",
    },
    publicos: [
      {
        titulo: "A benefit for employees",
        texto:
          "When a problem comes up with a bill, a service or a purchase, your employees have somewhere to turn. DoLado helps organise the situation, prepares the complaint and follows the next steps — without the person having to work everything out alone.",
        pontos: [
          "Practical help with everyday consumer problems",
          "Each person deals with their case directly with DoLado",
          "Less time and worry spent on hard-to-follow processes",
        ],
      },
      {
        titulo: "An offer for your customers",
        texto:
          "Add useful support to your relationship with your customers for when something goes wrong with another company. DoLado can be presented as an extra resource, with communication suited to your audience.",
        pontos: [
          "A concrete service, applied to real situations",
          "Added value in the relationship you already have with your customers",
          "Access arrangements agreed together",
        ],
      },
    ],
    comoFunciona: {
      eyebrow: "How it works",
      titulo: "From the problem to the next step.",
      texto: "It starts with what happened to the person. DoLado turns the situation into practical support.",
    },
    passos: [
      {
        titulo: "The person explains what happened",
        texto: "A charge, a cancellation, a refund that never arrives or a complaint that went unanswered.",
        rotulo: "The person",
      },
      {
        titulo: "DoLado organises the situation",
        texto: "We identify the relevant information and what can be requested, based on the facts and documents of the case.",
        rotulo: "DoLado",
      },
      {
        titulo: "The complaint is prepared and reviewed",
        texto: "DoLado prepares the complaint text. The person reviews it and it only goes ahead once they authorise it.",
        rotulo: "The person decides",
      },
      {
        titulo: "The next steps are followed up",
        texto:
          "DoLado follows the response from the company complained about and keeps the person informed about the status of the case and the options that follow.",
        rotulo: "DoLado",
      },
    ],
    exemplosCabecalho: {
      eyebrow: "Examples",
      titulo: "Situations where help makes a difference.",
      texto: "Common consumer problems that take time and patience for anyone trying to solve them alone.",
    },
    exemplos: [
      {
        titulo: "Unexpected charges",
        texto: "A bill with an amount that makes no sense, or a service charged that was never requested.",
        contexto: "Telecoms · energy · water",
      },
      {
        titulo: "Cancellations",
        texto: "A cancellation request that goes nowhere, or exit charges that raise questions.",
        contexto: "Service contracts · subscriptions",
      },
      {
        titulo: "Refunds",
        texto: "A return that was accepted, but a refund that still hasn't arrived.",
        contexto: "Purchases · services",
      },
      {
        titulo: "Unanswered complaints",
        texto: "The person has already tried to sort it out directly with the company and got no answer or solution.",
        contexto: "Preparation · follow-up",
      },
    ],
    formatosCabecalho: {
      eyebrow: "Formats to explore",
      titulo: "A conversation to find the right format.",
      texto:
        "The audience, the way people access the service and the terms are agreed together, depending on your business's goals. These are starting points, not fixed packages.",
    },
    formatos: [
      { titulo: "For employees", texto: "Give your team a simple way to find out about and access DoLado's support." },
      { titulo: "For customers", texto: "Present DoLado as an extra resource in your relationship with your customers." },
      { titulo: "For both audiences", texto: "Combine employees and customers, with communication suited to each group." },
      {
        titulo: "A limited first trial",
        texto: "Start with a defined scope, learn from how it is used and decide on the next steps.",
      },
    ],
    clarezaCabecalho: {
      eyebrow: "Trust and clarity",
      titulo: "The person stays in control of their case.",
      texto: "DoLado prepares and follows the situation. The person reviews the complaint before it is sent and decides how they want to proceed.",
    },
    clareza: [
      { titulo: "The case starts with the person", texto: "They explain the situation and decide whether to go ahead." },
      {
        titulo: "The complaint is reviewed before it is sent",
        texto: "The person sees the text prepared by DoLado and only authorises sending it if they agree with it.",
      },
      {
        titulo: "The outcome depends on the company complained about",
        texto: "DoLado prepares and follows the process, but does not promise a particular response or outcome.",
      },
    ],
    perguntasCabecalho: {
      eyebrow: "Frequently asked questions",
      titulo: "Before we start.",
      texto: "A first conversation helps clarify what makes sense for your business.",
    },
    perguntas: [
      {
        pergunta: "Who can a business offer DoLado to?",
        resposta:
          "Employees, customers or both. The audience, the way people access the service and the communication are agreed together, depending on your business's goals.",
      },
      {
        pergunta: "What kind of support does DoLado provide?",
        resposta:
          "DoLado helps resolve problems with companies — for example telecoms, energy or water companies: it organises the situation, prepares the complaint, which the person reviews before it is sent, and follows the next steps. With Protection, DoLado also keeps track of the dates and bills the person provides, to help spot a problem in time.",
      },
      {
        pergunta: "Does the business have access to individual cases?",
        resposta:
          "Each case is handled directly between the person and DoLado. The solution does not assume that the business can access the individual cases of the people using DoLado; any information to be shared as part of a partnership is defined and clearly explained before starting.",
      },
      {
        pergunta: "What are the prices and terms for businesses?",
        resposta:
          "They depend on the audience, the format and the intended use, and are agreed in a conversation with DoLado. Get in touch so we can explore what makes sense for your business.",
      },
      {
        pergunta: "Does DoLado guarantee that the complaint will be resolved?",
        resposta: "No. DoLado prepares and follows the process, but the response and the outcome depend on the company complained about.",
      },
    ],
    ctaFinal: {
      eyebrow: "Let's talk",
      titulo: "Run a business? Talk to DoLado.",
      texto:
        "Tell us what you have in mind — employees, customers or both — and we will explore the next step with you. You can also write to <email/>.",
    },
  },
};
