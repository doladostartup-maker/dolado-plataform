import Link from "@/i18n/Link";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { Eyebrow, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { TEXTO } from "@/components/marketing-v2/estilos";
import type { Idioma } from "@/i18n/config";
import { tProblemas } from "@/i18n/mensagens/problemas";
import { CAMINHO_PROBLEMAS, caminhoCategoria, caminhoProblema, categoriasComPagina, type Categoria } from "@/lib/problemas/catalogo";
import { AcoesProblema } from "./AcoesProblema";
import { CartaoProblema, ICONES_CATEGORIA, TituloPagina } from "./partes";
import { Trilho } from "./Trilho";

// Página de uma categoria (/problemas/<categoria>): introdução curta,
// problemas frequentes (ligações para cada página) e CTA para quem não
// encontra a sua situação.

const H2 = "text-[clamp(24px,2.8vw,30px)] font-extrabold leading-[1.15] tracking-[-0.02em] text-[var(--v2-navy)]";

export function PaginaCategoria({ idioma, categoria }: { idioma: Idioma; categoria: Categoria }) {
  const t = tProblemas[idioma];
  const cat = t.categorias[categoria.slug as keyof typeof t.categorias];
  const paginasCat = t.paginas[categoria.slug as keyof typeof t.paginas] as Record<string, { titulo: string; resumo: string }>;
  const caminho = caminhoCategoria(categoria.slug);
  const outras = categoriasComPagina().filter((c) => c.slug !== categoria.slug);

  return (
    <>
      <SectionV2 size="compact" className="lg:py-16">
        <Trilho
          idioma={idioma}
          rotulo={t.comum.trilho}
          elementos={[
            { nome: t.comum.inicio, caminho: "/" },
            { nome: t.comum.problemas, caminho: CAMINHO_PROBLEMAS },
            { nome: cat.nome, caminho },
          ]}
        />
        <div className="max-w-[760px]">
          <Eyebrow>
            <span className="mr-2 inline-flex text-[var(--v2-green)] [&_svg]:h-4 [&_svg]:w-4">{ICONES_CATEGORIA[categoria.slug]}</span>
            {cat.nome}
          </Eyebrow>
          <TituloPagina>{cat.titulo}</TituloPagina>
          <p className={`${TEXTO} mt-5 text-[17.5px]`}>{cat.intro}</p>
        </div>
      </SectionV2>

      <SectionV2 tone="soft-blue">
        <h2 className={H2}>{t.categoria.problemasTitulo}</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categoria.problemas.map((p) => (
            <li key={p.slug}>
              <CartaoProblema href={caminhoProblema(categoria.slug, p.slug)} titulo={paginasCat[p.slug].titulo} resumo={paginasCat[p.slug].resumo} saberMais={t.categoria.saberMais} />
            </li>
          ))}
        </ul>
      </SectionV2>

      <CTASection
        titulo={t.categoria.ctaTitulo}
        texto={t.categoria.ctaTexto}
        acao={<AcoesProblema contexto={{ origem: caminho, categoria: categoria.slug, problema: "categoria", setor: categoria.setor }} local="categoria" />}
      />

      {outras.length > 0 && (
        <SectionV2 size="compact">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--v2-navy)]">{t.categoria.outrasTitulo}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {outras.map((c) => (
              <li key={c.slug}>
                <Link
                  prefetch={false}
                  href={caminhoCategoria(c.slug)}
                  className="inline-flex min-h-11 items-center rounded-full border border-[var(--v2-line)] bg-white px-4 text-[14.5px] font-medium text-[var(--v2-navy)] hover:border-[var(--v2-green)] hover:text-[var(--v2-green)]"
                >
                  {t.categorias[c.slug as keyof typeof t.categorias].nome}
                </Link>
              </li>
            ))}
            <li>
              <Link
                prefetch={false}
                href={CAMINHO_PROBLEMAS}
                className="inline-flex min-h-11 items-center rounded-full border border-[var(--v2-line)] bg-white px-4 text-[14.5px] font-medium text-[var(--v2-navy)] hover:border-[var(--v2-green)] hover:text-[var(--v2-green)]"
              >
                {t.indice.eyebrow}
              </Link>
            </li>
          </ul>
        </SectionV2>
      )}
    </>
  );
}
