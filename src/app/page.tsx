import type { Metadata } from "next";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { Homepage } from "@/components/landing/Homepage";

export const metadata: Metadata = {
  title: "A sua reclamação, feita bem - DoLado",
  description:
    "A DoLado escreve a sua reclamação formal com base legal — envie-a você mesmo ou autorize a submissão ao Livro de Reclamações — e acompanha o caso até à resposta.",
};

export default function LandingPage() {
  return (
    <>
      <AnalyticsScripts />
      <Homepage />
    </>
  );
}
