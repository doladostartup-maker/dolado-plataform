import type { Metadata } from "next";
import { CalculadoraV2 } from "@/components/calculadora-v2/CalculadoraV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { metadadosPublicos } from "@/i18n/metadados";
import { tCalculadora } from "@/i18n/mensagens/calculadora";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";

export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tCalculadora[idioma].metadados;
  return metadadosPublicos(idioma, "/calculadora-cancelamento", { title: t.titulo, description: t.descricao });
}

export default async function CalculadoraCancelamentoPage({ params }: ComIdioma) {
  await idiomaDaPagina(params);
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_reclamacao">
      <CalculadoraV2 />
    </PaginaV2>
  );
}
