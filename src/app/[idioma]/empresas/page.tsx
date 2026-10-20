import type { Metadata } from "next";
import { EmpresasV2 } from "@/components/empresas-v2/EmpresasV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { metadadosPublicos } from "@/i18n/metadados";
import { tInstitucional } from "@/i18n/mensagens/institucional";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";

export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tInstitucional[idioma].empresas.metadados;
  return metadadosPublicos(idioma, "/empresas", { title: t.titulo, description: t.descricao });
}

export default async function EmpresasPage({ params }: ComIdioma) {
  await idiomaDaPagina(params);
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_empresas">
      <EmpresasV2 />
    </PaginaV2>
  );
}
