"use client";

import { useState } from "react";

type Faq = { q: string; a: string; cta?: boolean };

const FAQS: Faq[] = [
  {
    q: "Isto é um serviço jurídico?",
    a: "Não. A DoLado não é uma sociedade de advogados nem presta consulta jurídica individualizada. Organizamos, escrevemos e acompanhamos a sua reclamação com base em critérios legais públicos e objetivos.",
  },
  {
    q: "Quanto custa?",
    a: "Nada durante a fase Beta. Estamos em validação e o serviço é completamente grátis enquanto testamos com os primeiros casos — trata-se do caso inteiro, sem pagar. Quando a Beta terminar, conversamos sobre pricing antes de qualquer cobrança; nunca lhe cobramos nada sem o combinar consigo primeiro.",
  },
  {
    q: "O que tenho de fazer depois de enviar o formulário?",
    a: "Praticamente nada. Voltamos a falar consigo para confirmar os detalhes e, a partir daí, é a DoLado que escreve, envia e acompanha. Só o contactamos quando houver uma decisão a tomar ou uma resposta da empresa.",
  },
  {
    q: "O que acontece se a empresa não responder?",
    a: "Vigiamos o prazo legal de resposta e, esgotado esse prazo, preparamos o passo seguinte com um dossiê completo do caso — pronto para seguir para a entidade competente.",
  },
  {
    q: "Que documentos preciso de ter?",
    a: "O que tiver à mão: faturas, contrato, e-mails ou mensagens trocadas com a empresa e registos de contactos com o apoio ao cliente. Se faltar algo, dizemos-lhe exatamente o que pedir.",
  },
  {
    q: "Tratam de qualquer tipo de problema?",
    a: "Durante a fase Beta tratamos apenas casos de telecomunicações, energia e água/resíduos — são os setores onde as regras são mais claras e onde queremos validar bem o serviço. Depois abriremos a todos os setores. Se o seu caso estiver fora destes três ou não tiver base para reclamação, dizemos-lhe isso à partida.",
  },
  {
    q: "Prefiro só falar antes de decidir — dá?",
    a: "Dá, sim.",
    cta: true,
  },
];

export function FaqAccordion() {
  const [open, setOpen] = useState<number>(-1);

  return (
    <div className="flex flex-col border-t border-[var(--color-hairline)]">
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} className="border-b border-[var(--color-hairline)]">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-5 py-5 text-left text-[17px] font-semibold tracking-tight text-[var(--color-ink)]"
            >
              <span className="leading-snug">{f.q}</span>
              <span className="flex-none text-[22px] font-normal leading-none text-[var(--color-brand)]">
                {isOpen ? "−" : "+"}
              </span>
            </button>
            {isOpen && (
              <div className="pb-6 pr-0 text-[var(--text-body)] leading-relaxed text-[var(--color-ink-muted)] sm:pr-12">
                <p>{f.a}</p>
                {f.cta && (
                  <p className="mt-3">
                    <a
                      href="https://calendly.com/dolado-startup/30min"
                      target="_blank"
                      rel="noopener"
                      className="font-semibold text-[var(--color-brand)] underline underline-offset-4 hover:text-[var(--color-brand-hover)]"
                    >
                      Marque 15 minutos comigo
                    </a>
                    , sem qualquer compromisso — só para me contar o que se passou e tirar dúvidas.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
