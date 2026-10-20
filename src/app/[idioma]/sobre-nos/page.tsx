import type { Metadata } from "next";
import { SobreNosV2 } from "@/components/sobre-nos-v2/SobreNosV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { metadadosPublicos } from "@/i18n/metadados";
import { tInstitucional } from "@/i18n/mensagens/institucional";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";

export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tInstitucional[idioma].sobreNos.metadados;
  return metadadosPublicos(idioma, "/sobre-nos", { title: t.titulo, description: t.descricao });
}

export default async function SobreNosPage({ params }: ComIdioma) {
  await idiomaDaPagina(params);
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_sobre_nos">
      <SobreNosV2 />
    </PaginaV2>
  );
}
