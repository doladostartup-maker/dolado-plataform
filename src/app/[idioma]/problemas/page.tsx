import type { Metadata } from "next";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { PaginaIndiceProblemas } from "@/components/problemas/PaginaIndiceProblemas";
import { metadadosPublicos } from "@/i18n/metadados";
import { tProblemas } from "@/i18n/mensagens/problemas";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { CAMINHO_PROBLEMAS } from "@/lib/problemas/catalogo";

// /problemas — página agregadora "Problemas que tratamos" (estrutura em
// src/lib/problemas/catalogo.ts, textos em src/i18n/mensagens/*/problemas.ts).

export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tProblemas[idioma].indice.metadados;
  return metadadosPublicos(idioma, CAMINHO_PROBLEMAS, { title: t.titulo, description: t.descricao });
}

export default async function ProblemasPage({ params }: ComIdioma) {
  const idioma = await idiomaDaPagina(params);
  return (
    <PaginaV2 eventoCtaNavbar="problemas_clique_tratar_caso" parametrosCtaNavbar={{ categoria: "todas", problema: "indice", local: "cabecalho" }}>
      <PaginaIndiceProblemas idioma={idioma} />
    </PaginaV2>
  );
}
