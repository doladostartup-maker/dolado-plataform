import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { avisarAdminIA, gastoApiUsd } from "@/lib/orcamentoClaude";
import { avisosAtravessados, estadoOrcamento, lerTetoOrcamentoUsd } from "@/lib/monitor/custos";
import type { Fornecedor } from "@/lib/monitor/fornecedores";
import { chamarClaudeRascunho } from "./claude";
import type { CasoParaRascunho, FaturaMonitor, ServicoMonitor } from "./contexto";
import { gerarRascunho, iniciarGeracao, type DepsRascunho, type FinalidadeGeracao, type OrigemGeracao, type ResultadoAplicar, type ResultadoGeracao } from "./gerar";
import type { RegraJuridica } from "./regras";

// DoLado — dependências reais da geração da sugestão do texto (service
// role). Quem chama tem de ter validado antes o direito: o próprio servidor
// logo a seguir a criar o caso, ou o admin (requireAdmin) no backoffice.
//
// Interruptor: só corre com RASCUNHO_IA_ATIVO=1 (Clever Cloud). Sem ele, o
// caso segue o caminho manual de sempre. Partilha o orçamento da Claude API
// do piloto (ANTHROPIC_ORCAMENTO_USD) com o Monitor de Proteção.

export function rascunhoIAAtivo() {
  return process.env.RASCUNHO_IA_ATIVO === "1";
}

function hojeLisboa() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

const avisarAdmin = (assunto: string, texto: string) => avisarAdminIA("Rascunho IA", assunto, texto);

function falhou(contexto: string, error: { message: string } | null) {
  if (error) throw new Error(`${contexto}: ${error.message}`);
}

