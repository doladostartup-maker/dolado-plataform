import Link from "next/link";
import type { ReactNode } from "react";
import { Logotipo } from "@/components/marketing-v2/Logotipo";
import { fonteV2 } from "@/components/marketing-v2/fonte";
import { EYEBROW, TEXTO_SECUNDARIO, TITULO_PAGINA } from "@/components/portal/ui";
import { LIVRO_RECLAMACOES_URL, ROTAS_LEGAIS } from "@/lib/legal";
import { MARKETING_SITE_URL } from "@/lib/site";
import { terminarSessao } from "@/app/[idioma]/empresa/actions";
import { Aviso } from "@/components/portal/Aviso";
import { avisoDoEstado } from "@/lib/empresas/painel";

// Moldura do portal da DoLado Empresas (Fase 7): navegação própria, tema
// das empresas (.tema-empresas, verde mais escuro) e só português (D1).

export const SECCOES_PORTAL = [
  { chave: "painel", href: "/empresa", texto: "Painel" },
  { chave: "instalacoes", href: "/empresa/instalacoes", texto: "Instalações" },
  { chave: "servicos", href: "/empresa/servicos", texto: "Contratos e serviços" },
  { chave: "documentos", href: "/empresa/documentos", texto: "Facturas e análises" },
  { chave: "alertas", href: "/empresa/alertas", texto: "Alertas" },
  { chave: "historico", href: "/empresa/historico", texto: "Histórico" },
  { chave: "definicoes", href: "/empresa/definicoes", texto: "Definições" },
] as const;

export type SeccaoPortal = (typeof SECCOES_PORTAL)[number]["chave"];

export function PortalEmpresa({
  nome,
  estado,
  ativa,
  titulo,
  descricao,
  mensagens,
  children,
}: {
  nome: string;
  /** Estado da organização: pagamento em atraso, suspensa ou terminada mostram um aviso. */
  estado: string;
  ativa: SeccaoPortal;
  titulo: string;
  descricao?: ReactNode;
  /** Mensagens das acções (?erro= / ?info=). */
  mensagens?: { erro?: string; info?: string };
  children: ReactNode;
}) {
  const aviso = avisoDoEstado(estado);
  return (
    <div className={`tema-portal tema-empresas ${fonteV2.className} flex min-h-screen flex-col bg-[#F7F9FC] text-[var(--v2-navy)] antialiased`}>
      <header className="border-b border-[var(--v2-line)] bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Logotipo />
            <span className="hidden text-[14px] font-semibold text-[var(--v2-muted)] sm:inline">Empresas · {nome}</span>
          </div>
          <form action={terminarSessao}>
            <button type="submit" className="min-h-11 px-2 text-[15px] text-[var(--v2-muted)] underline underline-offset-4 hover:text-[var(--v2-navy)]">
              Sair
            </button>
          </form>
        </div>
        <nav aria-label="Portal da empresa" className="mx-auto w-full max-w-6xl overflow-x-auto px-4">
          <ul className="flex gap-1">
            {SECCOES_PORTAL.map((s) => (
              <li key={s.chave}>
                <Link
                  href={s.href}
                  prefetch={false}
                  aria-current={s.chave === ativa ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-[15px] font-semibold ${
                    s.chave === ativa
                      ? "border-[var(--v2-green)] text-[var(--v2-green-dark)]"
                      : "border-transparent text-[var(--v2-muted)] hover:text-[var(--v2-navy)]"
                  }`}
                >
                  {s.texto}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-2">
          <p className={EYEBROW}>{nome}</p>
          <h1 className={TITULO_PAGINA}>{titulo}</h1>
          {descricao && <div className={TEXTO_SECUNDARIO}>{descricao}</div>}
        </div>
        {aviso && <Aviso tom={aviso.tom}>{aviso.texto}</Aviso>}
        {mensagens?.erro && <Aviso tom="erro">{mensagens.erro}</Aviso>}
        {mensagens?.info && <Aviso tom="sucesso">{mensagens.info}</Aviso>}
        {children}
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
