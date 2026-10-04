import Link from "next/link";
import { LIVRO_RECLAMACOES_URL, ROTAS_LEGAIS } from "@/lib/legal";
import { ENTIDADE_LEGAL, NIPC } from "@/lib/site";
import { Logotipo } from "./Logotipo";
import { ROTAS_V2 } from "./rotas";

// Rodapé do Design System V2. Só links para páginas que existem.

const COLUNAS_RODAPE: { titulo: string; links: { href: string; label: string; externo?: boolean }[] }[] = [
  {
    titulo: "Produto",
    links: [
      { href: ROTAS_V2.comoFunciona, label: "Como funciona" },
      { href: ROTAS_V2.ferramentas, label: "Ferramentas gratuitas" },
      { href: ROTAS_V2.precario, label: "Preçário" },
    ],
  },
  {
    titulo: "DoLado",
    links: [
      { href: ROTAS_V2.sobreNos, label: "Sobre nós" },
      { href: ROTAS_V2.transparencia, label: "Transparência" },
      { href: ROTAS_V2.ajuda, label: "Ajuda" },
      { href: ROTAS_V2.contacto, label: "Contacto" },
    ],
  },
  {
    titulo: "Legal",
    links: [
      { href: ROTAS_LEGAIS.termos, label: "Termos e Condições" },
      { href: ROTAS_LEGAIS.privacidade, label: "Política de Privacidade" },
      { href: ROTAS_LEGAIS.livreResolucao, label: "Livre resolução" },
      { href: ROTAS_LEGAIS.resolucaoLitigios, label: "Resolução de litígios" },
      { href: LIVRO_RECLAMACOES_URL, label: "Livro de Reclamações", externo: true },
    ],
  },
];

export function FooterV2() {
  return (
    <footer className="border-t border-[var(--v2-line)] bg-white">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logotipo />
          <p className="mt-4 max-w-[260px] text-[14px] leading-relaxed text-[var(--v2-muted)]">
            Do lado dos consumidores.
          </p>
        </div>
        {COLUNAS_RODAPE.map((c) => (
          <div key={c.titulo}>
            <p className="mb-4 text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--v2-navy)]">{c.titulo}</p>
            <ul className="space-y-3">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.externo ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-[14px] text-[var(--v2-muted)] hover:text-[var(--v2-green)]">
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className="text-[14px] text-[var(--v2-muted)] hover:text-[var(--v2-green)]">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--v2-line)]">
        <p className="mx-auto max-w-[1200px] px-5 py-5 text-[12.5px] text-[var(--v2-muted)] sm:px-8">
          © 2026 DoLado · {ENTIDADE_LEGAL} · NIPC {NIPC} · Lisboa
        </p>
      </div>
    </footer>
  );
}
