import Link from "next/link";
import { PRIVACIDADE_EMAIL } from "@/lib/site";
import type { Pergunta } from "./AccordionPerguntas";

// Conteúdo das Perguntas Frequentes — partilhado entre a homepage (versão
// curta) e /perguntas-frequentes (versão completa), para as respostas não
// divergirem. Antes de acrescentar perguntas sobre planos, prazos ou envio,
// confirmar a regra no CLAUDE.md e na implementação — não inventar.

const LINK = "font-medium text-[var(--color-brand)] underline underline-offset-4 hover:text-[var(--color-brand-hover)]";

const O_QUE_E: Pergunta = {
  id: "o-que-e",
  pergunta: "O que é a DoLado?",
  resposta:
    "A DoLado ajuda consumidores a preparar, enviar e acompanhar reclamações de consumo. Analisamos o caso, identificamos a legislação aplicável e ajudamos a estruturar a reclamação e os próximos passos.",
};

const SEM_AUTORIZACAO: Pergunta = {
  id: "sem-autorizacao",
  pergunta: "A DoLado envia alguma coisa sem a minha autorização?",
  resposta:
    "Não. Recebe sempre o conteúdo da reclamação primeiro para poder rever. O envio só é feito depois da sua confirmação explícita.",
};

const DIFERENCA_PLANOS: Pergunta = {
  id: "diferenca-planos",
  pergunta: "Qual é a diferença entre o Avulso e a Assinatura Mensal?",
  resposta:
    "O Avulso é para quem tem um problema agora e quer tratar apenas desse caso. A Assinatura Mensal inclui uma reclamação por mês (acumulável até 4) e dá-lhe acesso contínuo às funcionalidades de proteção — alertas de fim de fidelização e de fim de promoção, aviso sectorial e comparador de faturas —, mesmo sem reclamação ativa.",
};

// O prazo documentado (FormularioGuiado, e-mail "novo-caso", indicador do
// backoffice) conta a partir da abertura do caso e é o da primeira resposta
// pessoal — não há prazo definido para a preparação da reclamação.
const PRAZO: Pergunta = {
  id: "prazo",
  pergunta: "Quanto tempo demora?",
  resposta:
    "Depois de abrir o seu caso, respondemos-lhe no prazo máximo de 48 horas úteis para confirmar os factos consigo. A reclamação é preparada a partir dessa confirmação.",
};

const SUBSTITUI_ADVOGADO: Pergunta = {
  id: "substitui-advogado",
  pergunta: "A DoLado substitui um advogado?",
  resposta:
    "Não. A DoLado ajuda na preparação e acompanhamento de reclamações de consumo, mas não substitui aconselhamento ou representação jurídica quando estes forem necessários.",
};

export const PERGUNTAS_HOMEPAGE: Pergunta[] = [
  O_QUE_E,
  {
    id: "como-funciona",
    pergunta: "Como funciona?",
    resposta:
      "Conte-nos o que aconteceu e analisamos o seu caso. A DoLado prepara a reclamação e apresenta-lhe o texto antes de qualquer envio. Depois de rever e autorizar, tratamos do envio e acompanhamos o que acontece a seguir.",
  },
  SEM_AUTORIZACAO,
  DIFERENCA_PLANOS,
  PRAZO,
  {
    id: "garante-resultado",
    pergunta: "A DoLado garante que o meu problema será resolvido?",
    resposta:
      "Não é possível garantir o resultado de uma reclamação. A DoLado ajuda a apresentar o caso de forma clara e fundamentada, acompanha a resposta e ajuda a perceber os próximos passos disponíveis.",
  },
  SUBSTITUI_ADVOGADO,
];

export type CategoriaPerguntas = {
  id: string;
  titulo: string;
  perguntas: Pergunta[];
};

