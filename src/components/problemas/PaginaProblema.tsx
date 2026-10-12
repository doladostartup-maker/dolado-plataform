import Link from "@/i18n/Link";
import type { ReactNode } from "react";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { IconeSeta } from "@/components/marketing-v2/Icones";
import { ListaVistos } from "@/components/marketing-v2/ListaVistos";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { CARTAO, TEXTO } from "@/components/marketing-v2/estilos";
import type { Idioma } from "@/i18n/config";
import { rico } from "@/i18n/Rico";
import { tProblemas } from "@/i18n/mensagens/problemas";
import { CAMINHO_PROBLEMAS, caminhoCategoria, caminhoProblema, type Categoria, type Problema } from "@/lib/problemas/catalogo";
import { AcoesProblema, type ContextoProblema } from "./AcoesProblema";
import { CartaoProblema, LINK_SETA, LINK_TEXTO, TEXTO_PROBLEMAS, TituloPagina } from "./partes";
import { Trilho } from "./Trilho";

// Página de um problema (/problemas/<categoria>/<problema>): problema →
// pode ser contestado? → o que verificar → como a DoLado ajuda → CTA →
// relacionados. Informação geral, curta e orientada à ação — nunca um guia
// "faça você mesmo" (sem cartas, moradas nem passos de envio).

const H2_CARTAO = "text-[clamp(22px,2.4vw,26px)] font-extrabold leading-[1.15] tracking-[-0.02em] text-[var(--v2-navy)]";

export function PaginaProblema({ idioma, categoria, problema }: { idioma: Idioma; categoria: Categoria; problema: Problema }) {
  const t = tProblemas[idioma];
  const cat = t.categorias[categoria.slug as keyof typeof t.categorias];
  const paginasCat = t.paginas[categoria.slug as keyof typeof t.paginas] as Record<string, (typeof t.paginas.telecomunicacoes)["aumento-preco"]>;
  const p = paginasCat[problema.slug];
  const caminho = caminhoProblema(categoria.slug, problema.slug);
  const contexto: ContextoProblema = {
    origem: caminho,
    categoria: categoria.slug,
    problema: problema.slug,
    setor: categoria.setor,
    problemaCaso: problema.problemaCaso,
  };
  const etiquetas = {
    calc: (c: ReactNode) => (
      <Link prefetch={false} href="/calculadora-cancelamento" className={LINK_TEXTO}>
        {c}
      </Link>
    ),
  };

  return (
    <>
      {/* ===== 1. O problema ===== */}
      <SectionV2 size="compact" className="lg:py-16">
        <Trilho
          idioma={idioma}
          rotulo={t.comum.trilho}
          elementos={[
            { nome: t.comum.inicio, caminho: "/" },
            { nome: t.comum.problemas, caminho: CAMINHO_PROBLEMAS },
            { nome: cat.nome, caminho: caminhoCategoria(categoria.slug) },
            { nome: p.rotulo, caminho },
          ]}
        />
        <div className="max-w-[760px]">
          <Eyebrow>{cat.nome}</Eyebrow>
          <TituloPagina>{p.titulo}</TituloPagina>
          <p className={`${TEXTO} mt-5 text-[17.5px]`}>{p.subtitulo}</p>
          <div className="mt-8">
            <AcoesProblema contexto={contexto} local="topo" />
          </div>
        </div>
      </SectionV2>

      {/* ===== 2 e 3. Pode ser contestado? / O que verificar ===== */}
      <SectionV2 tone="soft-blue" className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="contestar" className={`${CARTAO} p-6 sm:p-8`}>
          <h2 id="contestar" className={H2_CARTAO}>
            {t.comum.contestarTitulo}
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            {p.contestar.map((paragrafo) => (
              <p key={paragrafo} className={TEXTO_PROBLEMAS}>
                {rico(paragrafo, etiquetas)}
              </p>
            ))}
          </div>
        </section>
        <section aria-labelledby="verificar" className={`${CARTAO} p-6 sm:p-8`}>
          <h2 id="verificar" className={H2_CARTAO}>
            {t.comum.verificarTitulo}
          </h2>
          <p className={`${TEXTO_PROBLEMAS} mt-4 mb-5`}>{t.comum.verificarTexto}</p>
          <ListaVistos compacta itens={p.verificar} />
        </section>
      </SectionV2>

      {/* ===== 4. Como a DoLado pode ajudar ===== */}
      <SectionV2>
        <SectionHeader titulo={t.comum.ajudaTitulo} texto={p.ajuda} />
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.comum.ajudaPassos.map((passo, i) => (
            <li key={passo} className="rounded-[18px] bg-[var(--v2-mint)] p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[15px] font-bold text-[var(--v2-green-dark)]" aria-hidden="true">
                {i + 1}
              </span>
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--v2-navy)]">{passo}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-[680px] text-[14.5px] leading-relaxed text-[var(--v2-muted)]">{t.comum.ajudaNota}</p>
      </SectionV2>

      {/* ===== 5. CTA ===== */}
      <CTASection titulo={t.comum.ctaTitulo} texto={t.comum.ctaTexto} acao={<AcoesProblema contexto={contexto} local="final" />} />

      {/* ===== 6. Relacionados ===== */}
      <SectionV2 size="compact">
        <h2 className="text-[clamp(24px,2.8vw,30px)] font-extrabold leading-[1.15] tracking-[-0.02em] text-[var(--v2-navy)]">
          {t.comum.relacionadosTitulo}
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {problema.relacionados.map((slug) => {
            const r = paginasCat[slug];
            return (
              <li key={slug}>
                <CartaoProblema href={caminhoProblema(categoria.slug, slug)} titulo={r.titulo} resumo={r.resumo} saberMais={t.categoria.saberMais} />
              </li>
            );
          })}
        </ul>
        <Link prefetch={false} href={caminhoCategoria(categoria.slug)} className={`${LINK_SETA} mt-6`}>
          {t.comum.verTodos(cat.nomeMinusculas)} <IconeSeta tamanho={15} />
        </Link>
        <p className="mt-10 max-w-[760px] border-t border-[var(--v2-line)] pt-6 text-[13.5px] leading-relaxed text-[var(--v2-muted)]">{t.comum.aviso}</p>
      </SectionV2>
    </>
  );
}
