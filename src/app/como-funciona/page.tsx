import type { Metadata } from "next";
import { ComoFunciona } from "@/components/landing/ComoFunciona";

export const metadata: Metadata = {
  title: "Como funciona - DoLado",
  description:
    "Do problema à reclamação enviada, passo a passo: veja como a DoLado prepara a reclamação com a legislação aplicável, pede a sua autorização antes do envio e acompanha o prazo de resposta até ao desfecho.",
};

export default function ComoFuncionaPage() {
  return <ComoFunciona />;
}
