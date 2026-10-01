import type { Metadata } from "next";
import Link from "next/link";
import { COMO_EXERCER_LIVRE_RESOLUCAO, RESUMO_LIVRE_RESOLUCAO, ROTAS_LEGAIS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Livre resolução — DoLado",
};

// Estrutura simples, com os textos centralizados em src/lib/legal.ts —
// REVISÃO JURÍDICA PENDENTE. Não acrescentar texto jurídico aqui sem
// validação.
export default function LivreResolucaoPage() {
  return (
    <article className="flex flex-col gap-6 pt-4">
      <h1 className="text-[32px] font-semibold leading-tight text-[var(--color-ink)]">Direito de livre resolução</h1>
      <p className="text-base leading-relaxed text-[var(--color-ink)]">{RESUMO_LIVRE_RESOLUCAO}</p>
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">Como exercer</h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">{COMO_EXERCER_LIVRE_RESOLUCAO}</p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">Livre resolução e cancelamento</h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          O cancelamento da subscrição, feito na área Gestão de Subscrição, impede a renovação seguinte e mantém o
          serviço até ao fim do período já pago. O exercício do direito de livre resolução é um pedido diferente e é
          tratado à parte.
        </p>
      </section>
      <p className="text-base leading-relaxed text-[var(--color-ink)]">
        Mais informação nos{" "}
        <Link href={`${ROTAS_LEGAIS.termos}#livre-resolucao`} className="text-[var(--color-brand)] underline">
          Termos e Condições
        </Link>
        .
      </p>
    </article>
  );
}
