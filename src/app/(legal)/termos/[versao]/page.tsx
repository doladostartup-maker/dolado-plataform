import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ROTAS_LEGAIS, TERMOS_VERSAO } from "@/lib/legal";
import { VERSOES_TERMOS } from "../_versoes";

export const metadata: Metadata = {
  title: "Termos e Condições (versão) — DoLado",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(VERSOES_TERMOS).map((versao) => ({ versao }));
}

/** URL estável de cada versão publicada dos Termos (a aceite em cada compra). */
export default async function TermosVersaoPage({ params }: { params: Promise<{ versao: string }> }) {
  const { versao } = await params;
  const Termos = VERSOES_TERMOS[versao];
  if (!Termos) notFound();

  return (
    <>
      {versao !== TERMOS_VERSAO && (
        <div className="mt-4 rounded-lg border-l-[3px] border-[var(--color-brand)] bg-[var(--color-surface-sunken)] p-4 text-sm text-[var(--color-ink-muted)]">
          Está a consultar a versão de {versao} dos Termos e Condições, que já não está em vigor.{" "}
          <Link href={ROTAS_LEGAIS.termos} className="text-[var(--color-brand)] underline">
            Ver a versão em vigor
          </Link>
          .
        </div>
      )}
      <Termos />
    </>
  );
}
