import type { Metadata } from "next";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { SimuladorV2 } from "@/components/simulador-v2/SimuladorV2";
import { MARKETING_SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Simulador de Elegibilidade - DoLado",
  description:
    "Veja se a DoLado pode ajudar com o seu caso de telecomunicações, energia ou água. 4 perguntas, grátis, sem criar conta e sem deixar o seu e-mail.",
  alternates: { canonical: `${MARKETING_SITE_URL}/simulador-elegibilidade` },
};

export default function SimuladorElegibilidadePage() {
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_reclamacao">
      <SimuladorV2 />
    </PaginaV2>
  );
}
