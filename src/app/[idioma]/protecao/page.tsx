import { ofertaProtecaoGratuitaPublica } from "@/lib/site";
import type { Metadata } from "next";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { ProtecaoV2 } from "@/components/protecao-v2/ProtecaoV2";
import { metadadosPublicos } from "@/i18n/metadados";
import { tPaginas } from "@/i18n/mensagens/paginas";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { diagnosticoAtivo } from "@/lib/diagnostico/regras";

// /protecao — página pública da Proteção como serviço autónomo (17/10/2026).
export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tPaginas[idioma].protecao.metadados;
  return metadadosPublicos(idioma, "/protecao", { title: t.titulo, description: t.descricao });
}

export default async function ProtecaoPage({ params }: ComIdioma) {
  await idiomaDaPagina(params);
  return (
    <PaginaV2 eventoCtaNavbar="click_protecao_nav">
      <ProtecaoV2 protecaoGratuita={ofertaProtecaoGratuitaPublica()} analise={diagnosticoAtivo()} />
    </PaginaV2>
  );
}
