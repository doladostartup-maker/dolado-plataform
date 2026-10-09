import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { metadadosLegais } from "@/i18n/metadados";
import { tLegal } from "@/i18n/mensagens/legal";
import { rico } from "@/i18n/Rico";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { notFound } from "next/navigation";
import { ROTAS_LEGAIS, TERMOS_VERSAO } from "@/lib/legal";
import { VERSOES_TERMOS } from "../_versoes";

export async function generateMetadata({ params }: ComIdioma<{ versao: string }>): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const { versao } = await params;
  return metadadosLegais(idioma, `/termos/${versao}`, { title: tLegal[idioma].titulos.termosVersao });
}

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(VERSOES_TERMOS).map((versao) => ({ versao }));
}

/** URL estável de cada versão publicada dos Termos (a aceite em cada compra). */
export default async function TermosVersaoPage({ params }: ComIdioma<{ versao: string }>) {
  const idioma = await idiomaDaPagina(params);
  const { versao } = await params;
  const Termos = VERSOES_TERMOS[versao];
  if (!Termos) notFound();

  return (
    <>
      {versao !== TERMOS_VERSAO && (
        <div className="mt-4 rounded-lg border-l-[3px] border-[var(--color-brand)] bg-[var(--color-surface-sunken)] p-4 text-sm text-[var(--color-ink-muted)]">
          {rico(tLegal[idioma].versaoAntigaTermos(versao), {
            atual: (c) => (
              <Link prefetch={false} href={ROTAS_LEGAIS.termos} className="text-[var(--color-brand)] underline">
                {c}
              </Link>
            ),
          })}
        </div>
      )}
      <Termos />
    </>
  );
}
