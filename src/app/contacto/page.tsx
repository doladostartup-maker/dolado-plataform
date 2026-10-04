import type { Metadata } from "next";
import { ContactoV2 } from "@/components/contacto-v2/ContactoV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";

export const metadata: Metadata = {
  title: "Contacto - DoLado",
  description:
    "Fale connosco para imprensa, parcerias ou dúvidas gerais. Para abrir um caso, use \"Tratar o meu caso\".",
};

export default function ContactoPage() {
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_contacto">
      <ContactoV2 />
    </PaginaV2>
  );
}
