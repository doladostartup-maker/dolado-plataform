import Link from "@/i18n/Link";
import { SeletorIdioma } from "@/components/idioma/SeletorIdioma";
import { localizarHref } from "@/i18n/config";
import { tCompra } from "@/i18n/mensagens/compra";
import { tIndicacoes } from "@/i18n/mensagens/indicacoes";
import { tPlanos } from "@/i18n/mensagens/planos";
import { rico } from "@/i18n/Rico";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { redirect } from "next/navigation";
import { obterAcesso, utilizadorAtual } from "@/lib/auth";
import { decidirCompra, type PlanoSubscricaoAtiva } from "@/lib/compra/decisao";
import { customerDaConta, ofertaConversaoDaConta, subscricoesAtivasDoCustomer } from "@/lib/compra/servidor";
import { ehPlanoId } from "@/lib/planos";
import { MARKETING_SITE_URL, urlTratarCaso } from "@/lib/site";
import { BotaoComprar } from "@/components/compra/BotaoComprar";
import { destinoCompra } from "@/lib/destinoAuth";
import { produtoComDescontoIndicacao } from "@/lib/indicacoes/regras";
import { visitaDeIndicacaoNoBrowser } from "@/lib/indicacoes/servidor";
import { Aviso } from "@/components/portal/Aviso";
import { Logotipo } from "@/components/marketing-v2/Logotipo";
import { fonteV2 } from "@/components/marketing-v2/fonte";
import {
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CARTAO,
  EYEBROW,
  LIGACAO,
  METADADOS,
  TEXTO,
  TEXTO_SECUNDARIO,
  TITULO_PAGINA,
} from "@/components/portal/ui";
import { CompraConfirmacao } from "./CompraConfirmacao";

export async function generateMetadata({ params }: ComIdioma) {
  return { title: tCompra[await idiomaDaPagina(params)].comprar.metadados, robots: { index: false } };
}

const LINK = `${LIGACAO} underline`;

// Ponto de entrada de todas as compras do preçário de dolado.pt. Corre em
// portal.dolado.pt, onde está a sessão: decide aqui (e de novo no servidor,
// em confirmarCompra) se a compra é da conta ou pública.
// Design System V2 (mesmo tema do portal: .tema-portal).
export default async function ComprarPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ plano?: string }>;
} & ComIdioma) {
  const idioma = await idiomaDaPagina(params);
  const t = tCompra[idioma];
  const PRECARIO = localizarHref(idioma, `${MARKETING_SITE_URL}/precario`);
  const { plano } = await searchParams;
  if (!ehPlanoId(plano)) redirect(PRECARIO);

  const { supabase, user } = await utilizadorAtual();
  let subscricoesAtivasStripe: PlanoSubscricaoAtiva[] = [];
  let acesso = null;
  if (user) {
    acesso = await obterAcesso(supabase, user.id);
    // Se o Stripe falhar, a Server Action volta a verificar antes de abrir o Checkout.
    subscricoesAtivasStripe = await subscricoesAtivasDoCustomer(await customerDaConta(user.id)).catch(() => []);
  }
  const decisao = decidirCompra({ plano, autenticado: !!user, acesso, subscricoesAtivasStripe });

  if (decisao.acao === "tratar_caso") redirect(localizarHref(idioma, urlTratarCaso("precario")));

  const nome = tPlanos[idioma].nome[plano];
  // Chegou por um link de indicação, sem sessão: os 20% só com conta.
  const avisoIndicacao =
    decisao.acao === "publico" && produtoComDescontoIndicacao(plano) && (await visitaDeIndicacaoNoBrowser().catch(() => false));
  return (
    <div
      className={`tema-portal ${fonteV2.className} flex min-h-screen flex-col bg-[#F7F9FC] text-[var(--v2-navy)] antialiased`}
    >
      <header className="border-b border-[var(--v2-line)] bg-white">
        <div className="mx-auto flex h-16 w-full max-w-md items-center justify-between gap-3 px-4">
          <Logotipo />
          <SeletorIdioma compacto />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className={`${CARTAO} flex flex-col gap-5`}>
          <div className="flex flex-col gap-2">
            <p className={EYEBROW}>{t.comprar.eyebrow}</p>
            <h1 className={TITULO_PAGINA}>{nome}</h1>
          </div>

          {decisao.acao === "ja_tem_subscricao" && (
            <>
              <p className={TEXTO}>{decisao.mesmoPlano ? t.mensagens.mesmaSubscricao : t.mensagens.outraSubscricao}</p>
              <div className="flex flex-col gap-3">
                <Link href="/portal/subscricao" className={BOTAO_PRIMARIO}>
                  {t.comprar.verSubscricao}
                </Link>
                <Link href="/portal" className={BOTAO_SECUNDARIO}>
                  {t.comprar.irPortal}
                </Link>
              </div>
            </>
          )}

          {decisao.acao === "publico" && (
            <>
              {avisoIndicacao && <Aviso tom="info">{tIndicacoes[idioma].textos.semConta}</Aviso>}
              <p className={TEXTO_SECUNDARIO}>{t.comprar.jaTemConta}</p>
              <div className="flex flex-col gap-3">
                <Link href={`/login?next=${encodeURIComponent(localizarHref(idioma, destinoCompra(plano)))}`} className={BOTAO_PRIMARIO}>
                  {t.comprar.iniciarSessao}
                </Link>
                <BotaoComprar plano={plano} fluxo="publico" origem="landing" className={`${BOTAO_SECUNDARIO} w-full`}>
                  {t.comprar.semConta}
                </BotaoComprar>
              </div>
              <p className={`${METADADOS} border-t border-[var(--v2-line)] pt-4 leading-relaxed`}>
                {rico(t.comprar.criarDepois, {
                  registo: (c) => (
                    <Link href={`/registo?next=${encodeURIComponent(localizarHref(idioma, destinoCompra(plano)))}`} className={LINK}>
                      {c}
                    </Link>
                  ),
                  precario: (c) => (
                    <a href={PRECARIO} className={LINK}>
                      {c}
                    </a>
                  ),
                })}
              </p>
            </>
          )}

          {decisao.acao === "adesao" && user && (
            <CompraConfirmacao
              plano={plano}
              fluxo="adesao"
              conversao={plano === "avulso" ? null : await ofertaConversaoDaConta(user.id, plano)}
              voltarPara={PRECARIO}
            />
          )}
        </div>
      </main>
    </div>
  );
}
