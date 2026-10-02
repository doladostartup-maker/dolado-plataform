// Política de Privacidade — versão 2026-10-02e.
//
// Em relação à 2026-10-02d (Monitor de Proteção — texto validado pela
// advogada, confirmado por Thiago a 02/10/2026; rascunho em
// docs/legal/rascunho-privacidade-monitor-protecao.md): secção 2 (dados do
// Monitor de Proteção, incluindo CPE/CUI e situações detetadas), secção 3
// (finalidade do Monitor; interesse legítimo alargado aos contratos
// desativados), secção 4 (a IA só lê e estrutura documentos; comparações e
// regras em código; revisão humana antes de comunicar), secção 5 (Supabase e
// Anthropic) e secção 6 (prazos do Monitor; custos da IA sem dados
// pessoais). Restantes secções sem alterações.
//
// Uma versão publicada não se edita.
import Link from "next/link";
import { ROTAS_LEGAIS } from "@/lib/legal";
import { ENTIDADE_LEGAL, MORADA_SEDE, NIPC, PRIVACIDADE_EMAIL } from "@/lib/site";

const H2 = "text-xl font-semibold text-[var(--color-ink)]";
const P = "text-base leading-relaxed text-[var(--color-ink)]";
const UL = "flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed text-[var(--color-ink)]";
const LINK = "text-[var(--color-brand)] underline";

function EmailPrivacidade() {
  return (
    <a href={`mailto:${PRIVACIDADE_EMAIL}`} className={LINK}>
      {PRIVACIDADE_EMAIL}
    </a>
  );
}

const CONSERVACAO: { categoria: string; prazo: string }[] = [
  {
    categoria: "Dados da conta (identificação, contacto, credenciais, perfil e preferências)",
    prazo:
      "Enquanto a conta existir. Depois de a conta ser eliminada, são apagados, exceto os dados que tenham de ser conservados pelas razões indicadas nas linhas seguintes.",
  },
  {
    categoria: "Pedidos enviados pelos formulários do site que não avançam (sem resposta ao contacto ou por decisão do titular)",
    prazo: "Até 3 meses depois do pedido; depois são eliminados.",
  },
  {
    categoria:
      "Casos: descrição, documentos enviados, versões do texto preparado, pedidos de alteração, autorização de envio, texto efetivamente enviado, comprovativos de submissão, histórico e dossiê",
    prazo:
      "Durante o acompanhamento do caso e, depois de encerrado, enquanto a conta existir, para que o titular os possa consultar. Depois disso, só os elementos necessários para demonstrar o que foi autorizado e enviado são conservados, até ao fim do prazo de prescrição dos direitos que possam resultar do serviço prestado, sendo depois eliminados ou anonimizados.",
  },
  {
    categoria:
      "Registos de prova da relação contratual: aceitação dos Termos, pedido de início imediato, cancelamentos e pedidos de livre resolução",
    prazo:
      "Durante a relação contratual e, depois dela, até ao fim do prazo de prescrição dos direitos que possam resultar do contrato.",
  },
  {
    categoria: "Faturação e pagamentos (planos, valores, faturas, reembolsos e identificadores da Stripe)",
    prazo:
      "10 anos, pelo período de conservação de documentos de suporte da contabilidade previsto na lei fiscal (artigo 123.º do Código do IRC).",
  },
  {
    categoria:
      "Monitor de Proteção e restantes funcionalidades de proteção: contratos acompanhados, faturas e contratos carregados (documentos e dados lidos), origem e correções dos dados, situações detetadas e respetiva revisão, alertas e setores subscritos para o aviso sectorial",
    prazo:
      "Enquanto a subscrição com Proteção estiver ativa ou até o titular deixar de acompanhar o contrato ou pedir a sua eliminação. Quando a subscrição termina, o acompanhamento é desativado e deixam de ser enviados alertas; os dados e os documentos são conservados durante 6 meses a contar dessa data, apenas para que o titular possa recuperar o acompanhamento se voltar à DoLado, sem qualquer envio nesse período. Após esse prazo, são eliminados ou anonimizados, salvo obrigação legal que exija a sua conservação.",
  },
  {
    categoria:
      "Registos do custo de utilização da inteligência artificial (modelo, quantidade de dados processados e custo, sem conteúdo dos documentos)",
    prazo: "Sem dados pessoais: conservados para controlo de custos.",
  },
  {
    categoria: "Respostas guardadas pela versão anterior do Simulador de Elegibilidade (até 1 de outubro de 2026)",
    prazo:
      "Apagadas 30 dias depois do pedido; um pedido que ainda esteja em análise mantém-se até ser concluído e é apagado a seguir.",
  },
  {
    categoria: "Comunicações opcionais baseadas em consentimento",
    prazo: "Até o consentimento ser retirado.",
  },
  {
    categoria: "Medição e cookies (Google Analytics / Ads), com consentimento",
    prazo:
      "Pelos prazos de cada cookie indicados no banner de cookies e pelo prazo de conservação definido nas ferramentas de medição; o consentimento pode ser retirado a qualquer momento.",
  },
  {
    categoria: "Registos técnicos e de segurança (por exemplo, registos de acesso e de envio de e-mails)",
    prazo:
      "Pelos prazos curtos definidos pelos prestadores de alojamento, autenticação e e-mail, salvo quando sejam necessários para investigar um incidente de segurança.",
  },
];

