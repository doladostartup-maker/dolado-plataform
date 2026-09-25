import type { Metadata } from "next";
import { SimuladorElegibilidadePublico } from "@/components/landing/SimuladorElegibilidadePublico";

export const metadata: Metadata = {
  title: "Simulador de Elegibilidade - DoLado",
  description:
    "Verifique grátis, sem criar conta, se o seu caso de telecomunicações, energia ou água parece ter fundamento para reclamação.",
};

export default function SimuladorElegibilidadePage() {
  return <SimuladorElegibilidadePublico />;
}
