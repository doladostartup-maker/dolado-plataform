"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { contaParticularComEmailConfirmado } from "@/lib/auth";
import { CAMPO_ACEITA_TERMOS, VALOR_ACEITE } from "@/lib/consentimentoCompra";
import { TERMOS_VERSAO, TEXTO_ACEITACAO_PROTECAO_GRATUITA } from "@/lib/legal";
import { ROTA_EXPERIMENTAR } from "@/lib/protecaoGratuita";
import { processarProtecaoGratuita } from "@/lib/protecaoGratuitaAvisos";
import {
  ativarParaConta,
  dependenciasProtecaoGratuita,
  protecaoGratuitaDisponivel,
  type ResultadoAtivacao,
} from "@/lib/protecaoGratuitaServidor";
import { tProtecaoGratuita } from "@/i18n/mensagens/protecaoGratuita";
import { caminho, obterIdioma } from "@/i18n/servidor";

// Ativação da Proteção gratuita (30 dias). Única porta de entrada: valida
// no servidor a aceitação dos Termos, a sessão e o e-mail confirmado; a
// elegibilidade e a gravação são atómicas na base de dados
// (protecao_gratuita_ativar, idempotente). O browser só envia a checkbox e
// a origem (valores fixos, só para métricas). Nada é criado no Stripe.

export type EstadoAtivacao = { erro: string | null };

export async function ativarProtecaoGratuita(_: EstadoAtivacao, form: FormData): Promise<EstadoAtivacao> {
  const idioma = await obterIdioma();
  const t = tProtecaoGratuita[idioma].ativar.motivos;
  if (!protecaoGratuitaDisponivel()) return { erro: t.indisponivel };
  if (form.get(CAMPO_ACEITA_TERMOS) !== VALOR_ACEITE) return { erro: t.aceitarTermos };

  const conta = await contaParticularComEmailConfirmado("experimentar-protecao:acao");
  if (!conta) redirect(await caminho(`/login?next=${encodeURIComponent(ROTA_EXPERIMENTAR)}`));
  if (!conta.emailConfirmado || !conta.email) return { erro: t.email_nao_confirmado };

  let r: ResultadoAtivacao;
  try {
    r = await ativarParaConta({
      userId: conta.id,
      email: conta.email,
      origem: String(form.get("origem") ?? ""),
      termosVersao: TERMOS_VERSAO,
      textoAceite: TEXTO_ACEITACAO_PROTECAO_GRATUITA,
    });
  } catch (erro) {
    console.error(JSON.stringify({ origem: "protecao_gratuita_ativar", erro_codigo: (erro as { code?: string })?.code ?? "erro" }));
    return { erro: t.erro };
  }

  if (r.resultado === "ativada" || r.resultado === "ativa") {
    if (r.resultado === "ativada") {
      // E-mail do dia 0 logo a seguir (o job horário apanha-o se falhar aqui).
      const gratuitaId = r.id;
      after(async () => {
        const portalUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.dolado.pt";
        await processarProtecaoGratuita(dependenciasProtecaoGratuita(portalUrl), portalUrl, {
          soGratuita: gratuitaId,
          semManutencao: true,
        }).catch(() => undefined);
      });
    }
    redirect(await caminho(`/portal/contratos?gratuita=${r.resultado === "ativada" ? "ativada" : "ativa"}`));
  }
  return { erro: t[r.resultado] };
}
