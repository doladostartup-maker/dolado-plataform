import type { ReactNode } from "react";
import { IconeCalendario, IconeCasa, IconePergunta } from "./Icones";
import { VisualFidelizacao, VisualMudanca, VisualSimulador } from "./Mockups";

// As ferramentas públicas e gratuitas da DoLado, apresentadas pela pergunta
// do consumidor (secções 28 e 33 do Design System V2). Fonte única para a
// página /ferramentas-gratuitas e para a secção de ferramentas da homepage V2.
// Só ferramentas gratuitas, sem conta: nunca a comparação de faturas (é da
// Proteção). Os textos descrevem o que cada ferramenta faz de facto.

export type Ferramenta = {
  id: "calculadora" | "simulador" | "mudanca";
  icone: ReactNode;
  titulo: string;
  texto: string;
  visual: ReactNode;
  cta: string;
  href: string;
};

export const FERRAMENTAS: Ferramenta[] = [
  {
    id: "calculadora",
    icone: <IconeCalendario tamanho={30} strokeWidth={1.6} />,
    titulo: "Quanto custa cancelar antes do fim da fidelização?",
    texto:
      "Para contratos de telecomunicações: com as datas e os valores do contrato, estime o encargo máximo de um cancelamento antecipado.",
    visual: <VisualFidelizacao />,
    cta: "Calcular o encargo grátis",
    href: "/calculadora-cancelamento",
  },
  {
    id: "simulador",
    icone: <IconePergunta tamanho={30} strokeWidth={1.6} />,
    titulo: "A DoLado pode tratar do meu caso?",
    texto: "Responda a 4 perguntas e veja, de forma indicativa, se a DoLado pode ajudar com a sua situação.",
    visual: <VisualSimulador />,
    cta: "Ver se a DoLado pode ajudar",
    href: "/simulador-elegibilidade",
  },
  {
    id: "mudanca",
    icone: <IconeCasa tamanho={30} strokeWidth={1.6} />,
    titulo: "Vai mudar de casa?",
    texto:
      "Veja o que deve tratar antes, durante e depois da mudança: telecomunicações, eletricidade, gás e água.",
    visual: <VisualMudanca />,
    cta: "Ver Guia de Mudança",
    href: "/mudanca-de-casa",
  },
];
