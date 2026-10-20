import type { Metadata } from "next";
import { TransparenciaV2 } from "@/components/transparencia-v2/TransparenciaV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { metadadosPublicos } from "@/i18n/metadados";
import { tInstitucional } from "@/i18n/mensagens/institucional";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";

export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tInstitucional[idioma].transparencia.metadados;
  return metadadosPublicos(idioma, "/transparencia", { title: t.titulo, description: t.descricao });
}

export default async function TransparenciaPage({ params }: ComIdioma) {
  await idiomaDaPagina(params);
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_transparencia">
      <TransparenciaV2 />
    </PaginaV2>
  );
}
