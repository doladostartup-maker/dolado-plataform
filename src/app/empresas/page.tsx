import type { Metadata } from "next";
import { EmpresasV2 } from "@/components/empresas-v2/EmpresasV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";

export const metadata: Metadata = {
  title: "DoLado para empresas | DoLado",
  description:
    "Tem uma empresa? Fale com a DoLado sobre uma solução de apoio ao consumidor para colaboradores ou clientes: organizar o problema, preparar a reclamação e acompanhar os próximos passos.",
};

export default function EmpresasPage() {
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_empresas">
      <EmpresasV2 />
    </PaginaV2>
  );
}
