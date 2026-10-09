import type { Metadata } from "next";
import { PrecarioV2 } from "@/components/precario-v2/PrecarioV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { metadadosPublicos } from "@/i18n/metadados";
import { tPaginas } from "@/i18n/mensagens/paginas";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";

// Preçário no Design System V2. Os links antigos "/#precario" chegam aqui
// pela homepage (HomepageV2 redireciona o fragmento).
export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tPaginas[idioma].precario.metadados;
  return metadadosPublicos(idioma, "/precario", { title: t.titulo, description: t.descricao });
}

export default async function PrecarioPage({ params }: ComIdioma) {
  await idiomaDaPagina(params);
  return (
    <PaginaV2 eventoCtaNavbar="click_precario_v2_nav">
      <PrecarioV2 />
    </PaginaV2>
  );
}
