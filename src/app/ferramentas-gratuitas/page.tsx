import type { Metadata } from "next";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { FerramentasV2 } from "@/components/ferramentas-v2/FerramentasV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { MARKETING_SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ferramentas gratuitas - DoLado",
  description:
    "Ferramentas gratuitas da DoLado, sem criar conta: estime o encargo de cancelar um contrato de telecomunicações, veja se a DoLado pode ajudar com o seu caso e prepare a mudança de casa.",
  alternates: { canonical: `${MARKETING_SITE_URL}/ferramentas-gratuitas` },
};

export default function FerramentasGratuitasPage() {
  return (
    <>
      <AnalyticsScripts />
      <PaginaV2 eventoCtaNavbar="click_nav_ferramentas">
        <FerramentasV2 />
      </PaginaV2>
    </>
  );
}
