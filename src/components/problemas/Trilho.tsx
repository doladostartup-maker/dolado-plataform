import Link from "@/i18n/Link";
import type { Idioma } from "@/i18n/config";
import { urlPublico } from "@/i18n/metadados";

// Trilho de navegação (breadcrumbs) visível + BreadcrumbList em JSON-LD com os
// mesmos nomes e os URLs canónicos de dolado.pt no idioma da página. O último
// elemento é a página atual (aria-current, sem ligação).

export type ElementoTrilho = { nome: string; caminho: string };

export function Trilho({ idioma, elementos, rotulo }: { idioma: Idioma; elementos: ElementoTrilho[]; rotulo: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: elementos.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: e.nome,
      item: urlPublico(idioma, e.caminho),
    })),
  };
  return (
    <nav aria-label={rotulo} className="mb-6">
      {/* JSON.stringify não escapa "<": os textos são nossos, mas evita-se fechar o <script>. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-[var(--v2-muted)]">
        {elementos.map((e, i) => {
          const ultimo = i === elementos.length - 1;
          return (
            <li key={e.caminho} className="flex items-center gap-2">
              {ultimo ? (
                <span aria-current="page" className="font-medium text-[var(--v2-navy)]">
                  {e.nome}
                </span>
              ) : (
                <>
                  <Link prefetch={false} href={e.caminho} className="inline-flex min-h-8 items-center underline-offset-4 hover:text-[var(--v2-green)] hover:underline">
                    {e.nome}
                  </Link>
                  <span aria-hidden="true">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
