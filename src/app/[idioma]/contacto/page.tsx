import type { Metadata } from "next";
import { ContactoV2 } from "@/components/contacto-v2/ContactoV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { metadadosPublicos } from "@/i18n/metadados";
import { tInstitucional } from "@/i18n/mensagens/institucional";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";

export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tInstitucional[idioma].contacto.metadados;
  return metadadosPublicos(idioma, "/contacto", { title: t.titulo, description: t.descricao });
}

export default async function ContactoPage({ params }: ComIdioma) {
  await idiomaDaPagina(params);
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_contacto">
      <ContactoV2 />
    </PaginaV2>
  );
}
