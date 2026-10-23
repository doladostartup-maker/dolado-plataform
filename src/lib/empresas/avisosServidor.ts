// DoLado Empresas — envio dos avisos do ciclo de pagamento (servidor). Fase 5.
// Os avisos nascem na base de dados (empresa_avisos, um por organização,
// período e tipo — registados nas transições). Aqui: reserva (tentativas+1)
// → envio pela Brevo → enviado_em. Uma falha fica para a execução seguinte,
// até MAX_TENTATIVAS_AVISO; com mais de 3 dias, o aviso já não sai.
// Chamado pela rota interna (pg_cron, de hora a hora) e logo a seguir às
// acções do admin e do cliente.

import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmailBrevo } from "@/lib/email/brevo";
import { ASSUNTOS_AVISO_CICLO, montarHtmlAvisoCiclo, type TipoAvisoCiclo } from "@/lib/email/empresas";
import { emailDaConta } from "./contaServidor.ts";
import { MAX_TENTATIVAS_AVISO, avisoAindaValido, dataPorExtenso, precoSemIva, prazosDoVencimento } from "./ciclo.ts";

type Aviso = { id: string; organizacao_id: string; periodo_id: string | null; tipo: TipoAvisoCiclo; criado_em: string; tentativas: number };

export async function enviarAvisosEmpresas(limite = 50): Promise<{ enviados: number; falhados: number; ignorados: number }> {
  const admin = createAdminClient();
  const resultado = { enviados: 0, falhados: 0, ignorados: 0 };
  const { data, error } = await admin
    .from("empresa_avisos")
    .select("id, organizacao_id, periodo_id, tipo, criado_em, tentativas")
    .is("enviado_em", null)
    .is("ignorado_em", null)
    .lt("tentativas", MAX_TENTATIVAS_AVISO)
    .order("criado_em", { ascending: true })
    .limit(limite);
  if (error) throw new Error(`empresa_avisos.select: ${error.message}`);

  for (const aviso of (data ?? []) as Aviso[]) {
    if (!avisoAindaValido(aviso.criado_em)) {
      await admin.from("empresa_avisos").update({ ignorado_em: new Date().toISOString() }).eq("id", aviso.id);
      resultado.ignorados++;
      continue;
    }
    // Reserva: só quem sobe as tentativas a partir do valor lido envia.
    const { data: reservado } = await admin
      .from("empresa_avisos")
      .update({ tentativas: aviso.tentativas + 1 })
      .eq("id", aviso.id)
      .eq("tentativas", aviso.tentativas)
      .is("enviado_em", null)
      .select("id")
      .maybeSingle();
    if (!reservado) continue;

    try {
      const destino = await destinatarioEDados(aviso);
      if (!destino) {
        await admin.from("empresa_avisos").update({ ignorado_em: new Date().toISOString() }).eq("id", aviso.id);
        resultado.ignorados++;
        continue;
      }
      await enviarEmailBrevo(destino.email, ASSUNTOS_AVISO_CICLO[aviso.tipo], montarHtmlAvisoCiclo(aviso.tipo, destino.dados));
      await admin.from("empresa_avisos").update({ enviado_em: new Date().toISOString() }).eq("id", aviso.id);
      resultado.enviados++;
    } catch (e) {
      console.error(`[empresas] aviso ${aviso.tipo}:`, (e as { code?: string }).code ?? "erro");
      resultado.falhados++;
    }
  }
  return resultado;
}

async function destinatarioEDados(aviso: Aviso) {
  const admin = createAdminClient();
  const [{ data: org }, { data: membro }, { data: periodo }] = await Promise.all([
    admin.from("organizacoes").select("nome, acesso_consulta_ate, eliminacao_prevista_em").eq("id", aviso.organizacao_id).maybeSingle(),
    admin
      .from("organizacoes_membros")
      .select("utilizador_id")
      .eq("organizacao_id", aviso.organizacao_id)
      .is("removido_em", null)
      .maybeSingle(),
    aviso.periodo_id
      ? admin.from("empresa_periodos").select("inicio, fim, valor_cents, referencia_factura").eq("id", aviso.periodo_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!org || !membro) return null;
  const email = await emailDaConta(membro.utilizador_id as string);
  if (!email) return null;

  const prazos = periodo ? prazosDoVencimento(periodo.inicio as string) : null;
  return {
    email,
    dados: {
      nome: org.nome as string,
      periodo: periodo
        ? {
            inicio: dataPorExtenso(periodo.inicio as string),
            fim: dataPorExtenso(periodo.fim as string),
            valor: precoSemIva(periodo.valor_cents as number),
            referencia: (periodo.referencia_factura as string | null) ?? null,
          }
        : null,
      suspensaEm: prazos ? dataPorExtenso(prazos.suspensaEm) : undefined,
      canceladaEm: prazos ? dataPorExtenso(prazos.canceladaEm) : undefined,
      consultaAte: org.acesso_consulta_ate ? dataPorExtenso(String(org.acesso_consulta_ate).slice(0, 10)) : null,
      eliminacaoEm: org.eliminacao_prevista_em ? dataPorExtenso(org.eliminacao_prevista_em as string) : null,
    },
  };
}
