// Política de Privacidade — versão 2026-10-01.
//
// Em relação à versão 2026-09-30: sem o enquadramento "Fase Beta"; secções 1
// a 3 atualizadas para o serviço atual (conta, funcionalidades de proteção,
// pagamentos, registos de aceitação/autorização e bases jurídicas); secção 4
// (inteligência artificial e decisões automatizadas); secção 5 (Anthropic,
// Stripe, Google, Cookiebot, transferências internacionais e destinatários da
// reclamação). Secções 6 a 9 mantêm a redação anterior. Uma versão
// publicada não se edita.
import { PRIVACIDADE_EMAIL } from "@/lib/site";

export function PrivacidadeV20261001() {
  return (
    <article className="flex flex-col gap-6 pt-4">
      <div>
        <h1 className="text-[32px] font-semibold leading-tight text-[var(--color-ink)]">
          Política de Privacidade
        </h1>
        <p className="mt-1 text-base text-[var(--color-ink-muted)]">
          DoLado — tratamento de dados pessoais nos termos do RGPD
        </p>
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
            href={`mailto:${PRIVACIDADE_EMAIL}`}
            className="text-[var(--color-brand)] underline"
          >
            {PRIVACIDADE_EMAIL}
          </a>
          , é responsável pelo tratamento dos dados pessoais recolhidos através do site
          dolado.pt e da área de cliente da DoLado, nos termos do Regulamento (UE)
          2016/679 (RGPD).
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Não há, nesta fase, Encarregado de Proteção de Dados (DPO) nomeado — o volume
          e a natureza dos dados tratados (contas de clientes e casos individuais,
          analisados caso a caso por uma pessoa da equipa DoLado) não geram essa
          obrigação. Esta conclusão será reavaliada se o volume de casos crescer
          significativamente.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          2. Que dados tratamos
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed text-[var(--color-ink)]">
          <li>
            <strong>Dados de identificação e contacto</strong>: nome completo, e-mail,
            telefone
          </li>
          <li>
            <strong>Dados da conta</strong>: e-mail de acesso e credenciais de
            autenticação (palavra-passe, guardada sob a forma de hash irreversível, ou
            início de sessão com conta Google), perfil e preferências indicadas pelo Utilizador (por
            exemplo, os setores subscritos para o aviso sectorial)
          </li>
          <li>
            <strong>Dados do caso</strong>: setor e empresa visada, descrição do
            problema (texto livre), documentos anexados (fatura, contrato, capturas de
            ecrã ou outros comprovativos), o texto da reclamação preparado pela DoLado e
            as respetivas versões, os pedidos de alteração e a autorização de envio dada
            pelo Utilizador, e o registo do envio e do comprovativo de submissão
          </li>
          <li>
            <strong>Dados das funcionalidades de proteção</strong>: a informação e os
            documentos que o Utilizador submete em cada funcionalidade — operadora e
            datas de fim de fidelização ou de promoção, contratos e faturas carregados,
            e as respostas ao Simulador de Elegibilidade
          </li>
          <li>
            <strong>Dados de pagamento e subscrição</strong>: plano escolhido, estado da
            subscrição, datas de renovação, casos disponíveis, histórico de pagamentos e
            reembolsos e os identificadores atribuídos pela Stripe. Os dados do cartão
            ou de outro meio de pagamento são introduzidos diretamente na página de
            pagamento da Stripe e não são recebidos nem guardados pela DoLado
          </li>
          <li>
            <strong>Registos de aceitação e de autorização</strong>: a versão dos Termos
            e Condições aceite, a versão desta Política disponibilizada, o pedido
            expresso de início imediato do serviço e a autorização de envio da
            reclamação, com a data e hora em que foram dados
          </li>
          <li>
            <strong>Dados de navegação e medição</strong>, apenas com consentimento dado
            no banner de cookies: dados de utilização do site recolhidos via Google
            Analytics (GA4), designadamente páginas visitadas e eventos como a
            submissão de formulários, e dados de medição de conversões do Google Ads,
            incluindo o e-mail indicado no formulário sob a forma de hash irreversível
            (SHA-256)
          </li>
        </ul>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Não pedimos documentos além dos estritamente necessários para perceber o caso
          ou para a funcionalidade utilizada.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          3. Para que usamos estes dados
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Usamos os dados para: (a) contactar o Utilizador e confirmar os detalhes do
          caso; (b) analisar e identificar o direito legal potencialmente aplicável;
          (c) redigir a reclamação formal, submetê-la à revisão do Utilizador e
          enviá-la apenas depois da sua autorização explícita; (d) acompanhar o
          processo e manter o Utilizador informado; (e) gerir a conta e a área de
          cliente; (f) prestar as funcionalidades de proteção incluídas no plano
          contratado; (g) processar pagamentos, gerir subscrições e emitir a
          faturação; e (h) enviar os e-mails transacionais relacionados com o caso, a
          conta e os pagamentos.
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          <strong>Base jurídica</strong>:
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed text-[var(--color-ink)]">
          <li>
            diligências pré-contratuais a pedido do titular dos dados e execução do
            contrato de prestação do serviço (artigo 6.º, n.º 1, alínea b) do RGPD),
            para as finalidades (a) a (h). O consentimento assinalado no formulário de
            abertura do caso cobre o tratamento dos dados do caso para este fim;
          </li>
          <li>
            cumprimento de obrigações legais (artigo 6.º, n.º 1, alínea c) do RGPD),
            designadamente obrigações fiscais e contabilísticas relativas a pagamentos
            e faturação;
          </li>
          <li>
            interesse legítimo da DoLado (artigo 6.º, n.º 1, alínea f) do RGPD) na
            conservação dos registos de aceitação e de autorização, para poder
            demonstrar o que foi aceite e autorizado e para a declaração, o exercício
            ou a defesa de direitos;
          </li>
          <li>
            consentimento (artigo 6.º, n.º 1, alínea a) do RGPD) para os dados de
            navegação e de medição: só são recolhidos depois de o visitante dar
            consentimento explícito através do banner de cookies apresentado no site,
            nos termos da Lei n.º 58/2019, e o consentimento pode ser retirado a
            qualquer momento nas definições de cookies.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          4. Inteligência artificial e decisões automatizadas
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          A DoLado utiliza sistemas de inteligência artificial como ferramenta de
          apoio em determinadas funcionalidades do serviço — atualmente, o Alerta de
          fim de promoção, o Comparador de Faturas e o Simulador de Elegibilidade.
          Estes sistemas podem ser utilizados para apoiar a análise de informação, a
          comparação de dados, a preparação de conteúdos, a identificação de
          possíveis direitos ou oportunidades e a apresentação de resultados ou de
          informação de apoio ao Utilizador.
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          A utilização de inteligência artificial não implica, por si só, uma decisão
          exclusivamente automatizada. A DoLado <strong>não utiliza inteligência
          artificial para tomar decisões exclusivamente automatizadas que produzam
          efeitos jurídicos sobre o Utilizador ou que o afetem de forma
          similarmente significativa</strong>, nos termos do artigo 22.º do RGPD.
          Sempre que aplicável, existe intervenção e revisão humana: no Simulador de
          Elegibilidade, a análise é sempre revista por uma pessoa da equipa DoLado
          antes de qualquer conclusão operacional relevante. A redação e, quando
          autorizada, a submissão da reclamação são conduzidas por uma pessoa da
          equipa DoLado. Os resultados obtidos com apoio de inteligência artificial
          têm natureza informativa e não constituem uma decisão jurídica definitiva.
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Em observância do princípio da minimização dos dados, a DoLado envia ao
          prestador de inteligência artificial apenas a informação necessária à
          funcionalidade em causa — designadamente, o documento ou a informação que
          o Utilizador submete para essa funcionalidade —, sem lhe acrescentar dados
          de identificação ou de contacto da conta, como o nome, o e-mail ou o
          telefone.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          5. Com quem partilhamos os dados
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          <strong>Prestadores de serviços</strong>, na qualidade indicada para cada
          um:
        </p>
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
            <strong>Brevo</strong> (envio de e-mails transacionais relacionados com o
            caso, na qualidade de subcontratante, com sede na União Europeia)
          </li>
          <li>
            <strong>Google</strong> (Google Analytics / GA4, Google Tag Manager e Google
            Ads — métricas de utilização do site e medição de conversões, apenas com
            consentimento dado no banner de cookies). A Google atua como subcontratante
            no tratamento que realiza por conta da DoLado, nos termos dos seus termos de
            tratamento de dados, e, para finalidades próprias definidas nos seus
            termos, como responsável pelo tratamento autónomo. Quando o Utilizador
            escolhe iniciar sessão com a sua conta Google, a Google trata os dados
            dessa conta como responsável pelo tratamento autónomo. Este tratamento pode
            implicar transferências internacionais de dados, nos termos indicados
            abaixo
          </li>
          <li>
            <strong>Cookiebot</strong> (gestão do consentimento de cookies e registo das
            escolhas do visitante, na qualidade de subcontratante)
          </li>
          <li>
            <strong>Anthropic</strong> (fornecimento da Claude API e tratamento da
            informação necessária às funcionalidades de inteligência artificial
            descritas na secção 4, na qualidade de subcontratante, ao abrigo de um
            acordo de tratamento de dados). Este tratamento pode implicar
            transferências internacionais de dados, nos termos indicados abaixo
          </li>
          <li>
            <strong>Stripe</strong> (processamento de pagamentos, gestão de subscrições
            e faturação dos serviços da DoLado, com tratamento dos dados necessários
            aos pagamentos). A Stripe atua como subcontratante no tratamento que
            realiza por conta da DoLado e, para finalidades próprias definidas nos
            seus termos — como a prevenção de fraude e o cumprimento das suas
            obrigações legais —, como responsável pelo tratamento autónomo. Os dados
            do meio de pagamento são introduzidos diretamente na página de pagamento
            da Stripe e não são guardados pela DoLado. Este tratamento pode implicar
            transferências internacionais de dados, nos termos indicados abaixo
          </li>
        </ul>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          <strong>Transferências internacionais</strong>: quando o tratamento por um
          prestador implique a transferência de dados pessoais para fora do Espaço
          Económico Europeu, a transferência realiza-se com base em mecanismos
          adequados nos termos do RGPD, incluindo cláusulas contratuais-tipo
          aprovadas pela Comissão Europeia, quando aplicável, previstas no acordo de
          tratamento de dados celebrado com o prestador.
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          <strong>Destinatários necessários à reclamação</strong>, que não são
          prestadores de serviços da DoLado — apenas os dados estritamente
          necessários para formalizar e sustentar a reclamação, com a autorização do
          Utilizador, e apenas depois de o Utilizador confirmar que pretende avançar:
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed text-[var(--color-ink)]">
          <li>a empresa ou entidade visada pela reclamação;</li>
          <li>
            a plataforma do Livro de Reclamações Eletrónico, quando a reclamação é
            submetida por essa via;
          </li>
          <li>
            as entidades reguladoras ou fiscalizadoras competentes, quando aplicável.
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
          O Utilizador pode, a qualquer momento, pedir acesso, retificação,
          apagamento, ou limitação do tratamento dos seus dados, escrevendo para{" "}
          <a
            href={`mailto:${PRIVACIDADE_EMAIL}`}
            className="text-[var(--color-brand)] underline"
          >
            {PRIVACIDADE_EMAIL}
          </a>
          . Tem também o direito de apresentar reclamação junto da Comissão Nacional
          de Proteção de Dados (CNPD), através de{" "}
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
          Esta Política pode ser atualizada à medida que o serviço evolui; a versão em
          vigor é sempre a publicada em dolado.pt. Para qualquer questão sobre os seus
          dados:{" "}
          <a
            href={`mailto:${PRIVACIDADE_EMAIL}`}
            className="text-[var(--color-brand)] underline"
          >
            {PRIVACIDADE_EMAIL}
          </a>
          .
        </p>
      </section>

      <p className="mt-6 text-xs text-[var(--color-ink-faint)]">
        Versão 2026-10-01 · Última atualização: 1 de outubro de 2026
      </p>
    </article>
  );
}
