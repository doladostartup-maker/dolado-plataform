import type { ReactNode } from "react";

// Secção de funcionalidades da homepage: o valor recorrente da Proteção em
// três benefícios, e o tratamento de casos numa faixa à parte.
//
// Posicionamento (decisão de Thiago, 03/10/2026): os contratos e as faturas
// são contexto, o produto é a resolução do problema. Cada cartão descreve um
// acontecimento que pode tornar-se num problema, nunca a gestão de contratos.
//
// A copy segue o que o produto faz hoje (Monitor de Proteção e Aviso
// Sectorial), descrito pelo benefício e sem nomes internos. A comparação de
// faturas não se apresenta como exclusiva de um setor (decisão de Thiago,
// 03/10/2026) e cada situação detetada é revista por uma pessoa; os alertas
// de datas saem 60 e 30 dias antes; o aviso sectorial é por setor. A mesma
// descrição está no preçário (Precario.tsx) e nas perguntas frequentes
// (conteudoPerguntasFrequentes.tsx). Mudar o produto = rever estes textos.

type Beneficio = {
  icone: ReactNode;
  titulo: string;
  texto: string;
  detalhe: string;
};

const PROPS_ICONE = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const BENEFICIOS: Beneficio[] = [
  {
    icone: (
      <svg {...PROPS_ICONE}>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M9 10h6M9 14h6M9 18h3" />
      </svg>
    ),
    titulo: "Algo mudou na sua fatura?",
    texto: "Comparamos cada fatura com as anteriores para identificar alterações que possam merecer a sua atenção.",
    detalhe: "Comparação mês a mês",
  },
  {
    icone: (
      <svg {...PROPS_ICONE}>
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </svg>
    ),
    titulo: "Está a aproximar-se uma data importante?",
    texto: "Avisamo-lo por e-mail antes do fim de promoções e de períodos de fidelização, para que possa decidir a tempo.",
    detalhe: "Promoções · Fidelizações",
  },
  {
    icone: (
      <svg {...PROPS_ICONE}>
        <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
        <path d="M10 20.5a2 2 0 0 0 4 0" />
      </svg>
    ),
    titulo: "Mudaram as condições?",
    texto: "Avisamo-lo de alterações anunciadas no seu setor que possam afetá-lo, como subidas de preços ou mudanças nas condições dos serviços.",
    detalhe: "Telecomunicações · Energia · Água",
  },
];

export function FuncionalidadesProtecao({
  botaoPrimario,
  botaoSecundario,
  onProblemaClick,
}: {
  botaoPrimario: string;
  botaoSecundario: string;
  onProblemaClick: () => void;
}) {
  return (
    <section id="funcionalidades" className="border-y border-[var(--color-hairline)] bg-white">
      <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-10 sm:py-20">
        <div className="mb-10 max-w-[620px]">
          <h2 className="mb-3 text-[clamp(24px,3.2vw,32px)] font-semibold leading-tight tracking-[-0.01em] text-[var(--color-ink)]">
            Um problema nem sempre começa com uma reclamação.
          </h2>
          <p className="text-base leading-relaxed text-[var(--color-ink-muted)]">
            Com a Proteção, a DoLado também está atenta a alterações nas suas faturas, a datas importantes
            e a mudanças nas condições que possam vir a prejudicá-lo. Se alguma coisa merecer atenção,
            avisamo-lo. E, se houver um problema, ajudamos a tratá-lo.
          </p>
        </div>

        <ul className="grid gap-5 md:grid-cols-3">
          {BENEFICIOS.map((b) => (
            <li
              key={b.titulo}
              className="flex flex-col rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-subtle)]"
            >
              <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-brand-wash)] text-[var(--color-brand)]">
                {b.icone}
              </span>
              <h3 className="mb-2 text-[16px] font-semibold text-[var(--color-ink)]">{b.titulo}</h3>
              <p className="mb-4 text-[14px] leading-relaxed text-[var(--color-ink-muted)]">{b.texto}</p>
              <p className="mt-auto text-[12px] font-medium text-[var(--color-ink-faint)]">{b.detalhe}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-5 rounded-[var(--radius-card)] bg-[var(--color-surface-sunken)] px-6 py-6 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="max-w-[560px]">
            <p className="mb-1.5 text-[15px] font-semibold text-[var(--color-ink)]">
              Se surgir um problema, também tratamos disso consigo.
            </p>
            <p className="text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
              Analisamos o caso, preparamos a reclamação e só avançamos depois da sua autorização.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:shrink-0">
            <a href="#precario" className={botaoPrimario}>
              Conhecer a Proteção
            </a>
            <button type="button" onClick={onProblemaClick} className={`${botaoSecundario} bg-[var(--color-surface)]`}>
              Tenho um problema agora
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
