import Link from "next/link";
import { LIMITE_CASOS_ACUMULADOS, PLANOS, formatarPreco, precoComUnidade } from "@/lib/planos";
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

// Preços e o que cada plano inclui: src/lib/planos.ts. As respostas usam os
// mesmos valores para não divergirem do preçário.
const QUANTO_CUSTA: Pergunta = {
  id: "quanto-custa",
  pergunta: "Quanto custa a DoLado?",
  resposta: `A DoLado tem três opções: Proteção por ${precoComUnidade("protecao")}, Caso + Proteção por ${precoComUnidade("caso_protecao")} e o serviço Avulso por ${formatarPreco(PLANOS.avulso.precoCentimos)} por caso. Todos os preços incluem IVA.`,
};

const DIFERENCA_PLANOS: Pergunta = {
  id: "diferenca-planos",
  pergunta: "Qual é a diferença entre Proteção, Caso + Proteção e Avulso?",
  resposta:
    "A Proteção dá acesso às funcionalidades de prevenção e acompanhamento de contratos, sem tratamento de casos. O Caso + Proteção junta essas funcionalidades a 1 novo caso por mês. O Avulso é um pagamento único para tratar um caso, sem subscrição.",
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
  QUANTO_CUSTA,
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
          "Antes do envio, pode rever o texto preparado pela DoLado através do link que lhe enviamos por e-mail. Se pretender alguma alteração, selecione “Pedir alterações” e indique-nos o que gostaria de rever. A DoLado só procede ao envio depois de receber a sua autorização explícita.",
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
      QUANTO_CUSTA,
      DIFERENCA_PLANOS,
      {
        id: "o-que-inclui-protecao",
        pergunta: "O que inclui o plano Proteção?",
        resposta:
          "O plano Proteção dá acesso às funcionalidades de prevenção e acompanhamento de contratos disponíveis na DoLado — alertas de fim de fidelização e de fim de promoção, aviso sectorial, comparador de faturas e simulador de elegibilidade. Não inclui o tratamento de reclamações.",
      },
      {
        id: "o-que-inclui-caso-protecao",
        pergunta: "O que inclui o plano Caso + Proteção?",
        resposta: `Inclui as funcionalidades do plano Proteção e 1 novo caso por mês. Os casos não utilizados acumulam até ao limite de ${LIMITE_CASOS_ACUMULADOS}.`,
      },
      {
        id: "sem-subscricao",
        pergunta: "Preciso de uma subscrição para tratar um caso?",
        resposta: `Não. Pode utilizar o serviço Avulso por ${formatarPreco(PLANOS.avulso.precoCentimos)} para tratar um caso sem aderir a uma subscrição.`,
      },
      {
        id: "avulso-depois-subscricao",
        pergunta: "Já comprei um Avulso. Posso aderir depois a uma subscrição?",
        resposta:
          "Sim, a partir da sua área de cliente. Quando um Avulso elegível é convertido numa subscrição, parte do valor já pago cobre o primeiro mês e o restante é reembolsado para o método de pagamento original.",
      },
      {
        id: "cancelar-protecao",
        pergunta: "Posso cancelar a Proteção?",
        resposta: (
          <>
            <p>
              Sim. Pode cancelar a sua subscrição a qualquer momento na área{" "}
              <strong>Gestão de Subscrição</strong>. Depois de cancelar, continua a beneficiar da
              Proteção até ao fim do período que já pagou e não serão feitas novas cobranças.
            </p>
            <p className="mt-3">
              O cancelamento normal não dá direito ao reembolso proporcional da mensalidade já
              paga, sem prejuízo dos direitos que a lei lhe atribui, nomeadamente o direito de
              livre resolução quando aplicável.
            </p>
            <p className="mt-3">
              Os casos que já criou continuam disponíveis na sua conta. Se tiver casos acumulados
              no plano Caso + Proteção, estes ficam guardados durante 90 dias após o fim da
              subscrição. Se voltar a subscrever o Caso + Proteção dentro desse período, recupera
              os casos disponíveis que tinha.
            </p>
          </>
        ),
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
          "Sim. Depois do envio, pode consultar no seu caso o texto exato da reclamação submetida e, quando disponível, o respetivo comprovativo de submissão. Estes elementos ficam disponíveis no seu portal, juntamente com o histórico do caso. No final do acompanhamento, disponibilizamos também o dossiê do caso.",
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
