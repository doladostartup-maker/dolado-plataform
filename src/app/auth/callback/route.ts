import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { destinoDepoisDeAutenticar } from "@/lib/authServidor";
import { COOKIE_DESTINO_POS_LOGIN, ehDestinoSeguro } from "@/lib/destinoAuth";
import { haPedidoPorPagarNoBrowser } from "@/lib/pedidoCasoServidor";
import { createClient } from "@/lib/supabase/server";
import { atribuirIndicacaoDoBrowser } from "@/lib/indicacoes/servidor";
import { registarOrigemDaConta } from "@/lib/origemAquisicaoServidor";
import { gravarIdiomaDeContaNova } from "@/lib/idiomaContaServidor";
import { COOKIE_IDIOMA, localizarHref, normalizarIdioma } from "@/i18n/config";
import { traduzirMensagemConta } from "@/i18n/mensagens/conta";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPedido = searchParams.get("next");
  // Usa sempre o site URL configurado, nunca o origin derivado do pedido:
  // atrás do proxy da Clever Cloud, request.url resolve para o endereço
  // interno (localhost:8080), não para o domínio público.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  // Idioma escolhido neste browser (cookie de preferência): o regresso do
  // e-mail ou do Google continua no mesmo idioma. Só apresentação.
  const idioma = normalizarIdioma((await cookies()).get(COOKIE_IDIOMA)?.value);
  const noIdioma = (caminho: string) => localizarHref(idioma, caminho);
  const msg = (m: string) => encodeURIComponent(traduzirMensagemConta(idioma, m));

  if (!code) {
    // O próprio Google/Supabase pode devolver um erro em vez de um code
    // (ex. utilizador cancelou, ou falha no provider) — regista para
    // conseguirmos distinguir isso de uma falha na troca do code.
    console.error(
      "[auth/callback] sem code:",
      searchParams.get("error"),
      searchParams.get("error_description"),
    );
  } else {
    // Diagnóstico: nomes dos cookies recebidos (nunca os valores), para
    // perceber se o cookie do code verifier chega ao callback ou não.
    const nomesCookies = (request.headers.get("cookie") ?? "")
      .split(";")
      .map((c) => c.trim().split("=")[0])
      .filter(Boolean);
    console.error("[auth/callback] cookies recebidos:", nomesCookies.join(", ") || "(nenhum)");

    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const destinoGuardado = (await cookies()).get(COOKIE_DESTINO_POS_LOGIN)?.value;
    if (!error && data.user) {
      // Programa de indicação: a conta fica ligada ao link visitado neste
      // browser (a base de dados recusa auto-indicação, contas já clientes e
      // visitas com mais de 30 dias). Nunca impede o login.
      await atribuirIndicacaoDoBrowser(data.user.id).catch(() => undefined);
      // Origem de aquisição (?ref=): só para contas criadas depois da visita.
      await registarOrigemDaConta(data.user.id);
      // Conta nova pelo Google: guarda o idioma do percurso em que foi
      // criada (idioma dos e-mails). Contas antigas e contas por e-mail (já
      // gravado no signUp) não mudam.
      await gravarIdiomaDeContaNova(data.user, idioma);
      // Destino: ?next= explícito → destino guardado ao criar a conta ou ao
      // sair para o Google (ex.: continuar a compra em /comprar) → pedido de
      // caso por pagar neste browser → Painel /portal (ou backoffice, admin).
      const next = await destinoDepoisDeAutenticar(supabase, data.user.id, {
        nextExplicito: nextPedido,
        destinoGuardado,
        haPedidoPorPagar: haPedidoPorPagarNoBrowser,
      });
      const resposta = NextResponse.redirect(`${siteUrl}${noIdioma(next)}`);
      if (destinoGuardado) resposta.cookies.delete(COOKIE_DESTINO_POS_LOGIN);
      return resposta;
    }
    console.error("[auth/callback] exchangeCodeForSession falhou:", error?.message);

    // A ligação de confirmação aberta noutro browser/dispositivo: a Supabase
    // já confirmou o e-mail, mas a sessão só abre no browser que criou a
    // conta (PKCE). Em vez de um erro, pede para iniciar sessão — e mantém o
    // destino para continuar no mesmo passo.
    const voltar = ehDestinoSeguro(destinoGuardado) ? `&next=${encodeURIComponent(destinoGuardado)}` : "";
    return NextResponse.redirect(
      `${siteUrl}${noIdioma(`/login?info=${msg("Se acabou de confirmar o seu e-mail, inicie sessão para continuar.")}${voltar}`)}`,
    );
  }

  return NextResponse.redirect(`${siteUrl}${noIdioma(`/login?erro=${msg("Não foi possível iniciar sessão.")}`)}`);
}
