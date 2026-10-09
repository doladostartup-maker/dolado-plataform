import type { Metadata } from "next";
import { metadadosLegais } from "@/i18n/metadados";
import { tLegal } from "@/i18n/mensagens/legal";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { TERMOS_VERSAO } from "@/lib/legal";
import { VERSOES_TERMOS } from "./_versoes";

export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  return metadadosLegais(idioma, "/termos", { title: tLegal[idioma].titulos.termos });
}

/** Versão em vigor (TERMOS_VERSAO). As anteriores estão em /termos/<versão>. */
export default async function TermosPage({ params }: ComIdioma) {
  await idiomaDaPagina(params);
  const Termos = VERSOES_TERMOS[TERMOS_VERSAO];
  return <Termos />;
}