export function criarDependenciasRascunho(): DepsRascunho {
  const admin = createAdminClient();
  const teto = lerTetoOrcamentoUsd(process.env.ANTHROPIC_ORCAMENTO_USD);
  let gastoAntes = 0;

  return {
    ativo: rascunhoIAAtivo,
    hoje: hojeLisboa,

    async iniciar(casoId, origem, adminId, versoes, finalidade = "reclamacao") {
      const { data, error } = await admin.rpc("rascunho_ia_iniciar", {
        p_caso_id: casoId,
        p_origem: origem,
        p_admin: adminId,
        p_prompt_versao: versoes.prompt,
        p_schema_versao: versoes.schema,
        p_finalidade: finalidade,
      });
      falhou("rascunho_ia_iniciar", error);
      return (data as string | null) ?? null;
    },

    async carregarCaso(casoId) {
      const { data, error } = await admin
        .from("casos")
        .select("id, utilizador_id, nome, sector, empresa, problema_tipo, tipo_problema, descricao, momento_cliente, data_fim_fidelidade, created_at")
        .eq("id", casoId)
        .maybeSingle<CasoParaRascunho>();
      falhou("casos", error);
      return data ?? null;
    },

    async carregarSeguimento(casoId) {
      const [envios, recebidas, analises] = await Promise.all([
        admin.from("casos_textos_envios").select("enviado_em, casos_textos(conteudo)").eq("caso_id", casoId).order("enviado_em", { ascending: false }).limit(2),
        admin
          .from("casos_comunicacoes_recebidas")
          .select("corpo_apresentacao, corpo_texto, data_mensagem, recebida_em")
          .eq("caso_id", casoId)
          .neq("estado_analise", "sem_acao")
          .order("recebida_em", { ascending: false })
          .limit(1),
        admin.from("casos_analises").select("resumo").eq("caso_id", casoId).not("resumo", "is", null).order("created_at", { ascending: false }).limit(1),
      ]);
      falhou("casos_textos_envios", envios.error);
      const r = recebidas.data?.[0];
      return {
        enviadas: (envios.data ?? []).flatMap((e) => {
          const t = (Array.isArray(e.casos_textos) ? e.casos_textos[0] : e.casos_textos) as { conteudo: string } | null;
          return t ? [{ conteudo: t.conteudo, enviado_em: e.enviado_em as string }] : [];
        }),
        ultimaResposta: r ? { texto: (r.corpo_apresentacao ?? r.corpo_texto) as string | null, data: (r.data_mensagem ?? r.recebida_em) as string | null } : null,
        analise: (analises.data?.[0]?.resumo as string | undefined) ?? null,
      };
    },

    async carregarServicos(utilizadorId) {
      const { data: servicos, error } = await admin
        .from("contratos_monitorizados")
        .select(
          "id, setor, fornecedor, servico, data_assinatura, data_ativacao, data_inicio, duracao_fidelizacao_meses, data_fim_fidelizacao, tipo_fidelizacao, mensalidade_cents, descricao_promocao, data_inicio_promocao, data_fim_promocao, desconto_promocao_cents, cessacao_operador_cents, cessacao_operador_data, servicos_incluidos",
        )
        .eq("utilizador_id", utilizadorId)
        .is("desativado_em", null);
      falhou("contratos_monitorizados", error);
      if (!servicos?.length) return [];
      const { data: faturas, error: erroFaturas } = await admin
        .from("faturas_monitor")
        .select("contrato_id, data_emissao, periodo_inicio, periodo_fim, total_cents, recorrente_cents, pontual_cents, descontos_cents, mensalidade_lida_cents, linhas")
        .in("contrato_id", servicos.map((s) => s.id))
        .order("periodo_fim", { ascending: false, nullsFirst: false })
        .limit(60);
      falhou("faturas_monitor", erroFaturas);
      return servicos.map((s) => ({
        ...(s as Omit<ServicoMonitor, "faturas">),
        faturas: ((faturas ?? []) as FaturaMonitor[]).filter((f) => f.contrato_id === s.id),
      }));
    },

    async carregarFornecedores() {
      const { data } = await admin.from("fornecedores").select("id, nome_comercial, nome_legal, aliases").eq("ativo", true);
      return (data ?? []) as Fornecedor[];
    },

    async carregarRegras() {
      const { data, error } = await admin.from("regras_juridicas").select("*").eq("ativa", true);
      falhou("regras_juridicas", error);
      return (data ?? []) as RegraJuridica[];
    },

    async orcamentoBloqueado() {
      gastoAntes = await gastoApiUsd(admin);
      const bloqueado = estadoOrcamento(gastoAntes, teto).bloqueado;
      if (bloqueado) await avisarAdmin("Orçamento da Claude API atingido", `A sugestão do texto não foi gerada: o gasto (${gastoAntes.toFixed(2)} USD) atingiu o teto de ${teto} USD.`);
      return bloqueado;
    },

    chamarModelo: chamarClaudeRascunho,

    async registarUso(uso, ok) {
      await admin.from("uso_api_claude").insert({
        funcionalidade: "rascunho_reclamacao",
        modelo: uso.modelo,
        tokens_entrada: uso.tokensEntrada,
        tokens_saida: uso.tokensSaida,
        custo_estimado_usd: uso.custoUsd,
        latencia_ms: uso.latenciaMs,
        estado: ok ? "sucesso" : "erro",
        request_id: uso.requestId,
      });
      for (const pct of avisosAtravessados(gastoAntes, gastoAntes + uso.custoUsd, teto)) {
        await avisarAdmin(`Orçamento da Claude API a ${pct}%`, `Gasto estimado: ${(gastoAntes + uso.custoUsd).toFixed(4)} USD de ${teto} USD.`);
      }
    },

    async concluir(geracaoId, { resposta, regrasEnviadas, contextoSha256, uso }) {
      const { error } = await admin
        .from("casos_rascunhos_ia")
        .update({
          estado: "gerado",
          resposta,
          confianca: resposta.confidence,
          regras_enviadas: regrasEnviadas,
          regras_usadas: resposta.legal_basis.map((b) => b.rule_id),
          contexto_sha256: contextoSha256,
          modelo: uso.modelo,
          tokens_entrada: uso.tokensEntrada,
          tokens_saida: uso.tokensSaida,
          custo_estimado_usd: uso.custoUsd,
          latencia_ms: uso.latenciaMs,
          request_id: uso.requestId,
          concluido_em: new Date().toISOString(),
        })
        .eq("id", geracaoId)
        .eq("estado", "a_gerar");
      falhou("casos_rascunhos_ia (concluir)", error);
    },

    async falhar(geracaoId, { motivo, detalhe, regrasEnviadas, contextoSha256, uso }) {
      const { error } = await admin
        .from("casos_rascunhos_ia")
        .update({
          estado: "falhou",
          erro: motivo.slice(0, 60),
          erro_detalhe: detalhe ? detalhe.slice(0, 500) : null,
          regras_enviadas: regrasEnviadas ?? [],
          contexto_sha256: contextoSha256 ?? null,
          modelo: uso?.modelo ?? null,
          tokens_entrada: uso?.tokensEntrada ?? null,
          tokens_saida: uso?.tokensSaida ?? null,
          custo_estimado_usd: uso?.custoUsd ?? null,
          latencia_ms: uso?.latenciaMs ?? null,
          request_id: uso?.requestId ?? null,
          concluido_em: new Date().toISOString(),
        })
        .eq("id", geracaoId)
        .eq("estado", "a_gerar");
      falhou("casos_rascunhos_ia (falhar)", error);
    },

    async aplicar(geracaoId, adminId) {
      return aplicarRascunhoIA(geracaoId, adminId, false);
    },
  };
}

