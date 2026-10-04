import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";

// Páginas legais (Termos, Privacidade, Livre resolução, Resolução de
// litígios) com a moldura do Design System V2: navbar, rodapé (com o Livro
// de Reclamações e as restantes ligações legais) e tipografia. O texto não
// muda: as versões publicadas não se editam e usam os tokens antigos, que
// .documento-legal (globals.css) aponta para as cores V2.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_reclamacao">
      <div className="documento-legal mx-auto w-full max-w-[760px] px-5 pb-20 pt-10 sm:px-8 sm:pt-14">{children}</div>
    </PaginaV2>
  );
}
