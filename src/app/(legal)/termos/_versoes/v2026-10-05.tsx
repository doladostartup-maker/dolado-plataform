// Termos e Condições — versão 2026-10-05.
//
// Substitui a 2026-10-02. Só muda (Caso Extra, 20261005190000_caso_extra.sql;
// validado por Thiago a 05/10/2026):
// - secção 5: Caso Extra (benefício de subscritor do Caso + Proteção); a
//   Proteção passa a ser descrita pelo Monitor de Proteção (sem o
//   "comparador de faturas" nem o alerta gratuito de fim de fidelização, já
//   substituídos/retirados);
// - secção 6: o desconto do Caso Extra não acumula com códigos promocionais;
// - secção 8: casos disponíveis também de compras Caso Extra; o limite de
//   casos acumulados conta só os casos da subscrição (as compras à parte já
//   não contam); ordem de utilização com o Caso Extra; Caso Extra não afetado
//   pelo fim da subscrição;
// - secção 9: passa a "Avulso e Caso Extra";
// - secção 10: o Caso Extra não passa a subscrição.
//
// Só descreve regras já implementadas. Preços e limites vêm de
// src/lib/planos.ts; textos legais de src/lib/legal.ts; identificação de
// src/lib/site.ts. As secções herdadas mantêm a revisão jurídica pendente da
// 2026-10-02 (REVISAO_JURIDICA_PENDENTE); o texto do Caso Extra foi validado.
//
// Uma versão publicada não se edita: alterações vão para uma versão nova
// (ficheiro novo em _versoes/, registo em index.ts e TERMOS_VERSAO).
import Link from "next/link";
import {
  CONTACTO_LIVRE_RESOLUCAO,
  LIVRO_RECLAMACOES_URL,
  PRAZO_LIVRE_RESOLUCAO_DIAS,
  ROTAS_LEGAIS,
  consentimentoInicioImediato,
} from "@/lib/legal";
import { ROTULO_CONFIRMAR, ROTULO_RESOLVER } from "@/lib/livreResolucao";
import { CASO_EXTRA, LIMITE_CASOS_ACUMULADOS, PLANOS, formatarPreco } from "@/lib/planos";
import { DIAS_CASOS_GUARDADOS } from "@/lib/acesso";
import { VALOR_MENSALIDADE_CENTIMOS } from "@/lib/stripe/conversao";
import { CONTACTO_EMAIL, ENTIDADE_LEGAL, MORADA_SEDE, NIPC, PRIVACIDADE_EMAIL } from "@/lib/site";

// Descrição da Proteção tal como estava em src/lib/planos.ts quando esta
// versão foi publicada. Uma versão publicada não muda: o texto fica aqui
// fixo, mesmo que a descrição usada no site e na compra mude.
const DESCRICAO_PROTECAO_PUBLICADA =
  "Monitor de Proteção — acompanhamento dos serviços a partir das faturas e dos contratos que o Utilizador adiciona, para identificar alterações que possam tornar-se num problema, com avisos antes do fim de promoções e de períodos de fidelização — e aviso sectorial. Não inclui o tratamento de casos.";

const H2 = "text-xl font-semibold text-[var(--color-ink)]";
const H3 = "text-base font-semibold text-[var(--color-ink)]";
const P = "text-base leading-relaxed text-[var(--color-ink)]";
const UL = "flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed text-[var(--color-ink)]";
const OL = "flex list-decimal flex-col gap-2 pl-5 text-base leading-relaxed text-[var(--color-ink)]";
const LINK = "text-[var(--color-brand)] underline";

function Secao({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-3">
      <h2 className={H2}>{titulo}</h2>
      {children}
    </section>
  );
}

function Email({ endereco }: { endereco: string }) {
  return (
    <a href={`mailto:${endereco}`} className={LINK}>
      {endereco}
    </a>
  );
}

