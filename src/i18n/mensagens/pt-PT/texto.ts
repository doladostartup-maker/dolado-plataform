// Texto da reclamação: páginas de revisão por link seguro (/texto/…) e, no
// portal, o texto em curso e a reclamação enviada. O CONTEÚDO da reclamação
// nunca é traduzido (é o texto que a DoLado envia, em português); só a
// interface à volta. Mensagens e estados vêm de src/lib/textoCaso.ts.

import { CANAIS_ENVIO, ESTADO_TEXTO_CLIENTE, MENSAGENS_TEXTO } from "../../../lib/textoCaso.ts";

export const texto = {
  metadados: "Revisão do texto — DoLado",
  eyebrow: "A sua reclamação",
  reverTitulo: "Rever e autorizar o envio",
  alterarTitulo: "Pedir alterações",
  relativaA: (assunto: string) => `Reclamação relativa a ${assunto}`,
  aSuaReclamacao: "A sua reclamação",
  versao: (n: number) => ` · versão ${n}`,
  reverTexto:
    "Este é exatamente o texto que a DoLado vai enviar em seu nome. Leia-o com atenção. Abrir este link não autorizou nada: o envio só fica autorizado depois de selecionar “Autorizar envio”.",
  reverNota: "Se quiser mudar alguma coisa, não autorize: use o link “Pedir alterações” do e-mail ou a sua área de cliente.",
  alterarTexto:
    "Este é o texto preparado pela DoLado. Indique-nos o que gostaria de rever — vamos preparar uma nova versão e enviá-la para a sua aprovação. O pedido só fica registado quando selecionar “Enviar pedido de alterações”, e nada é enviado sem a sua autorização.",
  /** Só em inglês: o texto da reclamação é escrito e enviado em português. */
  emPortugues: "",
  autorizarConfirma: "Ao autorizar, confirma que reviu este texto e autoriza a DoLado a enviá-lo em seu nome.",
  aRegistar: "A registar…",
  autorizar: "Autorizar envio",
  oQueAlterar: "O que gostaria de alterar?",
  descreva: "Descreva o que gostaria de alterar no texto.",
  aEnviar: "A enviar…",
  enviarPedido: "Enviar pedido de alterações",
  novoLinkPedido: "Se o pedido for válido, vai receber um novo link no e-mail associado ao caso dentro de alguns minutos.",
  aPedir: "A pedir…",
  pedirNovoLink: "Pedir um novo link",
  jaAutorizadoEm: (data: string) =>
    `Este texto já foi autorizado em ${data}. A DoLado pode proceder ao envio em seu nome.`,
  mensagens: MENSAGENS_TEXTO,
  estados: ESTADO_TEXTO_CLIENTE,
  canais: CANAIS_ENVIO,
  portal: {
    reveNova: "Reveja a nova comunicação à empresa",
    nova: "Nova comunicação à empresa",
    reveTexto: "Reveja o texto da reclamação",
    textoReclamacao: "Texto da reclamação",
    aRever: "Este é exatamente o texto que a DoLado vai enviar em seu nome. Reveja-o e autorize o envio, ou peça alterações.",
    alteracoesRecebidas: "Recebemos o seu pedido. Vamos preparar uma nova versão e mostrar-lha antes de qualquer envio.",
    pedirAlteracoes: "Pedir alterações",
    autorizouEm: (data: string) => `Autorizou o envio em ${data}.`,
  },
  enviada: {
    comprovativo: "Comprovativo de submissão",
    numero: (n: string) => `N.º da submissão: ${n}`,
    ver: "Ver comprovativo",
    descarregar: "Descarregar",
    semComprovativo: "Este envio não tem comprovativo de submissão.",
    comprovativoBreve: "O comprovativo de submissão será disponibilizado aqui assim que estiver disponível.",
    novaEnviada: "Nova comunicação enviada",
    reclamacaoEnviada: "Reclamação enviada",
    enviadaEtiqueta: "Enviada",
    enviadaEm: "Enviada em",
    por: "Por",
    destinatario: "Destinatário",
    referencia: "Referência",
    textoExato: "Texto exato enviado",
    versao: (n: number) => ` (versão ${n})`,
    naoAlteravel: "Este é o texto exato que foi submetido. Não pode ser alterado.",
    disponivel: "O texto enviado e o comprovativo ficam disponíveis no seu caso no portal.",
  },
};
