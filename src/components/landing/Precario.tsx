"use client";

import { useState, useTransition } from "react";
import { iniciarCheckout } from "@/app/actions/stripe";
import { track } from "@/lib/analytics";
import {
  IVA_INCLUIDO,
  LIMITE_CASOS_ACUMULADOS,
  ORDEM_PLANOS,
  PLANOS,
  formatarPreco,
  type PlanoId,
} from "@/lib/planos";

// Preçário público. Nomes, preços e Price IDs vêm de src/lib/planos.ts; o
// botão envia só o PlanoId à Server Action, que escolhe o Price ID.
// Só se listam funcionalidades de proteção já disponíveis na plataforma.

const FUNCIONALIDADES_PROTECAO = [
  "Alerta de fim de fidelização",
  "Alerta de fim de promoção",
  "Aviso sectorial de aumento de preços",
  "Comparador de faturas mês a mês",
  "Simulador de elegibilidade na área de cliente",
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
    resumo: "Para quem quer antecipar problemas e acompanhar o que pode mudar nos seus contratos.",
    inclui: FUNCIONALIDADES_PROTECAO,
    naoInclui: "Não inclui o tratamento de casos.",
    cta: "Aderir à Proteção",
  },
  caso_protecao: {
    resumo: "Proteção contínua e acompanhamento quando precisar de tratar um problema.",
    inclui: [
      "Tudo o que está incluído no plano Proteção",
      "1 caso por mês",
      `Casos não utilizados acumulam até ao limite de ${LIMITE_CASOS_ACUMULADOS}`,
      "Sem período de carência",
    ],
    cta: "Escolher Caso + Proteção",
    destaque: true,
  },
  avulso: {
    resumo: "Para quem precisa de tratar um problema pontual, sem aderir a uma subscrição.",
    inclui: [
      "Tratamento de 1 caso",
      "Acompanhamento desse caso ao longo do processo",
      "Acesso ao histórico do caso na área de cliente",
    ],
    naoInclui: "Não inclui as funcionalidades de proteção.",
    cta: "Tratar um caso",
  },
};

const COMPARACAO: { label: string; valores: Record<PlanoId, string> }[] = [
  {
    label: "Preço",
    valores: {
      protecao: `${formatarPreco(PLANOS.protecao.precoCentimos)}/mês`,
      caso_protecao: `${formatarPreco(PLANOS.caso_protecao.precoCentimos)}/mês`,
      avulso: formatarPreco(PLANOS.avulso.precoCentimos),
    },
  },
  { label: "Proteção e prevenção", valores: { protecao: "Sim", caso_protecao: "Sim", avulso: "Não" } },
  { label: "Casos incluídos", valores: { protecao: "0", caso_protecao: "1 por mês", avulso: "1" } },
  {
    label: "Acumulação de casos",
    valores: { protecao: "—", caso_protecao: `Até ${LIMITE_CASOS_ACUMULADOS}`, avulso: "—" },
  },
  { label: "Subscrição", valores: { protecao: "Sim", caso_protecao: "Sim", avulso: "Não" } },
  { label: IVA_INCLUIDO, valores: { protecao: "Sim", caso_protecao: "Sim", avulso: "Sim" } },
];

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-[13.5px] font-semibold text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-60";
const BOTAO_SECUNDARIO =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-[13.5px] font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--color-canvas)] disabled:opacity-60";

export function Precario() {
  const [aIniciarPagamento, iniciarPagamento] = useTransition();
  const [emCurso, setEmCurso] = useState<PlanoId | null>(null);

  const escolher = (plano: PlanoId) => {
    track(`click_precario_${plano}`);
    setEmCurso(plano);
    iniciarPagamento(() => iniciarCheckout(plano));
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
                disabled={aIniciarPagamento}
                onClick={() => escolher(id)}
                className={`mt-auto ${cartao.destaque ? BOTAO_PRIMARIO : BOTAO_SECUNDARIO}`}
              >
                {aIniciarPagamento && emCurso === id ? "A abrir pagamento…" : cartao.cta}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-6 max-w-[70ch] text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
        Já comprou um caso Avulso? Se aderir depois a uma subscrição, parte do valor já pago cobre o
        primeiro mês e o restante é reembolsado para o método de pagamento original.
      </p>

      <div className="mt-10 overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)]">
        <table className="w-full min-w-[520px] border-collapse text-left text-[12.5px]">
          <caption className="sr-only">Comparação dos planos da DoLado</caption>
          <thead>
            <tr className="border-b border-[var(--color-hairline)]">
              <th scope="col" className="px-4 py-3 font-semibold text-[var(--color-ink-muted)]">
                <span className="sr-only">Característica</span>
              </th>
              {ORDEM_PLANOS.map((id) => (
                <th key={id} scope="col" className="px-4 py-3 font-semibold text-[var(--color-ink)]">
                  {PLANOS[id].nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARACAO.map((linha) => (
              <tr key={linha.label} className="border-b border-[var(--color-hairline)] last:border-b-0">
                <th scope="row" className="px-4 py-2.5 font-medium text-[var(--color-ink-muted)]">
                  {linha.label}
                </th>
                {ORDEM_PLANOS.map((id) => (
                  <td key={id} className="px-4 py-2.5 text-[var(--color-ink)]">
                    {linha.valores[id]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
