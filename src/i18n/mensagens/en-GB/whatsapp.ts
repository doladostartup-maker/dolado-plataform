import type { Traducao } from "../../dicionario.ts";
import type { whatsapp as pt } from "../pt-PT/whatsapp.ts";

export const whatsapp: Traducao<typeof pt> = {
  rotuloAcessivel: "Message DoLado on WhatsApp",
  abreNovaJanela: "(opens WhatsApp in a new window)",
  soMensagem: "Support by message only.",
  falarConnosco: "Message us on WhatsApp",
  contextos: {
    homepage: {
      pergunta: "Need help getting started?",
      mensagem: "Hello. I'm on the DoLado website and would like some help working out where to start.",
    },
    precario: {
      pergunta: "Not sure which option suits you best?",
      mensagem: "Hello. I'm looking at DoLado's plans and have a question about which option suits me best.",
    },
    calculadora: {
      pergunta: "Any questions about this result?",
      acao: "Ask a question on WhatsApp",
      mensagem: "Hello. I used DoLado's minimum term calculator and have a question about the result.",
    },
    simulador: {
      pergunta: "Any questions?",
      mensagem: "Hello. I used DoLado's eligibility checker and would like to ask a question about the result.",
    },
    ajuda: {
      pergunta: "Didn't find the answer you were looking for?",
      mensagem: "Hello. I've looked at DoLado's help pages but still have a question.",
    },
    setor: {
      pergunta: "Not sure how to start?",
      mensagens: {
        telecomunicacoes:
          "Hello. I'm reading DoLado's information about problems with telecoms providers and would like some help working out how to start.",
        energia:
          "Hello. I'm reading DoLado's information about problems with electricity suppliers and would like some help working out how to start.",
        gas: "Hello. I'm reading DoLado's information about problems with gas suppliers and would like some help working out how to start.",
        agua: "Hello. I'm reading DoLado's information about problems with the water supply and would like some help working out how to start.",
        "compras-reembolsos":
          "Hello. I'm reading DoLado's information about problems with purchases and refunds and would like some help working out how to start.",
      },
    },
    contacto: {
      titulo: "WhatsApp",
      texto:
        "We help you work out where to start, answer questions about the service and choose the most suitable option. Messages only. We do not assess cases or receive documents on WhatsApp: requests are made through the step-by-step form.",
      acao: "Send a message",
      mensagem: "Hello. I'm on the DoLado website and would like some help.",
    },
  },
};
