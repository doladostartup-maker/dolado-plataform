import type { Traducao } from "../../dicionario.ts";
import type { mudanca as pt } from "../pt-PT/mudanca.ts";

export const mudanca: Traducao<typeof pt> = {
  metadados: {
    titulo: "Moving home: what you need to sort out - DoLado",
    descricao:
      "A free guide to moving home in Portugal: telecoms, electricity, gas and water. What to prepare, what to keep, what the CPE and CUI codes are and what to check on your final bill.",
  },
  tratarCaso: "Start my case",
  eyebrow: "DoLado guide · free",
  titulo: "Moving home: what you need to sort out",
  texto:
    "Moving home means dealing with several contracts and services. Use this guide to work out what to prepare, what to keep and when there may be a problem worth complaining about.",
  nestaPagina: "On this page",
  indice: {
    antes: "Before the move",
    diaDaSaida: "On moving-out day",
    casaNova: "In your new home",
    depois: "After the move",
    dolado: "When DoLado can help",
    perguntas: "Frequently asked questions",
  },
  antes: {
    intro: "The sooner you deal with these points, the fewer surprises you will have in your new home and on the final bill for your old one.",
    telecom: {
      titulo: "Telecoms (internet, TV, phone)",
      itens: [
        "Check whether your provider has coverage at your new address.",
        "Ask whether your current service can be transferred, and on what terms.",
        "Check when your minimum term ends: it is usually shown on your monthly bill.",
        "If you are thinking of cancelling, ask your provider how much the charges would be. You can also get an estimate with the <calc>Cancellation Calculator</calc>.",
        "Ask what you should do with the equipment (router, TV box, cards) and by when.",
        "Ask for the answers in writing and keep them.",
      ],
      cta: "Having trouble with the transfer or cancellation?",
    },
    eletricidade: {
      titulo: "Electricity",
      itens: [
        "Identify your current contract: supplier, account holder and CPE (it's on your bill).",
        "Decide your moving-out date and tell your supplier in good time.",
        "Find out what will happen with the contract for your new home: whether the supply is already connected or needs connecting.",
        "Keep your meter readings and proof of any requests you make.",
      ],
    },
    gas: {
      titulo: "Gas",
      itens: [
        "Find the CUI on your gas bill.",
        "Get ready to take the meter reading on moving-out day.",
        "Check the situation at your new home: whether it has mains gas, bottled gas or none.",
        "Keep your documents and proof of your requests.",
      ],
    },
    agua: {
      titulo: "Water",
      itens: [
        "Identify the water provider: usually the local council (câmara municipal), the municipal services or a concession company.",
        "Check the local procedure for ending the contract at your old home and opening one at your new home.",
        "Get ready to take the meter reading on moving-out day.",
      ],
    },
  },
  diaDaSaida: {
    intro: "Photos and receipts from this day are often what lets you sort out a disagreement later on.",
    titulo: "Moving-out day checklist",
    itens: [
      "Photograph the electricity, gas and water meters.",
      "Note down the readings, with the date and time.",
      "Keep the receipts for any equipment you return.",
      "Keep the cancellation or change requests you sent and the replies you received.",
      "Don't throw away the paperwork for your old home until you have received the final bill for each service.",
    ],
  },
  casaNova: {
    intro: "Each home has its own installation identifiers. They don't move with you from your old home.",
    cpe: {
      titulo: "CPE: Supply Point Code (Código de Ponto de Entrega)",
      texto:
        'It identifies the home\'s electricity installation. It is a code starting with "PT" and appears on electricity bills. Your new home has its own CPE: that is the one to give when you set up your electricity contract.',
    },
    cui: {
      titulo: "CUI: Universal Installation Code (Código Universal de Instalação)",
      texto:
        "It identifies the home's mains gas installation and appears on gas bills. Like the CPE, it belongs to the installation, not to the customer. Don't confuse it with the CUR (supplier of last resort), which is an organisation.",
    },
    tratar: {
      titulo: "What to sort out in your new home",
      itens: [
        "<b>Telecoms:</b> confirm coverage and the installation date before ending the service at your old home.",
        "<b>Electricity and gas:</b> choose your supplier and give the CPE and CUI of your new home.",
        "<b>Water:</b> open a contract with the water provider for your new municipality or area.",
        "<b>Account holder:</b> make sure the contracts are in the name of whoever is going to pay.",
        "<b>Paperwork:</b> some suppliers ask for a document proving you live at the property, such as your tenancy agreement or title deed. Keep it to hand.",
      ],
    },
  },
  depois: {
    intro: "In the following weeks, the final bills for your old home and the first bills for your new home will arrive. They are worth reading carefully.",
    titulo: "What to check",
    itens: [
      "The final bill for each service at your old home.",
      "Usage billed after your moving-out date.",
      "The reading used, compared with the one you photographed.",
      "Cancellation charges.",
      "Charges for equipment you have already returned.",
      "Contracts still active when they should have ended.",
      "Charges that keep arriving after you moved out.",
      "Whether billing for your new home's services started on the right date.",
    ],
    cta: "Found a charge, a refusal or another problem after your move?",
  },
  dolado: {
    titulo: "DoLado steps in when a problem comes up",
    naoConnosco: {
      titulo: "Not something we handle",
      intro: "These requests are made directly with the supplier:",
      itens: ["requesting a new connection;", "choosing a supplier;", "sending meter readings;", "changing the account holder on a contract."],
    },
    ajuda: {
      titulo: "Where DoLado helps",
      itens: [
        "the supplier refuses your request;",
        "you get no reply;",
        "an unexpected charge appears;",
        "the cancellation wasn't processed;",
        "the reading billed doesn't match the real one;",
        "you disagree with an early exit charge;",
        "you returned the equipment and were charged anyway;",
        "another problem with the supplier.",
      ],
    },
    fecho:
      'Under "Start my case" you describe what happened, create your account and choose the option that suits you. If you\'re not sure yet whether DoLado can help, try the <sim>Eligibility Checker</sim>.',
  },
  perguntas: {
    eyebrow: "Frequently asked questions",
    titulo: "Common questions about moving.",
    lista: [
      {
        pergunta: "Does the CPE change when I move home?",
        resposta:
          "Yes. The CPE identifies the electricity installation, not the person or the contract. Your new home has its own CPE, which stays the same even if the account holder or supplier changes. The CPE for your old home stays with your old home.",
      },
      {
        pergunta: "What about the gas CUI?",
        resposta:
          "It works the same way: the CUI identifies the home's mains gas installation. In your new home, use the CUI for that installation. Don't confuse CUI with CUR, which is the supplier of last resort — an organisation, not a code.",
      },
      {
        pergunta: "Can I take my internet and TV contract to my new home?",
        resposta:
          "It depends on whether the provider has coverage and can provide the same service at your new address. Ask the provider to confirm in writing the coverage and the transfer terms, including what happens to your minimum term and equipment. If the service can't be provided at your new address, ask what the termination conditions are and keep the reply.",
      },
      {
        pergunta: "What should I do about meter readings?",
        resposta:
          "On the day you move out, photograph the electricity, gas and water meters, with the date visible wherever possible, and send the readings to your supplier. Do the same when you move into your new home. If the final bill uses a different figure, these photos help clear up the difference.",
      },
      {
        pergunta: "How do I prove I returned the router or TV box?",
        resposta:
          "Always ask for a receipt, whether you return it in a shop or by post, showing the date and identifying the equipment (ideally the serial number). Keep it until you receive a final bill with no equipment charges.",
      },
      {
        pergunta: "What should I check on the final bill?",
        resposta:
          "Whether the billing period ends on your moving-out date, whether the reading used matches the one you gave, whether there are any cancellation or equipment charges, and whether you are still being charged after the date the contract should have ended.",
      },
    ],
    aviso:
      "This guide contains general information and does not replace the terms of your contract or a legal assessment of your case. Procedures may vary from supplier to supplier.",
  },
  ctaFinal: {
    titulo: "Has a problem come up with your move?",
    texto: "Tell us what happened. DoLado handles the complaint with the supplier and follows your case.",
  },
};
