import type { Traducao } from "../../dicionario.ts";
import type { texto as pt } from "../pt-PT/texto.ts";

export const texto: Traducao<typeof pt> = {
  metadados: "Review the text — DoLado",
  eyebrow: "Your complaint",
  reverTitulo: "Review and authorise sending",
  alterarTitulo: "Request changes",
  relativaA: (assunto: string) => `Complaint about ${assunto}`,
  aSuaReclamacao: "Your complaint",
  versao: (n: number) => ` · version ${n}`,
  reverTexto:
    "This is exactly the text that DoLado will send on your behalf. Please read it carefully. Opening this link has not authorised anything: sending is only authorised once you select “Authorise sending”.",
  reverNota: "If you would like to change anything, don't authorise it: use the “Request changes” link in the email or your account.",
  alterarTexto:
    "This is the text prepared by DoLado. Tell us what you would like us to review — we will prepare a new version and send it to you for approval. Your request is only recorded when you select “Send change request”, and nothing is sent without your authorisation.",
  emPortugues:
    "The complaint is written in Portuguese, the language in which it will be sent to the company and the Portuguese authorities.",
  autorizarConfirma: "By authorising, you confirm that you have reviewed this text and authorise DoLado to send it on your behalf.",
  aRegistar: "Recording…",
  autorizar: "Authorise sending",
  oQueAlterar: "What would you like to change?",
  descreva: "Please describe what you would like to change in the text.",
  aEnviar: "Sending…",
  enviarPedido: "Send change request",
  novoLinkPedido: "If the request is valid, you will receive a new link at the email address linked to the case within a few minutes.",
  aPedir: "Requesting…",
  pedirNovoLink: "Request a new link",
  jaAutorizadoEm: (data: string) => `This text was already authorised on ${data}. DoLado can go ahead and send it on your behalf.`,
  mensagens: {
    autorizado: {
      titulo: "Text authorised",
      texto: "Thank you. DoLado can now send it on your behalf. We will keep you updated at every relevant step.",
    },
    ja_autorizado: {
      titulo: "Text already authorised",
      texto: "This text has already been authorised. DoLado can go ahead and send it on your behalf.",
    },
    pedido_registado: {
      titulo: "Change request sent",
      texto: "We have received your request. We will review the text and send you a new version for approval. Nothing will be sent without your authorisation.",
    },
    alteracoes_pedidas: {
      titulo: "We have already received your change request",
      texto: "We will review the text and send you a new version for approval. Nothing will be sent without your authorisation.",
    },
    versao_antiga: {
      titulo: "There is a more recent version of this text",
      texto: "Please check the most recent email from DoLado or go to your account.",
    },
    expirado: {
      titulo: "This link has expired",
      texto: "For security, review links are valid for a limited time. You can request a new link, which we will send to the email address linked to the case.",
    },
    link_substituido: {
      titulo: "This link is no longer active",
      texto: "We have since sent you a more recent link. Please check the most recent email from DoLado or go to your account.",
    },
    mensagem_invalida: {
      titulo: "Please tell us what to change",
      texto: "Please describe what you would like to change in the text.",
    },
    invalido: {
      titulo: "Invalid link",
      texto: "This link is not valid. Please check that you copied the full address from the email, or go to your account.",
    },
    erro: {
      titulo: "We couldn't complete your request",
      texto: "Please try again in a few minutes.",
    },
  },
  estados: {
    rascunho: "Text being prepared",
    aguardando_aprovacao: "Awaiting your approval",
    alteracoes_solicitadas: "Changes requested",
    autorizado: "Text authorised",
    enviado: "Sent",
    substituido: "Version replaced",
  },
  canais: {
    livro_reclamacoes_eletronico: "Electronic Complaints Book (Livro de Reclamações Eletrónico)",
    email: "Email",
    carta: "Letter",
    formulario_operador: "Company's form",
    outro: "Other",
  },
  portal: {
    reveNova: "Review the new message to the company",
    nova: "New message to the company",
    reveTexto: "Review the complaint text",
    textoReclamacao: "Complaint text",
    aRever: "This is exactly the text that DoLado will send on your behalf. Review it and authorise sending, or request changes.",
    alteracoesRecebidas: "We have received your request. We will prepare a new version and show it to you before anything is sent.",
    pedirAlteracoes: "Request changes",
    autorizouEm: (data: string) => `You authorised sending on ${data}.`,
  },
  enviada: {
    comprovativo: "Proof of submission",
    numero: (n: string) => `Submission no.: ${n}`,
    ver: "View proof",
    descarregar: "Download",
    semComprovativo: "This submission has no proof of submission.",
    comprovativoBreve: "The proof of submission will be made available here as soon as it is ready.",
    novaEnviada: "New message sent",
    reclamacaoEnviada: "Complaint sent",
    enviadaEtiqueta: "Sent",
    enviadaEm: "Sent on",
    por: "Via",
    destinatario: "Recipient",
    referencia: "Reference",
    textoExato: "Exact text sent",
    versao: (n: number) => ` (version ${n})`,
    naoAlteravel: "This is the exact text that was submitted. It can't be changed.",
    disponivel: "The text sent and the proof of submission are available in your case in the portal.",
  },
};
