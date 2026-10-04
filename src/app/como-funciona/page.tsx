import type { Metadata } from "next";
import { ComoFuncionaV2 } from "@/components/como-funciona-v2/ComoFuncionaV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";

export const metadata: Metadata = {
  title: "Como funciona - DoLado",
  description:
    "Do problema à reclamação enviada, passo a passo: veja como a DoLado prepara a reclamação com a legislação aplicável, pede a sua autorização antes do envio e acompanha o prazo de resposta até ao desfecho.",
};

export default function ComoFuncionaPage() {
  // Sem AnalyticsScripts, como antes da migração (a página nunca carregou
  // medição nem o banner de cookies).
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_como_funciona">
      <ComoFuncionaV2 />
    </PaginaV2>
  );
}
