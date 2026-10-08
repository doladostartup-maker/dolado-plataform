import Link from "next/link";
import type { ReactNode } from "react";
import { CTASection } from "@/components/marketing-v2/CTASection";
import { FAQAccordionV2 } from "@/components/marketing-v2/FAQAccordionV2";
import {
  IconeCirculoVisto,
  IconeDocumentoVisto,
  IconeEtiqueta,
  IconeFatura,
  IconeMensagem,
  IconePessoas,
  IconeSeta,
  IconeVisto,
} from "@/components/marketing-v2/Icones";
import { VisualHero } from "@/components/marketing-v2/Mockups";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";
import { StepsTimeline, type Passo } from "@/components/marketing-v2/StepsTimeline";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";
import type { Pergunta } from "@/components/landing/AccordionPerguntas";
import { CONTACTO_EMAIL } from "@/lib/site";

// DoLado para empresas (/empresas): página estática de apresentação a
// empresas que queiram disponibilizar a DoLado a colaboradores, oferecê-la a
// clientes ou explorar os dois públicos. Sem formulário próprio nem backend:
// o contacto usa o formulário já existente em /contacto ("Imprensa, parcerias
// e outros assuntos") e o e-mail institucional. Sem preços, condições,
// clientes nem resultados — formatos e condições ficam para a conversa.

const CONTACTO_EMPRESAS = `${ROTAS_V2.contacto}#formulario`;
const LINK = "font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline";

function AcoesContacto({ secundaria }: { secundaria?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link prefetch={false} href={CONTACTO_EMPRESAS} className={BOTAO_PRIMARIO}>
        Falar com a DoLado <IconeSeta tamanho={17} />
      </Link>
      {secundaria}
    </div>
  );
}

const PUBLICOS: { icone: ReactNode; titulo: string; texto: string; pontos: string[] }[] = [
  {
    icone: <IconePessoas tamanho={28} strokeWidth={1.6} />,
    titulo: "Um benefício para colaboradores",
    texto:
      "Quando surge um problema com uma fatura, um serviço ou uma compra, o colaborador tem a quem recorrer. A DoLado ajuda a organizar a situação, prepara a reclamação e acompanha os próximos passos — sem que a pessoa tenha de descobrir tudo sozinha.",
    pontos: [
      "Apoio prático em problemas de consumo do dia a dia",
      "Cada pessoa trata do seu caso diretamente com a DoLado",
      "Menos tempo e preocupação com processos difíceis de perceber",
    ],
  },
  {
    icone: <IconeCirculoVisto tamanho={28} strokeWidth={1.6} />,
    titulo: "Uma oferta para os seus clientes",
    texto:
      "Acrescente à relação com os seus clientes um apoio útil para quando algo corre mal com outra empresa. A DoLado pode ser apresentada como um recurso adicional, com comunicação adequada ao seu público.",
    pontos: [
      "Um serviço concreto, aplicado a situações reais",
      "Valor acrescentado na relação que já tem com os clientes",
      "Forma de acesso definida em conjunto",
    ],
  },
];

const PASSOS: Passo[] = [
  {
    titulo: "A pessoa explica o que aconteceu",
    texto: "Uma cobrança, um cancelamento, um reembolso que não chega ou uma reclamação que ficou sem resposta.",
    rotulo: { texto: "A pessoa", doCliente: true },
  },
  {
    titulo: "A DoLado organiza a situação",
    texto: "Percebemos a informação relevante e o que pode ser pedido, com base nos factos e nos documentos do caso.",
    rotulo: { texto: "A DoLado", doCliente: false },
  },
  {
    titulo: "A reclamação é preparada e revista",
    texto: "A DoLado prepara o texto da reclamação. A pessoa revê-o e só depois de o autorizar é que ele segue.",
    rotulo: { texto: "A pessoa decide", doCliente: true },
  },
  {
    titulo: "Os próximos passos são acompanhados",
    texto:
      "A DoLado acompanha a resposta da empresa reclamada e mantém a pessoa informada sobre o estado do caso e as opções seguintes.",
    rotulo: { texto: "A DoLado", doCliente: false },
    final: true,
  },
];

const EXEMPLOS: { icone: ReactNode; titulo: string; texto: string; contexto: string }[] = [
  {
    icone: <IconeFatura tamanho={26} strokeWidth={1.6} />,
    titulo: "Cobranças inesperadas",
    texto: "Uma fatura com um valor que não se percebe ou um serviço cobrado que não foi pedido.",
    contexto: "Telecomunicações · energia · água",
  },
  {
    icone: <IconeDocumentoVisto tamanho={26} strokeWidth={1.6} />,
    titulo: "Cancelamentos",
    texto: "Um pedido de cancelamento que não avança ou encargos de saída que levantam dúvidas.",
    contexto: "Contratos de serviços · subscrições",
  },
  {
    icone: <IconeEtiqueta tamanho={26} strokeWidth={1.6} />,
    titulo: "Reembolsos",
    texto: "Uma devolução aceite, mas um reembolso que continua por chegar.",
    contexto: "Compras · serviços",
  },
  {
    icone: <IconeMensagem tamanho={26} strokeWidth={1.6} />,
    titulo: "Reclamações sem resposta",
    texto: "A pessoa já tentou resolver diretamente com a empresa e não teve resposta ou solução.",
    contexto: "Preparação · acompanhamento",
  },
];

