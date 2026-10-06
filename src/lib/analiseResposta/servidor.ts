import { after } from "next/server";
import { MODELO_ANALISES, PARAMETROS_ANALISE } from "@/lib/claude";
import { chamarClaudeJson } from "@/lib/claudeJson";
import { createAdminClient } from "@/lib/supabase/admin";
import { avisosAtravessados, estadoOrcamento, lerTetoOrcamentoUsd } from "@/lib/monitor/custos";
import { avisarAdminIA, gastoApiUsd } from "@/lib/orcamentoClaude";
import type { ComunicacaoParaAnalise, DadosAnalise } from "./contexto";
import { gerarAnalise, iniciarAnalise, type DepsAnalise, type ResultadoAnalise } from "./gerar";
import { paraEnvio, selecionarRegras, type RegraJuridica } from "@/lib/rascunhoIA/regras";

// DoLado — dependências reais da análise preliminar das respostas (service
// role). Quem chama já validou o direito: o webhook (evento confirmado
// junto da Brevo), o registo manual ou o pedido do admin (requireAdmin).
//
// Interruptor: só corre com ANALISE_RESPOSTA_IA_ATIVO=1. Sem ele, a mensagem
// fica guardada e o caso "Resposta em análise" — a análise é feita à mão,
// como sempre. Orçamento partilhado com o Monitor e o rascunho.

export function analiseIAAtiva() {
  return process.env.ANALISE_RESPOSTA_IA_ATIVO === "1";
}

function falhou(contexto: string, error: { message: string } | null) {
  if (error) throw new Error(`${contexto}: ${error.message}`);
}

const COLUNAS_COMUNICACAO =
  "id, caso_id, canal, remetente_email, assunto, corpo_apresentacao, corpo_texto, data_mensagem, recebida_em, automatica";

