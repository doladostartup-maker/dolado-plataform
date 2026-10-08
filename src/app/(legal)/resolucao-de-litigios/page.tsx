import type { Metadata } from "next";
import { ENTIDADES_RAL, LISTA_OFICIAL_RAL_URL, LIVRO_RECLAMACOES_URL } from "@/lib/legal";
import { CONTACTO_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Reclamações e resolução de litígios — DoLado",
  description:
    "Como apresentar uma reclamação sobre o serviço da DoLado: contacto, Livro de Reclamações Eletrónico e entidades de resolução alternativa de litígios de consumo.",
};

const H2 = "text-xl font-semibold text-[var(--color-ink)]";
const P = "text-base leading-relaxed text-[var(--color-ink)]";
const LINK = "text-[var(--color-brand)] underline";

// Obrigações da DoLado enquanto prestadora de serviços (DL 156/2005 na
// redação do DL 74/2017; Lei 144/2015, art. 18.º). Não confundir com as
// reclamações que a DoLado trata em nome dos clientes. Entidades em
// src/lib/legal.ts (ENTIDADES_RAL), conforme a lista oficial da DGC.
export default function ResolucaoLitigiosPage() {
  return (
    <article className="flex flex-col gap-6 pt-4">
      <h1 className="text-[32px] font-semibold leading-tight text-[var(--color-ink)]">
        Reclamações e resolução de litígios
      </h1>
      <p className={P}>
        Esta página diz respeito a reclamações sobre o próprio serviço da DoLado. Não se aplica às reclamações que a
        DoLado prepara e acompanha em nome dos seus clientes junto de outras empresas.
      </p>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>Falar connosco</h2>
        <p className={P}>
          Se tiver alguma questão ou reclamação sobre o serviço, escreva-nos para{" "}
          <a href={`mailto:${CONTACTO_EMAIL}`} className={LINK}>
            {CONTACTO_EMAIL}
          </a>
          . Analisamos cada situação e respondemos por e-mail.
        </p>
      </section>

      <section id="livro-de-reclamacoes" className="flex flex-col gap-3">
        <h2 className={H2}>Livro de Reclamações</h2>
        <p className={P}>
          Pode também apresentar uma reclamação no{" "}
          <a href={LIVRO_RECLAMACOES_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
            Livro de Reclamações Eletrónico
          </a>
          .
        </p>
      </section>

      <section id="ral" className="flex flex-col gap-3">
        <h2 className={H2}>Resolução alternativa de litígios de consumo</h2>
        <p className={P}>
          Em caso de litígio de consumo, o consumidor pode recorrer a uma entidade de resolução alternativa de
          litígios de consumo. A entidade adequada depende do setor, do âmbito territorial e material, do valor e das
          regras de cada entidade. A lista abaixo é informativa e não determina qual é competente para um caso
          concreto; confirme diretamente com a entidade. A lista oficial inclui centros de competência geral e
          entidades setoriais.
        </p>
        <h3 className={H2}>Centros de competência geral</h3>
        <ul className="flex flex-col gap-3 text-base leading-relaxed text-[var(--color-ink)]">
          {ENTIDADES_RAL.filter((e) => e.tipo === "geral").map((e) => (
            <li key={e.nome}>
              <a href={e.site} target="_blank" rel="noopener noreferrer" className={LINK}>
                {e.nome}
              </a>
            </li>
          ))}
        </ul>
        <h3 className={H2}>Entidades setoriais</h3>
        <ul className="flex flex-col gap-3 text-base leading-relaxed text-[var(--color-ink)]">
          {ENTIDADES_RAL.filter((e) => e.tipo === "setorial").map((e) => (
            <li key={e.nome}>
              <a href={e.site} target="_blank" rel="noopener noreferrer" className={LINK}>
                {e.nome}
              </a>
            </li>
          ))}
        </ul>
        <p className={P}>
          A lista oficial e atualizada das entidades de resolução alternativa de litígios de consumo está disponível
          no{" "}
          <a href={LISTA_OFICIAL_RAL_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
            Portal do Consumidor
          </a>
          .
        </p>
      </section>
    </article>
  );
}
