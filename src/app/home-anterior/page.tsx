import type { Metadata } from "next";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { Landing } from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "A sua reclamação, feita bem - DoLado",
  description:
    "A DoLado escreve e envia a sua reclamação formal a qualquer empresa de telecomunicações, energia ou água — e acompanha o caso até à resposta.",
};

export default function HomeAnteriorPage() {
  return (
    <>
      <AnalyticsScripts />
      <Landing />
    </>
  );
}
