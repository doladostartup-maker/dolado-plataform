import type { Metadata } from "next";
import { SimuladorV2 } from "@/components/simulador-v2/SimuladorV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { metadadosPublicos } from "@/i18n/metadados";
import { tSimulador } from "@/i18n/mensagens/simulador";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";

export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tSimulador[idioma].metadados;
  return metadadosPublicos(idioma, "/simulador-elegibilidade", { title: t.titulo, description: t.descricao });
}

export default async function SimuladorElegibilidadePage({ params }: ComIdioma) {
  await idiomaDaPagina(params);
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_reclamacao">
      <SimuladorV2 />
    </PaginaV2>
  );
}
