import Link from "next/link";
import { LIVRO_RECLAMACOES_URL, ROTAS_LEGAIS } from "@/lib/legal";

// Rodapé simples das ferramentas públicas (Simulador, Calculadora).
export function RodapeLegal() {
  return (
    <footer className="flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-[var(--color-hairline)] px-4 py-6 text-xs text-[var(--color-ink-faint)]">
      <Link href={ROTAS_LEGAIS.termos} className="hover:text-[var(--color-ink-muted)]">
        Termos e Condições
      </Link>
      <Link href={ROTAS_LEGAIS.privacidade} className="hover:text-[var(--color-ink-muted)]">
        Política de Privacidade
      </Link>
      <Link href={ROTAS_LEGAIS.livreResolucao} className="hover:text-[var(--color-ink-muted)]">
        Livre resolução
      </Link>
      <Link href={ROTAS_LEGAIS.resolucaoLitigios} className="hover:text-[var(--color-ink-muted)]">
        Resolução de litígios
      </Link>
      <a href={LIVRO_RECLAMACOES_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-ink-muted)]">
        Livro de Reclamações
      </a>
    </footer>
  );
}
