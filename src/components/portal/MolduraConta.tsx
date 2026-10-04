import Link from "next/link";
import type { ReactNode } from "react";
import { Logotipo } from "@/components/marketing-v2/Logotipo";
import { fonteV2 } from "@/components/marketing-v2/fonte";
import { LIVRO_RECLAMACOES_URL, ROTAS_LEGAIS } from "@/lib/legal";
import { MARKETING_SITE_URL } from "@/lib/site";
import { CARTAO, EYEBROW, TEXTO_SECUNDARIO, TITULO_PAGINA } from "./ui";

// Moldura das páginas de conta (entrar, iniciar sessão, registo,
// confirmação do e-mail, criar conta depois do pagamento, associar compra):
// Design System V2 (.tema-portal), logótipo, cartão central e ligações legais.
// Só apresentação — formulários e ações ficam em cada página.

export function MolduraConta({
  contexto,
  titulo,
  descricao,
  children,
  depois,
}: {
  contexto?: ReactNode;
  titulo: ReactNode;
  descricao?: ReactNode;
  children?: ReactNode;
  /** Conteúdo abaixo do cartão (ligações secundárias). */
  depois?: ReactNode;
}) {
  return (
    <div className={`tema-portal ${fonteV2.className} flex min-h-screen flex-col bg-[#F7F9FC] text-[var(--v2-navy)] antialiased`}>
      <header className="border-b border-[var(--v2-line)] bg-white">
        <div className="mx-auto flex h-16 w-full max-w-md items-center px-4">
          <Logotipo />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 px-4 py-10">
        <div className={`${CARTAO} flex flex-col gap-5`}>
          <div className="flex flex-col gap-2">
            {contexto && <p className={EYEBROW}>{contexto}</p>}
            <h1 className={TITULO_PAGINA}>{titulo}</h1>
            {descricao && <div className={TEXTO_SECUNDARIO}>{descricao}</div>}
          </div>
          {children}
        </div>
        {depois && <div className={`${TEXTO_SECUNDARIO} px-1 text-center`}>{depois}</div>}
      </main>
      <footer className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-4 py-6 text-[13px] text-[var(--v2-muted)]">
        <Link href={`${MARKETING_SITE_URL}${ROTAS_LEGAIS.termos}`} prefetch={false} className="hover:text-[var(--v2-navy)]">
          Termos e Condições
        </Link>
        <span aria-hidden>·</span>
        <Link href={`${MARKETING_SITE_URL}${ROTAS_LEGAIS.privacidade}`} prefetch={false} className="hover:text-[var(--v2-navy)]">
          Política de Privacidade
        </Link>
        <span aria-hidden>·</span>
        <a href={LIVRO_RECLAMACOES_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--v2-navy)]">
          Livro de Reclamações
        </a>
      </footer>
    </div>
  );
}

/** Separador "ou" entre o formulário e o acesso com Google. */
export function SeparadorOu() {
  return (
    <div className="flex items-center gap-3 text-[13px] text-[var(--v2-muted)]">
      <span className="h-px flex-1 bg-[var(--v2-line)]" />
      ou
      <span className="h-px flex-1 bg-[var(--v2-line)]" />
    </div>
  );
}
