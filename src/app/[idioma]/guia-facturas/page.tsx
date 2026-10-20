import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CabecalhoGuiaFacturas, GuiaFacturas } from "@/components/guia-facturas/GuiaFacturas";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { localizarHref } from "@/i18n/config";
import { metadadosPublicos } from "@/i18n/metadados";
import { tGuiaFacturas } from "@/i18n/mensagens/guiaFacturas";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { PARTILHA_GUIA_FACTURAS, guiaFacturasAtivo } from "@/lib/guiaFacturas";

// /guia-facturas — página do e-book gratuito (22/10/2026), destino das
// publicações e anúncios no Instagram e no Facebook. Indexável (canonical e
// hreflang como as outras páginas públicas); a confirmação do download é um
// estado da mesma página, sem URL próprio, por isso nunca é indexada.
// Cabeçalho simplificado (uma só acção); rodapé V2 com os documentos legais.
// Com a página desligada (GUIA_FACTURAS_ATIVO, lido no build), um link antigo
// leva às ferramentas gratuitas.
const IMAGEM_PARTILHA = `https://dolado.pt${PARTILHA_GUIA_FACTURAS}`;

export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tGuiaFacturas[idioma].metadados;
  const base = metadadosPublicos(idioma, "/guia-facturas", { title: t.titulo, description: t.descricao });
  return {
    ...base,
    openGraph: { ...base.openGraph, images: [{ url: IMAGEM_PARTILHA, width: 1200, height: 630, alt: t.titulo }] },
    twitter: { card: "summary_large_image", title: t.titulo, description: t.descricao, images: [IMAGEM_PARTILHA] },
  };
}

export default async function GuiaFacturasPage({ params }: ComIdioma) {
  const idioma = await idiomaDaPagina(params);
  if (!guiaFacturasAtivo()) redirect(localizarHref(idioma, "/ferramentas-gratuitas"));
  return (
    <PaginaV2 eventoCtaNavbar="guia_nav" cabecalho={<CabecalhoGuiaFacturas />}>
      <GuiaFacturas />
    </PaginaV2>
  );
}
