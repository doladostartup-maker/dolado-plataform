import Image from "next/image";
import Link from "next/link";
import { DocumentoRaiz } from "../../DocumentoRaiz";
import { fonteV2 } from "@/components/marketing-v2/fonte";

export const metadata = {
  title: "Segurança da conta — DoLado",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/dolado-logo-icon.svg" },
};

// Layout raiz próprio (sempre em português, como o backoffice): fica fora de
// src/app/backoffice para continuar acessível com a sessão aal1 quando o
// backoffice passar a exigir aal2 (Fase 1B).
export default function MfaLayout({ children }: { children: React.ReactNode }) {
  return (
    <DocumentoRaiz lang="pt-PT">
      <div className={`tema-backoffice ${fonteV2.className} min-h-screen bg-[#F7F9FC] text-[var(--v2-navy)] antialiased`}>
        <header className="flex h-16 items-center border-b border-[var(--v2-line)] bg-white px-4 sm:px-6">
          <Link href="/backoffice" prefetch={false} className="flex items-center gap-2" aria-label="DoLado — backoffice, início">
            <Image src="/brand/dolado-logo-icon.svg" alt="" width={28} height={28} />
            <span className="text-[18px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">DoLado</span>
          </Link>
        </header>
        <main className="mx-auto max-w-[720px] px-4 pb-16 pt-8 sm:px-6">{children}</main>
      </div>
    </DocumentoRaiz>
  );
}
