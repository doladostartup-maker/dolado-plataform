import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { LandingV2 } from "@/components/landing-v2/LandingV2";

// Página de teste de uma possível nova homepage. Não substitui "/", não
// está no menu, no rodapé nem em links públicos, e não é indexada.
export const metadata: Metadata = {
  title: "DoLado — página de teste",
  description: "Versão de teste da homepage da DoLado.",
  robots: { index: false, follow: false },
};

// Fonte só desta página (alojada pelo next/font no próprio site).
const fonte = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export default function LandingV2Page() {
  return (
    <>
      <AnalyticsScripts />
      <LandingV2 classeFonte={fonte.className} />
    </>
  );
}
