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
import { precoNoIdioma } from "@/i18n/mensagens/planos";
import { tAcessoPatrocinado } from "@/i18n/mensagens/acessoPatrocinado";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { contaComEmailConfirmado, obterAcesso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PLANOS } from "@/lib/planos";
import { ROTA_ATIVAR_CODIGO } from "@/lib/acessoPatrocinado";
import { acessosPatrocinadosDisponiveis } from "@/lib/acessoPatrocinadoServidor";
import { MARKETING_SITE_URL } from "@/lib/site";
import { FormularioCodigo } from "./FormularioCodigo";

export async function generateMetadata({ params }: ComIdioma) {
  return { title: tAcessoPatrocinado[await idiomaDaPagina(params)].ativar.metadados, robots: { index: false } };
}

export const dynamic = "force-dynamic";

// Activação de um código de Protecção oferecida (Parceiro de Distribuição),
// em portal.dolado.pt (onde está a sessão). Fluxo: a empresa entrega o
// código → conta ou sessão → código + confirmação expressa aqui →
// /portal/contratos. Sem cartão, sem Stripe. O código nunca vai no URL. O
// que esta página mostra é só apresentação: a activação decide de novo, de
// forma atómica, na base de dados.
export default async function AtivarCodigoPage({ params }: ComIdioma) {
  const idioma = await idiomaDaPagina(params);
  const t = tAcessoPatrocinado[idioma].ativar;
  const preco = precoNoIdioma(idioma, PLANOS.protecao.precoCentimos);
  const precario = localizarHref(idioma, `${MARKETING_SITE_URL}/precario`);
  const aqui = localizarHref(idioma, ROTA_ATIVAR_CODIGO);

  const disponivel = acessosPatrocinadosDisponiveis();
  const conta = disponivel ? await contaComEmailConfirmado() : null;
  let estado: "indisponivel" | "sem_sessao" | "email_nao_confirmado" | "protecao_ativa" | "pronto" = "indisponivel";
  if (disponivel && !conta) estado = "sem_sessao";
  if (disponivel && conta) {
    if (!conta.emailConfirmado) {
      estado = "email_nao_confirmado";
    } else {
      const acesso = await obterAcesso(await createClient(), conta.id);
      if (acesso.acessoPatrocinado?.emCurso) redirect(localizarHref(idioma, "/portal/contratos"));
      estado = acesso.temSubscricao ? "protecao_ativa" : "pronto";
    }
  }

  const resumo = [t.resumo.inicio, t.resumo.semCartao, t.resumo.semCobranca(preco), t.resumo.semCasos, t.resumo.privacidade];

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

          {(estado === "pronto" || estado === "sem_sessao") && (
            <div className="flex flex-col gap-3">
              <h2 className={TITULO_CARTAO}>{t.resumoTitulo}</h2>
              <ListaVistos compacta itens={resumo} />
            </div>
          )}

          {estado === "pronto" && <FormularioCodigo codigoInicial="" />}

          {estado === "sem_sessao" && (
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

          {(estado === "indisponivel" || estado === "email_nao_confirmado" || estado === "protecao_ativa") && (
            <>
              <Aviso tom="info">{t.motivos[estado]}</Aviso>
              {estado === "protecao_ativa" ? (
                <Link href="/portal/contratos" className={BOTAO_SECUNDARIO}>
                  {t.irParaProtecao}
                </Link>
              ) : estado === "email_nao_confirmado" ? (
                <Link href={aqui} className={BOTAO_SECUNDARIO}>
                  {t.titulo}
                </Link>
              ) : (
                <a href={precario} className={BOTAO_SECUNDARIO}>
                  {t.verPlanos}
                </a>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
