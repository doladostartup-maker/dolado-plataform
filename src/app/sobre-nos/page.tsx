import type { Metadata } from "next";
import { SobreNos } from "@/components/landing/SobreNos";

export const metadata: Metadata = {
  title: "Sobre Nós | DoLado",
  description:
    "Conheça a DoLado, uma plataforma criada para ajudar os consumidores a apresentar reclamações, acompanhar processos e evitar prejuízos, com informação, proteção e acompanhamento.",
};

export default function SobreNosPage() {
  return <SobreNos />;
}
