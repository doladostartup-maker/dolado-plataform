import Link from "@/i18n/Link";
import { textos } from "@/i18n/servidor";
import { tComum } from "@/i18n/mensagens/comum";
import { LIVRO_RECLAMACOES_URL, ROTAS_LEGAIS } from "@/lib/legal";
import { ENTIDADE_LEGAL, NIPC } from "@/lib/site";
import { parceirosAtivos } from "@/lib/parceiros/regras";
import { DefinicoesCookies } from "./DefinicoesCookies";
import { Logotipo } from "./Logotipo";
import { ROTAS_V2 } from "./rotas";

// Rodapé do Design System V2. Só links para páginas que existem. Desde a
// simplificação do menu (17/10/2026) é aqui que vivem as páginas que saíram
// da navbar ("Como funciona", perguntas frequentes, "Empresas").

type Rodape = (typeof tComum)["pt-PT"]["rodape"];
type ChaveRodape = Exclude<keyof Rodape, "lema" | "cidade" | "definicoesCookies">;

const COLUNAS_RODAPE: { titulo: ChaveRodape; links: { href: string; label: ChaveRodape; externo?: boolean }[] }[] = [
  {
    titulo: "produto",
    links: [
      { href: ROTAS_V2.problemas, label: "problemas" },
      { href: ROTAS_V2.protecao, label: "protecao" },
      { href: ROTAS_V2.precario, label: "precario" },
      { href: ROTAS_V2.ferramentas, label: "ferramentas" },
    ],
  },
  {
    titulo: "apoio",
    links: [
      { href: ROTAS_V2.comoFunciona, label: "comoFunciona" },
      { href: ROTAS_V2.ajuda, label: "ajuda" },
      { href: ROTAS_V2.contacto, label: "contacto" },
    ],
  },
  {
    titulo: "dolado",
    links: [
      { href: ROTAS_V2.sobreNos, label: "sobreNos" },
      { href: ROTAS_V2.empresas, label: "empresas" },
      { href: ROTAS_V2.parceiros, label: "parceiros" },
      { href: ROTAS_V2.transparencia, label: "transparencia" },
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
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-6 gap-y-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr]">
        <div className="col-span-2 lg:col-span-1">
          <Logotipo />
          <p className="mt-4 max-w-[280px] text-[14px] leading-relaxed text-[var(--v2-muted)]">
            {t.lema[0]}
            <br />
            {t.lema[1]}
          </p>
        </div>
        {COLUNAS_RODAPE.map((c) => (
          <div key={c.titulo}>
            <p className="mb-4 text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--v2-navy)]">{t[c.titulo]}</p>
            <ul className="space-y-3">
              {c.links.filter((l) => l.href !== ROTAS_V2.parceiros || parceirosAtivos()).map((l) => (
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
              {c.titulo === "legal" && (
                <li>
                  <DefinicoesCookies className="text-left text-[14px] text-[var(--v2-muted)] hover:text-[var(--v2-green)]">
                    {t.definicoesCookies}
                  </DefinicoesCookies>
                </li>
              )}
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
