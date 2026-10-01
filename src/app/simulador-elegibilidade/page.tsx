import type { Metadata } from "next";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { SimuladorElegibilidadePublico } from "@/components/landing/SimuladorElegibilidadePublico";
import { MARKETING_SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Simulador de Elegibilidade - DoLado",
  description:
    "Veja se a DoLado pode ajudar com o seu caso de telecomunicações, energia ou água. 4 perguntas, grátis, sem criar conta e sem deixar o seu e-mail.",
  alternates: { canonical: `${MARKETING_SITE_URL}/simulador-elegibilidade` },
};

export default function SimuladorElegibilidadePage() {
  return (
    <>
      <AnalyticsScripts />
      <SimuladorElegibilidadePublico />
    </>
  );
}
