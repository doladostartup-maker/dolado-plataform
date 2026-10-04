"use client";

import { track } from "@/lib/analytics";
import { IVA_INCLUIDO, ORDEM_PLANOS, PLANOS, formatarPreco, type PlanoId } from "@/lib/planos";
import { CONTEUDO_PLANOS, NOTA_CONVERSAO_AVULSO, destinoPlano, type ConteudoPlano } from "@/lib/precario";

// Preçário público da homepage. Nomes e preços vêm de src/lib/planos.ts; o
// que cada plano inclui e o destino dos botões, de src/lib/precario.ts
// (partilhado com a página V2 /precario).

type Cartao = ConteudoPlano & { cta: string; destaque?: boolean };

const CARTOES: Record<PlanoId, Cartao> = {
  protecao: { ...CONTEUDO_PLANOS.protecao, cta: "Aderir à Proteção" },
  caso_protecao: { ...CONTEUDO_PLANOS.caso_protecao, cta: "Escolher Caso + Proteção", destaque: true },
  avulso: { ...CONTEUDO_PLANOS.avulso, cta: "Tratar o meu caso" },
};

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-[13.5px] font-semibold text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-60";
const BOTAO_SECUNDARIO =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-[13.5px] font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--color-canvas)] disabled:opacity-60";

export function Precario() {
  const escolher = (plano: PlanoId) => {
    track(`click_precario_${plano}`);
    window.location.assign(destinoPlano(plano, "precario"));
  };

  return (
    <section id="precario" className="mx-auto max-w-[1120px] px-4 py-16 sm:px-10">
      <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--color-brand)]">Preçário</p>
      <p className="mb-8 text-[13.5px] text-[var(--color-ink-faint)]">
        Três opções, todas com IVA incluído. Preços de lançamento — sujeitos a alteração.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        {ORDEM_PLANOS.map((id) => {
          const plano = PLANOS[id];
          const cartao = CARTOES[id];
          return (
            <div
              key={id}
              data-plano={id}
              className={`flex flex-col rounded-[var(--radius-card)] bg-[var(--color-surface)] p-7 ${
                cartao.destaque
                  ? "border-2 border-[var(--color-brand)] shadow-[var(--shadow-md)]"
                  : "border border-[var(--color-hairline)] shadow-[var(--shadow-subtle)]"
              }`}
            >
              <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{plano.nome}</h3>
              <p className="mb-4 text-[12.5px] leading-relaxed text-[var(--color-ink-muted)]">{cartao.resumo}</p>
              <p>
                <span className="font-serif text-[32px] font-medium text-[var(--color-ink)]">
                  {formatarPreco(plano.precoCentimos)}
                </span>
                <span className="text-[12.5px] text-[var(--color-ink-muted)]">
                  {plano.subscricao ? " /mês" : " / caso"}
                </span>
              </p>
              <p className="mb-5 text-[12px] text-[var(--color-ink-faint)]">
                {plano.subscricao ? `Subscrição mensal · ${IVA_INCLUIDO}` : `Pagamento único · ${IVA_INCLUIDO}`}
              </p>
              <ul className="mb-4 flex flex-col gap-2.5 text-[12.5px] text-[var(--color-ink)]">
                {cartao.inclui.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span aria-hidden="true" className="font-bold text-[var(--color-brand)]">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              {cartao.naoInclui && (
                <p className="mb-6 text-[12.5px] text-[var(--color-ink-muted)]">{cartao.naoInclui}</p>
              )}
              <button
                type="button"
                onClick={() => escolher(id)}
                className={`mt-auto ${cartao.destaque ? BOTAO_PRIMARIO : BOTAO_SECUNDARIO}`}
              >
                {cartao.cta}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-6 max-w-[70ch] text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
        {NOTA_CONVERSAO_AVULSO}
      </p>
    </section>
  );
}
