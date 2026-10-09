import type { Metadata } from "next";
import { ComoFuncionaV2 } from "@/components/como-funciona-v2/ComoFuncionaV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { metadadosPublicos } from "@/i18n/metadados";
import { tPaginas } from "@/i18n/mensagens/paginas";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";

export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tPaginas[idioma].comoFunciona.metadados;
  return metadadosPublicos(idioma, "/como-funciona", { title: t.titulo, description: t.descricao });
}

export default async function ComoFuncionaPage({ params }: ComIdioma) {
  await idiomaDaPagina(params);
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_como_funciona">
      <ComoFuncionaV2 />
    </PaginaV2>
  );
}
