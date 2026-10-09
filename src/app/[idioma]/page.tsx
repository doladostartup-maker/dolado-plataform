import type { Metadata } from "next";
import { HomepageV2 } from "@/components/homepage-v2/HomepageV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { metadadosPublicos } from "@/i18n/metadados";
import { tInicio } from "@/i18n/mensagens/inicio";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";

export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tInicio[idioma].metadados;
  return metadadosPublicos(idioma, "/", { title: t.titulo, description: t.descricao });
}

export default async function LandingPage({ params }: ComIdioma) {
  await idiomaDaPagina(params);
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_reclamacao">
      <HomepageV2 />
    </PaginaV2>
  );
}