export function PrivacidadeV20261002e() {
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
        <h2 className={H2}>1. Responsável pelo tratamento</h2>
        <p className={P}>
          {ENTIDADE_LEGAL} (NIPC {NIPC}), com sede na {MORADA_SEDE}, operando sob a marca DoLado, com contacto
          em <EmailPrivacidade />, é responsável pelo tratamento dos dados pessoais recolhidos através do site
          dolado.pt e da área de cliente da DoLado, nos termos do Regulamento (UE) 2016/679 (RGPD).
        </p>
        <p className={P}>
          A DoLado não designou atualmente um Encarregado de Proteção de Dados por não se encontrar, neste
          momento, abrangida pelas situações de designação obrigatória previstas no artigo 37.º do RGPD. Para
          qualquer questão sobre dados pessoais, o contacto é <EmailPrivacidade />.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>2. Que dados tratamos</h2>
        <ul className={UL}>
          <li>
            <strong>Dados de identificação e contacto</strong>: nome completo, e-mail, telefone
          </li>
          <li>
            <strong>Dados da conta</strong>: e-mail de acesso e credenciais de autenticação (palavra-passe, guardada
            sob a forma de hash irreversível, ou início de sessão com conta Google), perfil e preferências
            indicadas pelo Utilizador (por exemplo, os setores subscritos para o aviso sectorial)
          </li>
          <li>
            <strong>Dados do caso</strong>: setor e empresa visada, descrição do problema (texto livre), documentos
            anexados (fatura, contrato, capturas de ecrã ou outros comprovativos), o texto da reclamação preparado
            pela DoLado e as respetivas versões, os pedidos de alteração e a autorização de envio dada pelo
            Utilizador, e o registo do envio e do comprovativo de submissão
          </li>
          <li>
            <strong>Dados do Monitor de Proteção</strong>: os contratos que o Utilizador decide acompanhar e a
            informação que deles resulta — fornecedor, serviço, referência do contrato, mensalidade, datas de início
            e de fim de fidelização e de promoção, valor da vantagem associada à fidelização, valor de cessação
            antecipada indicado na fatura e, quando aplicável, os códigos de identificação da instalação (CPE, para a
            eletricidade, e CUI, para o gás natural); as faturas e os contratos que carrega e os valores lidos desses
            documentos; a origem de cada dado (introduzido pelo Utilizador, lido de um documento ou corrigido pela
            DoLado) e as confirmações e correções feitas pelo Utilizador; as situações detetadas na comparação das
            faturas e a respetiva revisão pela DoLado; e o registo dos alertas enviados
          </li>
          <li>
            <strong>Dados de pagamento e subscrição</strong>: plano escolhido, estado da subscrição, datas de
            renovação, casos disponíveis, histórico de pagamentos e reembolsos e os identificadores atribuídos
            pela Stripe. Os dados do cartão ou de outro meio de pagamento são introduzidos diretamente na página de
            pagamento da Stripe e não são recebidos nem guardados pela DoLado
          </li>
          <li>
            <strong>Registos de aceitação, de autorização e de pedidos</strong>: a versão dos Termos e Condições
            aceite, a versão desta Política disponibilizada, o pedido expresso de início imediato do serviço, a
            autorização de envio da reclamação, os cancelamentos de subscrição e os pedidos de livre resolução, com
            a data e hora em que foram feitos
          </li>
          <li>
            <strong>Reclamações e pedidos dirigidos à DoLado</strong>: o conteúdo das mensagens enviadas para os
            contactos da DoLado e a respetiva resposta
          </li>
          <li>
            <strong>Dados de navegação e medição</strong>, apenas com consentimento dado no banner de cookies: dados
            de utilização do site recolhidos via Google Analytics (GA4), designadamente páginas visitadas e eventos
            como a submissão de formulários, e dados de medição de conversões do Google Ads, incluindo o e-mail
            indicado no formulário sob a forma de hash irreversível (SHA-256)
          </li>
        </ul>
        <p className={P}>
          O <strong>Simulador de Elegibilidade</strong> é gratuito e funciona sem conta e sem pedir dados de
          identificação ou de contacto. As respostas ficam apenas no navegador do Utilizador: a DoLado não as
          guarda nem as associa a uma pessoa ou conta. Com consentimento para medição, regista-se apenas o tipo de
          resultado obtido (por exemplo, &quot;positivo&quot;), sem as respostas. Se o Utilizador decidir avançar
          para &quot;Tratar o meu caso&quot;, o setor, o tipo de problema e o contacto prévio com a empresa
          indicados no simulador servem para pré-preencher esse formulário e só são guardados se o Utilizador o
          submeter.
        </p>
        <p className={P}>
          Não pedimos documentos além dos estritamente necessários para perceber o caso ou para a funcionalidade
          utilizada, nem pedimos dados de categorias especiais (por exemplo, dados de saúde).
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>3. Para que usamos estes dados e com que fundamento</h2>
        <p className={P}>
          <strong>Execução do contrato e diligências pré-contratuais</strong> a pedido do titular (artigo 6.º, n.º
          1, alínea b) do RGPD) — é o fundamento do tratamento necessário para prestar o serviço pedido:
        </p>
        <ul className={UL}>
          <li>analisar o pedido ou o caso e contactar o titular para confirmar detalhes;</li>
          <li>
            preparar a reclamação, submetê-la à revisão do Utilizador e enviá-la apenas depois da sua autorização
            explícita, e acompanhar o caso;
          </li>
          <li>gerir a conta e a área de cliente;</li>
          <li>
            prestar as funcionalidades de proteção do plano contratado, incluindo o Monitor de Proteção: ler os
            documentos carregados, acompanhar as datas e as condições dos contratos, comparar as faturas ao longo do
            tempo e avisar o titular das datas relevantes e das situações que, depois de revistas pela DoLado,
            mereçam ser verificadas;
          </li>
          <li>processar pagamentos e gerir subscrições, cancelamentos e casos disponíveis;</li>
          <li>enviar os e-mails transacionais relacionados com o caso, a conta e os pagamentos.</li>
        </ul>
        <p className={P}>
          Estes dados são necessários para prestar o serviço: sem eles, a DoLado não o consegue prestar. As caixas
          de confirmação dos formulários de abertura de caso e das funcionalidades registam o pedido do titular e a
          tomada de conhecimento desta Política; não são o fundamento deste tratamento.
        </p>
        <p className={P}>
          <strong>Cumprimento de obrigações legais</strong> (artigo 6.º, n.º 1, alínea c) do RGPD): obrigações
          fiscais e contabilísticas relativas a pagamentos e faturação, tratamento de pedidos de livre resolução e
          de reclamações apresentadas no Livro de Reclamações, e resposta a pedidos de exercício de direitos.
        </p>
        <p className={P}>
          <strong>Interesse legítimo da DoLado</strong> (artigo 6.º, n.º 1, alínea f) do RGPD): conservar os
          registos de aceitação, de autorização e de envio para poder demonstrar o que foi aceite, autorizado e
          enviado; conservar, durante 6 meses depois do fim da subscrição, a configuração dos alertas
          e dos contratos acompanhados que tenham sido desativados, para que o titular a possa recuperar se voltar à DoLado; declarar, exercer ou defender
          direitos; garantir a segurança da plataforma e prevenir abusos. O
          titular pode opor-se a estes tratamentos, nos termos da secção 7.
        </p>
        <p className={P}>
          <strong>Consentimento</strong> (artigo 6.º, n.º 1, alínea a) do RGPD), apenas para o que dele depende:
        </p>
        <ul className={UL}>
          <li>
            dados de navegação e de medição (Google Analytics e Google Ads), só recolhidos depois de consentimento
            explícito no banner de cookies;
          </li>
          <li>
            e-mails da DoLado com novidades e ofertas — por exemplo, sobre a Proteção —, que o titular pode
            aceitar de forma facultativa no formulário &quot;Tratar o meu caso&quot;. A autorização fica
            associada à conta, com a data e o texto aceite, e cada e-mail permite deixar de os receber.
          </li>
        </ul>
        <p className={P}>
          O consentimento pode ser retirado a qualquer momento — nas definições de cookies, no Perfil da área de
          cliente (e-mails com novidades e ofertas) ou escrevendo para{" "}
          <EmailPrivacidade /> —, sem afetar a licitude do tratamento feito antes.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          4. Inteligência artificial e decisões automatizadas
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          A DoLado utiliza sistemas de inteligência artificial como ferramenta de apoio no Monitor de Proteção,
          para ler as faturas e os contratos que o Utilizador carrega e extrair deles dados objetivos — por
          exemplo, datas, valores e o nome do fornecedor.
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          A utilização de inteligência artificial não implica, por si só, uma decisão
          exclusivamente automatizada. A DoLado <strong>não utiliza inteligência
          artificial para tomar decisões exclusivamente automatizadas que produzam
          efeitos jurídicos sobre o Utilizador ou que o afetem de forma
          similarmente significativa</strong>, nos termos do artigo 22.º do RGPD.
          Sempre que aplicável, existe intervenção e revisão humana: a redação e, quando
          autorizada, a submissão da reclamação são conduzidas por uma pessoa da
          equipa DoLado. Os resultados obtidos com apoio de inteligência artificial
          têm natureza informativa e não constituem uma decisão jurídica definitiva.
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          A inteligência artificial é usada apenas para ler e estruturar os documentos. As comparações, os cálculos
          e a aplicação de regras são feitos por programas com regras fixas, e o Utilizador pode confirmar ou
          corrigir os dados lidos. Qualquer situação detetada na comparação das faturas é revista por uma pessoa da
          equipa DoLado antes de ser comunicada ao Utilizador, e é apresentada como uma situação que merece ser
          verificada, nunca como uma conclusão sobre o cumprimento da lei ou do contrato.
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Em observância do princípio da minimização dos dados, a DoLado envia ao
          prestador de inteligência artificial apenas a informação necessária à
          funcionalidade em causa — designadamente, o documento ou a informação que
          o Utilizador submete para essa funcionalidade —, sem lhe acrescentar dados
          de identificação ou de contacto da conta, como o nome, o e-mail ou o
          telefone. O conteúdo dos documentos é tratado apenas como dados a extrair, e o prestador recebe um
          documento de cada vez, sem o histórico do Utilizador.
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
            <strong>Supabase</strong> (base de dados, autenticação das contas e
            armazenamento de documentos — dados da conta, pedidos e casos, documentos
            anexados, dados das funcionalidades de proteção e do Monitor de Proteção,
            incluindo os documentos carregados, e registos de pagamento,
            de aceitação e de autorização —, na qualidade de subcontratante, com os
            dados armazenados na União Europeia). A Supabase é uma empresa com sede
            nos Estados Unidos; eventuais acessos a partir de fora do Espaço
            Económico Europeu podem implicar transferências internacionais de
            dados, nos termos indicados abaixo
          </li>
          <li>
            <strong>Clever Cloud</strong> (alojamento e execução da aplicação — o site
            e a área de cliente —, por onde passam os dados enviados e consultados
            pelo Utilizador, na União Europeia, na qualidade de subcontratante)
          </li>
          <li>
            <strong>Brevo</strong> (envio dos e-mails transacionais relacionados com o
            caso, a conta, os pagamentos, as funcionalidades de proteção, os pedidos
            de livre resolução e as mensagens dirigidas à DoLado, na qualidade de
            subcontratante, com sede na União Europeia)
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
            <strong>Anthropic</strong> (fornecimento da Claude API e leitura das
            faturas e dos contratos carregados no Monitor de Proteção, descrita na
            secção 4, na qualidade de subcontratante, ao abrigo de um
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
        <h2 className={H2}>6. Prazo de conservação</h2>
        <p className={P}>
          Conservamos os dados apenas durante o tempo necessário à finalidade para que foram recolhidos e ao
          cumprimento de obrigações legais. Quando um prazo termina, os dados são eliminados ou anonimizados.
        </p>
        <ul className={UL}>
          {CONSERVACAO.map((linha) => (
            <li key={linha.categoria}>
              <strong>{linha.categoria}</strong>: {linha.prazo}
            </li>
          ))}
        </ul>
        <p className={P}>
          Os dados cuja conservação seja necessária para a declaração, o exercício ou a defesa de um direito num
          litígio em curso são conservados até à sua resolução.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>7. Direitos do titular</h2>
        <p className={P}>Nos termos do RGPD e quando aplicável, o titular dos dados tem direito a:</p>
        <ul className={UL}>
          <li>aceder aos seus dados pessoais;</li>
          <li>pedir a retificação de dados inexatos ou incompletos;</li>
          <li>
            pedir o apagamento dos dados, exceto quando a conservação seja necessária, por exemplo, para cumprir
            uma obrigação legal ou para a declaração, o exercício ou a defesa de um direito;
          </li>
          <li>pedir a limitação do tratamento;</li>
          <li>opor-se ao tratamento baseado no interesse legítimo da DoLado, por motivos relacionados com a sua situação particular;</li>
          <li>
            receber os dados que forneceu num formato estruturado, de uso corrente e de leitura automática, e
            pedir a sua transmissão a outro responsável (portabilidade), quando o tratamento se baseie no
            consentimento ou no contrato e seja feito por meios automatizados;
          </li>
          <li>retirar o consentimento a qualquer momento, quando o tratamento se baseie no consentimento.</li>
        </ul>
        <p className={P}>
          Para exercer qualquer destes direitos, escreva para <EmailPrivacidade />. Respondemos no prazo de um mês,
          prorrogável nos casos previstos no RGPD, e podemos pedir informação adicional para confirmar a sua
          identidade. O exercício dos direitos é gratuito, salvo nos casos de pedidos manifestamente infundados ou
          excessivos.
        </p>
        <p className={P}>
          O titular tem também o direito de apresentar reclamação junto da Comissão Nacional de Proteção de Dados
          (CNPD), através de{" "}
          <a href="https://www.cnpd.pt" target="_blank" rel="noopener" className={LINK}>
            www.cnpd.pt
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>8. Documentos com dados de terceiros</h2>
        <p className={P}>
          Os documentos de um caso — faturas, contratos, mensagens — podem conter dados pessoais de outras
          pessoas, por exemplo de quem partilha o contrato ou a morada. Para limitar esse tratamento, pedimos que:
        </p>
        <ul className={UL}>
          <li>envie apenas a informação e os documentos necessários ao caso;</li>
          <li>sempre que possível, oculte os dados de outras pessoas que não sejam relevantes;</li>
          <li>
            não envie dados de categorias especiais (por exemplo, dados de saúde) nem documentos de identificação,
            salvo se a DoLado os pedir por serem necessários ao caso;
          </li>
          <li>não envie documentos de terceiros sem uma ligação legítima ao caso.</li>
        </ul>
        <p className={P}>
          A DoLado trata os dados de terceiros que constem dos documentos apenas na medida necessária ao caso, com
          as mesmas regras de segurança e de conservação, e não os utiliza para outras finalidades. Os titulares
          desses dados podem exercer os seus direitos junto da DoLado, nos termos da secção 7.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>9. Segurança</h2>
        <p className={P}>
          Os dados são armazenados em sistemas com acesso restrito à equipa DoLado, com controlo de acesso por
          conta e documentos guardados em armazenamento privado. Documentos e informação do caso não são
          partilhados além do estritamente necessário descrito na secção 5.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>10. Alterações e contacto</h2>
        <p className={P}>
          Esta Política é identificada por versão; a versão em vigor é a publicada em dolado.pt/privacidade e as
          anteriores continuam disponíveis em dolado.pt/privacidade/&lt;versão&gt;. Para qualquer questão sobre os
          seus dados: <EmailPrivacidade />. Mais informação sobre os serviços nos{" "}
          <Link href={ROTAS_LEGAIS.termos} className={LINK}>
            Termos e Condições
          </Link>
          .
        </p>
      </section>

      <p className="mt-6 text-xs text-[var(--color-ink-faint)]">
        Versão 2026-10-02e · Última atualização: 2 de outubro de 2026
      </p>
    </article>
  );
}
