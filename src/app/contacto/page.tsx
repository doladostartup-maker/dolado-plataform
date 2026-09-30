import type { Metadata } from "next";
import { Contacto } from "@/components/landing/Contacto";

export const metadata: Metadata = {
  title: "Contacto - DoLado",
  description:
    "Fale connosco para imprensa, parcerias ou dúvidas gerais. Para abrir um caso, use o formulário \"Começar reclamação\".",
};

export default function ContactoPage() {
  return <Contacto />;
}
