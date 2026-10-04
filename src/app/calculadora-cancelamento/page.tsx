import type { Metadata } from "next";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { CalculadoraV2 } from "@/components/calculadora-v2/CalculadoraV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { MARKETING_SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Calculadora de Cancelamento - DoLado",
  description:
    "Estime o encargo máximo de cancelar antecipadamente um contrato de telecomunicações com fidelização. Grátis, sem criar conta e sem deixar o seu e-mail.",
  alternates: { canonical: `${MARKETING_SITE_URL}/calculadora-cancelamento` },
};

export default function CalculadoraCancelamentoPage() {
  return (
    <>
      <AnalyticsScripts />
      <PaginaV2 eventoCtaNavbar="click_nav_reclamacao">
        <CalculadoraV2 />
      </PaginaV2>
    </>
  );
}
