import type { Metadata } from "next";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { Homepage } from "@/components/landing/Homepage";

export const metadata: Metadata = {
  title: "A sua reclamação, feita bem - DoLado",
  description:
    "A DoLado acompanha as suas faturas, as datas importantes dos seus contratos e as alterações relevantes e, quando surge um problema, prepara a reclamação com a legislação aplicável e só a envia com a sua autorização.",
};

export default function LandingPage() {
  return (
    <>
      <AnalyticsScripts />
      <Homepage />
    </>
  );
}
