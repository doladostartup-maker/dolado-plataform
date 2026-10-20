"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { contaComEmailConfirmado } from "@/lib/auth";
import { CAMPO_ACEITA_TERMOS, VALOR_ACEITE } from "@/lib/consentimentoCompra";
import { TERMOS_VERSAO, TEXTO_ACEITACAO_ACESSO_PATROCINADO } from "@/lib/legal";
import { ROTA_ATIVAR_CODIGO } from "@/lib/acessoPatrocinado";
import { processarAvisosAcessoPatrocinado } from "@/lib/acessoPatrocinadoAvisos";
import {
  acessosPatrocinadosDisponiveis,
  ativarCodigoParaConta,
  dependenciasAcessoPatrocinado,
  type ResultadoAtivacaoCodigo,
} from "@/lib/acessoPatrocinadoServidor";
import { tAcessoPatrocinado } from "@/i18n/mensagens/acessoPatrocinado";
import { caminho, obterIdioma } from "@/i18n/servidor";

// Activação de um código de Protecção oferecida (Parceiro de Distribuição).
// Única porta de entrada: valida no servidor a aceitação dos Termos, a
// sessão e o e-mail confirmado; a validação do código, o limite de
// tentativas e a gravação são atómicos na base de dados
// (acesso_patrocinado_ativar). O browser só envia o código e a checkbox.
// Nada é criado no Stripe.

export type EstadoAtivacaoCodigo = { erro: string | null };

export async function ativarCodigoOferta(_: EstadoAtivacaoCodigo, form: FormData): Promise<EstadoAtivacaoCodigo> {
  const idioma = await obterIdioma();
  const t = tAcessoPatrocinado[idioma].ativar.motivos;
  if (!acessosPatrocinadosDisponiveis()) return { erro: t.indisponivel };
  const codigo = String(form.get("codigo") ?? "").trim();
  if (!codigo) return { erro: t.semCodigo };
  if (form.get(CAMPO_ACEITA_TERMOS) !== VALOR_ACEITE) return { erro: t.aceitarTermos };

  const conta = await contaComEmailConfirmado();
  if (!conta) redirect(await caminho(`/login?next=${encodeURIComponent(ROTA_ATIVAR_CODIGO)}`));
  if (!conta.emailConfirmado) return { erro: t.email_nao_confirmado };

  let r: ResultadoAtivacaoCodigo;
  try {
    r = await ativarCodigoParaConta({
      userId: conta.id,
      codigo,
      termosVersao: TERMOS_VERSAO,
      textoAceite: TEXTO_ACEITACAO_ACESSO_PATROCINADO,
    });
  } catch (erro) {
    console.error(JSON.stringify({ origem: "acesso_patrocinado_ativar", erro_codigo: (erro as { code?: string })?.code ?? "erro" }));
    return { erro: t.erro };
  }

  if (r.resultado === "ativado" || r.resultado === "ja_ativado") {
    if (r.resultado === "ativado") {
      // Aviso de activação logo a seguir (o job horário apanha-o se falhar aqui).
      const acessoId = r.id;
      after(async () => {
        const portalUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.dolado.pt";
        await processarAvisosAcessoPatrocinado(dependenciasAcessoPatrocinado(), portalUrl, { soAcesso: acessoId }).catch(
          () => undefined,
        );
      });
    }
    redirect(await caminho("/portal/contratos?oferta=ativada"));
  }
  return { erro: t[r.resultado] };
}
