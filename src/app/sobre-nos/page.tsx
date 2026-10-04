import type { Metadata } from "next";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { SobreNosV2 } from "@/components/sobre-nos-v2/SobreNosV2";

export const metadata: Metadata = {
  title: "Sobre Nós | DoLado",
  description:
    "Conheça a DoLado, uma plataforma criada para ajudar os consumidores a apresentar reclamações, acompanhar processos e evitar prejuízos, com informação, proteção e acompanhamento.",
};

export default function SobreNosPage() {
  // Sem AnalyticsScripts, como antes da migração.
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_sobre_nos">
      <SobreNosV2 />
    </PaginaV2>
  );
}
