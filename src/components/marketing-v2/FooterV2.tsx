import Link from "@/i18n/Link";
import { textos } from "@/i18n/servidor";
import { tComum } from "@/i18n/mensagens/comum";
import { LIVRO_RECLAMACOES_URL, ROTAS_LEGAIS } from "@/lib/legal";
import { ENTIDADE_LEGAL, NIPC } from "@/lib/site";
import { Logotipo } from "./Logotipo";
import { ROTAS_V2 } from "./rotas";

// Rodapé do Design System V2. Só links para páginas que existem.

type Rodape = (typeof tComum)["pt-PT"]["rodape"];
type ChaveRodape = Exclude<keyof Rodape, "lema" | "cidade">;

const COLUNAS_RODAPE: { titulo: ChaveRodape; links: { href: string; label: ChaveRodape; externo?: boolean }[] }[] = [
  {
    titulo: "produto",
    links: [
      { href: ROTAS_V2.comoFunciona, label: "comoFunciona" },
      { href: ROTAS_V2.ferramentas, label: "ferramentas" },
      { href: ROTAS_V2.precario, label: "precario" },
    ],
  },
  {
    titulo: "dolado",
    links: [
      { href: ROTAS_V2.sobreNos, label: "sobreNos" },
      { href: ROTAS_V2.transparencia, label: "transparencia" },
      { href: ROTAS_V2.ajuda, label: "ajuda" },
      { href: ROTAS_V2.empresas, label: "empresas" },
      { href: ROTAS_V2.contacto, label: "contacto" },
    ],
  },
  {
    titulo: "legal",
    links: [
      { href: ROTAS_LEGAIS.termos, label: "termos" },
      { href: ROTAS_LEGAIS.privacidade, label: "privacidade" },
      { href: ROTAS_LEGAIS.livreResolucao, label: "livreResolucao" },
      { href: ROTAS_LEGAIS.resolucaoLitigios, label: "resolucaoLitigios" },
      { href: LIVRO_RECLAMACOES_URL, label: "livroReclamacoes", externo: true },
    ],
  },
];

export async function FooterV2() {
  const t = (await textos(tComum)).rodape;
  return (
    <footer className="border-t border-[var(--v2-line)] bg-white">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logotipo />
          <p className="mt-4 max-w-[260px] text-[14px] leading-relaxed text-[var(--v2-muted)]">
            {t.lema}
          </p>
        </div>
        {COLUNAS_RODAPE.map((c) => (
          <div key={c.titulo}>
            <p className="mb-4 text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--v2-navy)]">{t[c.titulo]}</p>
            <ul className="space-y-3">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.externo ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-[14px] text-[var(--v2-muted)] hover:text-[var(--v2-green)]">
                      {t[l.label]}
                    </a>
                  ) : (
                    <Link prefetch={false} href={l.href} className="text-[14px] text-[var(--v2-muted)] hover:text-[var(--v2-green)]">
                      {t[l.label]}
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
          © 2026 DoLado · {ENTIDADE_LEGAL} · NIPC {NIPC} · {t.cidade}
        </p>
      </div>
    </footer>
  );
}
