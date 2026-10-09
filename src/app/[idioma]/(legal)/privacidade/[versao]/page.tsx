import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { metadadosLegais } from "@/i18n/metadados";
import { tLegal } from "@/i18n/mensagens/legal";
import { rico } from "@/i18n/Rico";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { notFound } from "next/navigation";
import { PRIVACIDADE_VERSAO, ROTAS_LEGAIS } from "@/lib/legal";
import { VERSOES_PRIVACIDADE } from "../_versoes";

export async function generateMetadata({ params }: ComIdioma<{ versao: string }>): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const { versao } = await params;
  return metadadosLegais(idioma, `/privacidade/${versao}`, { title: tLegal[idioma].titulos.privacidadeVersao });
}

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(VERSOES_PRIVACIDADE).map((versao) => ({ versao }));
}

/** URL estável de cada versão publicada da Política de Privacidade. */
export default async function PrivacidadeVersaoPage({ params }: ComIdioma<{ versao: string }>) {
  const idioma = await idiomaDaPagina(params);
  const { versao } = await params;
  const Politica = VERSOES_PRIVACIDADE[versao];
  if (!Politica) notFound();

  return (
    <>
      {versao !== PRIVACIDADE_VERSAO && (
        <div className="mt-4 rounded-lg border-l-[3px] border-[var(--color-brand)] bg-[var(--color-surface-sunken)] p-4 text-sm text-[var(--color-ink-muted)]">
          {rico(tLegal[idioma].versaoAntigaPrivacidade(versao), {
            atual: (c) => (
              <Link prefetch={false} href={ROTAS_LEGAIS.privacidade} className="text-[var(--color-brand)] underline">
                {c}
              </Link>
            ),
          })}
        </div>
      )}
      <Politica />
    </>
  );
}