export function TermosV20261005() {
  const { protecao, caso_protecao: casoProtecao, avulso } = PLANOS;
  const reembolsoProtecao = avulso.precoCentimos - VALOR_MENSALIDADE_CENTIMOS.protecao;
  const reembolsoCasoProtecao = avulso.precoCentimos - VALOR_MENSALIDADE_CENTIMOS.caso_protecao;

  return (
    <article className="flex flex-col gap-6 pt-4">
      <div>
        <h1 className="text-[32px] font-semibold leading-tight text-[var(--color-ink)]">Termos e Condições</h1>
        <p className="mt-1 text-base text-[var(--color-ink-muted)]">DoLado — a sua reclamação, feita bem</p>
      </div>

      <Secao id="identificacao" titulo="1. Identificação">
        <p className={P}>
          A DoLado é uma marca operada por <strong>{ENTIDADE_LEGAL}</strong>, NIPC {NIPC}, com sede na {MORADA_SEDE}{" "}
          (“DoLado”). Contacto geral: <Email endereco={CONTACTO_EMAIL} />. Questões sobre dados pessoais:{" "}
          <Email endereco={PRIVACIDADE_EMAIL} />.
        </p>
        <p className={P}>
          Estes Termos regulam a utilização do site dolado.pt, da área de cliente e dos serviços da DoLado por quem os
          utiliza (“Utilizador”).
        </p>
      </Secao>

      <Secao id="servico" titulo="2. O serviço da DoLado">
        <p className={P}>
          A DoLado presta um serviço de apoio a consumidores com problemas em contratos de telecomunicações, energia
          ou água em Portugal: analisa a situação descrita pelo Utilizador, prepara o texto de uma reclamação com os
          factos, as datas e a legislação potencialmente aplicável, submete-a pelo canal adequado — depois de o
          Utilizador a autorizar — e acompanha o caso. Disponibiliza também, nos planos com Proteção, funcionalidades
          de prevenção e acompanhamento de contratos.
        </p>
        <ul className={UL}>
          <li>
            A DoLado não é uma sociedade de advogados nem de solicitadores e não presta consulta jurídica
            individualizada. A informação legal partilhada tem natureza informativa e organizativa e não constitui
            parecer jurídico.
          </li>
          <li>
            A DoLado não é uma autoridade pública, entidade reguladora, centro de arbitragem nem tribunal, e não se
            apresenta como tal perante as empresas reclamadas. Não representa o Utilizador em tribunal, em centros de
            arbitragem nem perante entidades reguladoras.
          </li>
          <li>
            <strong>A DoLado não garante o resultado.</strong> A decisão de dar ou não razão ao Utilizador, de
            corrigir uma situação ou de devolver qualquer valor pertence sempre à empresa reclamada ou à entidade
            competente.
          </li>
        </ul>
      </Secao>

      <Secao id="conta" titulo="3. Conta">
        <ul className={UL}>
          <li>
            Os serviços pagos e o acompanhamento dos casos são utilizados através de uma conta pessoal na área de
            cliente, criada com e-mail e palavra-passe ou com uma conta Google. Depois de um pagamento, a conta é
            criada ou associada a esse pagamento.
          </li>
          <li>
            O Utilizador é responsável por manter as suas credenciais confidenciais e pela utilização feita com elas.
            Se suspeitar de acesso indevido, deve alterar a palavra-passe e avisar a DoLado de imediato.
          </li>
          <li>
            O Utilizador compromete-se a fornecer informação verdadeira, atual e completa, e a mantê-la atualizada.
          </li>
          <li>A conta é pessoal e intransmissível.</li>
        </ul>
      </Secao>

      <Secao id="utilizacao" titulo="4. Regras de utilização">
        <p className={P}>O Utilizador compromete-se a não:</p>
        <ul className={UL}>
          <li>fornecer factos, documentos ou dados que saiba serem falsos, ou apresentar reclamações em nome de terceiros sem legitimidade para tal;</li>
          <li>enviar documentos com dados pessoais de terceiros ou dados sensíveis que não sejam necessários ao caso;</li>
          <li>usar o serviço para fins ilícitos, abusivos ou ofensivos, incluindo para assediar empresas ou pessoas;</li>
          <li>tentar aceder a contas, casos ou dados de outros utilizadores, ou comprometer a segurança e o funcionamento da plataforma.</li>
        </ul>
        <p className={P}>
          Em caso de violação grave destas regras, a DoLado pode recusar o tratamento de um caso ou suspender a conta,
          informando o Utilizador do motivo, sem prejuízo dos direitos que a lei lhe atribui quanto aos valores já
          pagos.
        </p>
      </Secao>

      <Secao id="planos" titulo="5. Planos e preços">
        <p className={P}>Todos os preços incluem IVA.</p>
        <ul className={UL}>
          <li>
            <strong>{protecao.nome}</strong> — subscrição mensal de {formatarPreco(protecao.precoCentimos)}.{" "}
            {DESCRICAO_PROTECAO_PUBLICADA}
          </li>
          <li>
            <strong>{casoProtecao.nome}</strong> — subscrição mensal de {formatarPreco(casoProtecao.precoCentimos)}.
            Tudo o que a {protecao.nome} inclui, mais 1 caso por mês, nas condições da secção 8.
          </li>
          <li>
            <strong>{avulso.nome}</strong> — pagamento único de {formatarPreco(avulso.precoCentimos)} por caso.{" "}
            {avulso.descricaoCurta}
          </li>
          <li>
            <strong>{CASO_EXTRA.nome}</strong> — pagamento único de {formatarPreco(CASO_EXTRA.precoCentimos)} por caso,
            em vez de {formatarPreco(avulso.precoCentimos)} ({CASO_EXTRA.descontoPercentagem}% de desconto como benefício
            de subscritor). Disponível apenas para quem tem a subscrição {casoProtecao.nome} ativa e já não tem casos
            disponíveis, nas condições da secção 9.
          </li>
        </ul>
        <p className={P}>
          O preço aplicável a cada compra é o apresentado no passo de confirmação, antes do pagamento. Algumas
          ferramentas são disponibilizadas sem pagamento (por exemplo, o simulador de elegibilidade, a calculadora
          de cancelamento ou o guia de mudança de casa); quando assim for, isso é indicado no momento da utilização.
        </p>
      </Secao>

      <Secao id="pagamento" titulo="6. Pagamento">
        <ul className={UL}>
          <li>
            Os pagamentos são processados pela Stripe. Os dados do meio de pagamento são introduzidos diretamente na
            página de pagamento da Stripe e não são recebidos nem guardados pela DoLado.
          </li>
          <li>
            O plano só é ativado quando o pagamento é confirmado. Alguns meios de pagamento, como o débito direto
            SEPA, podem demorar alguns dias úteis a ser confirmados.
          </li>
          <li>
            Códigos promocionais são aplicados no passo de pagamento, nas condições indicadas para cada código. O{" "}
            {CASO_EXTRA.nome} já inclui o desconto de subscritor, aplicado automaticamente, e não acumula com códigos
            promocionais.
          </li>
        </ul>
      </Secao>

      <Secao id="subscricoes" titulo="7. Subscrições">
        <ul className={UL}>
          <li>
            Os planos {protecao.nome} e {casoProtecao.nome} são subscrições <strong>mensais</strong>, com{" "}
            <strong>renovação automática</strong>: o período começa na data da adesão e renova-se todos os meses, na
            mesma data, até ser cancelado.
          </li>
          <li>
            Em cada renovação é cobrado o preço do plano, ou o valor resultante do código promocional aplicado, no
            meio de pagamento associado à subscrição. A renovação ocorre mesmo quando o valor de um mês é 0 €.
          </li>
          <li>
            O Utilizador gere a subscrição na área <strong>Gestão de Subscrição</strong>, na área de cliente, onde vê o
            plano, o estado e a data da próxima renovação.
          </li>
          <li>
            <strong>Falha de pagamento.</strong> Se a cobrança de uma renovação falhar, a Stripe volta a tentar
            cobrar durante um período limitado e o plano mantém-se ativo enquanto isso acontece. Se o pagamento não
            for regularizado, a subscrição termina e aplicam-se as regras do fim da subscrição (secção 14.2). O
            Utilizador pode voltar a subscrever a qualquer momento.
          </li>
        </ul>
      </Secao>

      <Secao id="casos-disponiveis" titulo="8. Casos disponíveis">
        <ul className={UL}>
          <li>
            Abrir um caso utiliza 1 caso disponível. Os casos disponíveis vêm de compras {avulso.nome} ou{" "}
            {CASO_EXTRA.nome}, ou da subscrição {casoProtecao.nome}. A subscrição {protecao.nome} não inclui casos.
          </li>
          <li>
            No {casoProtecao.nome}, é atribuído 1 novo caso disponível quando o pagamento de cada mês é confirmado — na
            adesão e em cada renovação —, sem período de carência.
          </li>
          <li>
            Os casos não utilizados acumulam de mês para mês, até {LIMITE_CASOS_ACUMULADOS} casos da subscrição: se a
            conta já tiver {LIMITE_CASOS_ACUMULADOS} casos da subscrição por utilizar, a renovação desse mês não
            acrescenta um novo. Os casos {avulso.nome} e {CASO_EXTRA.nome} comprados à parte somam sempre, não contam
            para este limite e nunca impedem a atribuição do caso mensal.
          </li>
          <li>
            Ao abrir um caso com os casos disponíveis que a conta já tem, é utilizado primeiro um caso da subscrição{" "}
            {casoProtecao.nome} e só depois o caso comprado à parte mais antigo ({avulso.nome} ou {CASO_EXTRA.nome}).
            Quando o Utilizador paga um {avulso.nome} ou um {CASO_EXTRA.nome} para um pedido concreto, esse pedido
            utiliza o caso dessa compra.
          </li>
          <li>
            Quando a subscrição {casoProtecao.nome} termina, os casos disponíveis que vieram dessa subscrição ficam
            guardados durante {DIAS_CASOS_GUARDADOS} dias e não podem ser utilizados enquanto não houver subscrição
            ativa. Se o Utilizador voltar a subscrever o {casoProtecao.nome} dentro desse prazo, recupera-os, até ao
            limite de {LIMITE_CASOS_ACUMULADOS}. Depois desse prazo, expiram. Os casos {avulso.nome} e {CASO_EXTRA.nome}{" "}
            ainda não utilizados não são afetados e continuam disponíveis.
          </li>
        </ul>
      </Secao>

      <Secao id="avulso" titulo="9. Avulso e Caso Extra">
        <p className={P}>
          O {avulso.nome} é um <strong>pagamento único</strong> de {formatarPreco(avulso.precoCentimos)}, sem
          renovação, que dá direito ao tratamento de 1 caso — análise, preparação do texto da reclamação, envio
          autorizado e acompanhamento desse caso, nos termos da secção 11. Ao contrário das subscrições, não inclui
          as funcionalidades de proteção nem dá novos casos ao longo do tempo.
        </p>
        <p className={P}>
          O <strong>{CASO_EXTRA.nome}</strong> é um <strong>pagamento único</strong> de{" "}
          {formatarPreco(CASO_EXTRA.precoCentimos)}, sem renovação, com o mesmo conteúdo do {avulso.nome}: dá direito
          ao tratamento de 1 caso, nos termos da secção 11. Só está disponível para quem tem a subscrição{" "}
          {casoProtecao.nome} ativa, com os pagamentos em dia, e já não tem casos disponíveis — por exemplo, porque já
          utilizou o caso incluído no mês. O direito ao {CASO_EXTRA.nome} é verificado antes do pagamento.
        </p>
        <p className={P}>
          Comprar um {CASO_EXTRA.nome} não altera o plano nem a subscrição, não muda a data nem o valor das renovações
          e não substitui o caso mensal seguinte, que é atribuído normalmente. Se a subscrição terminar, um{" "}
          {CASO_EXTRA.nome} já pago e ainda não utilizado continua disponível.
        </p>
      </Secao>

      <Secao id="conversao-avulso" titulo="10. Passar de Avulso para uma subscrição">
        <p className={P}>
          Se o Utilizador tiver pago um {avulso.nome} elegível — pago pela própria conta, não reembolsado, ainda não
          convertido, <strong>cujo caso ainda não tenha sido utilizado</strong> e com um valor pago que cubra a primeira
          mensalidade — e aderir depois a uma subscrição a partir da área de cliente, parte do valor pago cobre o
          primeiro mês da subscrição e o restante é reembolsado para o meio de pagamento original:
        </p>
        <ul className={UL}>
          <li>
            {protecao.nome}: {formatarPreco(VALOR_MENSALIDADE_CENTIMOS.protecao)} cobrem a primeira mensalidade e são
            reembolsados {formatarPreco(reembolsoProtecao)};
          </li>
          <li>
            {casoProtecao.nome}: {formatarPreco(VALOR_MENSALIDADE_CENTIMOS.caso_protecao)} cobrem a primeira
            mensalidade e são reembolsados {formatarPreco(reembolsoCasoProtecao)}.
          </li>
        </ul>
        <p className={P}>
          O reembolso só é processado depois de a subscrição estar confirmada e é feito uma única vez. A partir do
          segundo mês, é cobrado o preço do plano. A passagem não usa saldo nem crédito para meses seguintes.
        </p>
        <p className={P}>
          Com a passagem, o caso do {avulso.nome} deixa de estar disponível, porque o valor pago passa a cobrir a
          primeira mensalidade. No {casoProtecao.nome}, o caso do primeiro mês é o da subscrição.
        </p>
        <p className={P}>
          Um {avulso.nome} cujo caso já tenha sido utilizado não pode passar a subscrição: a adesão é feita como uma
          nova compra, com o preço normal do plano. A elegibilidade é verificada quando o Utilizador inicia a adesão e
          novamente quando o pagamento é confirmado. Se, entretanto, o caso do {avulso.nome} tiver sido utilizado, a
          passagem não se realiza: a subscrição iniciada nesse momento é cancelada sem qualquer cobrança, não há
          reembolso nem casos ou funcionalidades de proteção associados a essa subscrição, e o Utilizador pode aderir
          depois a uma subscrição como nova compra.
        </p>
        <p className={P}>
          O {CASO_EXTRA.nome} não pode passar a subscrição: é comprado por quem já é subscritor e o seu preço já
          inclui o desconto de subscritor.
        </p>
      </Secao>

      <Secao id="fluxo-do-caso" titulo="11. Como é tratado um caso">
        <ol className={OL}>
          <li>O Utilizador descreve a situação e envia a informação e os documentos de que dispõe.</li>
          <li>A DoLado analisa o caso e pode pedir esclarecimentos ou documentos adicionais.</li>
          <li>A DoLado prepara o texto da reclamação.</li>
          <li>O Utilizador revê o texto, na área de cliente ou através da ligação enviada por e-mail.</li>
          <li>
            O Utilizador autoriza explicitamente o envio dessa versão concreta do texto, ou pede alterações.
          </li>
          <li>Só depois da autorização a DoLado submete a reclamação, em nome do Utilizador, pelo canal adequado.</li>
          <li>
            Depois do envio, o Utilizador pode consultar no seu caso, na área de cliente, o texto exato enviado e,
            quando disponível, o comprovativo de submissão.
          </li>
        </ol>
        <p className={P}>
          O Utilizador continua responsável pela veracidade e exatidão das informações e dos documentos que fornece,
          e por ter legitimidade para reclamar. A DoLado pode recusar um caso ou um pedido que não tenha
          enquadramento, que esteja fora dos setores abrangidos ou que não seja possível apresentar, explicando o
          motivo.
        </p>
      </Secao>

      <Secao id="autorizacao" titulo="12. Autorização do envio">
        <ul className={UL}>
          <li>
            Nenhuma reclamação é enviada sem autorização explícita do Utilizador. Abrir uma ligação ou consultar o
            texto não equivale a autorizar.
          </li>
          <li>
            A autorização fica associada à versão concreta do texto que o Utilizador reviu. Se o texto for alterado —
            a pedido do Utilizador ou por necessidade do caso —, a nova versão tem de ser novamente autorizada antes
            do envio.
          </li>
          <li>
            A DoLado conserva o registo das versões apresentadas, da autorização e do envio, para poder demonstrar o
            que foi autorizado e enviado.
          </li>
        </ul>
      </Secao>

      <Secao id="depois-do-envio" titulo="13. Depois do envio">
        <p className={P}>
          O texto efetivamente enviado fica registado tal como foi enviado e não é alterado. Fica disponível no caso
          do Utilizador, na área de cliente, com a data, o canal e o destinatário do envio, juntamente com o
          comprovativo de submissão, quando o canal o emita, e o histórico do caso. No final do acompanhamento, a
          DoLado pode disponibilizar também o dossiê do caso. A DoLado acompanha o prazo de resposta e informa o
          Utilizador dos passos relevantes.
        </p>
      </Secao>

      <Secao id="livre-resolucao" titulo="14. Cancelamento, início da prestação e direito de livre resolução">
        <p className={P}>
          Cancelar uma subscrição e exercer o direito legal de livre resolução são pedidos diferentes, com efeitos
          diferentes.
        </p>

        <h3 className={H3}>14.1 Cancelamento da subscrição</h3>
        <ul className={UL}>
          <li>O Utilizador pode cancelar a subscrição a qualquer momento, na área Gestão de Subscrição.</li>
          <li>
            O cancelamento impede as renovações seguintes e produz efeitos no fim do período já pago. Até essa data,
            o plano continua ativo, com todas as funcionalidades e casos disponíveis.
          </li>
          <li>
            O cancelamento não dá direito ao reembolso proporcional da mensalidade já paga, sem prejuízo do direito
            de livre resolução (secção 14.4) e das situações excecionais (secção 15).
          </li>
          <li>
            Até ao fim do período pago, o Utilizador pode retirar o cancelamento e manter a mesma subscrição, sem nova
            cobrança nesse momento.
          </li>
        </ul>

        <h3 className={H3}>14.2 Fim da subscrição</h3>
        <p className={P}>
          Quando a subscrição termina, a conta fica sem subscrição: as funcionalidades de proteção deixam de estar
          disponíveis e aplicam-se as regras dos casos disponíveis da secção 8. Os casos já abertos, os documentos e
          o histórico não são apagados por esse motivo e continuam acessíveis na área de cliente, sendo conservados
          nos termos da Política de Privacidade.
        </p>

        <h3 className={H3}>14.3 Início imediato da prestação</h3>
        <p className={P}>
          O serviço só começa durante o prazo de livre resolução se o Utilizador o pedir expressamente. Antes de cada
          pagamento, é pedido ao Utilizador que confirme, numa opção separada e não pré-selecionada, o seguinte
          texto, que fica registado com a data, a hora e a versão:
        </p>
        <blockquote className="border-l-[3px] border-[var(--color-hairline-strong)] pl-4 text-base leading-relaxed text-[var(--color-ink-muted)]">
          {consentimentoInicioImediato("caso_protecao").texto}
        </blockquote>

        <h3 className={H3}>14.4 Direito de livre resolução</h3>
        <ul className={UL}>
          <li>
            O Utilizador que seja consumidor pode resolver o contrato no prazo de {PRAZO_LIVRE_RESOLUCAO_DIAS} dias a
            contar da data da sua celebração (o dia da compra ou da adesão), sem indicar o motivo, nos termos do
            Decreto-Lei n.º 24/2014, de 14 de fevereiro.
          </li>
          <li>
            Se tiver pedido o início imediato e exercer depois este direito, paga o montante proporcional ao serviço
            efetivamente prestado até à comunicação da sua decisão.
          </li>
          <li>
            Se o serviço tiver sido integralmente prestado dentro do prazo, depois do pedido expresso de início
            imediato e do reconhecimento de que perde o direito quando o contrato estiver plenamente executado, o
            direito de livre resolução deixa de existir.
          </li>
          <li>
            Quando houver lugar a reembolso, é feito no prazo máximo de 14 dias a contar da data em que a DoLado é
            informada da decisão, pelo mesmo meio de pagamento utilizado, sem custos para o Utilizador.
          </li>
          <li>
            Para exercer o direito: online, em{" "}
            <Link href={ROTAS_LEGAIS.livreResolucao} className={LINK}>
              dolado.pt/livre-resolucao
            </Link>{" "}
            (botões “{ROTULO_RESOLVER}” e “{ROTULO_CONFIRMAR}”), ou por e-mail para{" "}
            <Email endereco={CONTACTO_LIVRE_RESOLUCAO} />, podendo usar o modelo de formulário disponível nessa
            página. Cada pedido é apreciado caso a caso, tendo em conta o serviço efetivamente prestado.
          </li>
        </ul>
      </Secao>

      <Secao id="situacoes-excecionais" titulo="15. Situações excecionais">
        <p className={P}>
          Em caso de cobrança duplicada, cobrança indevida ou erro técnico relevante, o Utilizador deve contactar a
          DoLado através de <Email endereco={CONTACTO_EMAIL} />. A DoLado analisa cada situação e, quando se
          justifique, cancela a subscrição de imediato e/ou reembolsa os valores em causa.
        </p>
      </Secao>

      <Secao id="responsabilidade" titulo="16. Limitações e responsabilidade">
        <p className={P}>
          A DoLado compromete-se a prestar o serviço com diligência, na análise, na preparação do texto, no envio
          autorizado e no acompanhamento do caso. Sem prejuízo disso:
        </p>
        <ul className={UL}>
          <li>
            a DoLado não garante o sucesso de qualquer reclamação e não responde pelas decisões, respostas ou
            ausência de resposta das empresas reclamadas ou de outras entidades;
          </li>
          <li>
            os prazos de resposta e de decisão dependem das empresas reclamadas e de entidades externas, e não da
            DoLado;
          </li>
          <li>
            o serviço depende de plataformas e serviços de terceiros (por exemplo, o Livro de Reclamações Eletrónico,
            os canais das empresas, prestadores de alojamento, de pagamento e de e-mail). A plataforma da DoLado pode
            estar temporariamente indisponível por manutenção ou falhas técnicas; a DoLado procura limitar e
            resolver estas situações com a maior brevidade possível;
          </li>
          <li>
            a DoLado não responde pelas consequências de informação ou documentos falsos, incorretos ou incompletos
            fornecidos pelo Utilizador, nem por atrasos causados pela falta de resposta do Utilizador a pedidos de
            esclarecimento;
          </li>
          <li>
            alguns pedidos podem não ser apresentáveis por razões técnicas ou jurídicas (por exemplo, prazos já
            ultrapassados ou falta de enquadramento legal). Nesses casos, a DoLado informa o Utilizador.
          </li>
        </ul>
        <p className={P}>
          Nada nestes Termos exclui ou limita a responsabilidade da DoLado nos casos em que a lei não o permita,
          designadamente por dolo ou culpa grave, nem os direitos do Utilizador enquanto consumidor, nomeadamente os
          previstos na Lei n.º 24/96, de 31 de julho (Lei de Defesa do Consumidor), e no Decreto-Lei n.º 446/85, de
          25 de outubro.
        </p>
      </Secao>

      <Secao id="dados-pessoais" titulo="17. Dados pessoais">
        <p className={P}>
          O tratamento de dados pessoais rege-se pela{" "}
          <Link href={ROTAS_LEGAIS.privacidade} className={LINK}>
            Política de Privacidade
          </Link>
          . Para questões sobre dados pessoais ou para exercer os seus direitos: <Email endereco={PRIVACIDADE_EMAIL} />.
        </p>
      </Secao>

      <Secao id="reclamacoes" titulo="18. Reclamações sobre a DoLado">
        <p className={P}>
          Reclamações sobre o serviço da própria DoLado podem ser apresentadas para <Email endereco={CONTACTO_EMAIL} />{" "}
          ou no{" "}
          <a href={LIVRO_RECLAMACOES_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
            Livro de Reclamações Eletrónico
          </a>
          .
        </p>
      </Secao>

      <Secao id="ral" titulo="19. Resolução alternativa de litígios">
        <p className={P}>
          Em caso de litígio de consumo, o Utilizador pode recorrer a uma entidade de resolução alternativa de
          litígios de consumo, nos termos da Lei n.º 144/2015, de 8 de setembro. As entidades competentes e os
          respetivos sítios na Internet estão indicados em{" "}
          <Link href={ROTAS_LEGAIS.resolucaoLitigios} className={LINK}>
            Reclamações e resolução de litígios
          </Link>
          .
        </p>
      </Secao>

      <Secao id="lei-aplicavel" titulo="20. Lei aplicável">
        <p className={P}>
          Estes Termos regem-se pela lei portuguesa, sem prejuízo das normas imperativas de proteção do consumidor
          aplicáveis. Os litígios são resolvidos pelos tribunais competentes nos termos da lei, sem prejuízo do
          recurso às entidades de resolução alternativa de litígios referidas na secção 19.
        </p>
      </Secao>

      <Secao id="alteracoes" titulo="21. Versões, alterações e contacto">
        <p className={P}>
          Estes Termos são identificados por versão. Cada compra fica associada à versão aceite antes do pagamento, e
          cada versão continua disponível em dolado.pt/termos/&lt;versão&gt;. Para qualquer questão:{" "}
          <Email endereco={CONTACTO_EMAIL} />.
        </p>
      </Secao>

      <p className="text-sm text-[var(--color-ink-faint)]">Versão 2026-10-05 · Última atualização: 5 de outubro de 2026</p>
    </article>
  );
}
