import type { Metadata } from "next";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { LandingV2 } from "@/components/landing/LandingV2";

// Página de teste de uma possível nova homepage. Não substitui "/", não
// está no menu, no rodapé nem em links públicos, e não é indexada.
export const metadata: Metadata = {
  title: "DoLado — página de teste",
  description: "Versão de teste da homepage da DoLado.",
  robots: { index: false, follow: false },
};

export default function LandingV2Page() {
  return (
    <>
      <AnalyticsScripts />
      <LandingV2 />
    </>
  );
}
