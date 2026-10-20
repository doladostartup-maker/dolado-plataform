import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { SeletorIdioma } from "@/components/idioma/SeletorIdioma";
import { tConta } from "@/i18n/mensagens/conta";
import { tTratarCaso } from "@/i18n/mensagens/tratarCaso";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { LIVRO_RECLAMACOES_URL, ROTAS_LEGAIS } from "@/lib/legal";
import { MARKETING_SITE_URL } from "@/lib/site";
import { Logotipo } from "@/components/marketing-v2/Logotipo";
import { fonteV2 } from "@/components/marketing-v2/fonte";

export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const t = tTratarCaso[await idiomaDaPagina(params)].metadados;
  return { title: t.titulo, description: t.descricao };
}

export default async function TratarCasoLayout({ children, params }: { children: React.ReactNode } & ComIdioma) {
  const t = tConta[await idiomaDaPagina(params)].moldura;
  return (
    // Design System V2 (mesmo tema do portal: .tema-portal).
    <div className={`tema-portal ${fonteV2.className} flex min-h-screen flex-col bg-[#F7F9FC] text-[var(--v2-navy)] antialiased`}>
      <AnalyticsScripts />
      <header className="border-b border-[var(--v2-line)] bg-white">
        <div className="mx-auto flex h-16 max-w-[640px] items-center justify-between gap-3 px-4">
          <Logotipo />
          <SeletorIdioma compacto />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[640px] flex-1 px-4 py-8 sm:py-12">{children}</main>
      <footer className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-4 py-6 text-[13px] text-[var(--v2-muted)]">
        <Link prefetch={false} href={`${MARKETING_SITE_URL}${ROTAS_LEGAIS.termos}`} className="hover:text-[var(--v2-navy)]">
          {t.termos}
        </Link>
        <span aria-hidden>·</span>
        <Link prefetch={false} href={`${MARKETING_SITE_URL}${ROTAS_LEGAIS.privacidade}`} className="hover:text-[var(--v2-navy)]">
          {t.privacidade}
        </Link>
        <span aria-hidden>·</span>
        <Link prefetch={false} href={`${MARKETING_SITE_URL}${ROTAS_LEGAIS.livreResolucao}`} className="hover:text-[var(--v2-navy)]">
          {t.livreResolucao}
        </Link>
        <span aria-hidden>·</span>
        <a href={LIVRO_RECLAMACOES_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--v2-navy)]">
          {t.livroReclamacoes}
        </a>
      </footer>
    </div>
  );
}