const FORMATOS: { titulo: string; texto: string }[] = [
  {
    titulo: "Para colaboradores",
    texto: "Dar à equipa uma forma simples de conhecer e aceder ao apoio da DoLado.",
  },
  {
    titulo: "Para clientes",
    texto: "Apresentar a DoLado como um recurso adicional na relação com os seus clientes.",
  },
  {
    titulo: "Para os dois públicos",
    texto: "Combinar colaboradores e clientes, com a comunicação adequada a cada grupo.",
  },
  {
    titulo: "Uma primeira experiência delimitada",
    texto: "Começar com um âmbito definido, aprender com a utilização e decidir os passos seguintes.",
  },
];

const CLAREZA: { titulo: string; texto: string }[] = [
  {
    titulo: "O caso começa com a pessoa",
    texto: "É ela que explica a situação e decide se quer avançar.",
  },
  {
    titulo: "A reclamação é revista antes do envio",
    texto: "A pessoa vê o texto preparado pela DoLado e só autoriza o envio se concordar com ele.",
  },
  {
    titulo: "O resultado depende da entidade reclamada",
    texto: "A DoLado prepara e acompanha o processo, mas não promete uma resposta nem um resultado específico.",
  },
];

const PERGUNTAS: Pergunta[] = [
  {
    id: "empresas-publico",
    pergunta: "A quem pode a empresa disponibilizar a DoLado?",
    resposta:
      "A colaboradores, a clientes ou aos dois públicos. O público, a forma de acesso e a comunicação são definidos em conjunto, de acordo com o objetivo da sua empresa.",
  },
  {
    id: "empresas-apoio",
    pergunta: "Que tipo de apoio presta a DoLado?",
    resposta:
      "A DoLado ajuda a resolver problemas com empresas — por exemplo, de telecomunicações, energia ou água: organiza a situação, prepara a reclamação, que a pessoa revê antes do envio, e acompanha os próximos passos. Com a Proteção, a DoLado acompanha também as datas e as faturas indicadas pela pessoa, para ajudar a detetar um problema a tempo.",
  },
  {
    id: "empresas-casos",
    pergunta: "A empresa tem acesso aos casos individuais?",
    resposta:
      "Cada caso é tratado diretamente entre a pessoa e a DoLado. A solução não pressupõe que a empresa aceda aos casos individuais de quem utiliza a DoLado; qualquer informação a partilhar no âmbito de uma parceria é definida e explicada com clareza antes de começar.",
  },
  {
    id: "empresas-condicoes",
    pergunta: "Quais são os preços e as condições para empresas?",
    resposta:
      "Dependem do público, do formato e da utilização pretendida, e são definidos numa conversa com a DoLado. Fale connosco para explorarmos o que faz sentido para a sua empresa.",
  },
  {
    id: "empresas-resultado",
    pergunta: "A DoLado garante que a reclamação é resolvida?",
    resposta:
      "Não. A DoLado prepara e acompanha o processo, mas a resposta e o resultado dependem da entidade reclamada.",
  },
];

