import type { Metadata } from "next";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { TransparenciaV2 } from "@/components/transparencia-v2/TransparenciaV2";

export const metadata: Metadata = {
  title: "Transparência - DoLado",
  description:
    "O que a DoLado faz por si e o que não faz, sem letras miúdas: identificamos a legislação aplicável, preparamos a reclamação e acompanhamos o prazo — nunca damos aconselhamento jurídico individualizado nem representamos em tribunal.",
};

export default function TransparenciaPage() {
  // Sem AnalyticsScripts, como antes da migração.
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_transparencia">
      <TransparenciaV2 />
    </PaginaV2>
  );
}
