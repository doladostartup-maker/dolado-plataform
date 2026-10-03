"use client";

import { track } from "@/lib/analytics";
import { urlComprar, urlTratarCaso } from "@/lib/site";
import {
  IVA_INCLUIDO,
  LIMITE_CASOS_ACUMULADOS,
  ORDEM_PLANOS,
  PLANOS,
  formatarPreco,
  type PlanoId,
} from "@/lib/planos";

// Preçário público. Nomes, preços e Price IDs vêm de src/lib/planos.ts. Nas
// subscrições, o botão leva a portal.dolado.pt/comprar: dolado.pt não vê a
// sessão (cookies host-only do portal), e é lá que se decide se quem compra
// já tem conta (mesmo Customer, nunca uma segunda subscrição desligada da
// conta) antes da confirmação da compra (Termos, início imediato, livre
// resolução). O Avulso leva a "Tratar o meu caso" (caso primeiro, pagamento
// no fim).
// Só se listam funcionalidades de proteção já disponíveis na plataforma,
// descritas pelo benefício (como na secção de funcionalidades da homepage,
// FuncionalidadesProtecao.tsx) e nunca pelos nomes internos.

const FUNCIONALIDADES_PROTECAO = [
  "Comparação de faturas mês a mês",
  "Avisos antes do fim de promoções",
  "Avisos antes do fim de períodos de fidelização",
  "Alertas sobre alterações relevantes no seu setor",
];

type Cartao = {
  resumo: string;
  inclui: string[];
  naoInclui?: string;
  cta: string;
  destaque?: boolean;
};

const CARTOES: Record<PlanoId, Cartao> = {
  protecao: {
    resumo:
      "Para quem quer que a DoLado acompanhe o que paga, as datas importantes dos seus contratos e as alterações que podem merecer a sua atenção.",
    inclui: FUNCIONALIDADES_PROTECAO,
    naoInclui: "Não inclui o tratamento de casos.",
    cta: "Aderir à Proteção",
  },
  caso_protecao: {
    resumo: "A DoLado fica atenta por si e, quando surgir um problema, também o trata consigo.",
    inclui: [
      "Tudo o que está incluído na Proteção",
      "1 novo caso por mês",
      `Casos não utilizados acumulam até ao limite de ${LIMITE_CASOS_ACUMULADOS}`,
      "Sem período de carência",
    ],
    cta: "Escolher Caso + Proteção",
    destaque: true,
  },
  avulso: {
    resumo: "Para tratar um único problema, com pagamento único e sem aderir a uma subscrição.",
    inclui: [
      "Tratamento de 1 caso",
      "Acompanhamento desse caso ao longo do processo",
      "Acesso ao histórico do caso na área de cliente",
    ],
    naoInclui: "Não inclui as funcionalidades da Proteção.",
    cta: "Tratar o meu caso",
  },
};

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-[13.5px] font-semibold text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-60";
const BOTAO_SECUNDARIO =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-[13.5px] font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--color-canvas)] disabled:opacity-60";

export function Precario() {
  const escolher = (plano: PlanoId) => {
    track(`click_precario_${plano}`);
    // Avulso é o tratamento de um caso: começa pela descrição do caso e só
    // no fim se escolhe e paga a modalidade ("Tratar o meu caso").
    window.location.assign(plano === "avulso" ? urlTratarCaso("precario") : urlComprar(plano));
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
        Comprou um caso Avulso e ainda não o usou? Se aderir depois a uma subscrição, parte do valor já pago
        cobre o primeiro mês e o restante é reembolsado para o método de pagamento original.
      </p>
    </section>
  );
}