export function criarDependenciasAnalise(): DepsAnalise {
  const admin = createAdminClient();
  const teto = lerTetoOrcamentoUsd(process.env.ANTHROPIC_ORCAMENTO_USD);
  let gastoAntes = 0;
  const avisar = (assunto: string, texto: string) => avisarAdminIA("Análise IA", assunto, texto);

  return {
    ativo: analiseIAAtiva,
    log: (evento) => console.info(JSON.stringify({ origem: "analise_resposta", ...evento })),

    async iniciar(comunicacaoId, origem, adminId, versoes) {
      const { data, error } = await admin.rpc("analise_ia_iniciar", {
        p_comunicacao_id: comunicacaoId,
        p_origem: origem,
        p_admin: adminId,
        p_prompt_versao: versoes.prompt,
        p_schema_versao: versoes.schema,
      });
      falhou("analise_ia_iniciar", error);
      return (data as string | null) ?? null;
    },

    async carregar(comunicacaoId): Promise<DadosAnalise | null> {
      const { data: com, error } = await admin.from("casos_comunicacoes_recebidas").select(COLUNAS_COMUNICACAO).eq("id", comunicacaoId).maybeSingle();
      falhou("casos_comunicacoes_recebidas", error);
      if (!com) return null;
      const casoId = com.caso_id as string;
      const [caso, enviadas, anteriores, anexos, decisoes, regras] = await Promise.all([
        admin.from("casos").select("nome, sector, empresa, problema_tipo, tipo_problema, descricao, created_at").eq("id", casoId).single(),
        admin
          .from("casos_textos_envios")
          .select("enviado_em, canal, referencia, casos_textos(conteudo)")
          .eq("caso_id", casoId)
          .lte("enviado_em", com.recebida_em as string)
          .order("enviado_em", { ascending: false })
          .limit(5),
        admin
          .from("casos_comunicacoes_recebidas")
          .select(COLUNAS_COMUNICACAO)
          .eq("caso_id", casoId)
          .lt("recebida_em", com.recebida_em as string)
          .neq("estado_analise", "sem_acao")
          .order("recebida_em", { ascending: false })
          .limit(3),
        admin.from("casos_comunicacoes_anexos").select("comunicacao_id, tipo_mime, estado").eq("caso_id", casoId),
        admin.from("casos_analises").select("comunicacao_id, decisao").eq("caso_id", casoId),
        admin.from("regras_juridicas").select("*").eq("ativa", true),
      ]);
      falhou("casos", caso.error);
      const anexosDe = (id: string) => (anexos.data ?? []).filter((a) => a.comunicacao_id === id).map((a) => ({ tipo_mime: a.tipo_mime as string | null, estado: a.estado as string }));
      const paraAnalise = (c: Record<string, unknown>): ComunicacaoParaAnalise => ({
        ...(c as unknown as ComunicacaoParaAnalise),
        anexos: anexosDe(c.id as string),
      });
      const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
      const dadosCaso = caso.data as DadosAnalise["caso"];
      return {
        caso: dadosCaso,
        regras: selecionarRegras({ setor: dadosCaso.sector, categoria: dadosCaso.problema_tipo }, (regras.data ?? []) as RegraJuridica[], hoje).map(paraEnvio),
        comunicacao: paraAnalise(com),
        enviadas: (enviadas.data ?? []).flatMap((e) => {
          const texto = (Array.isArray(e.casos_textos) ? e.casos_textos[0] : e.casos_textos) as { conteudo: string } | null;
          return texto ? [{ conteudo: texto.conteudo, enviado_em: e.enviado_em as string, canal: e.canal as string, referencia: (e.referencia as string | null) ?? null }] : [];
        }),
        anteriores: (anteriores.data ?? []).map((a) => ({
          ...paraAnalise(a),
          decisao: ((decisoes.data ?? []).find((d) => d.comunicacao_id === a.id)?.decisao as string | undefined) ?? null,
        })),
      };
    },

    async orcamentoBloqueado() {
      gastoAntes = await gastoApiUsd(admin);
      const bloqueado = estadoOrcamento(gastoAntes, teto).bloqueado;
      if (bloqueado) await avisar("Orçamento da Claude API atingido", `A análise automática não foi gerada: o gasto (${gastoAntes.toFixed(2)} USD) atingiu o teto de ${teto} USD.`);
      return bloqueado;
    },

    chamarModelo: ({ sistema, mensagem, schema }) =>
      chamarClaudeJson({
        modelo: MODELO_ANALISES,
        maxTokens: PARAMETROS_ANALISE.max_tokens,
        effort: PARAMETROS_ANALISE.output_config.effort,
        sistema,
        mensagem,
        schema,
        contexto: "analise",
      }),

    async registarUso(uso, ok) {
      await admin.from("uso_api_claude").insert({
        funcionalidade: "analise_resposta",
        modelo: uso.modelo,
        tokens_entrada: uso.tokensEntrada,
        tokens_saida: uso.tokensSaida,
        custo_estimado_usd: uso.custoUsd,
        latencia_ms: uso.latenciaMs,
        estado: ok ? "sucesso" : "erro",
        request_id: uso.requestId,
      });
      for (const pct of avisosAtravessados(gastoAntes, gastoAntes + uso.custoUsd, teto)) {
        await avisar(`Orçamento da Claude API a ${pct}%`, `Gasto estimado: ${(gastoAntes + uso.custoUsd).toFixed(4)} USD de ${teto} USD.`);
      }
    },

    async concluir(analiseId, { analise, contextoSha256, uso }) {
      const { error } = await admin
        .from("casos_analises_ia")
        .update({
          estado: "gerado",
          resposta: analise,
          contexto_sha256: contextoSha256,
          modelo: uso.modelo,
          tokens_entrada: uso.tokensEntrada,
          tokens_saida: uso.tokensSaida,
          custo_estimado_usd: uso.custoUsd,
          latencia_ms: uso.latenciaMs,
          request_id: uso.requestId,
          concluido_em: new Date().toISOString(),
        })
        .eq("id", analiseId)
        .eq("estado", "a_gerar");
      falhou("casos_analises_ia (concluir)", error);
    },

    async falhar(analiseId, { motivo, detalhe, contextoSha256, uso }) {
      const { error } = await admin
        .from("casos_analises_ia")
        .update({
          estado: "falhou",
          erro: motivo.slice(0, 60),
          erro_detalhe: detalhe ? detalhe.slice(0, 500) : null,
          contexto_sha256: contextoSha256 ?? null,
          modelo: uso?.modelo ?? null,
          tokens_entrada: uso?.tokensEntrada ?? null,
          tokens_saida: uso?.tokensSaida ?? null,
          custo_estimado_usd: uso?.custoUsd ?? null,
          latencia_ms: uso?.latenciaMs ?? null,
          request_id: uso?.requestId ?? null,
          concluido_em: new Date().toISOString(),
        })
        .eq("id", analiseId)
        .eq("estado", "a_gerar");
      falhou("casos_analises_ia (falhar)", error);
    },
  };
}

export function gerarAnaliseIA(comunicacaoId: string, opcoes: { origem: "automatico" | "manual"; adminId: string | null; analiseIniciada?: string }): Promise<ResultadoAnalise> {
  return gerarAnalise(comunicacaoId, opcoes, criarDependenciasAnalise());
}

/** Depois de guardar a mensagem: análise em segundo plano (nunca atrasa nem bloqueia o registo). */
export function agendarAnaliseIA(comunicacaoId: string) {
  if (!analiseIAAtiva()) return;
  try {
    after(() => gerarAnaliseIA(comunicacaoId, { origem: "automatico", adminId: null }).then(() => undefined));
  } catch (erro) {
    console.error("[análise IA] não foi possível agendar:", erro instanceof Error ? erro.message : erro);
  }
}

/** Pedido manual no backoffice (admin já validado). null = já há uma análise em curso. */
export async function pedirAnaliseIAManual(comunicacaoId: string, adminId: string): Promise<string | null> {
  const deps = criarDependenciasAnalise();
  const analiseId = await iniciarAnalise(comunicacaoId, "manual", adminId, deps);
  if (analiseId) after(() => gerarAnalise(comunicacaoId, { origem: "manual", adminId, analiseIniciada: analiseId }, deps).then(() => undefined));
  return analiseId;
}
