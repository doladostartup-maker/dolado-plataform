import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { PaginaCategoria } from "@/components/problemas/PaginaCategoria";
import { metadadosPublicos } from "@/i18n/metadados";
import { tProblemas } from "@/i18n/mensagens/problemas";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { caminhoCategoria, categoriasComPagina, obterCategoria } from "@/lib/problemas/catalogo";

// /problemas/<categoria> — só as categorias com problemas publicados
// (catalogo.ts); qualquer outro slug dá 404 (dynamicParams = false).

export const dynamicParams = false;

export function generateStaticParams() {
  return categoriasComPagina().map((c) => ({ categoria: c.slug }));
}

type Params = ComIdioma<{ categoria: string }>;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const { categoria } = await params;
  const c = obterCategoria(categoria);
  if (!c) return {};
  const t = tProblemas[idioma].categorias[c.slug as keyof (typeof tProblemas)["pt-PT"]["categorias"]].metadados;
  return metadadosPublicos(idioma, caminhoCategoria(c.slug), { title: t.titulo, description: t.descricao });
}

export default async function CategoriaProblemasPage({ params }: Params) {
  const idioma = await idiomaDaPagina(params);
  const { categoria } = await params;
  const c = obterCategoria(categoria);
  if (!c) notFound();
  return (
    <PaginaV2 eventoCtaNavbar="problemas_clique_tratar_caso" parametrosCtaNavbar={{ categoria: c.slug, problema: "categoria", local: "cabecalho" }}>
      <PaginaCategoria idioma={idioma} categoria={c} />
    </PaginaV2>
  );
}
