// Política de Privacidade — versão 2026-10-22b. Parte da 2026-10-22 e
// acrescenta a área de parceiro (/portal/parceiro): conta da pessoa que
// representa um Parceiro de Indicação, ligação da conta ao parceiro e números
// totais mostrados ao parceiro, incluindo a possibilidade de inferência com
// números pequenos (secções 2, 5 e 6). Texto do rascunho
// docs/legal/rascunho-privacidade-area-parceiro.md (opção 1, totais exactos),
// validado pela advogada (confirmado por Thiago, 21/10/2026). Nada do resto
// muda.
//
// Uma versão publicada não se edita: alterações vão para uma versão nova.
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
    categoria: "Dados da conta (identificação, contacto e perfil)",
    prazo:
      "Enquanto a conta existir. Depois de a conta ser eliminada, são apagados, excepto os dados que tenham de ser conservados pelas razões indicadas nas linhas seguintes.",
  },
  {
    categoria: "Pedidos enviados pelos formulários do site que não avançam (sem resposta ao contacto ou por decisão do titular)",
    prazo: "Até 3 meses depois do pedido; depois são eliminados.",
  },
  {
    categoria:
      "Casos: descrição, documentos enviados, propostas do texto preparadas com apoio de inteligência artificial e respectivo registo, versões do texto preparado, pedidos de alteração, autorização de envio, texto efectivamente enviado, comprovativos de submissão, comunicações trocadas com a empresa e respectivos anexos e histórico",
    prazo:
      "Durante o acompanhamento e, depois de encerrado, enquanto a conta existir, para que o titular os possa consultar. Depois disso, só os elementos necessários para demonstrar o que foi autorizado e enviado são conservados durante o prazo necessário à defesa de direitos; os anexos sem necessidade probatória são eliminados.",
  },
  {
    categoria: "Dossiês PDF gerados pela DoLado e guardados na plataforma, incluindo versões anteriores",
    prazo: "Durante o acompanhamento e até 6 meses após a data de encerramento do caso; depois são apagados do armazenamento activo. O registo factual e as provas estritamente necessárias à defesa de direitos podem manter-se nos prazos indicados para os dados do caso.",
  },
  {
    categoria:
      "Registos de prova da relação contratual: aceitação dos Termos, pedido de início imediato, cancelamentos e pedidos de livre resolução",
    prazo:
      "Durante a relação contratual e, depois dela, até ao fim do prazo de prescrição dos direitos que possam resultar do contrato.",
  },
  {
    categoria: "Facturação e pagamentos (planos, valores, facturas, reembolsos e identificadores da Stripe)",
    prazo:
      "Durante o prazo legal aplicável a cada documento contabilístico ou fiscal, incluindo 10 anos quando esse prazo seja exigido. Esta conservação não abrange, por si só, documentos completos do caso ou do Monitor.",
  },
  {
    categoria:
      "Monitor de Protecção e restantes funcionalidades de protecção: serviços acompanhados, facturas e contratos carregados (documentos e dados lidos, incluindo os dados de identificação), condições contratadas e respectivas alterações, histórico mês a mês, origem e correcções dos dados, decisões de associação de documentos, situações detectadas e respectiva revisão, alertas e sectores subscritos para o aviso sectorial",
    prazo:
      "Enquanto a subscrição com Protecção estiver activa ou até o titular deixar de acompanhar o serviço ou pedir a sua eliminação. Um documento que o titular decida não associar a nenhum serviço (“Cancelar”) é apagado de imediato. Quando a subscrição termina, o acompanhamento é desactivado e deixam de ser enviados alertas; os dados e os documentos são conservados durante 6 meses a contar dessa data, apenas para que o titular possa recuperar o acompanhamento se voltar à DoLado, sem qualquer envio nesse período. Após esse prazo, são eliminados ou anonimizados, salvo obrigação legal que exija a sua conservação.",
  },
  {
    categoria:
      "Registos do custo de utilização da inteligência artificial (modelo, quantidade de dados processados e custo, sem conteúdo dos documentos nem dos casos)",
    prazo: "Sem dados pessoais: conservados para controlo de custos.",
  },
  {
    categoria: "Respostas guardadas pela versão anterior do Simulador de Elegibilidade (até 1 de Outubro de 2026)",
    prazo:
      "Apagadas 30 dias depois do pedido; um pedido que ainda esteja em análise mantém-se até ser concluído e é apagado a seguir.",
  },
  {
    categoria:
      "E-mails recebidos nos endereços próprios dos casos que não foi possível associar a um caso (destinatário, remetente, assunto, data e motivo, sem o conteúdo nem os anexos)",
    prazo: "90 dias; depois são eliminados.",
  },
  {
    categoria: "Prova de consentimento para comunicações comerciais",
    prazo: "Enquanto o consentimento estiver activo; após retirada, conserva-se apenas a prova mínima da autorização e da retirada por 5 anos desde a retirada ou a última comunicação comercial, consoante a data mais recente, para demonstrar o cumprimento das regras aplicáveis. No fim do prazo é eliminada, salvo processo ou reclamação pendente.",
  },
  {
    categoria: "Programa de indicação — códigos, relação entre quem indica e quem é indicado, primeira compra, descontos e histórico",
    prazo: "Enquanto a indicação ou recompensa estiver activa, em revisão ou por utilizar; depois da última decisão ou estado final na relação ou recompensa, até 3 anos. No fim, os registos ligados às contas e o histórico são eliminados, salvo litígio ou obrigação legal pendente. Os três anos são um limite interno de conservação, não um prazo legal geral.",
  },
  {
    categoria: "Protecção gratuita — pseudónimo do e-mail usado para impedir uma segunda utilização",
    prazo: "24 meses a contar da utilização, mesmo que a conta seja eliminada antes. No fim do prazo é apagado automaticamente.",
  },
  {
    categoria: "Protecção gratuita — datas do período, versão dos Termos aceite e página de origem da activação",
    prazo: "Enquanto a conta existir. Os serviços acompanhados e os documentos da Protecção seguem, no fim do período sem adesão, o mesmo prazo do fim de uma subscrição: 6 meses.",
  },
  {
    categoria: "Cookie dolado_indicacao e registo da visita ao link de indicação ou de um parceiro",
    prazo: "Até 30 dias. O cookie e a visita só são criados e usados depois de consentimento para cookies de marketing. As visitas são eliminadas quando ultrapassam 30 dias; se uma visita já tiver sido associada a uma conta, a relação e o respectivo histórico seguem o prazo do programa de indicação acima ou o da atribuição a um parceiro, abaixo.",
  },
  {
    categoria: "Programa de Parceiros — candidaturas",
    prazo:
      "Até à decisão. Uma candidatura rejeitada é apagada automaticamente 12 meses depois da decisão. Uma candidatura aprovada passa a fazer parte do registo do parceiro e segue o prazo da linha seguinte.",
  },
  {
    categoria: "Programa de Parceiros — dados dos parceiros, condições acordadas, comissões, pagamentos e histórico",
    prazo:
      "Durante a parceria e, depois dela, até ao fim do prazo de prescrição dos direitos que dela possam resultar. Os registos que suportam pagamentos são conservados durante o prazo legal aplicável aos documentos contabilísticos e fiscais, incluindo 10 anos quando esse prazo seja exigido.",
  },
  {
    categoria:
      "Atribuição de uma conta a um Parceiro de Indicação e mensalidades pagas usadas para calcular a comissão",
    prazo:
      "Enquanto a conta existir e a comissão correspondente puder ser calculada, revista ou paga. Se a conta for eliminada, a ligação à conta é removida e conserva-se apenas o registo financeiro da comissão, sem ligação à conta, pelo prazo indicado na linha anterior.",
  },
  {
    categoria: "Área de parceiro — ligação da conta de quem representa um Parceiro de Indicação ao parceiro (quem deu e retirou o acesso, datas e motivo)",
    prazo:
      "Enquanto a conta existir e durar a parceria. Retirar o acesso não apaga o registo. O histórico de quem teve acesso e quando segue o prazo dos dados dos parceiros, acima.",
  },
  {
    categoria: "Oportunidades empresariais apresentadas por parceiros (entidade e, quando indicado, contacto)",
    prazo:
      "Enquanto a oportunidade estiver em curso e, depois de ganha ou perdida, apenas enquanto for necessário para calcular, rever e pagar a comissão e para declarar, exercer ou defender direitos.",
  },
  {
    categoria:
      "Protecção oferecida por um parceiro — código activado (guardado apenas sob a forma de hash), datas do período, versão dos Termos e texto aceites e avisos enviados",
    prazo:
      "Enquanto a conta existir; quando a conta é eliminada, o registo da activação é apagado e o código fica apenas como utilizado, sem ligação à conta. Os serviços acompanhados e os documentos da Protecção seguem, no fim do período oferecido sem adesão, o mesmo prazo do fim de uma subscrição: 6 meses.",
  },
  {
    categoria:
      "Registos de tentativas usados para limitar abusos (activação de códigos e candidaturas), com o identificador da conta ou um pseudónimo do e-mail",
    prazo: "2 dias; depois são apagados automaticamente.",
  },
  {
    categoria: "Medição e cookie de origem dolado_origem, apenas após consentimento de estatística",
    prazo:
      "Pelos prazos indicados no banner e definidos nas ferramentas. O cookie dolado_origem guarda a primeira origem válida de ?ref= durante, no máximo, 30 dias; é removido quando o consentimento de estatística é retirado. Se já tiver sido associada à conta, essa origem também é apagada quando o titular retira o consentimento ou elimina a conta. Sem consentimento não é criada nem utilizada. O cookie do Pixel da Meta (_fbp) é conservado durante, no máximo, 90 dias, e deixa de ser utilizado quando o consentimento para marketing é retirado. Os dados recebidos pela Meta são conservados pela Meta nos termos da sua Política de Privacidade.",
  },
  {
    categoria: "Pedidos de guias gratuitos feitos no site (e-mail, idioma, datas dos pedidos e origem da visita)",
    prazo: "Até 12 meses depois do último pedido; depois são eliminados automaticamente.",
  },
  {
    categoria: "Autorizações para comunicações comerciais dadas sem conta (texto aceite, versão, data e hora)",
    prazo:
      "Enquanto a autorização estiver activa. Depois de retirada, a prova é conservada durante 3 anos, para demonstrar o que foi autorizado, e depois eliminada.",
  },
  {
    categoria: "Registos técnicos e de segurança (por exemplo, registos de acesso e de envio de e-mails)",
    prazo:
      "Pelos prazos curtos definidos pelos prestadores de alojamento, autenticação e e-mail, salvo quando sejam necessários para investigar um incidente de segurança.",
  },
];

