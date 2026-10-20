import type { Metadata } from "next";
import { metadadosLegais } from "@/i18n/metadados";
import { tLegal } from "@/i18n/mensagens/legal";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { PRIVACIDADE_VERSAO } from "@/lib/legal";
import { VERSOES_PRIVACIDADE } from "./_versoes";

export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  return metadadosLegais(idioma, "/privacidade", { title: tLegal[idioma].titulos.privacidade });
}

/** Versão em vigor (PRIVACIDADE_VERSAO). As anteriores estão em /privacidade/<versão>. */
export default async function PrivacidadePage({ params }: ComIdioma) {
  await idiomaDaPagina(params);
  const Politica = VERSOES_PRIVACIDADE[PRIVACIDADE_VERSAO];
  return <Politica />;
}
