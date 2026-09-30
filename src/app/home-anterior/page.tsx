import type { Metadata } from "next";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { Landing } from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "A sua reclamação, feita bem - DoLado",
  description:
    "A DoLado prepara a sua reclamação formal com a legislação aplicável, mostra-lhe o texto antes do envio e, só com a sua autorização, submete-a ao Livro de Reclamações — e acompanha o caso até à resposta.",
};

export default function HomeAnteriorPage() {
  return (
    <>
      <AnalyticsScripts />
      <Landing />
    </>
  );
}
