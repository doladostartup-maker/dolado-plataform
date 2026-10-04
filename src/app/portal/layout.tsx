import { requireUser } from "@/lib/auth";
import { Logotipo } from "@/components/marketing-v2/Logotipo";
import { fonteV2 } from "@/components/marketing-v2/fonte";
import { MenuMovel } from "./_components/MenuMovel";
import { NavegacaoPortal } from "./_components/NavegacaoPortal";

// Portal do cliente no Design System V2 (.tema-portal em globals.css): a
// mesma marca, fonte e tokens das páginas públicas, com uma moldura de
// aplicação — barra lateral no computador, cabeçalho com menu no telemóvel.

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className={`tema-portal ${fonteV2.className} min-h-screen bg-[#F7F9FC] text-[var(--v2-navy)] antialiased md:flex`}>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-[10px] bg-white px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar para o conteúdo
      </a>

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--v2-line)] bg-white px-4 md:hidden">
        <Logotipo />
        <MenuMovel>
          <NavegacaoPortal />
        </MenuMovel>
      </header>

      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col overflow-y-auto border-r border-[var(--v2-line)] bg-white px-4 py-6 md:flex">
        <div className="mb-8 px-2">
          <Logotipo />
        </div>
        <NavegacaoPortal />
      </aside>

      <main id="conteudo" className="min-w-0 flex-1 px-4 pb-16 pt-6 sm:px-6 md:px-10 md:pt-10">
        <div className="mx-auto max-w-[1040px]">{children}</div>
      </main>
    </div>
  );
}
