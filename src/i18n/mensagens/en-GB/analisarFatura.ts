import type { Traducao } from "../../dicionario.ts";
import type { analisarFatura as pt } from "../pt-PT/analisarFatura.ts";

export const analisarFatura: Traducao<typeof pt> = {
  metadados: {
    titulo: "Do you really know what you are paying? Free check of your bill",
    descricao:
      "Upload your electricity bill as a PDF and see, without signing up, what you are paying and what is worth confirming. A free initial check by DoLado.",
  },
  hero: {
    titulo: "Do you really know what you are paying?",
    subtitulo: "Upload your bill and see what you are paying and what is worth confirming.",
  },
  carregar: {
    titulo: "Send us your bill",
    arrastar: "Drag the PDF here or select the file.",
    tocar: "Select the PDF of your bill.",
    botao: "Check my bill",
    aEnviar: "Sending your bill…",
    largar: "Drop the file to start",
    complemento: ["Free initial check", "PDF only", "No sign-up to start"],
    passos: ["You send the bill", "We read the document", "You see the result"],
    privacidade:
      "Your bill is kept in a private space and is only used to show you the result. If you don't create an account, it is deleted after 7 days.",
    detalhesTitulo: "How we handle your document",
  },
  exemplo: {
    titulo: "What can you find out from your bill?",
    texto: "An example of the result, with an electricity bill made up for this page.",
    etiqueta: "Illustrative example",
    linhas: {
      energia: "Energy used",
      potencia: "Contracted power",
      taxas: "Taxes and charges",
      acerto: "Usage adjustment",
    },
    total: "Bill total",
    todosOsMeses: "every month",
    soEstaVez: "this time only",
    cartoes: {
      pagar: {
        titulo: "What you are paying",
        texto: "The main amounts on the bill, organised: where the total comes from.",
      },
      destaques: {
        titulo: "What stands out",
        texto: "Dates and amounts worth keeping in mind, showing where they come from.",
        doDocumento: "From the document",
        pontual: (total: string) => `1 charge that does not repeat every month (${total}).`,
        promocao: "The promotion ends in 40 days.",
      },
      contrato: {
        titulo: "What the bill does not say",
        texto: "What cannot be confirmed from the bill alone.",
        consta: "In the contract",
        condicoes: "The agreed price, minimum term and promotions.",
      },
    },
  },
  limites: {
    titulo: "What the check does — and what it doesn't",
    faz: "What it does",
    fazItens: [
      "Reads the amounts, dates and lines on the bill.",
      "Separates what you pay every month from what was charged only this time.",
      "Checks that the lines add up to the total and works out the dates that matter.",
      "Shows what could not be confirmed.",
    ],
    naoFaz: "What it doesn't do",
    naoFazItens: [
      "It does not say whether a charge is wrong or what you should do: it shows what is in the document.",
      "It does not replace the contract: only the contract confirms the agreed price and minimum term.",
      "It is not legal advice and does not contact the company for you.",
    ],
  },
  quem: {
    titulo: "Who DoLado is",
    texto:
      "DoLado is a Portuguese financial wellbeing company specialising in consumer support: we help people understand bills and contracts for telecoms, electricity, gas and water and, month by month, we check whether the bills you send us match your contract and your previous bills. We also keep track of changes and deadlines and deal with complaints.",
  },
  perguntas: {
    titulo: "Frequently asked questions",
    itens: [
      {
        pergunta: "Is the check really free?",
        resposta: "Yes. The initial check is free, with no sign-up and no bank card. You only see DoLado Protection after the result, if you wish.",
      },
      {
        pergunta: "Which bills can I send?",
        resposta:
          "The PDF of an electricity bill, as you received it from the company (up to 10 MB). You can also send telecoms, gas or water bills, or a contract.",
      },
      {
        pergunta: "Do I need to create an account?",
        resposta: "Not to start. If you want to save the result, you can create a free account after seeing it.",
      },
      {
        pergunta: "What happens to my bill?",
        resposta:
          "It is kept in a private space and only used to show you the result. If you don't create an account, the bill and the result are deleted after 7 days. The details are in the Privacy Policy.",
      },
      {
        pergunta: "Will the check tell me if I am paying too much?",
        resposta:
          "It shows what is on the bill, does the sums and highlights the dates and amounts worth keeping in mind. It does not conclude that a charge is wrong: for that you need the contract and, often, a reply from the company.",
      },
    ],
  },
  final: {
    titulo: "See what is on your bill",
    texto: "Free, no sign-up, just the PDF.",
  },
};