export const CATEGORIAS_PERGUNTAS: CategoriaPerguntas[] = [
  {
    id: "sobre-a-dolado",
    titulo: "Sobre a DoLado",
    perguntas: [
      O_QUE_E,
      {
        id: "escritorio-advogados",
        pergunta: "A DoLado é um escritório de advogados?",
        resposta:
          "Não. A DoLado é um serviço de apoio ao consumidor e não um escritório de advogados. Não substituímos aconselhamento ou representação jurídica quando estes forem necessários.",
      },
      {
        id: "garante-ganhar",
        pergunta: "A DoLado garante que vou ganhar a reclamação?",
        resposta:
          "Não. Nenhuma reclamação pode ter o resultado garantido. A DoLado ajuda a apresentar o caso de forma clara e fundamentada e acompanha os passos seguintes, mas a decisão ou resposta depende das entidades envolvidas e das circunstâncias de cada caso.",
      },
    ],
  },
  {
    id: "como-funciona",
    titulo: "Como funciona",
    perguntas: [
      {
        id: "como-funciona-reclamacao",
        pergunta: "Como funciona uma reclamação com a DoLado?",
        resposta:
          "Conte-nos o que aconteceu e envie as informações necessárias para analisarmos o caso. A DoLado prepara a reclamação e apresenta-lhe o conteúdo antes de qualquer envio. Depois de rever e autorizar, tratamos do envio e acompanhamos os próximos passos.",
      },
      {
        id: "enviam-por-mim",
        pergunta: "A DoLado envia a reclamação por mim?",
        resposta:
          "Sim. Antes do envio, recebe o conteúdo preparado pela DoLado para rever. Só depois da sua autorização explícita submetemos a reclamação ao Livro de Reclamações em seu nome.",
      },
      {
        ...SEM_AUTORIZACAO,
        resposta:
          "Não. Nada é enviado em seu nome sem que tenha primeiro acesso ao conteúdo e confirme que autoriza o envio.",
      },
      {
        id: "nao-concordo",
        pergunta: "E se eu não concordar com o texto preparado?",
        resposta:
          "Nada é enviado sem a sua aprovação. Se encontrar alguma informação incorreta ou algo que precise de ser ajustado, diga-nos antes de autorizar o envio.",
      },
      PRAZO,
      {
        id: "documentos",
        pergunta: "Que informações ou documentos posso precisar de enviar?",
        resposta:
          "Depende do caso. Podemos pedir informações como datas, valores, comunicações com a empresa, faturas, contratos ou outros documentos que ajudem a compreender e fundamentar a reclamação.",
      },
    ],
  },
  {
    id: "planos",
    titulo: "Planos e proteção",
    perguntas: [
      DIFERENCA_PLANOS,
      {
        id: "problema-agora",
        pergunta: "Tenho um problema agora. Que opção posso escolher?",
        resposta:
          "Se pretende tratar apenas do problema atual, pode escolher o Avulso. Se também quer contar com proteção para situações futuras, a Assinatura Mensal inclui uma reclamação por mês e as restantes funcionalidades de proteção.",
      },
      {
        id: "sem-reclamacao",
        pergunta: "Posso subscrever a proteção sem ter uma reclamação agora?",
        resposta:
          "Sim. A Assinatura Mensal dá acesso às funcionalidades de proteção mesmo sem reclamação ativa, e inclui uma reclamação por mês para quando precisar.",
      },
      {
        id: "avulso-depois-assinatura",
        pergunta: "Se escolher o Avulso, posso mudar para a Assinatura Mensal mais tarde?",
        resposta:
          "Sim. Pode mudar a partir da sua área de cliente. O valor que já pagou pela reclamação avulsa fica creditado automaticamente e é descontado da primeira mensalidade.",
      },
    ],
  },
  {
    id: "depois-do-envio",
    titulo: "Depois do envio",
    perguntas: [
      {
        id: "depois-enviada",
        pergunta: "O que acontece depois de a reclamação ser enviada?",
        resposta:
          "A DoLado acompanha o andamento do caso e a resposta recebida. Dependendo do resultado e do serviço aplicável ao seu caso, ajudamos a perceber quais são os próximos passos disponíveis.",
      },
      {
        id: "empresa-nao-resolve",
        pergunta: "E se a empresa não resolver o problema?",
        resposta:
          "Uma reclamação nem sempre termina com a primeira resposta. Quando o caso permitir e estiver dentro do serviço contratado, a DoLado ajuda a analisar a resposta e a identificar os próximos mecanismos disponíveis.",
      },
      {
        id: "copia",
        pergunta: "Recebo uma cópia da reclamação enviada?",
        resposta:
          "Recebe o texto completo da reclamação antes do envio, para rever. No final do acompanhamento, entregamos-lhe um dossiê completo do caso — histórico, documentos e comunicações — que pode consultar na sua área de cliente assim que estiver disponível.",
      },
    ],
  },
  {
    id: "privacidade",
    titulo: "Privacidade e segurança",
    perguntas: [
      {
        id: "dados-seguros",
        pergunta: "Os meus dados estão seguros?",
        resposta: (
          <>
            Os seus dados são guardados em sistemas com acesso restrito à equipa DoLado, com a
            base de dados alojada na União Europeia. Documentos e informação do caso só são
            partilhados no estritamente necessário. Para questões sobre os seus dados ou para
            exercer os seus direitos, escreva para{" "}
            <a href={`mailto:${PRIVACIDADE_EMAIL}`} className={LINK}>
              {PRIVACIDADE_EMAIL}
            </a>
            . Saiba mais na{" "}
            <Link href="/privacidade" className={LINK}>
              Política de Privacidade
            </Link>
            .
          </>
        ),
      },
      {
        id: "partilha-dados",
        pergunta: "A DoLado partilha os meus dados com outras entidades?",
        resposta: (
          <>
            Apenas o necessário para prestar o serviço. Recorremos a prestadores que tratam dados
            por nossa conta — por exemplo, para o alojamento da plataforma e o envio de e-mails —
            e, com a sua autorização, a reclamação inclui os dados estritamente necessários para
            a formalizar junto da empresa visada. Não vendemos nem partilhamos dados para fins de
            marketing de terceiros. A lista completa está na{" "}
            <Link href="/privacidade" className={LINK}>
              Política de Privacidade
            </Link>
            .
          </>
        ),
      },
    ],
  },
];
