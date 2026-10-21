import type { ReactNode } from "react";
import { SeletorIdioma } from "@/components/idioma/SeletorIdioma";
import { Logotipo } from "@/components/marketing-v2/Logotipo";
import { fonteV2 } from "@/components/marketing-v2/fonte";
import { CARTAO, TEXTO_SECUNDARIO, TITULO_PAGINA } from "@/components/portal/ui";

/** Moldura das páginas abertas a partir das ligações dos e-mails (sem sessão). */
export function MolduraLigacao({ titulo, texto, children }: { titulo: string; texto: string; children: ReactNode }) {
  return (
    <div className={`tema-portal ${fonteV2.className} flex min-h-screen flex-col bg-[#F7F9FC] text-[var(--v2-navy)] antialiased`}>
      <header className="border-b border-[var(--v2-line)] bg-white">
        <div className="mx-auto flex h-16 w-full max-w-md items-center justify-between gap-3 px-4">
          <Logotipo />
          <SeletorIdioma compacto />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className={`${CARTAO} flex flex-col gap-5`}>
          <h1 className={TITULO_PAGINA}>{titulo}</h1>
          <p className={TEXTO_SECUNDARIO}>{texto}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
