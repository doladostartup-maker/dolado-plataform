import type { Metadata } from "next";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { PrecarioV2 } from "@/components/precario-v2/PrecarioV2";
import { MARKETING_SITE_URL } from "@/lib/site";

// Preçário no Design System V2. Os links antigos "/#precario" chegam aqui
// pela homepage (HomepageV2 redireciona o fragmento).
export const metadata: Metadata = {
  title: "Preçário - DoLado",
  description:
    "Avulso, Caso + Proteção ou Proteção: escolha a ajuda de que precisa para tratar um problema com uma empresa ou continuar protegido. Preços com IVA incluído.",
  alternates: { canonical: `${MARKETING_SITE_URL}/precario` },
};

export default function PrecarioPage() {
  return (
    <>
      <AnalyticsScripts />
      <PaginaV2 eventoCtaNavbar="click_precario_v2_nav">
        <PrecarioV2 />
      </PaginaV2>
    </>
  );
}
