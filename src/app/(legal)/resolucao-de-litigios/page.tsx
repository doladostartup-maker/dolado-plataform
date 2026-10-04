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
// src/lib/legal.ts (ENTIDADES_RAL), confirmadas contra a lista oficial da DGC
// a 04/10/2026; pontos por validar em REVISAO_JURIDICA_PENDENTE.
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
          Em caso de litígio de consumo com a DoLado, o consumidor pode recorrer a uma entidade de resolução
          alternativa de litígios de consumo, que procura resolver o litígio por mediação, conciliação ou arbitragem.
          Recorrer a estas entidades é uma opção do consumidor, que pode sempre recorrer aos tribunais.
        </p>
        <p className={P}>
          Nem todas as entidades são competentes para todos os litígios. Em regra, é competente o centro de
          arbitragem da zona onde o contrato foi celebrado; quando não exista um centro regional competente, é
          competente o CNIACC, que atua em todo o território nacional. O CAUAL tem competência em todo o território
          nacional, mas não é exclusivo de conflitos de consumo. Em caso de dúvida, a própria entidade pode
          indicar se é competente para o seu caso.
        </p>
        <p className={P}>
          Nos litígios de valor não superior a 5 000 € (alçada dos tribunais de 1.ª instância), se o consumidor
          optar expressamente por submeter o litígio a um centro de arbitragem de conflitos de consumo legalmente
          autorizado, a DoLado fica sujeita a essa arbitragem, nos termos do artigo 14.º, n.º 2, da Lei n.º 24/96,
          de 31 de julho.
        </p>
        <ul className="flex flex-col gap-3 text-base leading-relaxed text-[var(--color-ink)]">
          {ENTIDADES_RAL.map((e) => (
            <li key={e.nome}>
              <a href={e.site} target="_blank" rel="noopener noreferrer" className={LINK}>
                {e.nome}
              </a>
              <span className="block text-[14px] text-[var(--color-ink-muted)]">{e.ambito}</span>
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
