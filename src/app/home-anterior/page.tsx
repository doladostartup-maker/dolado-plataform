import type { Metadata } from "next";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { Landing } from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "A sua reclamação, feita bem - DoLado",
  description:
    "A DoLado escreve a sua reclamação formal com base legal — envie-a você mesmo ou autorize a submissão ao Livro de Reclamações — e acompanha o caso até à resposta.",
};

export default function HomeAnteriorPage() {
  return (
    <>
      <AnalyticsScripts />
      <Landing />
    </>
  );
}