export function EmpresasV2() {
  return (
    <>
      {/* ===== Hero ===== */}
      <SectionV2 size="compact" recortar className="grid items-center gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-12 lg:py-20">
        <div>
          <Eyebrow>DoLado para empresas</Eyebrow>
          <h1 className="mt-5 text-[clamp(32px,3.6vw,48px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--v2-navy)]">
            Tem uma empresa?
            <br />
            <span className="font-semibold">Fale com a DoLado sobre uma solução para colaboradores ou clientes.</span>
          </h1>
          <p className={`${TEXTO} mt-6 max-w-[560px] text-[17.5px]`}>
            Quando alguém tem um problema com uma empresa — uma cobrança, um cancelamento, um reembolso — a DoLado
            ajuda a organizar a situação, prepara a reclamação e acompanha os próximos passos. A sua empresa pode
            levar esse apoio a quem conta consigo.
          </p>
          <div className="mt-8">
            <AcoesContacto
              secundaria={
                <a href="#como-funciona" className={BOTAO_CONTORNO}>
                  Ver como funciona
                </a>
              }
            />
          </div>
          <p className="mt-6 text-[14px] text-[var(--v2-muted)]">
            Formatos e condições definidos numa conversa, de acordo com o público e o objetivo da sua empresa.
          </p>
        </div>
        <VisualHero />
      </SectionV2>

      {/* ===== Proposta de valor ===== */}
      <SectionV2 id="solucao" tone="soft-blue">
        <SectionHeader
          eyebrow="Uma solução, dois públicos"
          titulo="Apoio aplicado a problemas concretos."
          texto="Não é uma lista de funcionalidades: é um serviço que acompanha a pessoa desde o problema até aos próximos passos."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {PUBLICOS.map((p) => (
            <article key={p.titulo} className={`${CARTAO} flex flex-col p-7 sm:p-9`}>
              <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--v2-mint)] text-[var(--v2-green)]">
                {p.icone}
              </span>
              <h3 className="mt-5 text-[22px] font-bold tracking-[-0.015em] text-[var(--v2-navy)]">{p.titulo}</h3>
              <p className="mt-3 text-[15.5px] leading-relaxed text-[var(--v2-muted)]">{p.texto}</p>
              <ul className="mt-6 space-y-3">
                {p.pontos.map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[15px] text-[var(--v2-navy)]">
                    <span className="mt-[1px] flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-[var(--v2-green)] text-white">
                      <IconeVisto tamanho={13} strokeWidth={2.8} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </SectionV2>

      {/* ===== Como funciona ===== */}
      <SectionV2 id="como-funciona">
        <SectionHeader
          eyebrow="Como funciona"
          titulo="Do problema ao próximo passo."
          texto="A experiência começa com aquilo que aconteceu à pessoa. A DoLado transforma a situação em apoio prático."
        />
        <div className="mt-12">
          <StepsTimeline passos={PASSOS} />
        </div>
      </SectionV2>

      {/* ===== Exemplos de utilização ===== */}
      <SectionV2 tone="soft-green">
        <SectionHeader
          eyebrow="Exemplos de utilização"
          titulo="Situações em que a ajuda faz diferença."
          texto="Problemas de consumo comuns, que levam tempo e paciência a quem os tenta resolver sozinho."
          sobreVerde
        />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {EXEMPLOS.map((e) => (
            <li key={e.titulo} className={`${CARTAO} flex flex-col p-6`}>
              <span className="text-[var(--v2-green)]">{e.icone}</span>
              <h3 className="mt-4 text-[18px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{e.titulo}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--v2-muted)]">{e.texto}</p>
              <p className="mt-auto pt-5 text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--v2-green-dark)]">
                {e.contexto}
              </p>
            </li>
          ))}
        </ul>
      </SectionV2>

      {/* ===== Formatos ===== */}
      <SectionV2 id="formatos" className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <SectionHeader
          eyebrow="Formatos a explorar"
          titulo="Uma conversa para encontrar o formato certo."
          texto="O público, a forma de acesso e as condições definem-se em conjunto, de acordo com o objetivo da sua empresa. Estes são pontos de partida, não pacotes fechados."
        />
        <ol className="border-t border-[var(--v2-line)]">
          {FORMATOS.map((f, i) => (
            <li key={f.titulo} className="flex gap-5 border-b border-[var(--v2-line)] py-6">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-[var(--v2-mint)] text-[14px] font-bold text-[var(--v2-green-dark)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-[18px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{f.titulo}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-[var(--v2-muted)]">{f.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </SectionV2>

      {/* ===== Confiança e clareza ===== */}
      <SectionV2 tone="soft-blue" className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <SectionHeader
          eyebrow="Confiança e clareza"
          titulo="A pessoa mantém o controlo do seu caso."
          texto="A DoLado prepara e acompanha a situação. A pessoa revê a reclamação antes do envio e decide como quer avançar."
        />
        <ul className="space-y-6">
          {CLAREZA.map((c) => (
            <li key={c.titulo} className="flex items-start gap-4">
              <span className="mt-[2px] flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-[var(--v2-green)] text-white">
                <IconeVisto tamanho={14} strokeWidth={2.8} />
              </span>
              <div>
                <h3 className="text-[17px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{c.titulo}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-[var(--v2-muted)]">{c.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </SectionV2>

      {/* ===== Perguntas frequentes ===== */}
      <SectionV2 id="perguntas" className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
        <SectionHeader
          eyebrow="Perguntas frequentes"
          titulo="Antes de começarmos."
          texto="Uma primeira conversa ajuda a esclarecer o que faz sentido para a sua empresa."
        />
        <FAQAccordionV2 perguntas={PERGUNTAS} />
      </SectionV2>

      {/* ===== CTA final ===== */}
      <CTASection
        eyebrow="Vamos conversar"
        titulo="Tem uma empresa? Fale com a DoLado."
        texto={
          <>
            Conte-nos o que tem em mente — colaboradores, clientes ou ambos — e exploramos o próximo passo consigo.
            Também pode escrever para{" "}
            <a href={`mailto:${CONTACTO_EMAIL}`} className={LINK}>
              {CONTACTO_EMAIL}
            </a>
            .
          </>
        }
        acao={
          <Link prefetch={false} href={CONTACTO_EMPRESAS} className={`${BOTAO_PRIMARIO} w-full md:w-auto`}>
            Falar com a DoLado <IconeSeta tamanho={17} />
          </Link>
        }
      />
    </>
  );
}
