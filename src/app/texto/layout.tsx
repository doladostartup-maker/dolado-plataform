import Image from "next/image";
import type { Metadata } from "next";
import { MARKETING_SITE_URL } from "@/lib/site";

// Páginas públicas de revisão do texto (acesso pelo link do e-mail, sem
// login): nunca indexadas e sem Referer para fora (o link é pessoal).
export const metadata: Metadata = {
  title: "Revisão do texto — DoLado",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function TextoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-4 py-6">
        <a href={MARKETING_SITE_URL} aria-label="Página inicial DoLado" className="inline-flex">
          <Image src="/brand/dolado-logo-horizontal.svg" alt="DoLado" width={110} height={26} priority />
        </a>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16">{children}</main>
    </div>
  );
}
