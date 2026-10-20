// Operações de servidor partilhadas pelo backoffice, pelo portal e pelas
// páginas públicas de revisão. Usa a service role: quem chama tem de ter
// validado antes a sessão (admin/cliente) ou o link. As regras de negócio
// estão nas funções da base de dados — aqui só se geram tokens e se enviam
// e-mails.
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL, enviarEmailBrevo } from "@/lib/email/brevo";
import { assuntoTextoParaRevisao, montarHtmlAvisoAlteracoes, montarHtmlTextoParaRevisao } from "@/lib/email/textoRevisao";
import { idiomaDaConta } from "@/lib/idiomaContaServidor";
import { ROTAS_TEXTO, VALIDADE_LINKS_REVISAO_DIAS, tokenComFormatoValido } from "@/lib/textoCaso";
import { gerarToken, hashToken } from "@/lib/textoCasoTokens";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.dolado.pt";

function validadeLinks() {
  return new Date(Date.now() + VALIDADE_LINKS_REVISAO_DIAS * 24 * 3600 * 1000).toISOString();
}

function novosTokens() {
  const rever = gerarToken();
  const alterar = gerarToken();
  return { rever, alterar, hashRever: hashToken(rever), hashAlterar: hashToken(alterar) };
}

async function contextoDoTexto(textoId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("casos_textos").select("caso_id, casos(empresa, sector, utilizador_id)").eq("id", textoId).maybeSingle();
  const caso = (Array.isArray(data?.casos) ? data?.casos[0] : data?.casos) as {
    empresa: string | null;
    sector: string | null;
    utilizador_id: string | null;
  } | null;
  // Já houve um envio no caso: este texto é uma nova comunicação à empresa.
  const { count } = data?.caso_id
    ? await admin.from("casos_textos_envios").select("id", { count: "exact", head: true }).eq("caso_id", data.caso_id)
    : { count: 0 };
  // Idioma do e-mail: o da conta do cliente (só apresentação; sem idioma → português).
  const idioma = await idiomaDaConta(caso?.utilizador_id);
  return { assunto: caso?.empresa || caso?.sector || null, seguimento: (count ?? 0) > 0, idioma };
}

async function enviarLinks(email: string, textoId: string, tokens: ReturnType<typeof novosTokens>, novoLink: boolean) {
  const { assunto, seguimento, idioma } = await contextoDoTexto(textoId);
  await enviarEmailBrevo(
    email,
    assuntoTextoParaRevisao(seguimento, idioma),
    montarHtmlTextoParaRevisao(
      {
        urlRever: `${SITE_URL}${ROTAS_TEXTO.rever(tokens.rever)}`,
        urlAlterar: `${SITE_URL}${ROTAS_TEXTO.alterar(tokens.alterar)}`,
        assunto,
        validadeDias: VALIDADE_LINKS_REVISAO_DIAS,
        novoLink,
        seguimento,
      },
      idioma,
    ),
  );
}

/**
 * Envia (ou reenvia) a versão ao cliente para revisão: novos links (os
 * anteriores deixam de valer) e e-mail. A base de dados recusa se a versão
 * não for a atual ou já não estiver em rascunho/à espera de aprovação.
 */
export async function emitirLinksEEnviarEmail(textoId: string): Promise<{ emailEnviado: boolean }> {
  const tokens = novosTokens();
  const { data: email, error } = await createAdminClient().rpc("texto_emitir_links", {
    p_texto_id: textoId,
    p_hash_rever: tokens.hashRever,
    p_hash_alterar: tokens.hashAlterar,
    p_expira_em: validadeLinks(),
  });
  if (error || !email) throw Object.assign(new Error("texto_emitir_links falhou"), { code: error?.code });
  try {
    await enviarLinks(email as string, textoId, tokens, false);
    return { emailEnviado: true };
  } catch {
    // A versão fica à espera de aprovação; a equipa pode reenviar (novos links).
    return { emailEnviado: false };
  }
}

/**
 * Novo link a partir de um link expirado. Só se a versão continuar a atual e
 * à espera de aprovação (e no máximo 1 a cada 10 minutos — regra na base de
 * dados). Nunca revela se o pedido foi aceite nem o e-mail.
 */
export async function reemitirLinksPorLinkAntigo(tokenAntigo: string) {
  const tokens = novosTokens();
  const { data: email, error } = await createAdminClient().rpc("texto_reemitir_por_link", {
    p_hash_antigo: hashToken(tokenAntigo),
    p_hash_rever: tokens.hashRever,
    p_hash_alterar: tokens.hashAlterar,
    p_expira_em: validadeLinks(),
  });
  if (error || !email) return;
  const { data: link } = await createAdminClient()
    .from("casos_textos_links")
    .select("texto_id")
    .eq("token_hash", tokens.hashRever)
    .maybeSingle();
  if (link?.texto_id) await enviarLinks(email as string, link.texto_id as string, tokens, true).catch(() => undefined);
}

/** Aviso interno de pedido de alterações. Uma falha de e-mail não anula o pedido. */
export async function avisarEquipaAlteracoes(casoId: string, versao: number | null) {
  await enviarEmailBrevo(
    ADMIN_EMAIL,
    "Pedido de alterações ao texto — DoLado",
    montarHtmlAvisoAlteracoes({ urlCaso: `${SITE_URL}/backoffice/casos/${casoId}`, versao }),
  ).catch(() => undefined);
}

export type ConsultaLink = {
  situacao: "valido" | "ja_autorizado" | "alteracoes_pedidas" | "versao_antiga" | "expirado" | "link_substituido" | "invalido";
  versao?: number;
  assunto?: string | null;
  autorizadoEm?: string | null;
  conteudo?: string | null;
};

/**
 * Leitura do link para as páginas públicas (GET). Só leitura: a função da
 * base de dados não escreve nada — abrir o link não autoriza nem consome.
 */
export async function consultarLink(token: string, finalidade: "rever_autorizar" | "pedir_alteracoes"): Promise<ConsultaLink> {
  if (!tokenComFormatoValido(token)) return { situacao: "invalido" };
  const { data, error } = await createAdminClient().rpc("texto_consultar_link", { p_hash: hashToken(token) });
  const r = (data ?? {}) as {
    situacao?: ConsultaLink["situacao"];
    finalidade?: string;
    versao?: number;
    empresa?: string | null;
    sector?: string | null;
    autorizado_em?: string | null;
    conteudo?: string | null;
  };
  if (error || !r.situacao || r.situacao === "invalido" || r.finalidade !== finalidade) return { situacao: "invalido" };
  return {
    situacao: r.situacao,
    versao: r.versao,
    assunto: r.empresa || r.sector || null,
    autorizadoEm: r.autorizado_em ?? null,
    conteudo: r.conteudo ?? null,
  };
}
