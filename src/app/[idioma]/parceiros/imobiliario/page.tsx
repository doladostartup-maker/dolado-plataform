import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { ImobiliarioV2 } from "@/components/parceiros-v2/ImobiliarioV2";
import { localizarHref } from "@/i18n/config";
import { metadadosPublicos } from "@/i18n/metadados";
import { tParceiros } from "@/i18n/mensagens/parceiros";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { parceirosAtivos } from "@/lib/parceiros/regras";

// /parceiros/imobiliario — Parceiro de Indicação para o sector imobiliário
// (21/10/2026). Como /parceiros: só com PARCEIROS_ATIVO (lido no build);
// desligado, leva a /empresas. Indexável; a candidatura é a de /parceiros.
export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tParceiros[idioma].imobiliario.metadados;
  return metadadosPublicos(idioma, "/parceiros/imobiliario", { title: t.titulo, description: t.descricao });
}

export default async function ParceirosImobiliarioPage({ params }: ComIdioma) {
  const idioma = await idiomaDaPagina(params);
  if (!parceirosAtivos()) redirect(localizarHref(idioma, "/empresas"));
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_parceiros_imobiliario">
      <ImobiliarioV2 />
    </PaginaV2>
  );
}
