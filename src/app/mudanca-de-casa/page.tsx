import type { Metadata } from "next";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { MudancaDeCasaV2 } from "@/components/mudanca-casa-v2/MudancaDeCasaV2";
import { MARKETING_SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mudança de casa: o que precisa de tratar - DoLado",
  description:
    "Guia gratuito para mudar de casa: telecomunicações, eletricidade, gás e água. O que preparar, o que guardar, o que é o CPE e o CUI e o que verificar na última fatura.",
  alternates: { canonical: `${MARKETING_SITE_URL}/mudanca-de-casa` },
};

export default function MudancaDeCasaPage() {
  return (
    <>
      <AnalyticsScripts />
      <PaginaV2 eventoCtaNavbar="mudanca_casa_clique_tratar_caso" parametrosCtaNavbar={{ local: "cabecalho" }}>
        <MudancaDeCasaV2 />
      </PaginaV2>
    </>
  );
}
