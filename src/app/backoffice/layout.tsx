import Image from "next/image";
import { DocumentoRaiz } from "../DocumentoRaiz";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { fonteV2 } from "@/components/marketing-v2/fonte";
import { MenuMovel } from "@/components/navegacao/MenuMovel";
import { NavegacaoBackoffice, type ContagensNavegacao } from "@/components/backoffice/Navegacao";
import { casosEmCurso, contagensFilas } from "@/lib/backoffice/filas";
import { proximaAcao } from "@/lib/backoffice/triagem";

// Metadata por omissão que vinha do antigo layout raiz (src/app/layout.tsx).
export const metadata = {
  title: "DoLado",
  description:
    "A DoLado é uma plataforma criada para ajudar os consumidores a resolver problemas e a evitar prejuízos relacionados com serviços essenciais, como telecomunicações, energia e água.",
  icons: { icon: "/brand/dolado-logo-icon.svg" },
};

// Backoffice no Design System V2 (.tema-backoffice em globals.css): a marca
// da DoLado numa ferramenta de trabalho — barra lateral com as filas e as
// contagens do que precisa de intervenção, conteúdo largo e denso.

function Marca() {
  return (
    <Link href="/backoffice" prefetch={false} className="flex items-center gap-2" aria-label="DoLado — backoffice, início">
      <Image src="/brand/dolado-logo-icon.svg" alt="" width={28} height={28} />
      <span className="text-[18px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">DoLado</span>
      <span className="rounded-[6px] bg-[var(--v2-surface)] px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--v2-muted)]">
        Backoffice
      </span>
    </Link>
  );
}

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  const [casos, filas] = await Promise.all([casosEmCurso(), contagensFilas()]);

  const contagens: ContagensNavegacao = {
    acao: casos.filter((c) => proximaAcao(c).interna).length,
    documentos: filas.documentosMonitor,
    achados: filas.achados,
    compras: filas.compras,
    conversoes: filas.conversoes,
    naoAssociadas: filas.naoAssociadas,
  };
  const navegacao = <NavegacaoBackoffice contagens={contagens} email={user.email} />;

  // Layout raiz próprio (sempre em português): o backoffice não tem idioma.
  return (
    <DocumentoRaiz lang="pt-PT">
    <div className={`tema-backoffice ${fonteV2.className} min-h-screen bg-[#F7F9FC] text-[var(--v2-navy)] antialiased lg:flex`}>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-[10px] bg-white px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar para o conteúdo
      </a>

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--v2-line)] bg-white px-4 lg:hidden">
        <Marca />
        <MenuMovel>{navegacao}</MenuMovel>
      </header>

      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col overflow-y-auto border-r border-[var(--v2-line)] bg-white px-3 py-5 lg:flex">
        <div className="mb-6 px-2">
          <Marca />
        </div>
        {navegacao}
      </aside>

      <main id="conteudo" className="min-w-0 flex-1 px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pt-7">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
    </DocumentoRaiz>
  );
}
