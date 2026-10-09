import type { Metadata } from "next";
import { MudancaDeCasaV2 } from "@/components/mudanca-casa-v2/MudancaDeCasaV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { metadadosPublicos } from "@/i18n/metadados";
import { tMudanca } from "@/i18n/mensagens/mudanca";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";

export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tMudanca[idioma].metadados;
  return metadadosPublicos(idioma, "/mudanca-de-casa", { title: t.titulo, description: t.descricao });
}

export default async function MudancaDeCasaPage({ params }: ComIdioma) {
  await idiomaDaPagina(params);
  return (
    <PaginaV2 eventoCtaNavbar="mudanca_casa_clique_tratar_caso" parametrosCtaNavbar={{ local: "cabecalho" }}>
      <MudancaDeCasaV2 />
    </PaginaV2>
  );
}
