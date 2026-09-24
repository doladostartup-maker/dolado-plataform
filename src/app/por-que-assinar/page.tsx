import type { Metadata } from "next";
import { PorQueAssinar } from "@/components/landing/PorQueAssinar";

export const metadata: Metadata = {
  title: "Por quê assinar - DoLado",
  description:
    "Saiba antes de a sua fidelização acabar e tenha a lei do seu lado quando precisar. Subscrever o alerta é grátis.",
};

export default function PorQueAssinarPage() {
  return <PorQueAssinar />;
}
