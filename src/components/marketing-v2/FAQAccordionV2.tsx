import { AccordionPerguntas, type Pergunta } from "@/components/landing/AccordionPerguntas";

// Perguntas frequentes no Design System V2. Mesmo accordion acessível e mesmo
// conteúdo das Perguntas Frequentes (conteudoPerguntasFrequentes.tsx), para as
// respostas não divergirem entre páginas.
export function FAQAccordionV2({ perguntas, nivelTitulo = 3 }: { perguntas: Pergunta[]; nivelTitulo?: 2 | 3 | 4 }) {
  return <AccordionPerguntas variante="v2" perguntas={perguntas} nivelTitulo={nivelTitulo} />;
}
