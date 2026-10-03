import type { Metadata } from "next";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { Homepage } from "@/components/landing/Homepage";

export const metadata: Metadata = {
  title: "A sua reclamação, feita bem - DoLado",
  description:
    "A DoLado ajuda a tratar problemas com empresas: prepara a reclamação com a legislação aplicável, só a envia com a sua autorização e acompanha o processo. Com a Proteção, ajuda também a identificar alterações que possam tornar-se num problema.",
};

export default function LandingPage() {
  return (
    <>
      <AnalyticsScripts />
      <Homepage />
    </>
  );
}
