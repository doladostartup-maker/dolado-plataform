import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { tLegal } from "@/i18n/mensagens/legal";
import { rico } from "@/i18n/Rico";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { CONTACTO_EMAIL } from "@/lib/site";

// Páginas legais (Termos, Privacidade, Livre resolução, Resolução de
// litígios) com a moldura do Design System V2: navbar, rodapé (com o Livro
// de Reclamações e as restantes ligações legais) e tipografia. O texto não
// muda: as versões publicadas não se editam e usam os tokens antigos, que
// .documento-legal (globals.css) aponta para as cores V2.
//
// Idioma: o texto jurídico só existe em português (versão vinculativa). Em
// /en, a moldura é inglesa, o documento fica marcado como lang="pt-PT" e um
// aviso explica que a versão portuguesa é a que vale.
export default async function LegalLayout({ children, params }: { children: React.ReactNode } & ComIdioma) {
  const idioma = await idiomaDaPagina(params);
  const aviso = tLegal[idioma].avisoSoPortugues;
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_reclamacao">
      <div className="documento-legal mx-auto w-full max-w-[760px] px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        {aviso && (
          <p
            role="note"
            className="mb-6 rounded-[12px] border-l-[3px] border-[var(--v2-aviso)] bg-[var(--v2-aviso-bg)] px-4 py-3 text-[14.5px] leading-relaxed text-[var(--v2-navy)]"
          >
            {rico(aviso, {
              email: () => (
                <a href={`mailto:${CONTACTO_EMAIL}`} className="font-semibold underline">
                  {CONTACTO_EMAIL}
                </a>
              ),
            })}
          </p>
        )}
        <div lang={idioma === "pt-PT" ? undefined : "pt-PT"}>{children}</div>
      </div>
    </PaginaV2>
  );
}