export function PrivacidadeV20261022b() {
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
          A DoLado não designou actualmente um Encarregado de Protecção de Dados por não se encontrar, neste
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
            pelo prestador de autenticação apenas sob a forma de hash irreversível, ou início de sessão com conta Google), perfil e preferências
            indicadas pelo Utilizador (por exemplo, os sectores subscritos para o aviso sectorial)
          </li>
          <li>
            <strong>Programa de indicação</strong>: códigos e identificadores de visita, relação entre quem indica e
            quem é indicado, data da visita e da atribuição, primeira compra (produto, valor, desconto, data e
            identificadores Stripe), recompensas e respectivo histórico (disponibilidade, reserva, utilização,
            expiração, anulação e motivo). Os códigos e identificadores são pseudonimizados, mas continuam a ser
            dados pessoais quando ligados a contas ou a outras informações que permitam identificar as pessoas.
          </li>
          <li>
            <strong>Prevenção de abusos no programa de indicação</strong>: para verificar possível auto-indicação, o
            servidor compara temporariamente a impressão digital (fingerprint) do cartão ou do débito directo SEPA
            usado na primeira compra com as impressões digitais dos meios de pagamento guardados no Customer Stripe
            de quem indicou. A impressão digital não é guardada pela DoLado. Uma coincidência é apenas um sinal para
            revisão manual da recompensa. Separadamente, quando a compra usa o mesmo Customer Stripe de quem indicou,
            a recompensa fica em revisão manual, sem rejeição automática. Neste fluxo de indicação, não recolhemos nem usamos o endereço
            IP para atribuir ou avaliar indicações.
          </li>
          <li>
            <strong>Protecção gratuita</strong>: para garantir que cada pessoa usa a Protecção gratuita uma única vez,
            guardamos um pseudónimo do endereço de e-mail normalizado — um código calculado com uma chave secreta,
            que não permite ler o e-mail —, mesmo que a conta seja eliminada. Guardamos também as datas de início e
            de fim do período, a versão dos Termos aceite e a página de origem da activação (esta última só para
            estatísticas, sem identificar a pessoa).
          </li>
          <li>
            <strong>Protecção oferecida por um parceiro</strong>: quando o Utilizador activa um código que recebeu de
            uma empresa parceira da DoLado (Parceiro de Distribuição), guardamos o código sob a forma de hash
            irreversível (e os seus quatro últimos caracteres, para apoio ao Utilizador), a empresa que o ofereceu, as
            datas de início e de fim do período, a versão dos Termos e o texto aceites e o registo dos avisos enviados
            sobre o período.
          </li>
          <li>
            <strong>Atribuição a um Parceiro de Indicação</strong>: quando o Utilizador chega à DoLado pela ligação de
            um parceiro, com consentimento para cookies de marketing, ou escreve um código de parceiro ao criar a conta
            ou antes de pagar, guardamos o parceiro, o código, a forma de atribuição (ligação ou código), a data da
            visita e a data da atribuição. Para calcular a comissão do parceiro, registamos as mensalidades pagas da
            primeira subscrição da conta: valor pago, IVA, descontos, data, identificadores da Stripe e se foram
            reembolsadas ou contestadas.
          </li>
          <li>
            <strong>Programa de Parceiros — candidatos e parceiros</strong>: de quem se candidata a parceiro, o nome,
            o e-mail, a empresa (opcional), o tipo de parceria pretendido, a descrição da actividade, o texto aceite, o
            idioma, a decisão e o respectivo motivo. Dos parceiros, o nome, o contacto administrativo, as condições
            comerciais acordadas e as suas versões, os códigos e ligações atribuídos, as comissões e o seu estado, os
            pagamentos (valor, IVA, número do documento emitido pelo parceiro, data e referência) e o histórico das
            alterações. Os dados de facturação e bancários necessários aos pagamentos são tratados na contabilidade da
            DoLado, fora da plataforma.
          </li>
          <li>
            <strong>Área de parceiro</strong>: da pessoa que representa um Parceiro de Indicação, os dados da sua conta
            DoLado (como qualquer conta) e a ligação dessa conta ao parceiro — quem deu e quem retirou o acesso, as
            datas e o motivo.
          </li>
          <li>
            <strong>Oportunidades empresariais apresentadas por parceiros</strong>: o nome da entidade apresentada e,
            quando o parceiro o indique, um contacto de uma pessoa dessa entidade, bem como o estado da oportunidade e,
            se der origem a um contrato, a receita recebida usada para calcular a comissão.
          </li>
          <li>
            <strong>Prevenção de abusos no Programa de Parceiros</strong>: para limitar tentativas repetidas de
            activação de códigos e de candidaturas, registamos durante 2 dias cada tentativa, associada à conta ou a um
            pseudónimo do e-mail (um código calculado que não permite ler o e-mail). Não recolhemos nem usamos o
            endereço IP para este efeito.
          </li>
          <li>
            <strong>Origem de aquisição</strong>: identificador indicado no parâmetro ?ref= da ligação pela qual o
            Utilizador chegou, quando tenha consentido em cookies de estatística; a data da primeira visita serve só
            para confirmar que a visita foi anterior à criação da conta. Só o identificador fica guardado na conta,
            para atribuição interna, e não é enviado à Stripe nem a parceiros
          </li>
          <li>
            <strong>Dados do caso</strong>: sector e empresa visada, descrição do problema (texto livre), documentos
            anexados (factura, contrato, capturas de ecrã ou outros comprovativos), o texto da reclamação preparado
            pela DoLado e as respectivas versões, os pedidos de alteração e a autorização de envio dada pelo
            Utilizador, e o registo do envio e do comprovativo de submissão. Quando a primeira proposta do texto é
            preparada com apoio de inteligência artificial (secção 4), guardamos também essa proposta e o registo
            da sua preparação: as regras jurídicas consideradas, a informação assinalada como estando por confirmar
            e a data. Guardamos também as comunicações recebidas da empresa visada ou de outras entidades sobre a
            reclamação — por e-mail, através de um endereço próprio do caso, ou registadas pela DoLado quando chegam
            por outro meio —, incluindo os anexos, o remetente e a data; a análise dessas comunicações e as decisões
            da DoLado sobre o passo seguinte; a informação e os ficheiros que o Utilizador envia a pedido da DoLado;
            e a confirmação do Utilizador sobre a resolução do problema
          </li>
          <li>
            <strong>Dados do Monitor de Protecção</strong>: os serviços que o Utilizador decide acompanhar (por
            exemplo, um serviço de telecomunicações ou de electricidade), com ou sem contrato, e as facturas e os
            contratos que carrega. Destes documentos resultam:
            <p className="mt-2">
              Se o Utilizador escolher reutilizar no Monitor uma factura que já enviou num caso, a DoLado cria uma
              cópia para o serviço que indicar. Essa cópia passa a integrar o Monitor e segue o prazo de conservação
              próprio do Monitor; não é reutilizada automaticamente.
            </p>
            <ul className="mt-2 flex list-[circle] flex-col gap-1.5 pl-5">
              <li>
                os valores de cada factura — total, mensalidade, descontos, consumos e outras cobranças, período e
                número da factura — e o histórico mês a mês que deles resulta;
              </li>
              <li>
                quando o Utilizador adiciona o contrato ou indica as condições, as condições contratadas e as
                respectivas alterações ao longo do tempo — fornecedor, serviço, referência do contrato, mensalidade,
                promoção e desconto, serviços incluídos, datas de início e de fim de fidelização e de promoção, valor
                da vantagem associada à fidelização e, quando aplicável, os códigos de identificação da instalação
                (CPE, para a electricidade, e CUI, para o gás natural);
              </li>
              <li>
                <strong>dados de identificação que constam dos documentos</strong> — nome e NIF do titular, número de
                cliente, de conta, de contrato e de serviço —, usados apenas para confirmar que cada documento pertence
                ao serviço certo. O NIF e o nome do titular nunca são guardados em texto: logo depois de lidos, são
                substituídos por um código pseudonimizado, calculado com uma chave secreta, que serve apenas para
                comparar documentos e não permite, sem essa chave, conhecer o valor original. Do NIF, a DoLado
                mostra apenas os últimos três dígitos. As referências de conta, de contrato e de serviço são guardadas
                tal como constam do documento. Os documentos carregados continuam guardados tal como foram enviados;
              </li>
              <li>
                a origem de cada dado (introduzido pelo Utilizador, lido de um documento, calculado ou corrigido pela
                DoLado), as confirmações e correcções feitas pelo Utilizador e as decisões de associação de documentos
                tomadas pelo Utilizador (por exemplo, associar uma factura a um serviço apesar de não termos conseguido
                confirmar a identificação);
              </li>
              <li>
                as situações detectadas na comparação das facturas, a respectiva revisão pela DoLado e o registo dos
                alertas enviados.
              </li>
            </ul>
          </li>
          <li>
            <strong>Dados de pagamento e subscrição</strong>: plano escolhido, estado da subscrição, datas de
            renovação, casos disponíveis, histórico de pagamentos e reembolsos e os identificadores atribuídos
            pela Stripe. Os dados do cartão ou de outro meio de pagamento são introduzidos directamente na página de
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
            contactos da DoLado e a respectiva resposta
          </li>
          <li>
            <strong>Dados de navegação e medição</strong>, apenas com consentimento dado no banner de cookies: dados
            de utilização do site recolhidos via Google Analytics (GA4), designadamente páginas visitadas e eventos
            como a submissão de formulários, e dados de medição de conversões do Google Ads, incluindo o e-mail
            indicado no formulário sob a forma de hash irreversível (SHA-256); e, com consentimento para
            marketing, as páginas do site visitadas, recolhidas pelo Pixel da Meta juntamente com o endereço IP,
            dados técnicos do navegador e um identificador guardado num cookie. Não enviamos à Meta o seu nome,
            e-mail, telefone, nem dados da sua conta, dos seus casos, contratos ou facturas
          </li>
        </ul>
        <p className={P}>
          O <strong>Simulador de Elegibilidade</strong> é gratuito e funciona sem conta e sem pedir dados de
          identificação ou de contacto. As respostas ficam apenas no navegador do Utilizador: a DoLado não as
          guarda nem as associa a uma pessoa ou conta. Com consentimento para medição, regista-se apenas o tipo de
          resultado obtido (por exemplo, &quot;positivo&quot;), sem as respostas. Se o Utilizador decidir avançar
          para &quot;Tratar o meu caso&quot;, o sector, o tipo de problema e o contacto prévio com a empresa
          indicados no simulador servem para pré-preencher esse formulário e só são guardados se o Utilizador o
          submeter.
        </p>
        <p className={P}>
          <strong>Guia gratuito.</strong> Quando pede um guia gratuito no nosso site, tratamos o seu endereço de
          e-mail para lho disponibilizar e para lhe enviar a ligação por e-mail. Registamos também a data do pedido,
          o idioma e a origem da visita (por exemplo, uma publicação no Instagram ou um anúncio), para sabermos que
          canais funcionam. Não criamos nenhuma conta. Apagamos estes dados 12 meses depois do seu último pedido.
        </p>
        <p className={P}>
          <strong>Comunicações comerciais.</strong> Só lhe enviamos dicas, novidades e outras comunicações da DoLado
          se tiver dado autorização, marcando a caixa opcional. Essa autorização não é necessária para receber o
          guia. Guardamos o texto que aceitou, a versão, a data e a hora, como prova. Pode retirá-la a qualquer
          momento pela ligação incluída em cada comunicação ou escrevendo para <EmailPrivacidade />.
        </p>
        <p className={P}>
          Pedimos apenas os documentos necessários ao caso ou à funcionalidade utilizada. Estes podem conter
          incidentalmente dados de saúde, outras categorias especiais ou dados de terceiros. A DoLado não solicita
          esses dados como regra; se forem estritamente necessários para formular ou provar o pedido, indica-se a
          finalidade, a informação mínima e os acessos antes do envio. Dados de saúde só são tratados quando exista,
          além de um fundamento do artigo 6.º do RGPD, uma condição autónoma do artigo 9.º aplicável ao caso. Quando
          essa condição seja o consentimento explícito, este é pedido separadamente e pode ser retirado. O simples
          carregamento de um documento não vale como consentimento.
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
            preparar a reclamação — incluindo, quando aplicável, uma primeira proposta do texto preparada com apoio
            de inteligência artificial e sempre revista por uma pessoa da equipa DoLado (secção 4) —, submetê-la à
            revisão do Utilizador e enviá-la apenas depois da sua autorização explícita, e acompanhar o caso;
          </li>
          <li>gerir a conta e a área de cliente;</li>
          <li>
            gerir o programa de indicação a pedido de quem participa: atribuir a indicação, aplicar os descontos
            anunciados, registar a primeira compra e administrar as recompensas e o respectivo histórico;
          </li>
          <li>
            prestar as funcionalidades de protecção do plano contratado, incluindo o Monitor de Protecção, para ajudar
            o titular a prevenir e a detectar problemas com os seus serviços: ler os documentos carregados, confirmar
            que cada documento pertence ao serviço certo — para não misturar dados de outra pessoa ou de outro
            serviço —, comparar cada factura com as anteriores e, quando o titular adiciona o contrato, com as
            condições contratadas, acompanhar as datas relevantes e avisar o titular dessas datas e das situações
            que, depois de revistas pela DoLado, mereçam ser verificadas;
          </li>
          <li>
            prestar a Protecção gratuita durante 30 dias a quem a activa: dar acesso às funcionalidades da Protecção,
            terminar o período na data prevista e enviar os avisos de início, de acompanhamento e de fim do período;
          </li>
          <li>
            prestar a Protecção oferecida por um parceiro a quem activa o código: verificar o código, dar acesso às
            funcionalidades da Protecção durante o período oferecido, terminá-lo na data prevista e enviar os avisos de
            activação, de fim próximo e de fim do período;
          </li>
          <li>processar pagamentos e gerir subscrições, cancelamentos e casos disponíveis;</li>
          <li>enviar os e-mails transacionais relacionados com o caso, a conta e os pagamentos;</li>
          <li>
            disponibilizar o guia gratuito pedido no site e enviar, por e-mail, a ligação para o descarregar (no
            máximo uma vez em cada 24 horas).
          </li>
        </ul>
        <p className={P}>
          Estes dados são necessários para prestar o serviço: sem eles, a DoLado não o consegue prestar. As caixas
          de confirmação dos formulários de abertura de caso e das funcionalidades registam o pedido do titular e a
          tomada de conhecimento desta Política; não são o fundamento deste tratamento.
        </p>
        <p className={P}>
          <strong>Cumprimento de obrigações legais</strong> (artigo 6.º, n.º 1, alínea c) do RGPD): obrigações
          fiscais e contabilísticas relativas a pagamentos e facturação, tratamento de pedidos de livre resolução e
          de reclamações apresentadas no Livro de Reclamações, e resposta a pedidos de exercício de direitos.
        </p>
        <p className={P}>
          <strong>Interesse legítimo da DoLado</strong> (artigo 6.º, n.º 1, alínea f) do RGPD): conservar os
          registos de aceitação, de autorização e de envio para poder demonstrar o que foi aceite, autorizado e
          enviado; conservar, durante 6 meses depois do fim da subscrição, a configuração dos alertas
          e dos contratos acompanhados que tenham sido desactivados, para que o titular a possa recuperar se voltar à DoLado; declarar, exercer ou defender
          direitos; medir de que canais (por exemplo, publicações ou anúncios) chegam os pedidos de guias gratuitos;
          garantir a segurança da plataforma e prevenir abusos, incluindo a utilização repetida da
          Protecção gratuita (através do pseudónimo do e-mail, conservado durante 24 meses). O
          titular pode opor-se a estes tratamentos, nos termos da secção 7.
        </p>
        <p className={P}>
          No programa de indicação, a execução do contrato ou as diligências pré-contratuais pedidas pelo titular
          (artigo 6.º, n.º 1, alínea b) do RGPD) fundamentam a atribuição e a gestão dos descontos e recompensas. O
          interesse legítimo da DoLado (artigo 6.º, n.º 1, alínea f)) fundamenta a prevenção de auto-indicações e de
          abuso do programa, incluindo a comparação temporária das impressões digitais de meios de pagamento e a
          conservação limitada dos registos necessários para rever decisões e defender direitos. A impressão digital
          não é conservada; uma coincidência encaminha a recompensa para revisão humana. A utilização do mesmo
          Customer Stripe também é apenas um sinal para revisão, permitindo considerar o contexto antes de decidir.
        </p>
        <p className={P}>
          No <strong>Programa de Parceiros</strong>:
        </p>
        <ul className={UL}>
          <li>
            as candidaturas são tratadas para as analisar e responder ao candidato, como diligências pré-contratuais
            a seu pedido (artigo 6.º, n.º 1, alínea b) do RGPD) quando se candidata em nome próprio, ou com base no
            interesse legítimo da DoLado em avaliar parcerias com empresas (alínea f)) quando se candidata em nome de
            uma empresa;
          </li>
          <li>
            os dados dos parceiros, das condições, das comissões e dos pagamentos são tratados para executar o acordo
            de parceria (alínea b), ou alínea f) quando o parceiro é uma empresa e os dados são do seu representante)
            e para cumprir as obrigações fiscais e contabilísticas dos pagamentos (alínea c));
          </li>
          <li>
            a atribuição de uma conta a um Parceiro de Indicação e o registo das mensalidades pagas baseiam-se no
            interesse legítimo da DoLado em calcular, verificar e pagar as comissões acordadas e em prevenir abusos
            (alínea f)). A atribuição pela ligação do parceiro depende do consentimento para cookies de marketing
            (cookie dolado_indicacao); a atribuição por código depende de o próprio Utilizador o escrever. A
            atribuição não altera o preço pago pelo Utilizador nem o serviço prestado;
          </li>
          <li>
            os contactos de pessoas de empresas apresentadas por parceiros são tratados com base no interesse legítimo
            da DoLado em responder a oportunidades comerciais entre empresas (alínea f)). O parceiro só deve
            comunicá-los quando tenha legitimidade para o fazer; no primeiro contacto, a DoLado informa a pessoa da
            origem dos dados e de como se pode opor;
          </li>
          <li>
            os registos de tentativas baseiam-se no interesse legítimo da DoLado em proteger os códigos e o formulário
            de candidatura contra tentativas repetidas (alínea f)).
          </li>
        </ul>
        <p className={P}>
          Quando um documento revele dados de saúde ou outra categoria especial, o fundamento do artigo 6.º não
          basta. A DoLado só trata essa informação quando seja estritamente necessária e se verifique uma condição
          autónoma do artigo 9.º do RGPD: para prestar a funcionalidade pedida, artigo 6.º, n.º 1, alínea b), em
          conjunto com consentimento explícito específico do artigo 9.º, n.º 2, alínea a); para declarar, exercer ou
          defender um direito, artigo 6.º, n.º 1, alínea f), em conjunto com o artigo 9.º, n.º 2, alínea f). Não se
          presume consentimento pelo simples carregamento do documento. O acesso fica limitado às pessoas que tratam
          o caso; a utilização sistemática depende de registo no ROPA e de avaliação documentada da necessidade de
          uma AIPD.
        </p>
        <p className={P}>
          <strong>Consentimento</strong> (artigo 6.º, n.º 1, alínea a) do RGPD), apenas para o que dele depende:
        </p>
        <ul className={UL}>
          <li>
            dados de navegação e de medição (Google Analytics, Google Ads e Pixel da Meta), só recolhidos depois
            de consentimento explícito no banner de cookies, para medir a utilização do site, medir a eficácia das
            nossas campanhas publicitárias e mostrar publicidade da DoLado a pessoas que visitaram o site. O acesso ou armazenamento de informação no equipamento é feito com
            consentimento prévio quando exigido pelo artigo 5.º, n.º 3, da Directiva ePrivacy, transposto pela Lei
            n.º 41/2004;
          </li>
          <li>
            o cookie de atribuição dolado_origem, criado apenas depois do consentimento da categoria de estatística no
            Cookiebot; a origem é guardada na conta para atribuição interna e não é enviada para a Stripe ou para
            parceiros.
          </li>
          <li>
            o cookie dolado_indicacao, que guarda durante 30 dias um identificador pseudonimizado da visita a um link
            do programa de indicação ou de um Parceiro de Indicação. Só é criado e usado depois de o Cookiebot
            confirmar consentimento para cookies de marketing. Sem esse consentimento, a visita não é registada nem
            associada a uma conta, e os descontos de indicação ou a atribuição a um parceiro não são feitos por esse
            link.
          </li>
          <li>
            o cookie técnico dolado_estatisticas, que regista apenas a escolha feita no banner sobre a categoria de
            estatística (dada ou recusada/retirada), durante 30 dias, para que essa escolha seja respeitada também
            em portal.dolado.pt: com consentimento, o servidor pode ler o cookie de origem; com recusa ou retirada, o
            cookie de origem é apagado e a origem guardada na conta é apagada na interacção seguinte com sessão
            iniciada.
          </li>
          <li>
            e-mails da DoLado com novidades e ofertas — por exemplo, sobre a Protecção —, que o titular pode
            aceitar de forma facultativa no formulário &quot;Tratar o meu caso&quot;. A autorização fica
            associada à conta, com a data e o texto aceite, e cada e-mail permite deixar de os receber.
          </li>
          <li>
            dicas, novidades e comunicações da DoLado por e-mail, que o titular pode aceitar de forma facultativa
            ao pedir um guia gratuito, sem conta. Guardamos o texto aceite, a versão, a data e a hora. A autorização
            não é condição para receber o guia, e cada comunicação permite deixar de as receber.
          </li>
        </ul>
        <p className={P}>
          O consentimento pode ser retirado a qualquer momento — nas definições de cookies, no Perfil da área de
          cliente (e-mails com novidades e ofertas) ou escrevendo para{" "}
          <EmailPrivacidade /> —, sem afectar a licitude do tratamento feito antes.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">
          4. Inteligência artificial e decisões automatizadas
        </h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          A DoLado utiliza sistemas de inteligência artificial como ferramenta de apoio em três situações:
        </p>
        <ul className={UL}>
          <li>
            no Monitor de Protecção, para ler as facturas e os contratos que o Utilizador carrega e extrair deles
            dados objectivos — por exemplo, datas, valores, o nome do fornecedor e os dados de identificação do
            titular e do serviço que constam do documento;
          </li>
          <li>
            na preparação da reclamação, para redigir uma primeira proposta do texto a partir da informação do caso
            e das regras jurídicas seleccionadas pela DoLado;
          </li>
          <li>
            no acompanhamento da reclamação, para preparar uma análise preliminar interna das respostas recebidas
            da empresa — o que foi respondido, o que ficou por responder e o passo seguinte possível —, sempre
            revista por uma pessoa da equipa DoLado, que decide o que fazer. Esta análise não é mostrada ao
            Utilizador nem enviada à empresa.
          </li>
        </ul>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          A utilização de inteligência artificial não implica, por si só, uma decisão
          exclusivamente automatizada. A DoLado não utiliza inteligência artificial
          para tomar decisões exclusivamente automatizadas que produzam efeitos
          jurídicos sobre o Utilizador ou que o afectem de forma similarmente
          significativa, nos termos do artigo 22.º do RGPD.
          Sempre que aplicável, existe intervenção e revisão humana: a redacção e, quando
          autorizada, a submissão da reclamação são conduzidas por uma pessoa da
          equipa DoLado. Os resultados obtidos com apoio de inteligência artificial
          têm natureza informativa e não constituem uma decisão jurídica definitiva.
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          No programa de indicação, há duas verificações diferentes: a coincidência da impressão digital de um cartão
          ou débito directo SEPA gera um sinal e encaminha a recompensa para revisão manual; a utilização do mesmo
          Customer Stripe de quem indicou é também um sinal de possível auto-indicação e encaminha a recompensa para
          revisão humana; por si só, não determina a rejeição. Esta regra não usa inteligência artificial. A pessoa
          responsável pela revisão aprecia o caso e regista o motivo da decisão.
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          No Monitor de Protecção, a inteligência artificial é usada apenas para ler e estruturar os documentos. A verificação de que um
          documento pertence a um serviço, as comparações, os cálculos e a aplicação de regras são feitos por
          programas com regras fixas, e o Utilizador pode confirmar ou corrigir os dados lidos. Quando não
          conseguimos confirmar que um documento pertence a um serviço, nada é associado nem alterado até o
          Utilizador decidir o que fazer com esse documento. Qualquer situação detectada na comparação das facturas é revista por uma pessoa da
          equipa DoLado antes de ser comunicada ao Utilizador, e é apresentada como uma situação que merece ser
          verificada, nunca como uma conclusão sobre o cumprimento da lei ou do contrato.
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          A proposta do texto da reclamação preparada com apoio de inteligência artificial é apenas um ponto de
          partida interno. É sempre revista e, se necessário, corrigida por uma pessoa da equipa DoLado antes de
          ser mostrada ao Utilizador; nunca é enviada ao Utilizador nem à empresa visada sem essa revisão, e a
          reclamação só é enviada depois da autorização explícita do Utilizador, como descrito na secção 3. A
          fundamentação jurídica da proposta só pode basear-se em regras escolhidas e revistas pela DoLado. A
          inteligência artificial não decide se a DoLado aceita ou trata um caso.
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Em observância do princípio da minimização dos dados, a DoLado envia ao
          prestador de inteligência artificial apenas a informação necessária à
          funcionalidade em causa — designadamente, o documento ou a informação que
          o Utilizador submete para essa funcionalidade —, sem lhe acrescentar dados
          de identificação ou de contacto da conta, como o nome, o e-mail ou o
          telefone. Na leitura de documentos do Monitor de Protecção, o conteúdo dos documentos é tratado apenas
          como dados a extrair, e o prestador recebe um documento de cada vez, sem o histórico do Utilizador.
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Para preparar a proposta do texto da reclamação, o prestador recebe apenas a informação do caso
          necessária para a redigir: o sector, a empresa visada, o tipo de problema, a descrição feita pelo
          Utilizador, a indicação de contacto anterior com a empresa e, quando o Utilizador acompanha o serviço
          dessa empresa no Monitor de Protecção, as condições registadas e os valores das facturas mais recentes.
          Não recebe o nome, o e-mail, o telefone, o NIF nem as referências de cliente ou de contrato, nem os
          documentos anexados ao caso. Antes do envio, a DoLado procura retirar da descrição contactos e números de
          identificação que o Utilizador possa ter escrito; por isso, recomendamos que não os inclua na descrição.
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Para essa análise, o prestador recebe o problema descrito pelo Utilizador, a última comunicação enviada
          pela DoLado e a resposta recebida, sem o nome, o e-mail nem o telefone do Utilizador, nem os ficheiros
          anexos.
        </p>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          No Monitor, a Claude API recebe apenas o documento escolhido pelo Utilizador para leitura, através de uma
          ligação temporária assinada, válida por 5 minutos. A DoLado não utiliza a API Files da Anthropic nem mantém
          aí uma cópia persistente. A Anthropic pode conservar entradas e saídas da API por até 30 dias para detecção
          de abuso e cumprimento das suas políticas, salvo excepções legais ou de segurança; a conta da DoLado não tem
          retenção zero de dados. Os documentos do caso não são enviados directamente à Claude API; se o Utilizador
          escolher copiar uma factura para o Monitor, essa cópia separada pode ser enviada para a leitura descrita
          acima.
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
            anexados, dados das funcionalidades de protecção e do Monitor de Protecção,
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
            caso, a conta, os pagamentos, as funcionalidades de protecção, os pedidos
            de livre resolução e as mensagens dirigidas à DoLado, na qualidade de
            subcontratante, com sede na União Europeia)
          </li>
          <li>
            <strong>Resend</strong> (recepção dos e-mails enviados para os endereços próprios de cada caso, que
            disponibiliza à DoLado, na qualidade de subcontratante). O Resend é uma empresa com sede nos Estados
            Unidos, onde decorre o essencial do tratamento, o que implica transferências internacionais de dados,
            realizadas ao abrigo das cláusulas contratuais-tipo aprovadas pela Comissão Europeia, incluídas no acordo
            de tratamento de dados celebrado com o Resend, e da certificação do Resend no Quadro de Privacidade de
            Dados UE-EUA (EU-U.S. Data Privacy Framework)
          </li>
          <li>
            <strong>Google</strong> (Google Analytics / GA4, Google Tag Manager e Google
            Ads — métricas de utilização do site e medição de conversões, apenas com
            consentimento dado no banner de cookies). A Google actua como subcontratante
            no tratamento que realiza por conta da DoLado, nos termos dos seus termos de
            tratamento de dados, e, para finalidades próprias definidas nos seus
            termos, como responsável pelo tratamento autónomo. Quando o Utilizador
            escolhe iniciar sessão com a sua conta Google, a Google trata os dados
            dessa conta como responsável pelo tratamento autónomo. Este tratamento pode
            implicar transferências internacionais de dados, nos termos indicados
            abaixo
          </li>
          <li>
            <strong>Meta</strong> (Meta Platforms Ireland Limited — Pixel da Meta, para medir as visitas ao site
            vindas das campanhas da DoLado no Facebook e no Instagram e para mostrar publicidade da DoLado a quem
            visitou o site, apenas com consentimento para marketing dado no banner de cookies). Na recolha e
            transmissão destes dados à Meta, a DoLado e a Meta são responsáveis conjuntas pelo tratamento, nos
            termos de um acordo celebrado entre ambas, que define que a DoLado informa o Utilizador e obtém o seu
            consentimento e que a Meta responde aos pedidos de exercício de direitos relativos aos dados que
            trata. O tratamento posterior desses dados é feito pela Meta como responsável pelo tratamento
            autónomo, nos termos da sua{" "}
            <a href="https://www.facebook.com/privacy/policy" target="_blank" rel="noopener" className={LINK}>
              Política de Privacidade
            </a>
            . Se tiver uma conta Facebook ou Instagram, a Meta pode associar a visita a essa conta. Este
            tratamento pode implicar transferências internacionais de dados para a Meta Platforms, Inc., nos
            Estados Unidos, certificada no Quadro de Privacidade de Dados UE-EUA (EU-U.S. Data Privacy
            Framework), e com base nas cláusulas contratuais-tipo aprovadas pela Comissão Europeia
          </li>
          <li>
            <strong>Cookiebot</strong> (gestão do consentimento de cookies e registo das
            escolhas do visitante, na qualidade de subcontratante)
          </li>
          <li>
            <strong>Anthropic</strong> (fornecimento da Claude API, usada na leitura
            das facturas e dos contratos carregados no Monitor de Protecção e na
            preparação da primeira proposta do texto da reclamação e na análise
            preliminar das respostas recebidas da empresa, descritas na
            secção 4, na qualidade de subcontratante, ao abrigo de um
            acordo de tratamento de dados). Este tratamento pode implicar
            transferências internacionais de dados, nos termos indicados abaixo
          </li>
          <li>
            <strong>Stripe</strong> (processamento de pagamentos, gestão de subscrições
            e facturação dos serviços da DoLado, com tratamento dos dados necessários
            aos pagamentos). A Stripe actua como subcontratante no tratamento que
            realiza por conta da DoLado e, para finalidades próprias definidas nos
            seus termos — como a prevenção de fraude e o cumprimento das suas
            obrigações legais —, como responsável pelo tratamento autónomo. Os dados
            do meio de pagamento são introduzidos directamente na página de pagamento
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
            a plataforma do Livro de Reclamações Electrónico, quando a reclamação é
            submetida por essa via;
          </li>
          <li>
            as entidades reguladoras ou fiscalizadoras competentes, quando aplicável.
          </li>
        </ul>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          Não vendemos nem partilhamos dados para fins de marketing de terceiros. Os parceiros que indicam a DoLado
          não recebem dados dos clientes encaminhados nem informação sobre os respectivos casos, contas ou compras. A
          DoLado conserva apenas o identificador de origem na conta para atribuição interna, até à retirada do
          consentimento de estatística ou à eliminação da conta. Os parceiros podem enviar
          os seus próprios contactos à DoLado apenas quando tenham base legal e informação adequadas; a DoLado não
          lhes devolve listas nem dados individuais.
        </p>
        <p className={P}>
          <strong>Parceiros comerciais.</strong> Um Parceiro de Indicação pode consultar, numa área própria da
          plataforma, apenas números totais: quantas contas lhe estão atribuídas, quantas subscreveram a Protecção ou o
          Caso + Protecção, o número e o valor das comissões em cada estado e os pagamentos que recebeu. Nunca vê o
          nome, o e-mail, a conta, os casos, as facturas ou os contratos das pessoas que lhe estão atribuídas. Como o
          parceiro sabe a quem fez a recomendação, quando os números são pequenos pode deduzir se uma pessoa que
          recomendou subscreveu um serviço e se a subscrição se mantém. Uma empresa que oferece
          a Protecção (Parceiro de Distribuição) sabe a quem entregou cada código, porque é ela que o entrega, mas a
          DoLado só lhe comunica números agregados (por exemplo, quantos códigos foram activados) e, em grupos com
          menos de 5 activações, apenas a indicação &quot;menos de 5&quot;. A DoLado não lhe diz quem activou um
          código, nem lhe dá acesso às facturas, contratos ou casos dos beneficiários. O nome comercial da empresa que
          ofereceu a Protecção é mostrado ao beneficiário na sua área de cliente e nos e-mails sobre o período.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>6. Prazo de conservação</h2>
        <p className={P}>
          Conservamos os dados apenas durante o tempo necessário à finalidade para que foram recolhidos e ao
          cumprimento de obrigações legais. Quando um prazo termina, os dados são eliminados ou anonimizados.
        </p>
        <p className={P}>
          Cada finalidade tem um prazo próprio. Os PDF do dossiê gerados pela DoLado e guardados na plataforma, bem
          como as respectivas versões, são eliminados 6 meses depois do encerramento do caso. No Monitor, os documentos e dados são eliminados quando o titular deixa de
          acompanhar o serviço; se a subscrição com Protecção terminar, a configuração e os dados desactivados ficam
          disponíveis durante 6 meses para reactivação e são eliminados no fim desse prazo. Um documento rejeitado no
          fluxo de associação é apagado de imediato. A origem de aquisição é apagada da conta quando o titular retira
          o consentimento de estatística ou elimina a conta.
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
        <p className={P}>
          No programa de indicação, o cookie e os registos de visitas sem atribuição são eliminados ao fim de 30 dias.
          As relações entre contas, os dados da primeira compra, os descontos e o histórico são conservados enquanto
          existir uma indicação ou recompensa activa ou em revisão e, após a última decisão ou estado final da relação
          ou recompensa, por até 3 anos; depois são
          eliminados, salvo litígio ou obrigação legal pendente. A limpeza é automática. Os três anos são um limite
          interno de conservação baseado na necessidade de revisão e defesa de direitos, não um prazo legal geral.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>7. Direitos do titular</h2>
        <p className={P}>Nos termos do RGPD e quando aplicável, o titular dos dados tem direito a:</p>
        <ul className={UL}>
          <li>aceder aos seus dados pessoais;</li>
          <li>pedir a rectificação de dados inexactos ou incompletos;</li>
          <li>
            pedir o apagamento dos dados, excepto quando a conservação seja necessária, por exemplo, para cumprir
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
          Pode retirar o consentimento para marketing a qualquer momento, nas definições de cookies do site
          (ligação &quot;Definições de cookies&quot; no rodapé). Quanto aos dados tratados pela Meta, pode também
          exercer os seus direitos directamente junto da Meta e gerir as preferências de publicidade na sua conta
          Facebook ou Instagram.
        </p>
        <p className={P}>
          O titular tem também o direito de apresentar reclamação junto da Comissão Nacional de Protecção de Dados
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
          Os documentos de um caso — facturas, contratos, mensagens — podem conter dados pessoais de outras
          pessoas, por exemplo de quem partilha o contrato ou a morada. Para limitar esse tratamento, pedimos que:
        </p>
        <ul className={UL}>
          <li>envie apenas a informação e os documentos necessários ao caso;</li>
          <li>sempre que possível, oculte os dados de outras pessoas que não sejam relevantes;</li>
          <li>
            oculte dados de saúde e outros dados especiais, salvo quando a DoLado confirme previamente que são
            estritamente necessários e indique a condição do artigo 9.º do RGPD aplicável; nesse caso, envie apenas
            os elementos indispensáveis;
          </li>
          <li>não envie documentos de terceiros sem uma ligação legítima ao caso.</li>
        </ul>
        <p className={P}>
          No Monitor de Protecção, se um documento carregado parecer pertencer a outra pessoa ou a outro serviço (por
          exemplo, um NIF do titular diferente), a DoLado não o junta ao serviço acompanhado e pede ao Utilizador que
          decida: adicioná-lo como um serviço diferente, associá-lo a outro serviço ou cancelar, caso em que o
          documento é apagado. Só deve carregar facturas e contratos de serviços de que seja titular ou com os quais
          tenha uma ligação legítima.
        </p>
        <p className={P}>
          A DoLado trata os dados de terceiros que constem dos documentos apenas na medida necessária ao caso, com
          as mesmas regras de segurança e de conservação, e não os utiliza para outras finalidades. Os titulares
          desses dados podem exercer os seus direitos junto da DoLado, nos termos da secção 7.
        </p>
        <p className={P}>
          As comunicações da empresa visada podem conter dados de pessoas que trabalham para essa empresa (por
          exemplo, nome e contacto profissional). A DoLado conserva-os apenas como parte do registo da reclamação.
        </p>
        <p className={P}>
          Um parceiro pode apresentar à DoLado uma empresa interessada nos seus serviços e indicar o contacto de uma
          pessoa dessa empresa. A DoLado usa esse contacto apenas para dar seguimento à oportunidade, informa a pessoa
          no primeiro contacto de que os seus dados foram indicados pelo parceiro e deixa de os usar se ela se opuser.
          Estas pessoas podem exercer os seus direitos junto da DoLado, nos termos da secção 7.
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
        Versão 2026-10-22b · Última actualização: 22 de Outubro de 2026
      </p>
    </article>
  );
}
