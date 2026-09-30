import type { Metadata } from "next";
import { PerguntasFrequentes } from "@/components/landing/PerguntasFrequentes";

export const metadata: Metadata = {
  title: "Perguntas Frequentes - DoLado",
  description:
    "Encontre respostas sobre como funciona a DoLado, reclamações de consumo, planos, proteção e acompanhamento do seu caso.",
};

export default function PerguntasFrequentesPage() {
  return <PerguntasFrequentes />;
}
