// Termos e Condições — versão 2026-10-01.
//
// Só descreve regras de produto já implementadas (planos, subscrição,
// cancelamento, casos acumulados, conversão do Avulso). Preços e limites
// vêm de src/lib/planos.ts; textos legais (livre resolução, início
// imediato) de src/lib/legal.ts. As secções marcadas "REVISÃO JURÍDICA
// PENDENTE" aguardam validação da advogada (ver REVISAO_JURIDICA_PENDENTE).
//
// Uma versão publicada não se edita: alterações vão para uma versão nova
// (ficheiro novo em _versoes/, registo em index.ts e TERMOS_VERSAO).
import Link from "next/link";
import {
  COMO_EXERCER_LIVRE_RESOLUCAO,
  RESUMO_LIVRE_RESOLUCAO,
  ROTAS_LEGAIS,
  consentimentoInicioImediato,
} from "@/lib/legal";
import { LIMITE_CASOS_ACUMULADOS, PLANOS, formatarPreco } from "@/lib/planos";
import { DIAS_CASOS_GUARDADOS } from "@/lib/acesso";
import { VALOR_MENSALIDADE_CENTIMOS } from "@/lib/stripe/conversao";
import { CONTACTO_EMAIL, PRIVACIDADE_EMAIL } from "@/lib/site";

const H2 = "text-xl font-semibold text-[var(--color-ink)]";
const P = "text-base leading-relaxed text-[var(--color-ink)]";
const UL = "flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed text-[var(--color-ink)]";
const LINK = "text-[var(--color-brand)] underline";

function Secao({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-3">
      <h2 className={H2}>{titulo}</h2>
      {children}
    </section>
  );
}

