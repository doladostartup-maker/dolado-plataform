import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRIVACIDADE_VERSAO, ROTAS_LEGAIS } from "@/lib/legal";
import { VERSOES_PRIVACIDADE } from "../_versoes";

export const metadata: Metadata = {
  title: "Política de Privacidade (versão) — DoLado",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(VERSOES_PRIVACIDADE).map((versao) => ({ versao }));
}

/** URL estável de cada versão publicada da Política de Privacidade. */
export default async function PrivacidadeVersaoPage({ params }: { params: Promise<{ versao: string }> }) {
  const { versao } = await params;
  const Politica = VERSOES_PRIVACIDADE[versao];
  if (!Politica) notFound();

  return (
    <>
      {versao !== PRIVACIDADE_VERSAO && (
        <div className="mt-4 rounded-lg border-l-[3px] border-[var(--color-brand)] bg-[var(--color-surface-sunken)] p-4 text-sm text-[var(--color-ink-muted)]">
          Está a consultar a versão de {versao} da Política de Privacidade, que já não está em vigor.{" "}
          <Link prefetch={false} href={ROTAS_LEGAIS.privacidade} className="text-[var(--color-brand)] underline">
            Ver a versão em vigor
          </Link>
          .
        </div>
      )}
      <Politica />
    </>
  );
}
