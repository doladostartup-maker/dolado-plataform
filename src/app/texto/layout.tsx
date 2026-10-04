import type { Metadata } from "next";
import { Logotipo } from "@/components/marketing-v2/Logotipo";
import { fonteV2 } from "@/components/marketing-v2/fonte";

// Páginas públicas de revisão do texto (acesso pelo link do e-mail, sem
// login): nunca indexadas e sem Referer para fora (o link é pessoal).
// Mesmo aspeto do portal (Design System V2, .tema-portal).
export const metadata: Metadata = {
  title: "Revisão do texto — DoLado",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function TextoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`tema-portal ${fonteV2.className} flex min-h-screen flex-col bg-[#F7F9FC] text-[var(--v2-navy)] antialiased`}>
      <header className="border-b border-[var(--v2-line)] bg-white">
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center px-4">
          <Logotipo />
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8">{children}</main>
    </div>
  );
}
