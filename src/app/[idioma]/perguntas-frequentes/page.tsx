import type { Metadata } from "next";
import { AjudaV2 } from "@/components/ajuda-v2/AjudaV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { metadadosPublicos } from "@/i18n/metadados";
import { tPaginas } from "@/i18n/mensagens/paginas";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";

export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tPaginas[idioma].ajuda.metadados;
  return metadadosPublicos(idioma, "/perguntas-frequentes", { title: t.titulo, description: t.descricao });
}

export default async function PerguntasFrequentesPage({ params }: ComIdioma) {
  await idiomaDaPagina(params);
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_perguntas_frequentes">
      <AjudaV2 />
    </PaginaV2>
  );
}
