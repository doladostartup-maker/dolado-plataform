import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CabecalhoLanding30Dias, Landing30Dias } from "@/components/landing-30-dias/Landing30Dias";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { localizarHref } from "@/i18n/config";
import { metadadosPublicos } from "@/i18n/metadados";
import { tLanding30Dias } from "@/i18n/mensagens/landing30Dias";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { CAMINHO_LANDING_30_DIAS } from "@/lib/landing30Dias";
import { ofertaProtecaoGratuitaPublica } from "@/lib/site";

// /30-dias-gratis — landing das campanhas pagas (Facebook e Instagram) para a
// Protecção gratuita durante 30 dias (20/10/2026). Não está no menu nem no
// sitemap e não é indexada (noindex, follow): é o destino dos anúncios e não
// deve competir nos resultados com /protecao. Navegação simplificada; o
// rodapé V2 mantém a página inicial e os documentos legais à mão.
// Com a oferta desligada (PROTECAO_GRATUITA_ATIVA, lido no build), um
// anúncio antigo leva à página da Protecção em vez de prometer o que não há.
export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tLanding30Dias[idioma].metadados;
  return {
    ...metadadosPublicos(idioma, CAMINHO_LANDING_30_DIAS, { title: t.titulo, description: t.descricao }),
    robots: { index: false, follow: true },
  };
}

export default async function Landing30DiasPage({ params }: ComIdioma) {
  const idioma = await idiomaDaPagina(params);
  if (!ofertaProtecaoGratuitaPublica()) redirect(localizarHref(idioma, "/protecao"));
  return (
    <PaginaV2 eventoCtaNavbar="landing_30d_nav" cabecalho={<CabecalhoLanding30Dias />}>
      <Landing30Dias />
    </PaginaV2>
  );
}
