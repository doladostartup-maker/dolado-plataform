import type { Metadata } from "next";
import { FerramentasV2 } from "@/components/ferramentas-v2/FerramentasV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { metadadosPublicos } from "@/i18n/metadados";
import { tPaginas } from "@/i18n/mensagens/paginas";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";

export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tPaginas[idioma].ferramentas.metadados;
  return metadadosPublicos(idioma, "/ferramentas-gratuitas", { title: t.titulo, description: t.descricao });
}

export default async function FerramentasGratuitasPage({ params }: ComIdioma) {
  await idiomaDaPagina(params);
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_ferramentas">
      <FerramentasV2 />
    </PaginaV2>
  );
}
