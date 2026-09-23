import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos e Condições — DoLado",
};

export default function TermosPage() {
  return (
    <article className="flex flex-col gap-6 pt-4">
      <div>
        <h1 className="text-[32px] font-semibold leading-tight text-[var(--color-ink)]">
          Termos e Condições — Fase Beta
        </h1>
        <p className="mt-1 text-base text-[var(--color-ink-muted)]">
          DoLado — a sua reclamação, feita bem
        </p>
      </div>

      <div className="rounded-lg border-l-[3px] border-[var(--color-brand)] bg-[var(--color-surface-sunken)] p-4 text-sm text-[var(--color-ink-muted)]">
        Estes Termos aplicam-se à fase atual de validação (Beta), em que o serviço é
        prestado de forma manual por uma pessoa da equipa DoLado, sem automação, sem
        conta de cliente, e sem qualquer cobrança. Serão substituídos por Termos
        completos quando o serviço passar a incluir submissão automatizada e planos
        pagos.
      </div>

      <p className="text-base leading-relaxed text-[var(--color-ink)]">
        DoLado é uma marca operada por{" "}
        <strong>Competent Domain - Consultoria em Informática Unipessoal Lda</strong>{" "}
        (NIPC 515609773), com sede na Rua Cidade de Manchester, n.º 35, r/c, 1170-099
        Lisboa.
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          1. O que é a DoLado
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          A DoLado presta um serviço de assistência administrativa a consumidores com
          problemas em contratos de telecomunicações, energia, ou água/resíduos em
          Portugal. Depois de o Utilizador descrever o seu caso, a DoLado identifica a
          norma legal potencialmente aplicável e prepara uma reclamação formal, que o
          Utilizador pode enviar por si ou autorizar a DoLado a submeter, com a sua
          autorização, pelo canal correto da empresa visada, e acompanha o processo até
          à resposta.
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          <strong>
            A DoLado não é uma sociedade de advogados nem de solicitadores, e não presta
            consulta jurídica individualizada.
          </strong>{" "}
          A informação legal partilhada tem função organizativa e informativa, nunca
          constitui parecer jurídico, e não garante que o Utilizador tenha direito a
          determinado resultado. A DoLado não representa o Utilizador em tribunal,
          centro de arbitragem, ou perante entidade reguladora.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          2. Como funciona, nesta fase
        </h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-base leading-relaxed text-[var(--color-ink)]">
          <li>
            O Utilizador descreve o problema através do formulário do site e anexa os
            documentos que tiver disponíveis.
          </li>
          <li>
            A DoLado contacta o Utilizador (telefone ou videochamada) para confirmar os
            detalhes do caso.
          </li>
          <li>
            A DoLado explica que direito parece aplicável ao caso e, só nesse momento, é
            combinado o preço do serviço (ver secção 3).
          </li>
          <li>
            Mediante confirmação do Utilizador para avançar, a DoLado escreve a
            reclamação formal, com base legal, factos e datas, e o Utilizador escolhe
            se a envia diretamente ou autoriza a DoLado a submetê-la ao Livro de
            Reclamações pelo canal oficial da empresa visada.
          </li>
          <li>
            A DoLado acompanha o prazo legal de resposta, mantém o Utilizador informado
            em cada passo relevante, e entrega, no final, um dossiê completo do caso —
            histórico, documentos e comunicações — para o Utilizador usar livremente,
            incluindo para decidir, por sua iniciativa, se quer avançar para outra via
            (ex. entidade reguladora, centro de arbitragem, ou advogado).
          </li>
        </ol>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Nesta fase, o processo é inteiramente conduzido por uma pessoa da equipa
          DoLado. Não existe submissão automática, conta de utilizador, nem
          autenticação por Chave Móvel Digital.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          3. Preço e fase Beta
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Durante a fase Beta, o serviço é <strong>gratuito</strong>. Não é feita
          qualquer cobrança sem que o preço tenha sido combinado previamente com o
          Utilizador, após a análise do caso. O Utilizador pode, a qualquer momento
          antes desse acordo, decidir não avançar, sem qualquer custo ou obrigação.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          4. O que garantimos e o que não garantimos
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3 className="text-base font-semibold text-[var(--color-ink)]">
              Garantimos
            </h3>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed text-[var(--color-ink)]">
              <li>
                Que a reclamação é redigida com base legal, para o Utilizador enviar ou
                para a DoLado submeter, com a sua autorização, pelo canal formal
                correto.
              </li>
              <li>
                Que o prazo legal de resposta é acompanhado e que o Utilizador é
                avisado em cada passo relevante.
              </li>
              <li>Que, no final, recebe um dossiê completo e organizado do caso.</li>
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-base font-semibold text-[var(--color-ink)]">
              Não garantimos
            </h3>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed text-[var(--color-ink)]">
              <li>Que a empresa aceite a reclamação ou devolva qualquer valor.</li>
              <li>Consulta jurídica individualizada ou representação em tribunal.</li>
              <li>
                Prazos de resolução, que dependem sempre da empresa reclamada e de
                fatores fora do controlo da DoLado.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          5. Setores abrangidos
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Nesta fase, a DoLado trata exclusivamente casos de telecomunicações, energia,
          e água/resíduos.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          6. Responsabilidade
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          A DoLado compromete-se a agir com diligência na redação da reclamação e, quando
          autorizada, na sua submissão, e no acompanhamento do prazo. A DoLado não é
          responsável por
          decisões da empresa reclamada, por atrasos ou indisponibilidade de sistemas
          de terceiros, ou por informação incorreta ou incompleta fornecida pelo
          Utilizador. Nada nestes Termos exclui responsabilidade que a lei portuguesa
          não permita excluir, designadamente nas relações de consumo reguladas pela
          Lei n.º 24/96.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          7. Dados pessoais
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          O tratamento de dados pessoais no âmbito deste serviço rege-se pela{" "}
          <Link href="/privacidade" className="text-[var(--color-brand)] underline">
            Política de Privacidade
          </Link>
          .
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          8. Alterações e contacto
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Estes Termos podem ser atualizados à medida que o serviço evolui; a versão em
          vigor é sempre a publicada em dolado.pt. Para qualquer questão:{" "}
          <a
            href="mailto:thiago.pereira@dolado.pt"
            className="text-[var(--color-brand)] underline"
          >
            thiago.pereira@dolado.pt
          </a>
          .
        </p>
      </section>

      <p className="mt-6 text-xs text-[var(--color-ink-faint)]">
        Última atualização: 14 de setembro de 2026
      </p>
    </article>
  );
}
