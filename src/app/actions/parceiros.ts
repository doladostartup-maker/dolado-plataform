"use server";

import { after } from "next/server";
import { ADMIN_EMAIL, enviarEmailBrevo } from "@/lib/email/brevo";
import { escaparHtml } from "@/lib/email/textoRevisao";
import { avisoAdminCandidatura, montarEmailCandidaturaRecebida } from "@/lib/email/parceiros";
import { CANDIDATURA_PARCEIROS_VERSAO, TEXTO_ACEITACAO_CANDIDATURA_PARCEIROS } from "@/lib/legal";
import { lerCandidatura, parceirosAtivos } from "@/lib/parceiros/regras";
import { criarCandidatura } from "@/lib/parceiros/servidor";
import { tParceiros } from "@/i18n/mensagens/parceiros";
import { obterIdioma } from "@/i18n/servidor";

// Candidatura ao Programa de Parceiros (/parceiros). Sem sessão: a forma é
// validada aqui, o limite (3 por e-mail em 24 h, chave pseudonimizada) e a
// gravação na base de dados (parceiro_candidatura_criar). O texto aceite
// gravado é sempre o português (prova). E-mails depois da resposta: ao
// candidato (confirmação) e ao admin (sem o texto livre).

export type EstadoCandidatura = { tipo: "inicio" } | { tipo: "enviada" } | { tipo: "erro"; mensagem: string };

export async function enviarCandidaturaParceiro(_: EstadoCandidatura, form: FormData): Promise<EstadoCandidatura> {
  const idioma = await obterIdioma();
  const t = tParceiros[idioma].candidatura.erros;
  if (!parceirosAtivos()) return { tipo: "erro", mensagem: t.indisponivel };

  const lido = lerCandidatura((n) => form.get(n));
  if (!lido.ok) return { tipo: "erro", mensagem: t[lido.erro] };

  let resultado: "criada" | "limite";
  try {
    resultado = await criarCandidatura(
      lido.candidatura,
      { versao: CANDIDATURA_PARCEIROS_VERSAO, texto: TEXTO_ACEITACAO_CANDIDATURA_PARCEIROS },
      idioma,
    );
  } catch (erro) {
    console.error(JSON.stringify({ origem: "parceiros_candidatura", erro_codigo: (erro as { code?: string })?.code ?? "erro" }));
    return { tipo: "erro", mensagem: t.erro };
  }
  if (resultado === "limite") return { tipo: "erro", mensagem: t.limite };

  const { email, tipo, empresa } = lido.candidatura;
  after(async () => {
    const recebida = montarEmailCandidaturaRecebida(idioma);
    await enviarEmailBrevo(email, recebida.assunto, recebida.html, recebida.texto).catch(() => undefined);
    const aviso = avisoAdminCandidatura({ tipo, temEmpresa: !!empresa });
    await enviarEmailBrevo(ADMIN_EMAIL, aviso.assunto, `<p>${escaparHtml(aviso.texto)}</p>`, aviso.texto).catch(() => undefined);
  });
  return { tipo: "enviada" };
}
