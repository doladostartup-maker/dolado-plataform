// DoLado — análise preliminar de uma comunicação recebida pela IA (fluxo).
//
// Sem I/O próprio: tudo vem de `deps` (implementação real em servidor.ts;
// falsas nos testes). Nunca lança e nunca muda o estado do caso: a mensagem
// já está guardada e o caso já está "Resposta em análise" antes de a IA
// correr. Qualquer falha (sem chave, API em baixo, orçamento, resposta
// inválida) fica registada e o backoffice mostra "Não foi possível gerar a
// análise automática. Faça a análise manualmente."

import type { MensagemIA } from "../ia/minimizacao.ts";
import { createHash } from "node:crypto";
import type { MotivoFalhaModelo, ResultadoModelo, UsoModelo } from "../rascunhoIA/gerar.ts";
import { construirContexto, type DadosAnalise } from "./contexto.ts";
import { PROMPT_SISTEMA, PROMPT_VERSAO, SCHEMA_RESPOSTA, SCHEMA_VERSAO, montarMensagem } from "./prompt.ts";
import { validarAnalise, type AnaliseIA } from "./validacao.ts";

export type OrigemAnalise = "automatico" | "manual";

export type DepsAnalise = {
  ativo(): boolean;
  iniciar(comunicacaoId: string, origem: OrigemAnalise, adminId: string | null, versoes: { prompt: string; schema: string }): Promise<string | null>;
  carregar(comunicacaoId: string): Promise<DadosAnalise | null>;
  orcamentoBloqueado(): Promise<boolean>;
  chamarModelo(pedido: { sistema: string; mensagem: MensagemIA; schema: Record<string, unknown> }): Promise<ResultadoModelo>;
  registarUso(uso: UsoModelo, ok: boolean): Promise<void>;
  concluir(analiseId: string, dados: { analise: AnaliseIA; contextoSha256: string; uso: UsoModelo }): Promise<void>;
  falhar(analiseId: string, dados: { motivo: string; detalhe?: string | null; contextoSha256?: string | null; uso?: UsoModelo | null }): Promise<void>;
  log(evento: Record<string, unknown>): void;
};

export type ResultadoAnalise =
  | { estado: "desativado" }
  | { estado: "ignorado" }
  | { estado: "falhou"; analiseId: string; motivo: MotivoFalhaModelo | string }
  | { estado: "gerado"; analiseId: string };

export function iniciarAnalise(comunicacaoId: string, origem: OrigemAnalise, adminId: string | null, deps: Pick<DepsAnalise, "iniciar">) {
  return deps.iniciar(comunicacaoId, origem, adminId, { prompt: PROMPT_VERSAO, schema: SCHEMA_VERSAO });
}

export async function gerarAnalise(
  comunicacaoId: string,
  { origem, adminId, analiseIniciada }: { origem: OrigemAnalise; adminId: string | null; analiseIniciada?: string },
  deps: DepsAnalise,
): Promise<ResultadoAnalise> {
  if (!deps.ativo()) return { estado: "desativado" };

  let analiseId: string | null;
  try {
    analiseId = analiseIniciada ?? (await iniciarAnalise(comunicacaoId, origem, adminId, deps));
  } catch (erro) {
    deps.log({ fase: "analise_ia", resultado: "erro_iniciar", detalhe: erro instanceof Error ? erro.message.slice(0, 160) : "erro" });
    return { estado: "ignorado" };
  }
  if (!analiseId) return { estado: "ignorado" };

  const falhar = async (dados: Parameters<DepsAnalise["falhar"]>[1]): Promise<ResultadoAnalise> => {
    deps.log({ fase: "analise_ia", resultado: "falhou", motivo: dados.motivo });
    await deps.falhar(analiseId, dados).catch(() => deps.log({ fase: "analise_ia", resultado: "erro_registar_falha" }));
    return { estado: "falhou", analiseId, motivo: dados.motivo };
  };

  try {
    const dados = await deps.carregar(comunicacaoId);
    if (!dados) return await falhar({ motivo: "comunicacao_inexistente" });
    if (await deps.orcamentoBloqueado()) return await falhar({ motivo: "orcamento_atingido" });

    const mensagem = montarMensagem(construirContexto(dados));
    const contextoSha256 = createHash("sha256").update(mensagem, "utf8").digest("hex");

    const chamada = await deps.chamarModelo({ sistema: PROMPT_SISTEMA, mensagem, schema: SCHEMA_RESPOSTA as unknown as Record<string, unknown> });
    if (chamada.uso) await deps.registarUso(chamada.uso, chamada.ok).catch(() => undefined);
    if (!chamada.ok) return await falhar({ motivo: chamada.motivo, detalhe: chamada.detalhe, contextoSha256, uso: chamada.uso });

    const v = validarAnalise(chamada.bruto, (dados.regras ?? []).map((g) => g.rule_id));
    if (!v.ok) return await falhar({ motivo: v.motivo, detalhe: v.detalhe, contextoSha256, uso: chamada.uso });

    await deps.concluir(analiseId, { analise: v.analise, contextoSha256, uso: chamada.uso });
    deps.log({ fase: "analise_ia", resultado: "gerado" });
    return { estado: "gerado", analiseId };
  } catch (erro) {
    return await falhar({ motivo: "erro_interno", detalhe: (erro instanceof Error ? erro.message : String(erro)).slice(0, 300) });
  }
}
