"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { track } from "@/lib/analytics";
import { urlTratarCaso } from "@/lib/site";
import { AccordionPerguntas, type Pergunta } from "./AccordionPerguntas";
import { RodapeLegal } from "./RodapeLegal";
import { SiteHeader } from "./SiteHeader";

// Guia público de mudança de casa (F3 — docs/especificacoes/
// F3_MUDANCA_CASA_PUBLICA.md). Página estática de aquisição e educação:
// sem login, sem formulários, sem IA, nada gravado. Os CTAs levam a
// "Tratar o meu caso" com a origem desta página e, quando faz sentido, o
// setor pré-preenchido (só valores das listas de src/lib/pedidoCaso.ts).

const ORIGEM = "/mudanca-de-casa";

type SetorCaso = "Telecomunicações" | "Energia" | "Água";

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";
const LINK =
  "font-medium text-[var(--color-brand)] underline underline-offset-2 hover:text-[var(--color-brand-hover)]";
const TEXTO = "text-[15px] leading-relaxed text-[var(--color-ink-muted)]";
const LISTA = `flex list-disc flex-col gap-1.5 pl-5 ${TEXTO} marker:text-[var(--color-ink-faint)]`;

function hrefTratarCaso(setor?: SetorCaso) {
  const base = urlTratarCaso(ORIGEM);
  return setor ? `${base}&setor=${encodeURIComponent(setor)}` : base;
}

function abrirTratarCaso(local: string) {
  track("mudanca_casa_clique_tratar_caso", { local });
}

// ---------------------------------------------------------------------------
// Blocos
// ---------------------------------------------------------------------------

