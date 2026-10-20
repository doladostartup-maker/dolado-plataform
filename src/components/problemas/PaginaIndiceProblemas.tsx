import Link from "@/i18n/Link";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { IconeSeta } from "@/components/marketing-v2/Icones";
import { Eyebrow, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_CONTORNO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";
import type { Idioma } from "@/i18n/config";
import { tProblemas } from "@/i18n/mensagens/problemas";
import { CAMINHO_PROBLEMAS, CATEGORIAS, caminhoCategoria, caminhoProblema, temPagina } from "@/lib/problemas/catalogo";
import { AcoesProblema, LigacaoTratarCaso } from "./AcoesProblema";
import { ICONES_CATEGORIA, TituloPagina } from "./partes";
import { Trilho } from "./Trilho";

// Página agregadora /problemas: as categorias que a DoLado trata, com
// exemplos e ligação para a página de cada uma. Categorias ainda sem páginas
// de problema (Gás, Água) ligam diretamente a "Tratar o meu caso" com o setor
// pré-preenchido — nunca a uma página vazia.

export function PaginaIndiceProblemas({ idioma }: { idioma: Idioma }) {
  const t = tProblemas[idioma];

  return (
    <>
      <SectionV2 size="compact" className="lg:py-16">
        <Trilho
          idioma={idioma}
          rotulo={t.comum.trilho}
          elementos={[
            { nome: t.comum.inicio, caminho: "/" },
            { nome: t.comum.problemas, caminho: CAMINHO_PROBLEMAS },
          ]}
        />
        <div className="max-w-[760px]">
          <Eyebrow>{t.indice.eyebrow}</Eyebrow>
          <TituloPagina>{t.indice.titulo}</TituloPagina>
          <p className={`${TEXTO} mt-5 text-[17.5px]`}>{t.indice.texto}</p>
        </div>
      </SectionV2>

      <SectionV2 tone="soft-blue">
        <h2 className="text-[clamp(24px,2.8vw,30px)] font-extrabold leading-[1.15] tracking-[-0.02em] text-[var(--v2-navy)]">
          {t.indice.categoriasTitulo}
        </h2>
        <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORIAS.map((categoria) => {
            const cat = t.categorias[categoria.slug as keyof typeof t.categorias];
            const paginasCat = t.paginas[categoria.slug as keyof typeof t.paginas] as Record<string, { rotulo: string }> | undefined;
            return (
              <li key={categoria.slug} className={`${CARTAO} flex flex-col p-6 sm:p-7`}>
                <span className="text-[var(--v2-green)]">{ICONES_CATEGORIA[categoria.slug]}</span>
                <h3 className="mt-4 text-[20px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">{cat.nome}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--v2-muted)]">{cat.descricao}</p>
                <p className="mt-5 text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--v2-navy)]">{t.indice.exemplos}</p>
                {temPagina(categoria) && paginasCat ? (
                  // Com página: os exemplos são as próprias páginas de problema.
                  <ul className="mt-2 flex flex-col">
                    {categoria.problemas.map((p) => (
                      <li key={p.slug}>
                        <Link
                          prefetch={false}
                          href={caminhoProblema(categoria.slug, p.slug)}
                          className="inline-flex min-h-10 items-center text-[15px] text-[var(--v2-navy)] underline decoration-[var(--v2-line-strong)] underline-offset-4 hover:text-[var(--v2-green)] hover:decoration-[var(--v2-green)]"
                        >
                          {paginasCat[p.slug].rotulo}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[15px] text-[var(--v2-muted)] marker:text-[var(--v2-green)]">
                    {cat.exemplos.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto pt-6">
                  {temPagina(categoria) ? (
                    <Link prefetch={false} href={caminhoCategoria(categoria.slug)} className={`${BOTAO_CONTORNO} w-full`}>
                      {cat.ligacao} <IconeSeta tamanho={16} />
                    </Link>
                  ) : (
                    <LigacaoTratarCaso
                      contexto={{ origem: CAMINHO_PROBLEMAS, categoria: categoria.slug, problema: "indice", setor: categoria.setor }}
                      local="indice_categoria"
                      texto={cat.ligacao}
                      className={`${BOTAO_CONTORNO} w-full`}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </SectionV2>

      <CTASection
        titulo={t.indice.ctaTitulo}
        texto={t.indice.ctaTexto}
        acao={<AcoesProblema contexto={{ origem: CAMINHO_PROBLEMAS, categoria: "todas", problema: "indice" }} local="indice" />}
      />
    </>
  );
}
