import type { Metadata } from "next";
import Link from "next/link";
import {
  CONTACTO_LIVRE_RESOLUCAO,
  MODELO_FORMULARIO_LIVRE_RESOLUCAO,
  PRAZO_LIVRE_RESOLUCAO_DIAS,
  RESUMO_LIVRE_RESOLUCAO,
  ROTAS_LEGAIS,
  consentimentoInicioImediato,
} from "@/lib/legal";
import { ROTULO_CONFIRMAR, ROTULO_RESOLVER } from "@/lib/livreResolucao";
import { FormularioLivreResolucao } from "./FormularioLivreResolucao";

export const metadata: Metadata = {
  title: "Livre resolução — DoLado",
  description:
    "Como exercer o direito de livre resolução nos serviços da DoLado: prazo, início imediato, formulário online e modelo de formulário.",
};

const H2 = "text-xl font-semibold text-[var(--color-ink)]";
const P = "text-base leading-relaxed text-[var(--color-ink)]";
const UL = "flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed text-[var(--color-ink)]";
const LINK = "text-[var(--color-brand)] underline";

// Textos jurídicos centralizados em src/lib/legal.ts e src/lib/livreResolucao.ts
// — revistos em 08/10/2026. Esta página descreve o regime legal (DL 24/2014)
// sem tirar conclusões por plano: os
// efeitos de cada pedido são apreciados caso a caso.
export default function LivreResolucaoPage() {
  return (
    <article className="flex flex-col gap-6 pt-4">
      <h1 className="text-[32px] font-semibold leading-tight text-[var(--color-ink)]">Direito de livre resolução</h1>
      <p className={P}>{RESUMO_LIVRE_RESOLUCAO}</p>

      <section id="prazo" className="flex flex-col gap-3">
        <h2 className={H2}>Prazo</h2>
        <p className={P}>
          Nos contratos celebrados à distância, o consumidor pode resolver o contrato no prazo de{" "}
          {PRAZO_LIVRE_RESOLUCAO_DIAS} dias a contar da data da celebração do contrato — o dia da compra ou da adesão
          à subscrição —, sem necessidade de indicar o motivo. Para cumprir o prazo, basta enviar a comunicação antes
          de ele terminar.
        </p>
      </section>

      <section id="inicio-imediato" className="flex flex-col gap-3">
        <h2 className={H2}>Início imediato do serviço</h2>
        <p className={P}>
          Antes de cada pagamento, a DoLado pede ao consumidor que confirme, de forma separada e sem opção
          pré-selecionada, se pretende que o serviço comece de imediato, durante o prazo de livre resolução. O texto
          apresentado é o seguinte:
        </p>
        <blockquote className="border-l-[3px] border-[var(--color-hairline-strong)] pl-4 text-base leading-relaxed text-[var(--color-ink-muted)]">
          {consentimentoInicioImediato("caso_protecao").texto}
        </blockquote>
        <p className={P}>Nos termos da lei:</p>
        <ul className={UL}>
          <li>
            se o consumidor pediu o início imediato e exercer depois o direito de livre resolução, paga o montante
            proporcional ao serviço efetivamente prestado até ao momento em que comunica a sua decisão;
          </li>
          <li>
            se o serviço tiver sido integralmente prestado durante o prazo, depois do pedido expresso de início
            imediato e do reconhecimento de que perde o direito de livre resolução quando o contrato estiver
            plenamente executado, o direito de livre resolução deixa de existir.
          </li>
        </ul>
        <p className={P}>Cada pedido é apreciado caso a caso, tendo em conta o serviço efetivamente prestado.</p>
      </section>

      <section id="reembolso" className="flex flex-col gap-3">
        <h2 className={H2}>Reembolso</h2>
        <p className={P}>
          Quando houver lugar a reembolso, a DoLado devolve os montantes devidos no prazo máximo de 14 dias a contar
          da data em que é informada da decisão de resolução, pelo mesmo meio de pagamento utilizado na compra, salvo
          acordo expresso em contrário e sem custos para o consumidor.
        </p>
      </section>

      <section id="como-exercer" className="flex flex-col gap-3">
        <h2 className={H2}>Como exercer</h2>
        <p className={P}>Pode exercer o direito de livre resolução de qualquer uma destas formas:</p>
        <ul className={UL}>
          <li>
            <strong>Online, nesta página</strong> — carregue em “{ROTULO_RESOLVER}”, preencha os dados e carregue em
            “{ROTULO_CONFIRMAR}”. O pedido fica registado com data e hora e é-lhe mostrada uma referência.
          </li>
          <li>
            <strong>Por e-mail</strong> — para{" "}
            <a href={`mailto:${CONTACTO_LIVRE_RESOLUCAO}`} className={LINK}>
              {CONTACTO_LIVRE_RESOLUCAO}
            </a>
            , com o seu nome, o e-mail usado na compra e o plano em causa. Pode usar o modelo abaixo, mas não é
            obrigatório: basta uma declaração inequívoca da sua decisão.
          </li>
        </ul>
        <div className="mt-2">
          <FormularioLivreResolucao />
        </div>
      </section>

      <section id="modelo" className="flex flex-col gap-3">
        <h2 className={H2}>Modelo de formulário de livre resolução</h2>
        <p className={P}>Só deve preencher e enviar este formulário se quiser resolver o contrato.</p>
        <div className="rounded-lg bg-[var(--color-surface-sunken)] p-4 text-[15px] leading-relaxed text-[var(--color-ink)]">
          {MODELO_FORMULARIO_LIVRE_RESOLUCAO.map((linha) => (
            <p key={linha} className="mb-1 last:mb-0">
              {linha}
            </p>
          ))}
        </div>
      </section>

      <section id="cancelamento" className="flex flex-col gap-3">
        <h2 className={H2}>Livre resolução e cancelamento são pedidos diferentes</h2>
        <ul className={UL}>
          <li>
            <strong>Cancelamento da subscrição</strong> — feito a qualquer momento na área Gestão de Subscrição. Impede
            a renovação seguinte e mantém o serviço até ao fim do período já pago, sem reembolso proporcional da
            mensalidade.
          </li>
          <li>
            <strong>Livre resolução</strong> — direito legal de resolver o contrato nos primeiros{" "}
            {PRAZO_LIVRE_RESOLUCAO_DIAS} dias, nas condições acima. É tratado à parte do cancelamento.
          </li>
        </ul>
      </section>

      <p className={P}>
        Mais informação nos{" "}
        <Link prefetch={false} href={`${ROTAS_LEGAIS.termos}#livre-resolucao`} className={LINK}>
          Termos e Condições
        </Link>
        .
      </p>
    </article>
  );
}
