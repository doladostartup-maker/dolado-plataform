import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AnalisarFatura, CabecalhoAnalisarFatura } from "@/components/analisar-fatura/AnalisarFatura";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { localizarHref } from "@/i18n/config";
import { metadadosPublicos } from "@/i18n/metadados";
import { tAnalisarFatura } from "@/i18n/mensagens/analisarFatura";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { CAMINHO_ANALISAR_FATURA } from "@/lib/analisarFatura";
import { diagnosticoAtivo } from "@/lib/diagnostico/regras";

// /analisar-fatura — destino das campanhas Meta Ads "Sabe mesmo o que está a
// pagar?" (22/10/2026). Como a landing anterior (/30-dias-gratis), não está
// no menu nem no sitemap e não é indexada (noindex, follow). Cabeçalho só com
// o logótipo e o idioma; o rodapé V2 mantém a identificação da DoLado e os
// documentos legais. Sem o diagnóstico gratuito (DIAGNOSTICO_GRATUITO_ATIVO,
// lido no build), a promessa do anúncio não existe: leva à página da Protecção.
export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tAnalisarFatura[idioma].metadados;
  return {
    ...metadadosPublicos(idioma, CAMINHO_ANALISAR_FATURA, { title: t.titulo, description: t.descricao }),
    robots: { index: false, follow: true },
  };
}

export default async function AnalisarFaturaPage({ params }: ComIdioma) {
  const idioma = await idiomaDaPagina(params);
  if (!diagnosticoAtivo()) redirect(localizarHref(idioma, "/protecao"));
  return (
    <PaginaV2 eventoCtaNavbar="analisar_fatura_nav" cabecalho={<CabecalhoAnalisarFatura />}>
      <AnalisarFatura />
    </PaginaV2>
  );
}
