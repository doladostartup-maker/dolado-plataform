import Link from "@/i18n/Link";
import { redirect } from "next/navigation";
import { SeletorIdioma } from "@/components/idioma/SeletorIdioma";
import { ListaVistos } from "@/components/marketing-v2/ListaVistos";
import { Logotipo } from "@/components/marketing-v2/Logotipo";
import { fonteV2 } from "@/components/marketing-v2/fonte";
import { Aviso } from "@/components/portal/Aviso";
import {
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CARTAO,
  EYEBROW,
  TEXTO,
  TEXTO_SECUNDARIO,
  TITULO_CARTAO,
  TITULO_PAGINA,
} from "@/components/portal/ui";
import { localizarHref } from "@/i18n/config";
import { formatarData } from "@/i18n/formatar";
import { precoNoIdioma } from "@/i18n/mensagens/planos";
import { tProtecaoGratuita } from "@/i18n/mensagens/protecaoGratuita";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { contaComEmailConfirmado } from "@/lib/auth";
import { destinoCompra } from "@/lib/destinoAuth";
import { consultaUtm, lerUtm } from "@/lib/landing30Dias";
import { PLANOS } from "@/lib/planos";
import { ROTA_EXPERIMENTAR, fimSeAtivarAgora, lerOrigem, type MotivoElegibilidade } from "@/lib/protecaoGratuita";
import { elegibilidadeDaConta, protecaoGratuitaDisponivel } from "@/lib/protecaoGratuitaServidor";
import { MARKETING_SITE_URL } from "@/lib/site";
import { FormularioAtivacao } from "./FormularioAtivacao";

export async function generateMetadata({ params }: ComIdioma) {
  return { title: tProtecaoGratuita[await idiomaDaPagina(params)].ativar.metadados, robots: { index: false } };
}

export const dynamic = "force-dynamic";

// Ativação da Proteção gratuita (30 dias), em portal.dolado.pt (onde está a
// sessão). Fluxo: CTA "Experimentar 30 dias grátis" → conta ou sessão →
// confirmação expressa aqui → /portal/contratos. Sem cartão, sem Stripe.
// A elegibilidade mostrada é só apresentação: a ativação decide de novo,
// de forma atómica, na base de dados.
export default async function ExperimentarProtecaoPage({
  searchParams,
  params,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> } & ComIdioma) {
  const idioma = await idiomaDaPagina(params);
  const t = tProtecaoGratuita[idioma].ativar;
  const consulta = await searchParams;
  const origem = lerOrigem(consulta.origem);
  const preco = precoNoIdioma(idioma, PLANOS.protecao.precoCentimos);
  const precario = localizarHref(idioma, `${MARKETING_SITE_URL}/precario`);
  // Os UTM do anúncio (landing /30-dias-gratis) seguem pelo registo e pela
  // confirmação do e-mail até voltar aqui — só no URL, nunca gravados.
  const aqui = localizarHref(idioma, `${ROTA_EXPERIMENTAR}?origem=${origem}${consultaUtm(lerUtm(consulta))}`);

  const disponivel = protecaoGratuitaDisponivel();
  const conta = disponivel ? await contaComEmailConfirmado() : null;
  let motivo: MotivoElegibilidade | "indisponivel" | "sem_sessao" = "indisponivel";
  if (disponivel && !conta) motivo = "sem_sessao";
  if (disponivel && conta) {
    motivo = conta.emailConfirmado
      ? await elegibilidadeDaConta(conta.id, conta.email).catch(() => "conta_invalida" as const)
      : "email_nao_confirmado";
  }
  if (motivo === "ativa" || motivo === "protecao_ativa") redirect(localizarHref(idioma, "/portal/contratos"));

  const fim = fimSeAtivarAgora();
  const resumo = [
    t.resumo.inicio,
    t.resumo.fim(formatarData(idioma, fim, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" })),
    t.resumo.semCartao,
    t.resumo.semCobranca(preco),
    t.resumo.semCasos,
    t.resumo.umaVez,
  ];

  return (
    <div className={`tema-portal ${fonteV2.className} flex min-h-screen flex-col bg-[#F7F9FC] text-[var(--v2-navy)] antialiased`}>
      <header className="border-b border-[var(--v2-line)] bg-white">
        <div className="mx-auto flex h-16 w-full max-w-md items-center justify-between gap-3 px-4">
          <Logotipo />
          <SeletorIdioma compacto />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className={`${CARTAO} flex flex-col gap-5`}>
          <div className="flex flex-col gap-2">
            <p className={EYEBROW}>{t.eyebrow}</p>
            <h1 className={TITULO_PAGINA}>{t.titulo}</h1>
            <p className={TEXTO_SECUNDARIO}>{t.texto}</p>
          </div>

          {(motivo === "elegivel" || motivo === "sem_sessao") && (
            <div className="flex flex-col gap-3">
              <h2 className={TITULO_CARTAO}>{t.resumoTitulo}</h2>
              <ListaVistos compacta itens={resumo} />
            </div>
          )}

          {motivo === "elegivel" && <FormularioAtivacao origem={origem} />}

          {motivo === "sem_sessao" && (
            <div className="flex flex-col gap-3 border-t border-[var(--v2-line)] pt-5">
              <p className={TEXTO}>{t.semSessao}</p>
              <Link href={`/registo?next=${encodeURIComponent(aqui)}`} className={BOTAO_PRIMARIO}>
                {t.criarConta}
              </Link>
              <Link href={`/login?next=${encodeURIComponent(aqui)}`} className={BOTAO_SECUNDARIO}>
                {t.iniciarSessao}
              </Link>
            </div>
          )}

          {motivo !== "elegivel" && motivo !== "sem_sessao" && (
            <>
              <Aviso tom="info">{t.motivos[motivo]}</Aviso>
              <div className="flex flex-col gap-3">
                {(motivo === "ja_utilizada" || motivo === "ja_teve_protecao") && (
                  <Link href={destinoCompra("protecao")} className={BOTAO_PRIMARIO}>
                    {t.subscrever(preco)}
                  </Link>
                )}
                {motivo === "email_nao_confirmado" ? (
                  <Link href={aqui} className={BOTAO_SECUNDARIO}>
                    {t.titulo}
                  </Link>
                ) : (
                  <a href={precario} className={BOTAO_SECUNDARIO}>
                    {t.verPlanos}
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
