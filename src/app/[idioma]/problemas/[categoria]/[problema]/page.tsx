import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { PaginaProblema } from "@/components/problemas/PaginaProblema";
import { metadadosPublicos } from "@/i18n/metadados";
import { tProblemas } from "@/i18n/mensagens/problemas";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { caminhoProblema, categoriasComPagina, obterProblema } from "@/lib/problemas/catalogo";

// /problemas/<categoria>/<problema> — uma página por problema do catálogo;
// qualquer outro slug dá 404 (dynamicParams = false).

export const dynamicParams = false;

export function generateStaticParams({ params }: { params: { categoria: string } }) {
  const c = categoriasComPagina().find((x) => x.slug === params.categoria);
  return (c?.problemas ?? []).map((p) => ({ problema: p.slug }));
}

type Params = ComIdioma<{ categoria: string; problema: string }>;

function textoDaPagina(idioma: keyof typeof tProblemas, categoria: string, problema: string) {
  const paginas = tProblemas[idioma].paginas as Record<string, Record<string, { metadados: { titulo: string; descricao: string } }>>;
  return paginas[categoria]?.[problema];
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const { categoria, problema } = await params;
  const r = obterProblema(categoria, problema);
  const t = r && textoDaPagina(idioma, categoria, problema);
  if (!r || !t) return {};
  return metadadosPublicos(idioma, caminhoProblema(categoria, problema), { title: t.metadados.titulo, description: t.metadados.descricao });
}

export default async function ProblemaPage({ params }: Params) {
  const idioma = await idiomaDaPagina(params);
  const { categoria, problema } = await params;
  const r = obterProblema(categoria, problema);
  if (!r || !textoDaPagina(idioma, categoria, problema)) notFound();
  return (
    <PaginaV2 eventoCtaNavbar="problemas_clique_tratar_caso" parametrosCtaNavbar={{ categoria, problema, local: "cabecalho" }}>
      <PaginaProblema idioma={idioma} categoria={r.categoria} problema={r.problema} />
    </PaginaV2>
  );
}