/** Coloca uma sugestão no texto do caso (regras em texto_aplicar_rascunho_ia). */
export async function aplicarRascunhoIA(geracaoId: string, adminId: string | null, substituir: boolean): Promise<ResultadoAplicar> {
  const { data, error } = await createAdminClient().rpc("texto_aplicar_rascunho_ia", {
    p_rascunho_id: geracaoId,
    p_admin: adminId,
    p_substituir: substituir,
  });
  if (error) return "invalido";
  return ((data as { resultado?: ResultadoAplicar } | null)?.resultado ?? "invalido") as ResultadoAplicar;
}

export function gerarRascunhoIA(
  casoId: string,
  opcoes: { origem: OrigemGeracao; adminId: string | null; geracaoIniciada?: string },
): Promise<ResultadoGeracao> {
  return gerarRascunho(casoId, opcoes, criarDependenciasRascunho());
}

/**
 * Pedido manual (backoffice, admin já validado): regista o início já, para a
 * página mostrar "A gerar…", e corre a geração depois da resposta.
 * null = já havia uma geração em curso para este caso.
 */
export async function pedirRascunhoIAManual(
  casoId: string,
  adminId: string,
  finalidade: FinalidadeGeracao = "reclamacao",
): Promise<string | null> {
  const deps = criarDependenciasRascunho();
  const geracaoId = await iniciarGeracao(casoId, "manual", adminId, deps, finalidade);
  if (geracaoId) {
    after(() => gerarRascunho(casoId, { origem: "manual", adminId, geracaoIniciada: geracaoId, finalidade }, deps).then(() => undefined));
  }
  return geracaoId;
}

/**
 * Logo a seguir a criar um caso: agenda a geração para depois da resposta
 * (after()). A criação do caso nunca espera pela IA nem falha por causa
 * dela. Fora de um pedido do Next.js (ex.: testes), não faz nada.
 */
export function agendarRascunhoIA(casoId: string | null | undefined) {
  if (!casoId || !rascunhoIAAtivo()) return;
  try {
    after(() => gerarRascunhoIA(casoId, { origem: "automatico", adminId: null }).then(() => undefined));
  } catch (erro) {
    console.error("[rascunho IA] não foi possível agendar a geração:", erro instanceof Error ? erro.message : erro);
  }
}
