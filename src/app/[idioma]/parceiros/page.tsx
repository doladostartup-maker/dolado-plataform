import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { ParceirosV2 } from "@/components/parceiros-v2/ParceirosV2";
import { localizarHref } from "@/i18n/config";
import { metadadosPublicos } from "@/i18n/metadados";
import { tParceiros } from "@/i18n/mensagens/parceiros";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { parceirosAtivos } from "@/lib/parceiros/regras";

// /parceiros — Programa de Parceiros (Fase 1, ligado em produção a
// 20/10/2026 com PARCEIROS_ATIVO, lido no build). Indexável desde 20/10/2026
// (decisão de Thiago): no sitemap e no rodapé (só com o programa ligado), fora
// do menu. Com o programa desligado leva a /empresas.
export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tParceiros[idioma].pagina.metadados;
  return metadadosPublicos(idioma, "/parceiros", { title: t.titulo, description: t.descricao });
}

export default async function ParceirosPage({ params }: ComIdioma) {
  const idioma = await idiomaDaPagina(params);
  if (!parceirosAtivos()) redirect(localizarHref(idioma, "/empresas"));
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_parceiros">
      <ParceirosV2 />
    </PaginaV2>
  );
}
