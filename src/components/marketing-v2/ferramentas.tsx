import type { ReactNode } from "react";
import type { Idioma } from "@/i18n/config";
import { tMarketing } from "@/i18n/mensagens/marketing";
import { IconeCalendario, IconeCasa, IconePergunta } from "./Icones";
import { VisualFidelizacao, VisualMudanca, VisualSimulador } from "./Mockups";

// As ferramentas públicas e gratuitas da DoLado, apresentadas pela pergunta
// do consumidor (secções 28 e 33 do Design System V2). Fonte única para a
// página /ferramentas-gratuitas e para a secção de ferramentas da homepage V2.
// Só ferramentas gratuitas, sem conta: nunca a comparação de faturas (é da
// Proteção). Os textos descrevem o que cada ferramenta faz de facto
// (src/i18n/mensagens/*/marketing.ts, "ferramentas").

export type Ferramenta = {
  id: "calculadora" | "simulador" | "mudanca";
  icone: ReactNode;
  visual: ReactNode;
  href: string;
};

export type FerramentaComTexto = Ferramenta & { titulo: string; texto: string; cta: string };

const BASE: Ferramenta[] = [
  {
    id: "calculadora",
    icone: <IconeCalendario tamanho={30} strokeWidth={1.6} />,
    visual: <VisualFidelizacao />,
    href: "/calculadora-cancelamento",
  },
  {
    id: "simulador",
    icone: <IconePergunta tamanho={30} strokeWidth={1.6} />,
    visual: <VisualSimulador />,
    href: "/simulador-elegibilidade",
  },
  {
    id: "mudanca",
    icone: <IconeCasa tamanho={30} strokeWidth={1.6} />,
    visual: <VisualMudanca />,
    href: "/mudanca-de-casa",
  },
];

/** As ferramentas com os textos no idioma pedido. */
export function ferramentas(idioma: Idioma): FerramentaComTexto[] {
  return BASE.map((f) => ({ ...f, ...tMarketing[idioma].ferramentas[f.id] }));
}
