import type { Metadata } from "next";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { PrecarioV2 } from "@/components/precario-v2/PrecarioV2";

// Preçário no Design System V2. Enquanto a homepage "/" não migrar para o V2,
// só é ligada a partir das páginas V2 e não é indexada (o preçário público
// continua em /#precario, com os mesmos planos e o mesmo fluxo de compra).
export const metadata: Metadata = {
  title: "Preçário - DoLado",
  description:
    "Avulso, Caso + Proteção ou Proteção: escolha a ajuda de que precisa para tratar um problema com uma empresa ou continuar protegido. Preços com IVA incluído.",
  robots: { index: false, follow: false },
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
