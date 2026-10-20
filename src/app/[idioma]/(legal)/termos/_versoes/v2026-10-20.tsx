// Termos e Condições — versão 2026-10-20. Parte da 2026-10-19 e acrescenta o
// Programa de Parceiros (Fase 1): Protecção oferecida por um Parceiro de
// Distribuição (secções 5, 7, 14.2 e 23) e transparência sobre os Parceiros de
// Indicação, que recebem comissão (secções 22 e 24). Regras do programa e este
// texto validados pela advogada (confirmado por Thiago, 20/10/2026). Nada do
// resto muda.
//
// Uma versão publicada não se edita: alterações vão para uma versão nova
// (ficheiro novo em _versoes/, registo em index.ts e TERMOS_VERSAO).
//
// Só descreve regras já implementadas. Preços, limites e nomes dos planos vêm
// de src/lib/planos.ts; textos legais de src/lib/legal.ts; identificação de
// src/lib/site.ts.
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
import { DIAS_CASOS_GUARDADOS, MESES_ALERTAS_GUARDADOS } from "@/lib/acesso";
import { DIAS_PROTECAO_GRATUITA } from "@/lib/protecaoGratuita";
import { VALOR_MENSALIDADE_CENTIMOS } from "@/lib/stripe/conversao";
import { CONTACTO_EMAIL, ENTIDADE_LEGAL, MORADA_SEDE, NIPC, PRIVACIDADE_EMAIL } from "@/lib/site";

// Descrição da Proteção tal como estava em src/lib/planos.ts quando esta
// versão foi publicada. Uma versão publicada não muda: o texto fica aqui
// fixo, mesmo que a descrição usada no site e na compra mude.
const DESCRICAO_PROTECAO_PUBLICADA =
  "Monitor de Protecção — acompanhamento dos serviços a partir das facturas e dos contratos que o Utilizador adiciona, para identificar alterações que possam tornar-se num problema, com avisos antes do fim de promoções e de períodos de fidelização — e aviso sectorial. Não inclui o tratamento de casos.";

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

