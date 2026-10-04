import type { Metadata } from "next";
import { AjudaV2 } from "@/components/ajuda-v2/AjudaV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";

export const metadata: Metadata = {
  title: "Perguntas Frequentes - DoLado",
  description:
    "Encontre respostas sobre como funciona a DoLado, reclamações de consumo, planos, proteção e acompanhamento do seu caso.",
};

export default function PerguntasFrequentesPage() {
  // Sem AnalyticsScripts, como antes da migração.
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_perguntas_frequentes">
      <AjudaV2 />
    </PaginaV2>
  );
}