export function TermosV20261001() {
  const reembolsoProtecao = PLANOS.avulso.precoCentimos - VALOR_MENSALIDADE_CENTIMOS.protecao;
  const reembolsoCasoProtecao = PLANOS.avulso.precoCentimos - VALOR_MENSALIDADE_CENTIMOS.caso_protecao;

  return (
    <article className="flex flex-col gap-6 pt-4">
      <div>
        <h1 className="text-[32px] font-semibold leading-tight text-[var(--color-ink)]">Termos e Condições</h1>
        <p className="mt-1 text-base text-[var(--color-ink-muted)]">DoLado — a sua reclamação, feita bem</p>
      </div>

      <p className={P}>
        DoLado é uma marca operada por{" "}
        <strong>Competent Domain - Consultoria em Informática Unipessoal Lda</strong> (NIPC 515609773), com sede na
        Rua Cidade de Manchester, n.º 35, r/c, 1170-099 Lisboa.
      </p>

      <Secao id="o-que-e" titulo="1. O que é a DoLado">
        <p className={P}>
          A DoLado presta um serviço de assistência administrativa a consumidores com problemas em contratos de
          telecomunicações, energia ou água em Portugal. Depois de o Utilizador descrever o seu caso, a DoLado
          identifica a norma legal potencialmente aplicável e prepara uma reclamação formal, que o Utilizador pode
          enviar por si ou autorizar a DoLado a submeter pelo canal correto da empresa visada, e acompanha o
          processo até à resposta.
        </p>
        <p className={P}>
          <strong>
            A DoLado não é uma sociedade de advogados nem de solicitadores, e não presta consulta jurídica
            individualizada.
          </strong>{" "}
          A informação legal partilhada tem função organizativa e informativa, nunca constitui parecer jurídico, e
          não garante que o Utilizador tenha direito a determinado resultado. A DoLado não representa o Utilizador
          em tribunal, centro de arbitragem, ou perante entidade reguladora.
        </p>
      </Secao>

      <Secao id="como-funciona" titulo="2. Conta e funcionamento do serviço">
        <p className={P}>
          O serviço é utilizado através de uma conta pessoal na área de cliente da DoLado. Na área de cliente, o
          Utilizador pode abrir casos, acompanhar o seu estado, consultar documentos e gerir a sua subscrição.
        </p>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-base leading-relaxed text-[var(--color-ink)]">
          <li>O Utilizador descreve o problema e anexa os documentos que tiver disponíveis.</li>
          <li>A DoLado analisa o caso e pode contactar o Utilizador para confirmar detalhes.</li>
          <li>
            A DoLado escreve a reclamação formal, com base legal, factos e datas, e apresenta ao Utilizador o texto
            que pretende enviar. O Utilizador revê esse texto e confirma explicitamente se autoriza o envio; só
            depois dessa autorização a DoLado submete a reclamação, em nome do Utilizador.
          </li>
          <li>
            A DoLado acompanha o prazo legal de resposta, mantém o Utilizador informado em cada passo relevante e
            disponibiliza um dossiê do caso — histórico, documentos e comunicações — para o Utilizador usar
            livremente.
          </li>
        </ol>
        <p className={P}>Não existe submissão automática nem autenticação por Chave Móvel Digital.</p>
      </Secao>

      <Secao id="planos" titulo="3. Planos e preços">
        <p className={P}>Todos os preços incluem IVA.</p>
        <ul className={UL}>
          <li>
            <strong>{PLANOS.protecao.nome}</strong> — {formatarPreco(PLANOS.protecao.precoCentimos)} por mês.{" "}
            {PLANOS.protecao.descricaoCurta}
          </li>
          <li>
            <strong>{PLANOS.caso_protecao.nome}</strong> — {formatarPreco(PLANOS.caso_protecao.precoCentimos)} por
            mês. {PLANOS.caso_protecao.descricaoCurta}
          </li>
          <li>
            <strong>{PLANOS.avulso.nome}</strong> — {formatarPreco(PLANOS.avulso.precoCentimos)} por caso, pagamento
            único. {PLANOS.avulso.descricaoCurta}
          </li>
        </ul>
        <p className={P}>
          O preço aplicável a cada compra é o apresentado no passo de confirmação, antes do pagamento.
        </p>
      </Secao>

      <Secao id="pagamento" titulo="4. Pagamento">
        <p className={P}>
          Os pagamentos são processados pela Stripe, prestador de serviços de pagamento. Os dados do meio de
          pagamento são introduzidos diretamente na página de pagamento da Stripe e não são guardados pela DoLado.
        </p>
        <p className={P}>
          O acesso ao plano é ativado quando o pagamento é confirmado. Alguns métodos de pagamento, como o débito
          direto SEPA, podem demorar alguns dias úteis a ser confirmados.
        </p>
        <p className={P}>
          Códigos promocionais são aplicados no passo de pagamento, nas condições indicadas para cada código.
        </p>
      </Secao>

      <Secao id="subscricoes" titulo="5. Subscrições e renovação automática">
        <p className={P}>
          Os planos {PLANOS.protecao.nome} e {PLANOS.caso_protecao.nome} são subscrições mensais com renovação
          automática: renovam-se todos os meses, ao preço do plano ou nas condições do código promocional aplicado,
          até serem cancelados. Isto aplica-se também quando o valor de um mês é 0 €.
        </p>
        <p className={P}>
          No plano {PLANOS.caso_protecao.nome}, cada mês pago dá direito a 1 novo caso. Os casos não utilizados
          acumulam até ao limite de {LIMITE_CASOS_ACUMULADOS}. Abrir um caso utiliza um caso disponível.
        </p>
      </Secao>

      <Secao id="cancelamento" titulo="6. Cancelamento da subscrição">
        <ul className={UL}>
          <li>
            O Utilizador pode cancelar a subscrição a qualquer momento na área Gestão de Subscrição, na área de
            cliente.
          </li>
          <li>
            O cancelamento produz efeitos no fim do período já pago: até essa data, o plano continua ativo e todas as
            funcionalidades continuam disponíveis; depois dela, a subscrição não é renovada e não há novas cobranças.
          </li>
          <li>
            O cancelamento normal não dá direito ao reembolso proporcional da mensalidade já paga, sem prejuízo dos
            direitos que a lei atribui ao Utilizador, nomeadamente o direito de livre resolução quando aplicável
            (secção 9).
          </li>
          <li>
            Até ao fim do período pago, o Utilizador pode retirar o cancelamento e manter a subscrição, sem nova
            cobrança nesse momento.
          </li>
          <li>
            O cancelamento não apaga os casos já criados, os documentos nem o histórico, que se mantêm de acordo com
            a Política de Privacidade. Depois do fim da subscrição, a DoLado deixa de prestar os serviços
            associados à Proteção, incluindo o acompanhamento dos casos no âmbito da subscrição.
          </li>
        </ul>
      </Secao>

      <Secao id="casos-acumulados" titulo="7. Casos acumulados depois do fim da subscrição">
        <p className={P}>
          Quando uma subscrição {PLANOS.caso_protecao.nome} termina, os casos disponíveis acumulados ficam guardados
          durante {DIAS_CASOS_GUARDADOS} dias e não podem ser utilizados sem uma subscrição ativa. Se o Utilizador
          voltar a subscrever o {PLANOS.caso_protecao.nome} dentro desse prazo, recupera esses casos, até ao limite
          de {LIMITE_CASOS_ACUMULADOS}. Depois desse prazo, os casos acumulados expiram. Os casos {PLANOS.avulso.nome}{" "}
          comprados à parte não são afetados.
        </p>
      </Secao>

      <Secao id="conversao-avulso" titulo="8. Conversão de um Avulso numa subscrição">
        <p className={P}>
          Se o Utilizador tiver pago um caso {PLANOS.avulso.nome} elegível e aderir depois a uma subscrição a partir
          da área de cliente, parte do valor pago cobre o primeiro mês e o restante é reembolsado para o método de
          pagamento original: {formatarPreco(reembolsoProtecao)} na {PLANOS.protecao.nome} e{" "}
          {formatarPreco(reembolsoCasoProtecao)} no {PLANOS.caso_protecao.nome}. A partir do mês seguinte, é cobrado
          o preço do plano. O reembolso só é processado depois de a subscrição estar confirmada.
        </p>
      </Secao>

      {/* REVISÃO JURÍDICA PENDENTE — textos em src/lib/legal.ts */}
      <Secao id="livre-resolucao" titulo="9. Direito de livre resolução e início imediato">
        <p className={P}>{RESUMO_LIVRE_RESOLUCAO}</p>
        <p className={P}>
          Antes de cada pagamento, é pedido ao Utilizador que confirme, de forma separada, o seguinte pedido expresso
          de início imediato:
        </p>
        <blockquote className="border-l-[3px] border-[var(--color-hairline-strong)] pl-4 text-base leading-relaxed text-[var(--color-ink-muted)]">
          {consentimentoInicioImediato("caso_protecao").texto}
        </blockquote>
        <p className={P}>{COMO_EXERCER_LIVRE_RESOLUCAO}</p>
        <p className={P}>
          O exercício do direito de livre resolução é distinto do cancelamento da subscrição (secção 6). Os efeitos de
          cada pedido, incluindo eventual reembolso ou valor devido pelo serviço já prestado, são apreciados caso a
          caso, nos termos da lei. Mais informação em{" "}
          <Link href={ROTAS_LEGAIS.livreResolucao} className={LINK}>
            Livre resolução
          </Link>
          .
        </p>
      </Secao>

      <Secao id="reembolsos-excecionais" titulo="10. Situações excecionais">
        <p className={P}>
          Em caso de cobrança duplicada, cobrança indevida ou erro técnico relevante, o Utilizador deve contactar a
          DoLado através de{" "}
          <a href={`mailto:${CONTACTO_EMAIL}`} className={LINK}>
            {CONTACTO_EMAIL}
          </a>
          . A DoLado analisa cada situação e pode, quando se justifique, cancelar a subscrição de imediato e/ou
          reembolsar os valores em causa.
        </p>
      </Secao>

      <Secao id="garantias" titulo="11. O que garantimos e o que não garantimos">
        <h3 className="text-base font-semibold text-[var(--color-ink)]">Garantimos</h3>
        <ul className={UL}>
          <li>
            Que a reclamação é redigida com base legal e só é submetida pela DoLado depois de o Utilizador rever o
            texto e autorizar expressamente o envio.
          </li>
          <li>Que o prazo legal de resposta é acompanhado e que o Utilizador é avisado em cada passo relevante.</li>
          <li>Que o Utilizador tem acesso a um dossiê organizado do caso.</li>
        </ul>
        <h3 className="text-base font-semibold text-[var(--color-ink)]">Não garantimos</h3>
        <ul className={UL}>
          <li>Que a empresa aceite a reclamação ou devolva qualquer valor.</li>
          <li>Consulta jurídica individualizada ou representação em tribunal.</li>
          <li>
            Prazos de resolução, que dependem sempre da empresa reclamada e de fatores fora do controlo da DoLado.
          </li>
        </ul>
      </Secao>

      <Secao id="setores" titulo="12. Setores abrangidos">
        <p className={P}>A DoLado trata casos de telecomunicações, energia e água.</p>
      </Secao>

      <Secao id="responsabilidade" titulo="13. Responsabilidade">
        <p className={P}>
          A DoLado compromete-se a agir com diligência na redação da reclamação e, quando autorizada, na sua
          submissão, e no acompanhamento do prazo. A DoLado não é responsável por decisões da empresa reclamada, por
          atrasos ou indisponibilidade de sistemas de terceiros, ou por informação incorreta ou incompleta fornecida
          pelo Utilizador. Nada nestes Termos exclui responsabilidade que a lei portuguesa não permita excluir,
          designadamente nas relações de consumo reguladas pela Lei n.º 24/96.
        </p>
      </Secao>

      <Secao id="dados-pessoais" titulo="14. Dados pessoais">
        <p className={P}>
          O tratamento de dados pessoais rege-se pela{" "}
          <Link href={ROTAS_LEGAIS.privacidade} className={LINK}>
            Política de Privacidade
          </Link>
          . Para questões sobre os seus dados pessoais ou para exercer os seus direitos:{" "}
          <a href={`mailto:${PRIVACIDADE_EMAIL}`} className={LINK}>
            {PRIVACIDADE_EMAIL}
          </a>
          .
        </p>
      </Secao>

      <Secao id="alteracoes" titulo="15. Versões, alterações e contacto">
        <p className={P}>
          Estes Termos são identificados por versão (data). Cada compra fica associada à versão aceite antes do
          pagamento, e cada versão continua disponível em dolado.pt/termos/&lt;data da versão&gt;. Para qualquer
          questão:{" "}
          <a href={`mailto:${CONTACTO_EMAIL}`} className={LINK}>
            {CONTACTO_EMAIL}
          </a>
          .
        </p>
      </Secao>

      <p className="text-sm text-[var(--color-ink-faint)]">Versão 2026-10-01 · Última atualização: 1 de outubro de 2026</p>
    </article>
  );
}