export function TermosV20261020() {
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
          A DoLado presta um serviço de apoio a consumidores com problemas com empresas, em Portugal, nos seguintes
          âmbitos: contratos de telecomunicações, de energia, de gás e de água; compras de bens, incluindo entregas,
          devoluções, garantias e reembolsos; e contratos com ginásios e health clubs. A DoLado analisa a situação
          descrita pelo Utilizador, prepara o texto de uma reclamação com os factos, as datas e a legislação
          potencialmente aplicável, submete-a pelo canal adequado — depois de o Utilizador a autorizar — e acompanha o
          caso. Disponibiliza também, nos planos com Protecção, funcionalidades que ajudam a prevenir e a detectar
          problemas a partir dos contratos e das facturas do Utilizador.
        </p>
        <ul className={UL}>
          <li>
            A DoLado não é uma sociedade de advogados nem de solicitadores e não presta consulta jurídica
            individualizada. A informação legal partilhada tem natureza informativa e organizativa e não constitui
            parecer jurídico.
          </li>
          <li>
            Se a situação exigir interpretação jurídica individualizada ou representação, o Utilizador deve procurar
            um advogado ou solicitador. A revisão humana da DoLado limita-se ao serviço descrito nestes Termos e não
            substitui aconselhamento jurídico independente.
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
            O Utilizador compromete-se a fornecer informação verdadeira, actual e completa, e a mantê-la actualizada.
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
            de subscritor). Disponível apenas para quem tem a subscrição {casoProtecao.nome} activa e já não tem casos
            disponíveis, nas condições da secção 9.
          </li>
          <li>
            <strong>{protecao.nome} gratuita durante {DIAS_PROTECAO_GRATUITA} dias.</strong> Quem nunca teve a{" "}
            {protecao.nome} nem o {casoProtecao.nome}, nem uma {protecao.nome} oferecida por um parceiro, pode
            experimentar a {protecao.nome} gratuitamente durante{" "}
            {DIAS_PROTECAO_GRATUITA} dias, uma única vez por pessoa. Não é pedido nenhum meio de pagamento. O período
            começa no momento em que o Utilizador o activa na sua área de cliente e termina automaticamente ao fim de{" "}
            {DIAS_PROTECAO_GRATUITA} dias, sem qualquer cobrança e sem dar origem a uma subscrição. Durante o período,
            o Utilizador tem acesso às funcionalidades da {protecao.nome} nos termos da secção 2. O período gratuito
            não inclui o tratamento de casos.
          </li>
          <li>
            <strong>{protecao.nome} oferecida por um parceiro.</strong> Uma empresa parceira da DoLado pode oferecer a{" "}
            {protecao.nome} aos seus clientes ou colaboradores, entregando-lhes um código. Quem activa o código tem a{" "}
            {protecao.nome} sem qualquer custo durante o período oferecido, nas condições da secção 23. O período
            oferecido não inclui o tratamento de casos.
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
            Os pagamentos são processados pela Stripe. Os dados do meio de pagamento são introduzidos directamente na
            página de pagamento da Stripe e não são recebidos nem guardados pela DoLado.
          </li>
          <li>
            O plano só é activado quando o pagamento é confirmado. Alguns meios de pagamento, como o débito directo
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
            cobrar durante um período limitado e o plano mantém-se activo enquanto isso acontece. Se o pagamento não
            for regularizado, a subscrição termina e aplicam-se as regras do fim da subscrição (secção 14.2). O
            Utilizador pode voltar a subscrever a qualquer momento.
          </li>
          <li>
            <strong>Depois da {protecao.nome} gratuita.</strong> Para continuar com a {protecao.nome} depois do período
            gratuito, o Utilizador tem de aderir expressamente à subscrição. Se aderir à {protecao.nome} durante o
            período gratuito, a primeira cobrança é feita no dia em que o período terminaria e é indicada antes do
            pagamento; se faltarem menos de 2 dias, a primeira cobrança é feita no dia da adesão. Se aderir ao{" "}
            {casoProtecao.nome}, a cobrança começa no dia da adesão e o período gratuito termina nesse momento. O
            Utilizador pode cancelar antes da primeira cobrança sem qualquer custo.
          </li>
          <li>
            <strong>Depois da {protecao.nome} oferecida por um parceiro.</strong> Para continuar com a {protecao.nome}{" "}
            depois do período oferecido, o Utilizador tem de aderir expressamente à subscrição. Se aderir à{" "}
            {protecao.nome} durante o período oferecido, a primeira cobrança é feita no dia em que o período termina e é
            indicada antes do pagamento; se faltarem menos de 2 dias, a primeira cobrança é feita no dia da adesão. Se
            aderir ao {casoProtecao.nome}, a cobrança começa no dia da adesão. O Utilizador pode cancelar antes da
            primeira cobrança sem qualquer custo.
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
            activa. Se o Utilizador voltar a subscrever o {casoProtecao.nome} dentro desse prazo, recupera-os, até ao
            limite de {LIMITE_CASOS_ACUMULADOS}. Depois desse prazo, expiram. Os casos {avulso.nome} e {CASO_EXTRA.nome}{" "}
            ainda não utilizados não são afectados e continuam disponíveis.
          </li>
        </ul>
      </Secao>

      <Secao id="avulso" titulo="9. Avulso e Caso Extra">
        <p className={P}>
          O {avulso.nome} é um <strong>pagamento único</strong> de {formatarPreco(avulso.precoCentimos)}, sem
          renovação, que dá direito ao tratamento de 1 caso — análise, preparação do texto da reclamação, envio
          autorizado e acompanhamento desse caso, nos termos da secção 11. Ao contrário das subscrições, não inclui
          as funcionalidades de protecção nem dá novos casos ao longo do tempo.
        </p>
        <p className={P}>
          O <strong>{CASO_EXTRA.nome}</strong> é um <strong>pagamento único</strong> de{" "}
          {formatarPreco(CASO_EXTRA.precoCentimos)}, sem renovação, com o mesmo conteúdo do {avulso.nome}: dá direito
          ao tratamento de 1 caso, nos termos da secção 11. Só está disponível para quem tem a subscrição{" "}
          {casoProtecao.nome} activa, com os pagamentos em dia, e já não tem casos disponíveis — por exemplo, porque já
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
          Estes valores correspondem a um {avulso.nome} pago a {formatarPreco(avulso.precoCentimos)}. Num{" "}
          {avulso.nome} pago a outro preço (por exemplo, comprado antes desta versão dos Termos), o reembolso é sempre o
          valor efectivamente pago menos a primeira mensalidade.
        </p>
        <p className={P}>
          O reembolso só é processado depois de a subscrição estar confirmada e é feito uma única vez. A partir do
          segundo mês, é cobrado o preço do plano. A passagem não usa saldo nem crédito para meses seguintes.
        </p>
        <p className={P}>
          A passagem não é automática: exige que o Utilizador escolha e confirme a adesão a uma subscrição na área de
          cliente. Só pode ser aplicada a um {avulso.nome} ainda não utilizado, não reembolsado e elegível; um caso já
          utilizado não gera crédito nem reembolso ao aderir a uma subscrição. Esta condição comercial não limita o
          direito legal de livre resolução nem outros direitos imperativos do consumidor.
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
          reembolso nem casos ou funcionalidades de protecção associados a essa subscrição, e o Utilizador pode aderir
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
            Depois do envio, o Utilizador pode consultar no seu caso, na área de cliente, o texto exacto enviado e,
            quando disponível, o comprovativo de submissão.
          </li>
        </ol>
        <p className={P}>
          O Utilizador continua responsável pela veracidade e exactidão das informações e dos documentos que fornece,
          e por ter legitimidade para reclamar. A DoLado pode recusar um caso ou um pedido que não tenha
          enquadramento, que esteja fora dos sectores abrangidos ou que não seja possível apresentar, explicando o
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
          O texto efectivamente enviado fica registado tal como foi enviado e não é alterado. Fica disponível no caso
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
            o plano continua activo, com todas as funcionalidades e casos disponíveis.
          </li>
          <li>
            O cancelamento não dá direito ao reembolso proporcional da mensalidade já paga, sem prejuízo do direito
            de livre resolução (secção 14.4) e das situações excepcionais (secção 15).
          </li>
          <li>
            Até ao fim do período pago, o Utilizador pode retirar o cancelamento e manter a mesma subscrição, sem nova
            cobrança nesse momento.
          </li>
          <li>
            Se, ao cancelar, o Utilizador tiver casos em curso abertos com um caso da subscrição, a área Gestão de
            Subscrição informa-o antes da confirmação e o Utilizador escolhe: manter a subscrição até esses casos
            terminarem, ou cancelar e aceitar expressamente que o acompanhamento desses casos termina também no fim do
            período já pago. O cancelamento só é registado depois dessa confirmação.
          </li>
        </ul>

        <h3 className={H3}>14.2 Fim da subscrição</h3>
        <p className={P}>
          Quando a subscrição termina, a conta fica sem subscrição: as funcionalidades de protecção deixam de estar
          disponíveis e aplicam-se as regras dos casos disponíveis da secção 8. Os casos já abertos, os documentos e
          o histórico não são apagados por esse motivo e continuam acessíveis na área de cliente, sendo conservados
          nos termos da Política de Privacidade.
        </p>
        <p className={P}>
          Quando a subscrição termina, a DoLado deixa de acompanhar os casos em curso que foram abertos com um caso da
          subscrição (análise das respostas da empresa, novas comunicações e restantes acções de acompanhamento),
          conforme a escolha feita pelo Utilizador no cancelamento (secção 14.1). Os casos tratados com um{" "}
          {avulso.nome} ou um {CASO_EXTRA.nome}, pagos à parte, continuam a ser acompanhados nos termos da secção 11.
          O acompanhamento de um caso não é sinónimo de resolução: o resultado depende da empresa visada.
        </p>
        <p className={P}>
          No fim da {protecao.nome} gratuita sem adesão, aplica-se o mesmo regime de conservação do fim de uma
          subscrição: os serviços acompanhados e os documentos ficam desactivados, são conservados durante{" "}
          {MESES_ALERTAS_GUARDADOS} meses e voltam a ficar activos se o Utilizador aderir à {protecao.nome} nesse
          prazo. O mesmo se aplica no fim da {protecao.nome} oferecida por um parceiro sem adesão.
        </p>

        <h3 className={H3}>14.3 Início imediato da prestação</h3>
        <p className={P}>
          O serviço só começa durante o prazo de livre resolução se o Utilizador o pedir expressamente. Antes de cada
          pagamento, é pedido ao Utilizador que confirme, numa opção separada e não pré-seleccionada, o seguinte
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
            Decreto-Lei n.º 24/2014, de 14 de Fevereiro.
          </li>
          <li>
            Se tiver pedido o início imediato e exercer depois este direito, paga o montante proporcional ao serviço
            efectivamente prestado até à comunicação da sua decisão.
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
            página. Cada pedido é apreciado caso a caso, tendo em conta o serviço efectivamente prestado.
          </li>
        </ul>
      </Secao>

      <Secao id="situacoes-excecionais" titulo="15. Situações excepcionais">
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
            o serviço depende de plataformas e serviços de terceiros (por exemplo, o Livro de Reclamações Electrónico,
            os canais das empresas, prestadores de alojamento, de pagamento e de e-mail). A plataforma da DoLado pode
            estar temporariamente indisponível por manutenção ou falhas técnicas; a DoLado procura limitar e
            resolver estas situações com a maior brevidade possível;
          </li>
          <li>
            a DoLado não responde pelas consequências de informação ou documentos falsos, incorrectos ou incompletos
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
          previstos na Lei n.º 24/96, de 31 de Julho (Lei de Defesa do Consumidor), e no Decreto-Lei n.º 446/85, de
          25 de Outubro.
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
            Livro de Reclamações Electrónico
          </a>
          .
        </p>
      </Secao>

      <Secao id="ral" titulo="19. Resolução alternativa de litígios">
        <p className={P}>
          Em caso de litígio de consumo, o Utilizador pode recorrer a uma entidade de resolução alternativa de
          litígios de consumo, nos termos da Lei n.º 144/2015, de 8 de Setembro. As entidades competentes e os
          respectivos sítios na Internet estão indicados em{" "}
          <Link href={ROTAS_LEGAIS.resolucaoLitigios} className={LINK}>
            Reclamações e resolução de litígios
          </Link>
          .
        </p>
      </Secao>

      <Secao id="lei-aplicavel" titulo="20. Lei aplicável">
        <p className={P}>
          Estes Termos regem-se pela lei portuguesa, sem prejuízo das normas imperativas de protecção do consumidor
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

      <Secao id="indicacoes" titulo="22. Programa de indicação">
        <p className={P}>
          O programa de indicação permite que quem chega à DoLado através de um link de indicação receba um desconto
          de 20% na primeira compra elegível e que a pessoa que partilhou o link receba uma recompensa quando essa
          primeira compra for paga. Para associar a indicação, a visita ao link tem de ficar ligada a uma conta no
          prazo de 30 dias. O desconto de aquisição exige que o Utilizador tenha uma conta ou inicie sessão antes do
          pagamento.
        </p>
        <ul className={UL}>
          <li>
            <strong>Desconto de quem chega pelo link.</strong> O desconto de 20% aplica-se uma única vez, à primeira
            compra {avulso.nome} ou à primeira mensalidade da subscrição {protecao.nome}. Não se aplica à adesão ao
            {" "}{casoProtecao.nome}, ao {CASO_EXTRA.nome}, nem a compras sem conta associada à indicação.
          </li>
          <li>
            <strong>Recompensa de quem indica.</strong> Por cada conta indicada, é atribuído um desconto de 20% quando
            a primeira compra elegível dessa conta é confirmada e paga por um valor superior a 0 €. Essa compra pode
            ser {avulso.nome}, {protecao.nome} ou {casoProtecao.nome}; o {CASO_EXTRA.nome} não conta para este efeito.
            Uma compra de {casoProtecao.nome} pode, por isso, gerar uma recompensa para quem indicou, apesar de não
            receber o desconto de aquisição.
          </li>
          <li>
            Cada recompensa fica válida durante 12 meses a partir da data em que fica disponível. Pode ser usada
            automaticamente, uma de cada vez, numa compra {avulso.nome} ou numa cobrança mensal da subscrição
            {protecao.nome} ou {casoProtecao.nome}. Não pode ser usada no {CASO_EXTRA.nome}, convertida em dinheiro
            ou saldo, nem aplicada mais do que uma vez na mesma cobrança.
          </li>
          <li>
            O desconto de aquisição e as recompensas de indicação não acumulam com códigos promocionais nem com
            outros descontos. Quando exista um código promocional ou outro desconto aplicável, o Utilizador pode
            prescindir do desconto de indicação para usar o código, se o fluxo de compra o permitir.
          </li>
          <li>
            O desconto de indicação de novo cliente não se aplica à {protecao.nome} de quem já usou a {protecao.nome}{" "}
            gratuita.
          </li>
          <li>
            A auto-indicação não é permitida. Um reembolso integral ou uma disputa de pagamento da primeira compra
            reverte a recompensa correspondente. A DoLado pode rever manualmente indícios de auto-indicação ou de
            utilização abusiva e decidir se a recompensa pode ser atribuída ou utilizada.
          </li>
          <li>
            Cada conta só pode ficar associada a uma indicação: a primeira válida, de outro Utilizador ou de um
            Parceiro de Indicação (secção 24). Uma conta associada a um Parceiro de Indicação não recebe o desconto de
            aquisição deste programa.
          </li>
        </ul>
      </Secao>

      <Secao id="protecao-oferecida" titulo="23. Protecção oferecida por um parceiro">
        <p className={P}>
          Uma empresa parceira da DoLado (Parceiro de Distribuição) pode adquirir à DoLado acessos à {protecao.nome}{" "}
          para oferecer aos seus clientes ou colaboradores. Cada acesso corresponde a um código individual, que a
          empresa entrega à pessoa a quem o oferece (“beneficiário”).
        </p>
        <ul className={UL}>
          <li>
            O código é activado pelo beneficiário na sua área de cliente, com uma conta pessoal e o e-mail confirmado.
            Cada código só pode ser activado uma vez e até à data-limite definida para a oferta. Não é pedido nenhum
            meio de pagamento.
          </li>
          <li>
            O período oferecido começa no momento da activação e dura o número de meses de calendário definido para a
            oferta. As datas de início e de fim são indicadas na área de cliente e no e-mail de confirmação da
            activação.
          </li>
          <li>
            Durante o período, o beneficiário tem acesso às funcionalidades da {protecao.nome} nos termos da secção 2.
            O período oferecido não inclui o tratamento de casos.
          </li>
          <li>
            O período termina automaticamente na data indicada, sem qualquer cobrança e sem dar origem a uma
            subscrição. Para continuar depois, o beneficiário tem de aderir expressamente a uma subscrição (secção 7).
            No fim do período sem adesão, aplica-se o regime de conservação da secção 14.2.
          </li>
          <li>
            Um código não pode ser activado numa conta que já tenha uma subscrição com a {protecao.nome} activa, nem
            numa conta que já tenha outra {protecao.nome} oferecida em curso; nesses casos, o código não é utilizado e
            continua disponível. Se a conta estiver no período da {protecao.nome} gratuita, a activação do código
            termina esse período e passa a valer o período oferecido.
          </li>
          <li>
            Quem activou uma {protecao.nome} oferecida por um parceiro deixa de poder usar a {protecao.nome} gratuita
            durante {DIAS_PROTECAO_GRATUITA} dias (secção 5).
          </li>
          <li>
            A empresa que oferece a {protecao.nome} não tem acesso à conta, às facturas, aos contratos nem aos casos do
            beneficiário, e a DoLado não lhe indica quem activou cada código; comunica-lhe apenas números agregados,
            nos termos da Política de Privacidade.
          </li>
          <li>
            A DoLado pode anular um código ainda não activado a pedido da empresa que o adquiriu ou quando haja indícios
            de utilização indevida.
          </li>
        </ul>
      </Secao>

      <Secao id="parceiros" titulo="24. Parceiros de Indicação">
        <p className={P}>
          Alguns Utilizadores chegam à DoLado através de profissionais ou empresas parceiras (Parceiros de Indicação),
          que recebem da DoLado uma comissão quando uma subscrição que indicaram cumpre as condições acordadas com eles.
        </p>
        <ul className={UL}>
          <li>
            Uma conta fica associada a um Parceiro de Indicação quando o Utilizador chega pela ligação do parceiro (com
            consentimento para cookies de marketing) e essa visita fica ligada à sua conta no prazo de 30 dias, ou
            quando escreve um código de parceiro ao criar conta ou antes de pagar. O código de parceiro é opcional. Só
            ficam associadas contas que ainda não sejam clientes da DoLado, e nunca a conta do próprio parceiro.
          </li>
          <li>
            A associação a um parceiro não altera o preço pago, não dá direito a qualquer desconto e não altera o serviço
            prestado pela DoLado. A comissão é paga pela DoLado e não é cobrada ao Utilizador.
          </li>
          <li>
            Cada conta só fica associada à primeira indicação válida, que não muda depois.
          </li>
          <li>
            Os Parceiros de Indicação não prestam o serviço da DoLado, não actuam em nome da DoLado nem do Utilizador e
            não têm acesso à conta, às facturas, aos contratos nem aos casos das pessoas que indicaram.
          </li>
        </ul>
      </Secao>

      <p className="text-sm text-[var(--color-ink-faint)]">Versão 2026-10-20 · Última actualização: 20 de Outubro de 2026</p>
    </article>
  );
}
