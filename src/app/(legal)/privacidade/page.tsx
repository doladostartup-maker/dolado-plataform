import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — DoLado",
};

export default function PrivacidadePage() {
  return (
    <article className="flex flex-col gap-6 pt-4">
      <div>
        <h1 className="text-[32px] font-semibold leading-tight text-[var(--color-ink)]">
          Política de Privacidade — Fase Beta
        </h1>
        <p className="mt-1 text-base text-[var(--color-ink-muted)]">
          DoLado — tratamento de dados pessoais nos termos do RGPD
        </p>
      </div>

      <div className="rounded-lg border-l-[3px] border-[var(--color-brand)] bg-[var(--color-surface-sunken)] p-4 text-sm text-[var(--color-ink-muted)]">
        Esta Política aplica-se à fase actual de validação (Beta), em que o
        processamento de casos é feito manualmente. Será substituída por uma Política
        mais detalhada quando o serviço passar a incluir automação, conta de cliente, e
        planos pagos.
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          1. Responsável pelo tratamento
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Competent Domain - Consultoria em Informática Unipessoal Lda (NIPC
          515609773), com sede na Rua Cidade de Manchester, n.º 35, r/c, 1170-099
          Lisboa, operando sob a marca DoLado, com contacto em{" "}
          <a
            href="mailto:thiago.pereira@dolado.pt"
            className="text-[var(--color-brand)] underline"
          >
            thiago.pereira@dolado.pt
          </a>
          , é responsável pelo tratamento dos dados pessoais recolhidos através do site
          dolado.pt, nos termos do Regulamento (UE) 2016/679 (RGPD).
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Não há, nesta fase, Encarregado de Protecção de Dados (DPO) nomeado — o volume
          e a natureza dos dados tratados (leads e casos individuais, processados
          manualmente) não geram essa obrigação. Esta conclusão será reavaliada se o
          volume de casos crescer significativamente.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          2. Que dados tratamos
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed text-[var(--color-ink)]">
          <li>
            <strong>Dados de identificação e contacto</strong>: nome completo, email,
            telefone
          </li>
          <li>
            <strong>Dados do caso</strong>: sector da empresa visada, descrição do
            problema (texto livre), documentos anexados (factura, contrato, capturas de
            ecrã ou outros comprovativos)
          </li>
          <li>
            <strong>Dados de navegação</strong>: dados de utilização do site recolhidos
            via Google Analytics (GA4), designadamente páginas visitadas e o evento de
            submissão do formulário
          </li>
        </ul>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Não pedimos, nesta fase, dados financeiros (ex. IBAN) nem documentos além dos
          estritamente necessários para perceber o caso.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          3. Para que usamos estes dados
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Usamos os dados fornecidos no formulário para: (a) contactar o Utilizador e
          confirmar os detalhes do caso; (b) analisar e identificar o direito legal
          potencialmente aplicável; (c) redigir e enviar, mediante confirmação do
          Utilizador, a reclamação formal à empresa visada; e (d) acompanhar o
          processo e manter o Utilizador informado.
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          <strong>Base jurídica</strong>: diligências pré-contratuais a pedido do
          titular dos dados e, quando o Utilizador confirma o avanço do caso, execução
          do serviço solicitado (artigo 6.º, n.º 1, alínea b) do RGPD). O
          consentimento assinalado no formulário cobre o tratamento dos dados para
          este fim.
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Os dados de navegação (GA4) só são recolhidos depois de o visitante dar
          consentimento explícito através do banner de cookies apresentado no site,
          nos termos da Lei n.º 58/2019.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          4. Decisões automatizadas
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Nesta fase, <strong>não existe qualquer decisão automatizada</strong>. Todo o
          processo — desde a leitura do formulário até à redacção e envio da reclamação
          — é conduzido por uma pessoa da equipa DoLado. O artigo 22.º do RGPD não é,
          por isso, aplicável ao funcionamento actual do serviço.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          5. Com quem partilhamos os dados
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed text-[var(--color-ink)]">
          <li>
            <strong>Supabase</strong> (base de dados e alojamento dos dados do
            formulário e dos casos, na qualidade de subcontratante, com os dados
            armazenados na União Europeia)
          </li>
          <li>
            <strong>Clever Cloud</strong> (alojamento da aplicação, na União Europeia,
            na qualidade de subcontratante)
          </li>
          <li>
            <strong>Brevo</strong> (envio de emails transaccionais relacionados com o
            caso, na qualidade de subcontratante, com sede na União Europeia)
          </li>
          <li>
            <strong>Google Analytics / GA4</strong> (métricas de utilização do site)
          </li>
          <li>
            <strong>A empresa visada pela reclamação</strong> — apenas os dados
            estritamente necessários para formalizar e sustentar a reclamação em nome
            do Utilizador, e apenas depois de o Utilizador confirmar que pretende
            avançar
          </li>
        </ul>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Não vendemos nem partilhamos dados para fins de marketing de terceiros.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          6. Prazo de conservação
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Se o Utilizador preencher o formulário mas o caso não avançar (ex. não há
          resposta ao contacto, ou o Utilizador decide não continuar), os dados são
          conservados por até 3 meses e depois eliminados. Se o caso avançar, os dados
          são conservados durante o acompanhamento do caso e por um período adicional
          necessário para efeitos de prova, findo o qual são eliminados ou
          anonimizados.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          7. Direitos do titular
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          O Utilizador pode, a qualquer momento, pedir acesso, rectificação,
          apagamento, ou limitação do tratamento dos seus dados, escrevendo para{" "}
          <a
            href="mailto:thiago.pereira@dolado.pt"
            className="text-[var(--color-brand)] underline"
          >
            thiago.pereira@dolado.pt
          </a>
          . Tem também o direito de apresentar reclamação junto da Comissão Nacional
          de Protecção de Dados (CNPD), através de{" "}
          <a
            href="https://www.cnpd.pt"
            target="_blank"
            rel="noopener"
            className="text-[var(--color-brand)] underline"
          >
            www.cnpd.pt
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          8. Segurança
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Os dados são armazenados em sistemas com acesso restrito à equipa DoLado.
          Documentos e informação do caso não são partilhados além do estritamente
          necessário descrito na secção 5.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          9. Alterações e contacto
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Esta Política pode ser actualizada à medida que o serviço evolui; a versão em
          vigor é sempre a publicada em dolado.pt. Para qualquer questão sobre os seus
          dados:{" "}
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
        Última actualização: 14 de setembro de 2026
      </p>
    </article>
  );
}
