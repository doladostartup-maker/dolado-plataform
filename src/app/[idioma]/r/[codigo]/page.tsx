import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { RegistarIndicacaoComConsentimento } from "@/components/indicacoes/RegistarIndicacaoComConsentimento";
import { localizarHref } from "@/i18n/config";
import { tIndicacoes } from "@/i18n/mensagens/indicacoes";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { MARKETING_SITE_URL } from "@/lib/site";
import { indicacoesAtivas, normalizarCodigo } from "@/lib/indicacoes/regras";

export async function generateMetadata({ params }: ComIdioma<{ codigo: string }>): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  return {
    title: tIndicacoes[idioma].pagina.titulo,
    robots: { index: false, follow: false },
  };
}

export default async function PaginaIndicacao({ params }: ComIdioma<{ codigo: string }>) {
  const idioma = await idiomaDaPagina(params);
  const codigo = normalizarCodigo((await params).codigo);
  if (!codigo || !indicacoesAtivas()) redirect(localizarHref(idioma, `${MARKETING_SITE_URL}/`));

  return (
    <PaginaV2 eventoCtaNavbar="click_nav_reclamacao">
      <RegistarIndicacaoComConsentimento codigo={codigo} />
    </PaginaV2>
  );
}
