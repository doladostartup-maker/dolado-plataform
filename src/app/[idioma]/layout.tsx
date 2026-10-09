import type { Metadata } from "next";
import { DocumentoRaiz } from "../DocumentoRaiz";
import { IDIOMAS, LANG_HTML, SEGMENTO } from "@/i18n/config";
import { ProvedorIdioma } from "@/i18n/cliente";
import { tComum } from "@/i18n/mensagens/comum";
import { idiomaDaPagina } from "@/i18n/servidor";

// Layout raiz de todas as páginas do cliente (site público, conta, "Tratar o
// meu caso", revisão do texto e portal), num só conjunto de páginas para os
// dois idiomas. O segmento [idioma] é interno: português sem prefixo no URL
// (o middleware reescreve para /pt), inglês em /en. O backoffice tem o seu
// próprio layout raiz, sempre em português.

export const dynamicParams = false;

export function generateStaticParams() {
  return IDIOMAS.map((i) => ({ idioma: SEGMENTO[i] }));
}

export async function generateMetadata({ params }: { params: Promise<{ idioma: string }> }): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tComum[idioma].metadados;
  return {
    title: t.titulo,
    description: t.descricao,
    icons: { icon: "/brand/dolado-logo-icon.svg" },
  };
}

export default async function LayoutIdioma({ children, params }: { children: React.ReactNode; params: Promise<{ idioma: string }> }) {
  const idioma = await idiomaDaPagina(params);
  return (
    <DocumentoRaiz lang={LANG_HTML[idioma]}>
      <ProvedorIdioma idioma={idioma}>{children}</ProvedorIdioma>
    </DocumentoRaiz>
  );
}
