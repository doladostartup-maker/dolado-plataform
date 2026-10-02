import type { Metadata } from "next";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { CalculadoraCancelamentoPublica } from "@/components/landing/CalculadoraCancelamentoPublica";
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
      <CalculadoraCancelamentoPublica />
    </>
  );
}
