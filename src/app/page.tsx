import type { Metadata } from "next";
import { HomepageV2 } from "@/components/homepage-v2/HomepageV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";

export const metadata: Metadata = {
  title: "A sua reclamação, feita bem - DoLado",
  description:
    "A DoLado ajuda a tratar problemas com empresas: prepara a reclamação com a legislação aplicável, só a envia com a sua autorização e acompanha o processo. Com a Proteção, ajuda também a identificar alterações que possam tornar-se num problema.",
};

export default function LandingPage() {
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_reclamacao">
      <HomepageV2 />
    </PaginaV2>
  );
}
