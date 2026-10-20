import type Stripe from "stripe";
import Link from "@/i18n/Link";
import { localizarHref } from "@/i18n/config";
import { tConta, traduzirMensagemConta } from "@/i18n/mensagens/conta";
import { rico } from "@/i18n/Rico";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { redirect } from "next/navigation";
import { contaComEmailConfirmado } from "@/lib/auth";
import { MENSAGENS_ASSOCIACAO, avaliarSessaoParaAssociar, type ResultadoAssociacao } from "@/lib/compra/associacao";
import { CONTACTO_EMAIL } from "@/lib/site";
import { getStripe } from "@/lib/stripe/client";
import { associarCompra } from "./actions";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_PRIMARIO, LIGACAO, TEXTO } from "@/components/portal/ui";

export async function generateMetadata({ params }: ComIdioma) {
  return { title: tConta[await idiomaDaPagina(params)].associar.metadados, robots: { index: false } };
}

const SUCESSO: ReadonlySet<string> = new Set(["associada", "ja_associada"]);
const LINK = LIGACAO;

// Associação de uma compra paga sem conta à conta da sessão. Só leitura
// aqui (GET): a associação acontece apenas no POST explícito do botão.
export default async function AssociarCompraPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ session_id?: string; resultado?: string }>;
} & ComIdioma) {
  const idioma = await idiomaDaPagina(params);
  const t = tConta[idioma].associar;
  const { session_id: sessionId, resultado } = await searchParams;
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) redirect(localizarHref(idioma, "/portal"));

  const conta = await contaComEmailConfirmado();
  if (!conta) {
    const voltar = localizarHref(idioma, `/associar-compra?session_id=${sessionId}`);
    redirect(localizarHref(idioma, `/login?next=${encodeURIComponent(voltar)}`));
  }

  let mensagem: string | null = null;
  let sucesso = false;
  if (resultado === "erro") {
    mensagem = "Não foi possível associar a compra. Tente novamente dentro de alguns minutos.";
  } else if (resultado && resultado in MENSAGENS_ASSOCIACAO) {
    mensagem = MENSAGENS_ASSOCIACAO[resultado as ResultadoAssociacao];
    sucesso = SUCESSO.has(resultado);
  }

  // Pré-verificação só para mostrar o estado (a ação volta a validar tudo).
  let podeAssociar = false;
  if (!mensagem) {
    const session = (await getStripe()
      .checkout.sessions.retrieve(sessionId)
      .catch(() => null)) as Stripe.Checkout.Session | null;
    const avaliacao = session ? avaliarSessaoParaAssociar(session, conta) : "sessao_invalida";
    if (avaliacao === "ok") podeAssociar = true;
    else mensagem = MENSAGENS_ASSOCIACAO[avaliacao];
  }

  return (
    <MolduraConta
      contexto={t.contexto}
      titulo={t.titulo}
      depois={
        <>
          <Link href="/portal" className={LINK}>
            {t.irPortal}
          </Link>{" "}
          · {t.ajuda}{" "}
          <a href={`mailto:${CONTACTO_EMAIL}`} className={LINK}>
            {CONTACTO_EMAIL}
          </a>
        </>
      }
    >
      {mensagem && <Aviso tom={sucesso ? "sucesso" : "erro"}>{traduzirMensagemConta(idioma, mensagem)}</Aviso>}

      {podeAssociar && (
        <form action={associarCompra} className="flex flex-col gap-4">
          <input type="hidden" name="session_id" value={sessionId} />
          <p className={TEXTO}>{rico(t.texto.replace("{email}", conta.email ?? ""))}</p>
          <button type="submit" className={BOTAO_PRIMARIO}>
            {t.botao}
          </button>
        </form>
      )}
    </MolduraConta>
  );
}
