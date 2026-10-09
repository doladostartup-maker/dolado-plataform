// Continuidade dos fluxos de autenticação (servidor). Regras puras em
// destinoAuth.ts.
//
// Todas as contas novas por e-mail confirmam pela mesma ligação:
// emailRedirectTo = <site>/auth/callback (URL autorizado na Supabase — sem
// ele a Supabase usa o "Site URL" do projeto, que não leva ao fluxo certo).
// O destino a seguir à confirmação vai num cookie deste browser, porque o
// URL de regresso autorizado é fixo e a ligação PKCE só funciona no mesmo
// browser que criou a conta.

import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COOKIE_DESTINO_POS_LOGIN,
  VALIDADE_DESTINO_CONFIRMACAO_S,
  destinoPorPerfil,
  destinoSeguro,
  escolherDestino,
} from "./destinoAuth.ts";
import { CHAVE_IDIOMA_CONTA } from "./idiomaConta.ts";
import type { Idioma } from "../i18n/config.ts";

export function urlCallbackAuth() {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
}

/** Guarda o destino a abrir quando o cliente confirmar o e-mail (ou voltar do Google). */
export async function guardarDestinoPosLogin(destino: string, validadeS = VALIDADE_DESTINO_CONFIRMACAO_S) {
  (await cookies()).set(COOKIE_DESTINO_POS_LOGIN, destinoSeguro(destino), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: validadeS,
  });
}

/**
 * Opções de signUp/resend para uma conta nova por e-mail.
 * `mostrarCodigo`: só no fluxo que tem um campo para o código ("Tratar o
 * meu caso"). O template do e-mail (supabase/templates/confirmacao.html) só
 * mostra o código quando a conta tem `mostrar_codigo` nos metadados.
 * `idioma`: idioma do percurso em que a conta é criada (/ ou /en) — fica
 * em user_metadata.idioma e decide o idioma dos e-mails (só apresentação;
 * ver idiomaConta.ts). Os templates da Supabase leem-no em `.Data.idioma`.
 */
export function dadosContaNova(dados: { nome?: string | null; mostrarCodigo?: boolean; idioma: Idioma }) {
  return {
    emailRedirectTo: urlCallbackAuth(),
    data: {
      ...(dados.nome ? { nome: dados.nome } : {}),
      ...(dados.mostrarCodigo ? { mostrar_codigo: true } : {}),
      [CHAVE_IDIOMA_CONTA]: dados.idioma,
    },
  };
}

/** Destino por omissão de uma conta: backoffice (admin) ou os casos do portal. */
export async function destinoPorOmissao(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("utilizadores").select("role").eq("id", userId).maybeSingle();
  return destinoPorPerfil(data?.role as string | undefined);
}

/** Destino final depois de autenticar (ver a ordem em destinoAuth.ts). */
export async function destinoDepoisDeAutenticar(
  supabase: SupabaseClient,
  userId: string,
  dados: { nextExplicito?: unknown; destinoGuardado?: unknown; haPedidoPorPagar?: () => Promise<boolean> },
) {
  const regra = escolherDestino({ nextExplicito: dados.nextExplicito, destinoGuardado: dados.destinoGuardado });
  if (regra) return regra;
  if (dados.haPedidoPorPagar) {
    const comPedido = escolherDestino({ haPedidoPorPagar: await dados.haPedidoPorPagar() });
    if (comPedido) return comPedido;
  }
  return destinoPorOmissao(supabase, userId);
}
