import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MARKETING_SITE_URL } from "@/lib/site";
import {
  COOKIE_INDICACAO,
  INDICACAO_JANELA_DIAS,
  indicacoesAtivas,
  normalizarCodigo,
  visitaDoCookie,
} from "@/lib/indicacoes/regras";
import { registarVisita } from "@/lib/indicacoes/servidor";

// Link de indicação: https://dolado.pt/r/ABC123DE. dolado.pt redireciona
// para portal.dolado.pt (middleware), onde fica o cookie: é aí que estão a
// conta e o Checkout. Guarda só o id da visita (30 dias) e segue para a
// homepage — a navegação continua normal. Um código inválido, ou o programa
// desligado, também segue para a homepage, sem cookie nem erro.
// O código nunca dá acesso a dados de ninguém: só cria uma visita.

function destino() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  // Em produção, a homepage está em dolado.pt; localmente, no próprio servidor.
  return site.includes("dolado.pt") || !site ? `${MARKETING_SITE_URL}/` : `${site}/`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const resposta = NextResponse.redirect(destino(), 302);
  resposta.headers.set("X-Robots-Tag", "noindex");
  const codigo = normalizarCodigo((await params).codigo);
  if (!indicacoesAtivas() || !codigo) return resposta;

  try {
    const atual = visitaDoCookie((await cookies()).get(COOKIE_INDICACAO)?.value);
    const visita = await registarVisita(codigo, atual);
    if (visita) {
      resposta.cookies.set(COOKIE_INDICACAO, visita, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: INDICACAO_JANELA_DIAS * 24 * 3600,
      });
    }
  } catch {
    // Sem visita registada: o visitante segue na mesma, sem erro.
  }
  return resposta;
}
