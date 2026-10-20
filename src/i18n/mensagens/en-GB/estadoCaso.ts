import type { Traducao } from "../../dicionario.ts";
import type { estadoCaso as pt } from "../pt-PT/estadoCaso.ts";

const NADA_A_FAZER = "You don't need to do anything right now.";

export const estadoCaso: Traducao<typeof pt> = {
  porStatus: {
    Novo: {
      rotulo: "Case received",
      explicacao: "We have received your case. DoLado will review the situation and the documents you sent.",
      proximoPasso: "DoLado reviews your case.",
    },
    "Em investigação": {
      rotulo: "Under review",
      explicacao: "DoLado is reviewing your case and preparing the next step.",
      proximoPasso: "Preparing the complaint text, which we show you before anything is sent.",
    },
    "Aguardando operador": {
      rotulo: "Awaiting the company's response",
      explicacao: "Your complaint has been sent. We are waiting for the company's response.",
      proximoPasso: `${NADA_A_FAZER} When the company responds, we will review the response and update you.`,
    },
    "Resposta em análise": {
      rotulo: "Response received — being reviewed by DoLado",
      explicacao:
        "We have received a message related to your complaint. We are reviewing it and will get in touch if any action is needed.",
      proximoPasso: NADA_A_FAZER,
    },
    "Aguardando cliente": {
      rotulo: "We need information from you",
      explicacao: "To keep working on your case, we need some information or documents from you.",
      proximoPasso: "Send us the information requested. We explain below exactly what we need.",
    },
    "Aguardando decisão cliente": {
      rotulo: "The company has offered a solution",
      explicacao: "The company has offered a solution for your case. Let us know whether the problem has been solved.",
      proximoPasso: "Your confirmation. We only mark the case as resolved once you confirm.",
    },
    Resolvido: {
      rotulo: "Resolved",
      explicacao: "The problem has been solved. The case is closed.",
      proximoPasso: "",
    },
    Bloqueado: {
      rotulo: "Next step given",
      explicacao: "DoLado has told you the next possible step to keep dealing with the situation.",
      proximoPasso: "See below the next step suggested by DoLado.",
    },
    "Encerrado sem resolução": {
      rotulo: "Closed",
      explicacao: "The case was closed without the company resolving the situation.",
      proximoPasso: "",
    },
    "Encerrado com encaminhamento externo": {
      rotulo: "Closed by DoLado",
      explicacao: "DoLado has finished following up this case. This does not necessarily mean the problem has been solved.",
      proximoPasso: "",
    },
  },
  desconhecido: {
    rotulo: "Being followed up",
    explicacao: "DoLado is following up your case.",
  },
  novaComunicacao: {
    explicacao: "DoLado is preparing a new message to the company, based on the response received.",
    proximoPasso: "We show you the text before anything is sent. Nothing is sent without your authorisation.",
  },
  analiseSemResposta: {
    rotulo: "Being reviewed by DoLado",
    explicacao:
      "We are reviewing your case to decide on the next step. We will get in touch if any action is needed.",
  },
  textoAguarda: {
    rotulo: "We need your authorisation",
    explicacaoNova: "We have prepared a new message to the company. Review it and authorise sending, or request changes.",
    explicacao: "We have prepared the complaint text. Review it and authorise sending, or request changes.",
    proximoPasso: "Your authorisation of the text. Nothing is sent without it.",
  },
  textoAlteracoes: {
    rotulo: "Revising the text",
    explicacao: "We have received your change request. DoLado is preparing a new version of the text.",
    proximoPasso: "A new version of the text for you to review.",
  },
  textoAutorizado: {
    rotulo: "Sending authorised",
    explicacaoNova: "You authorised sending. DoLado will send the new message to the company on your behalf.",
    explicacao: "You authorised sending. DoLado will submit the complaint on your behalf.",
    proximoPassoNova: "Sending the new message.",
    proximoPasso: "Sending the complaint and recording the proof of submission.",
  },
  eventos: {
    texto_preparado: "Complaint text prepared",
    nova_versao: "New version of the text prepared",
    texto_enviado_revisao: "Text sent to you for review",
    links_reemitidos: "New review link sent",
    alteracoes_pedidas: "You requested changes to the text",
    texto_autorizado: "You authorised sending",
    comunicacao_enviada: "Complaint sent",
    comprovativo_disponivel: "Proof of submission available",
    dossie_disponivel: "Final case file available",
    aguarda_resposta_empresa: "Awaiting the company's response",
    comunicacao_recebida: "Message received from the company",
    em_analise_dolado: "Being reviewed by DoLado",
    analise_concluida: "DoLado finished its review",
    solucao_apresentada: "The company offered a solution",
    cliente_confirmou_resolucao: "You confirmed the problem was solved",
    cliente_rejeitou_resolucao: "You said the problem wasn't solved",
    pedido_informacao_cliente: "We asked you for information",
    informacao_cliente_enviada: "You sent the information requested",
    encaminhamento_registado: "Next step given",
    caso_encerrado: "Case closed",
    dossie_gerado: "Case file prepared",
  },
  eventoDesconhecido: "Case update",
  cronologia: {
    reclamacaoEnviada: "Complaint sent",
    novaEnviada: "New message sent to the company",
    referencia: (ref: string) => `Reference: ${ref}`,
    novaPreparada: "New message prepared",
    novaRevisao: "New message sent to you for review",
    encerradoDolado: "Closed by DoLado",
    encerradoDetalhe: "Follow-up has ended; there are external options to continue",
    novoDossie: "New version of the case file prepared",
  },
};
