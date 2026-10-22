// DoLado — diagnóstico gratuito: o cookie funcional da sessão anónima
// (dolado_diagnostico). Só servidor: Server Actions e Server Components.

import { cookies, headers } from "next/headers";
import {
  COOKIE_DIAGNOSTICO,
  VALIDADE_COOKIE_S,
  dominioCookieDiagnostico,
  lerCookieSessao,
  valorCookieSessao,
  type SessaoDiagnostico,
} from "./regras";
import { associarDiagnosticos, novaSessao } from "./servidor";

export async function lerSessaoDiagnostico(): Promise<SessaoDiagnostico | null> {
  return lerCookieSessao((await cookies()).get(COOKIE_DIAGNOSTICO)?.value);
}

/** A sessão do cookie ou, sem ela, uma nova (gravada no cookie). Só em Server Actions. */
export async function sessaoDiagnosticoOuNova(): Promise<SessaoDiagnostico> {
  const existente = await lerSessaoDiagnostico();
  if (existente) return existente;
  const sessao = novaSessao();
  const host = (await headers()).get("host") ?? "";
  const dominio = dominioCookieDiagnostico(host);
  (await cookies()).set(COOKIE_DIAGNOSTICO, valorCookieSessao(sessao), {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: VALIDADE_COOKIE_S,
    ...(dominio ? { domain: dominio } : {}),
  });
  return sessao;
}

/** Liga à conta os diagnósticos deste browser (se houver cookie). Nunca lança. */
export async function associarDiagnosticosDaSessao(userId: string): Promise<number> {
  try {
    const sessao = await lerSessaoDiagnostico();
    return sessao ? await associarDiagnosticos(sessao, userId) : 0;
  } catch {
    return 0;
  }
}
