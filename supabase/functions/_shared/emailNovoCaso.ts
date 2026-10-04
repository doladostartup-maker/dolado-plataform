// Montagem dos e-mails da Edge Function novo-caso (confirmação ao cliente e
// notificação ao admin). Sem APIs de Deno — testado com `node --test`
// (src/lib/emailNovoCaso.test.mjs).
//
// Todos os campos do caso são preenchidos pelo cliente: no HTML passam por
// escape e no assunto perdem quebras de linha e são encurtados.

import { escaparHtml, textoParaAssunto } from "./textoSeguro.ts";
import { P_EMAIL, emailV2 } from "./molduraEmail.ts";

export interface CasoNovo {
  id: string;
  nome: string;
  email: string;
  sector: string | null;
  tipo_problema: string | null;
  problema_tipo: string | null;
  descricao: string | null;
  telefone: string | null;
  empresa: string | null;
  empresa_parceira: string | null;
}

/** Escape de HTML; vazio/nulo aparece como "—". Quebras de linha opcionais. */
function valor(texto: string | null | undefined, quebras = false): string {
  if (texto == null || String(texto).trim() === "") return "—";
  const seguro = escaparHtml(texto);
  return quebras ? seguro.replace(/\r\n|\r|\n/g, "<br>") : seguro;
}

export const ASSUNTO_CONFIRMACAO_CLIENTE = "Recebemos o seu caso";

export function htmlConfirmacaoCliente(nome: string): string {
  return emailV2({
    titulo: ASSUNTO_CONFIRMACAO_CLIENTE,
    corpo: `<p ${P_EMAIL}>Olá ${escaparHtml(nome ?? "")},</p>
              <p ${P_EMAIL}>Recebemos o seu caso.</p>
              <p ${P_EMAIL}>A DoLado irá analisar as informações enviadas e, antes de qualquer envio, poderá entrar em contacto consigo para confirmar os factos ou solicitar informações adicionais.</p>
              <p style="margin:0 0 4px 0;">Obrigado por confiar na DoLado.</p>`,
    assinatura: "nome",
  });
}

export function assuntoNotificacaoAdmin(caso: Pick<CasoNovo, "nome" | "sector">): string {
  const sector = caso.sector?.trim() ? textoParaAssunto(caso.sector, 40) : "Sem setor";
  const nome = textoParaAssunto(caso.nome ?? "", 60) || "Sem nome";
  return `[NOVO CASO] ${sector} – ${nome}`;
}

export function htmlNotificacaoAdmin(caso: CasoNovo, siteUrl: string): string {
  const linha = (label: string, texto: string | null) =>
    `<p style="margin:0 0 4px 0;"><strong>${label}:</strong> ${valor(texto)}</p>`;
  const link = `${siteUrl}/backoffice/casos/${encodeURIComponent(caso.id)}`;

  return `<!DOCTYPE html>
<html lang="pt-PT">
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; font-family: 'Inter', Arial, Helvetica, sans-serif; color:#171A21; font-size:15px; line-height:1.6;">
  <p style="margin:0 0 16px 0; font-weight:600;">Novo caso recebido.</p>
  ${linha("Nome", caso.nome)}
  ${linha("E-mail", caso.email)}
  ${linha("Telefone", caso.telefone)}
  ${linha("Setor", caso.sector)}
  ${linha("Tipo de problema", caso.tipo_problema)}
  ${linha("Problema (formulário guiado)", caso.problema_tipo)}
  ${linha("Empresa visada", caso.empresa)}
  ${linha("Empresa parceira", caso.empresa_parceira)}
  <p style="margin:16px 0 0 0;"><strong>Descrição:</strong><br>${valor(caso.descricao, true)}</p>
  <p style="margin:20px 0 0 0;">
    <a href="${escaparHtml(link)}" style="color:#0A7A4F;">Ver caso no backoffice</a>
  </p>
</body>
</html>`;
}
