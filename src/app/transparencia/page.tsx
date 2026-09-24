import type { Metadata } from "next";
import { Transparencia } from "@/components/landing/Transparencia";

export const metadata: Metadata = {
  title: "Transparência - DoLado",
  description:
    "O que a DoLado faz por si e o que não faz, sem letras miúdas: identificamos a lei aplicável, escrevemos a carta e acompanhamos o prazo — nunca damos aconselhamento jurídico individualizado nem representamos em tribunal.",
};

export default function TransparenciaPage() {
  return <Transparencia />;
}