function Seccao({ id, numero, titulo, intro, children }: { id: string; numero: string; titulo: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-24">
      <p className="mb-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--color-brand)]">{numero}</p>
      <h2 id={`${id}-titulo`} className="mb-3 text-[clamp(21px,3.6vw,25px)] font-semibold leading-[1.25] tracking-[-0.01em] text-[var(--color-ink)]">
        {titulo}
      </h2>
      {intro && <p className={`${TEXTO} mb-5`}>{intro}</p>}
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-[14px] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-subtle)] sm:p-6">
      <h3 className="mb-2.5 text-[17px] font-semibold text-[var(--color-ink)]">{titulo}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function CtaContextual({ pergunta, setor, local }: { pergunta: string; setor?: SetorCaso; local: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] bg-[var(--color-brand-wash)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[14.5px] font-medium leading-snug text-[var(--color-ink)]">{pergunta}</p>
      <a href={hrefTratarCaso(setor)} onClick={() => abrirTratarCaso(local)} className={`${BOTAO_PRIMARIO} flex-none`}>
        Tratar o meu caso
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Perguntas frequentes
// ---------------------------------------------------------------------------

const PERGUNTAS: Pergunta[] = [
  {
    id: "cpe-muda",
    pergunta: "O CPE muda quando mudo de casa?",
    resposta: (
      <p>
        Sim. O CPE identifica a instalação elétrica, não a pessoa nem o contrato. A casa nova tem o seu próprio CPE, que
        se mantém mesmo quando muda o titular ou o comercializador. O CPE da casa antiga fica com a casa antiga.
      </p>
    ),
  },
  {
    id: "cui-muda",
    pergunta: "E o CUI do gás?",
    resposta: (
      <p>
        Funciona da mesma forma: o CUI identifica a instalação de gás natural da casa. Na casa nova, use o CUI dessa
        instalação. Não confunda CUI com CUR, que é o comercializador de último recurso, uma entidade e não um código.
      </p>
    ),
  },
  {
    id: "transferir-telecom",
    pergunta: "Posso levar o contrato de internet e televisão para a casa nova?",
    resposta: (
      <p>
        Depende de o operador ter cobertura e conseguir prestar o mesmo serviço na nova morada. Peça ao operador, por
        escrito, a confirmação da cobertura e das condições da transferência, incluindo o que acontece à fidelização e
        aos equipamentos. Se o serviço não puder ser prestado na nova morada, pergunte quais são as condições de
        cessação e guarde a resposta.
      </p>
    ),
  },
  {
    id: "leitura-contador",
    pergunta: "O que devo fazer com a leitura dos contadores?",
    resposta: (
      <p>
        No dia em que sai, fotografe os contadores de eletricidade, gás e água, com a data visível sempre que possível,
        e comunique as leituras ao fornecedor. Faça o mesmo quando entra na casa nova. Se a fatura final usar um valor
        diferente, estas fotografias ajudam a esclarecer a diferença.
      </p>
    ),
  },
  {
    id: "devolver-equipamento",
    pergunta: "Como provo que devolvi o router ou a box?",
    resposta: (
      <p>
        Peça sempre um comprovativo de entrega, seja numa loja ou por envio, com a data e a identificação dos
        equipamentos (de preferência o número de série). Guarde-o até receber a fatura final sem cobranças de
        equipamento.
      </p>
    ),
  },
  {
    id: "ultima-fatura",
    pergunta: "O que devo verificar na última fatura?",
    resposta: (
      <p>
        Se o período faturado termina na data de saída, se a leitura usada corresponde à que comunicou, se aparecem
        encargos de cancelamento ou de equipamento e se continuam a existir cobranças depois da data em que o contrato
        devia ter terminado.
      </p>
    ),
  },
];

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const INDICE = [
  { id: "antes", titulo: "Antes da mudança" },
  { id: "dia-da-saida", titulo: "No dia da saída" },
  { id: "casa-nova", titulo: "Na casa nova" },
  { id: "depois", titulo: "Depois da mudança" },
  { id: "dolado", titulo: "Quando a DoLado pode ajudar" },
  { id: "perguntas", titulo: "Perguntas frequentes" },
];

export function MudancaDeCasa() {
  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <SiteHeader
        ctaLabel="Tratar o meu caso"
        onCtaClick={() => {
          abrirTratarCaso("cabecalho");
          window.location.assign(hrefTratarCaso());
        }}
      />

      {/* ===== Introdução ===== */}
      <section className="mx-auto max-w-[680px] px-4 pt-12 pb-2 text-center sm:px-10 sm:pt-14">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.06em] text-[var(--color-brand)]">Guia DoLado · grátis</p>
        <h1 className="text-[clamp(26px,5vw,34px)] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--color-ink)]">
          Mudança de casa: o que precisa de tratar
        </h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-[var(--color-ink-muted)]">
          Mudar de casa implica tratar de vários contratos e serviços. Use este guia para perceber o que deve preparar,
          o que deve guardar e quando pode existir um problema que justifique uma reclamação.
        </p>
      </section>

      {/* ===== Índice ===== */}
      <nav aria-label="Nesta página" className="mx-auto max-w-[760px] px-4 pt-6 sm:px-10">
        <ul className="flex flex-wrap justify-center gap-2">
          {INDICE.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="inline-flex min-h-9 items-center rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-white px-3.5 text-[13px] font-medium text-[var(--color-ink-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
              >
                {s.titulo}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto flex max-w-[720px] flex-col gap-14 px-4 pt-12 pb-14 sm:px-10">
        {/* ===== 1. Antes ===== */}
        <Seccao
          id="antes"
          numero="1"
          titulo="Antes da mudança"
          intro="Quanto mais cedo tratar destes pontos, menos surpresas terá na casa nova e na última fatura da casa antiga."
        >
          <Cartao titulo="Telecomunicações (internet, televisão, telefone)">
            <ul className={LISTA}>
              <li>Confirme se o seu operador tem cobertura na nova morada.</li>
              <li>Pergunte se o serviço atual pode ser transferido e em que condições.</li>
              <li>Veja até quando vai a fidelização: costuma aparecer na fatura mensal.</li>
              <li>
                Se pensa cancelar, peça ao operador o valor dos encargos. Pode também fazer uma estimativa na{" "}
                <Link href="/calculadora-cancelamento" className={LINK}>
                  Calculadora de Cancelamento
                </Link>
                .
              </li>
              <li>Pergunte o que deve fazer aos equipamentos (router, box, cartões) e até quando.</li>
              <li>Peça as respostas por escrito e guarde-as.</li>
            </ul>
            <CtaContextual
              pergunta="Está a ter dificuldades com a transferência ou o cancelamento?"
              setor="Telecomunicações"
              local="antes_telecomunicacoes"
            />
          </Cartao>

          <Cartao titulo="Eletricidade">
            <ul className={LISTA}>
              <li>Identifique o contrato atual: comercializador, titular e CPE (está na fatura).</li>
              <li>Decida a data de saída e informe o comercializador com antecedência.</li>
              <li>Perceba como vai ficar o contrato da casa nova: se a instalação já está ligada ou se precisa de ligação.</li>
              <li>Guarde as leituras e os comprovativos dos pedidos que fizer.</li>
            </ul>
          </Cartao>

          <Cartao titulo="Gás">
            <ul className={LISTA}>
              <li>Localize o CUI na fatura de gás.</li>
              <li>Prepare a leitura do contador para o dia da saída.</li>
              <li>Confirme a situação da instalação na casa nova: se tem gás natural, gás de garrafa ou nenhum.</li>
              <li>Guarde os documentos e os comprovativos dos pedidos.</li>
            </ul>
          </Cartao>

          <Cartao titulo="Água">
            <ul className={LISTA}>
              <li>Identifique a entidade gestora: normalmente a câmara municipal, os serviços municipalizados ou uma empresa concessionária.</li>
              <li>Veja o procedimento local para terminar o contrato da casa antiga e abrir o da casa nova.</li>
              <li>Prepare a leitura do contador para o dia da saída.</li>
            </ul>
          </Cartao>
        </Seccao>

        {/* ===== 2. Dia da saída ===== */}
        <Seccao
          id="dia-da-saida"
          numero="2"
          titulo="No dia da saída"
          intro="Fotografias e comprovativos tirados neste dia são muitas vezes o que permite esclarecer uma divergência mais tarde."
        >
          <Cartao titulo="Lista para o dia da saída">
            <ul className={LISTA}>
              <li>Fotografe os contadores de eletricidade, gás e água.</li>
              <li>Registe as leituras, com a data e a hora.</li>
              <li>Guarde os comprovativos de entrega dos equipamentos.</li>
              <li>Guarde os pedidos de cancelamento ou de alteração que enviou e as respostas que recebeu.</li>
              <li>Não deite fora a documentação da casa antiga antes de receber a fatura final de cada serviço.</li>
            </ul>
          </Cartao>
        </Seccao>

        {/* ===== 3. Casa nova ===== */}
        <Seccao
          id="casa-nova"
          numero="3"
          titulo="Na casa nova"
          intro="Cada casa tem os seus próprios identificadores de instalação. Não são transportados da casa antiga."
        >
          <Cartao titulo="CPE: Código de Ponto de Entrega">
            <p className={TEXTO}>
              Identifica a instalação elétrica da casa. É um código que começa por &quot;PT&quot; e aparece nas faturas
              de eletricidade. A casa nova tem o seu próprio CPE: é esse que deve indicar ao contratar a eletricidade.
            </p>
          </Cartao>

          <Cartao titulo="CUI: Código Universal de Instalação">
            <p className={TEXTO}>
              Identifica a instalação de gás natural da casa e aparece nas faturas de gás. Tal como o CPE, pertence à
              instalação e não ao cliente. Não confunda com CUR (comercializador de último recurso), que é uma entidade.
            </p>
          </Cartao>

          <Cartao titulo="O que tratar na casa nova">
            <ul className={LISTA}>
              <li>
                <strong className="text-[var(--color-ink)]">Telecomunicações:</strong> confirme a cobertura e a data de
                instalação antes de terminar o serviço na casa antiga.
              </li>
              <li>
                <strong className="text-[var(--color-ink)]">Eletricidade e gás:</strong> escolha o comercializador e
                indique o CPE e o CUI da casa nova.
              </li>
              <li>
                <strong className="text-[var(--color-ink)]">Água:</strong> abra contrato com a entidade gestora do novo
                município ou da nova zona.
              </li>
              <li>
                <strong className="text-[var(--color-ink)]">Titularidade:</strong> confirme que os contratos ficam em
                nome de quem vai pagar.
              </li>
              <li>
                <strong className="text-[var(--color-ink)]">Documentação:</strong> alguns fornecedores pedem um
                documento que comprove a ocupação da casa, como o contrato de arrendamento ou a escritura. Tenha-o à mão.
              </li>
            </ul>
          </Cartao>
        </Seccao>

        {/* ===== 4. Depois ===== */}
        <Seccao
          id="depois"
          numero="4"
          titulo="Depois da mudança"
          intro="Nas semanas seguintes chegam as últimas faturas da casa antiga e as primeiras da casa nova. Vale a pena lê-las com atenção."
        >
          <Cartao titulo="O que verificar">
            <ul className={LISTA}>
              <li>A fatura final de cada serviço da casa antiga.</li>
              <li>Consumos faturados depois da data de saída.</li>
              <li>A leitura usada, comparada com a que fotografou.</li>
              <li>Encargos de cancelamento.</li>
              <li>Equipamentos cobrados que já foram devolvidos.</li>
              <li>Contratos que continuam ativos quando já deviam ter terminado.</li>
              <li>Cobranças que continuam a chegar depois da saída.</li>
              <li>Se os serviços da casa nova começaram a ser faturados na data certa.</li>
            </ul>
            <CtaContextual
              pergunta="Encontrou uma cobrança, uma recusa ou outro problema depois da mudança?"
              local="depois"
            />
          </Cartao>
        </Seccao>

        {/* ===== Quando a DoLado entra ===== */}
        <Seccao id="dolado" numero="Quando a DoLado pode ajudar" titulo="A DoLado entra quando surge um problema">
          <div className="grid gap-4 sm:grid-cols-2">
            <Cartao titulo="Não é connosco">
              <p className={TEXTO}>Estes pedidos fazem-se diretamente junto do fornecedor:</p>
              <ul className={LISTA}>
                <li>pedir uma nova ligação;</li>
                <li>escolher um fornecedor;</li>
                <li>comunicar leituras;</li>
                <li>mudar a titularidade de um contrato.</li>
              </ul>
            </Cartao>
            <Cartao titulo="Aqui a DoLado ajuda">
              <ul className={LISTA}>
                <li>o fornecedor recusa o seu pedido;</li>
                <li>não obtém resposta;</li>
                <li>aparece uma cobrança inesperada;</li>
                <li>o cancelamento não foi feito;</li>
                <li>a leitura faturada não corresponde à real;</li>
                <li>discorda de uma penalização;</li>
                <li>devolveu o equipamento e foi cobrado na mesma;</li>
                <li>outro problema com o fornecedor.</li>
              </ul>
            </Cartao>
          </div>
          <p className={TEXTO}>
            Em &quot;Tratar o meu caso&quot; descreve o que aconteceu, cria a sua conta e escolhe a modalidade. Se ainda
            não sabe se a DoLado pode ajudar, experimente o{" "}
            <Link href="/simulador-elegibilidade" className={LINK}>
              Simulador de Elegibilidade
            </Link>
            .
          </p>
        </Seccao>

        {/* ===== Perguntas ===== */}
        <section id="perguntas" aria-labelledby="perguntas-titulo" className="scroll-mt-24">
          <h2 id="perguntas-titulo" className="mb-3 text-[clamp(21px,3.6vw,25px)] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">
            Perguntas frequentes
          </h2>
          <AccordionPerguntas perguntas={PERGUNTAS} />
        </section>

        <p className="text-[13px] leading-relaxed text-[var(--color-ink-faint)]">
          Este guia tem informação geral e não substitui as condições do seu contrato nem uma avaliação jurídica do seu
          caso. Os procedimentos podem variar de fornecedor para fornecedor.
        </p>
      </div>

      {/* ===== CTA final ===== */}
      <section className="flex flex-col items-center border-t border-[var(--color-hairline)] px-4 py-14 text-center sm:px-10">
        <h2 className="mb-2 text-[22px] font-semibold tracking-[-0.01em] text-[var(--color-ink)]">Surgiu um problema com a mudança?</h2>
        <p className="mb-5 max-w-[460px] text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
          Conte-nos o que aconteceu. A DoLado trata da reclamação junto do fornecedor e acompanha o seu caso.
        </p>
        <a href={hrefTratarCaso()} onClick={() => abrirTratarCaso("final")} className={BOTAO_PRIMARIO}>
          Tratar o meu caso
        </a>
      </section>

      <RodapeLegal />
    </div>
  );
}
