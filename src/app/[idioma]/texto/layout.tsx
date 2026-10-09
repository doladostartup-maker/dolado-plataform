import type { Metadata } from "next";
import { Logotipo } from "@/components/marketing-v2/Logotipo";
import { fonteV2 } from "@/components/marketing-v2/fonte";
import { SeletorIdioma } from "@/components/idioma/SeletorIdioma";
import { tTexto } from "@/i18n/mensagens/texto";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";

// Páginas públicas de revisão do texto (acesso pelo link do e-mail, sem
// login): nunca indexadas e sem Referer para fora (o link é pessoal).
// Mesmo aspeto do portal (Design System V2, .tema-portal).
export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  return {
    title: tTexto[await idiomaDaPagina(params)].metadados,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function TextoLayout({ children, params }: { children: React.ReactNode } & ComIdioma) {
  await idiomaDaPagina(params);
  return (
    <div className={`tema-portal ${fonteV2.className} flex min-h-screen flex-col bg-[#F7F9FC] text-[var(--v2-navy)] antialiased`}>
      <header className="border-b border-[var(--v2-line)] bg-white">
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center justify-between gap-3 px-4">
          <Logotipo />
          <SeletorIdioma compacto />
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8">{children}</main>
    </div>
  );
}
