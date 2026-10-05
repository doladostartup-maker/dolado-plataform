// DoLado — geração da primeira sugestão do texto da reclamação (fluxo).
//
// Sem I/O próprio: tudo o que lê/escreve vem de `deps` (implementação real em
// src/lib/rascunhoIA/servidor.ts; falsas nos testes). Passos separados:
//   1. começar a geração (auditoria) — a base de dados recusa duplicados;
//   2. ler o caso e os dados do Monitor; selecionar as regras jurídicas;
//   3. construir o contexto (sem dados pessoais desnecessários);
//   4. chamar o modelo (só no servidor);
//   5. validar a resposta;
//   6. guardar a resposta e colocar a sugestão no texto do caso — sem nunca
//      destruir texto editado por uma pessoa, e sempre "por rever".
//
// Nunca lança: qualquer falha fica registada como "Rascunho IA não gerado"
// e o caso continua normalmente no backoffice (regra 3 do "Uso de IA").
// A sugestão nunca é enviada ao cliente nem marcada como revista aqui.

import { createHash } from "node:crypto";
import type { Fornecedor } from "../monitor/fornecedores.ts";
import { construirContexto, servicosDoCaso, type CasoParaRascunho, type ServicoMonitor } from "./contexto.ts";
import { PROMPT_SISTEMA, PROMPT_VERSAO, SCHEMA_RESPOSTA, SCHEMA_VERSAO, montarMensagem } from "./prompt.ts";
import { paraEnvio, selecionarRegras, type RegraEnviada, type RegraJuridica, type SeletorRegras } from "./regras.ts";
import { validarResposta, type RespostaRascunho } from "./validacao.ts";

export type OrigemGeracao = "automatico" | "manual";

export type UsoModelo = {
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  custoUsd: number;
  latenciaMs: number;
  requestId: string | null;
};

export type MotivoFalhaModelo = "api_nao_configurada" | "recusa" | "resposta_invalida" | "erro_api";

export type ResultadoModelo =
  | { ok: true; bruto: unknown; uso: UsoModelo }
  | { ok: false; motivo: MotivoFalhaModelo; uso: UsoModelo | null; detalhe?: string };

export type ResultadoAplicar = "aplicado" | "requer_confirmacao" | "bloqueado" | "ja_aplicado" | "invalido";

export type DadosConclusao = {
  resposta: RespostaRascunho;
  regrasEnviadas: RegraEnviada[];
  contextoSha256: string;
  uso: UsoModelo;
};

export type DadosFalha = {
  motivo: string;
  detalhe?: string | null;
  regrasEnviadas?: RegraEnviada[];
  contextoSha256?: string | null;
  uso?: UsoModelo | null;
};

export type DepsRascunho = {
  ativo(): boolean;
  iniciar(casoId: string, origem: OrigemGeracao, adminId: string | null, versoes: { prompt: string; schema: string }): Promise<string | null>;
  carregarCaso(casoId: string): Promise<CasoParaRascunho | null>;
  carregarServicos(utilizadorId: string): Promise<ServicoMonitor[]>;
  carregarFornecedores(): Promise<Fornecedor[]>;
  carregarRegras(): Promise<RegraJuridica[]>;
  orcamentoBloqueado(): Promise<boolean>;
  chamarModelo(pedido: { sistema: string; mensagem: string; schema: Record<string, unknown> }): Promise<ResultadoModelo>;
  registarUso(uso: UsoModelo, ok: boolean): Promise<void>;
  concluir(geracaoId: string, dados: DadosConclusao): Promise<void>;
  falhar(geracaoId: string, dados: DadosFalha): Promise<void>;
  aplicar(geracaoId: string, adminId: string | null): Promise<ResultadoAplicar>;
  hoje(): string;
  seletor?: SeletorRegras;
};

export type ResultadoGeracao =
  | { estado: "desativado" }
  | { estado: "ignorado" }
  | { estado: "falhou"; geracaoId: string; motivo: string }
  | { estado: "gerado"; geracaoId: string; aplicacao: ResultadoAplicar };

export function hashContexto(mensagem: string) {
  return createHash("sha256").update(mensagem, "utf8").digest("hex");
}

/** Regista o início de uma geração (null = já há uma em curso / não se aplica). */
export function iniciarGeracao(casoId: string, origem: OrigemGeracao, adminId: string | null, deps: Pick<DepsRascunho, "iniciar">) {
  return deps.iniciar(casoId, origem, adminId, { prompt: PROMPT_VERSAO, schema: SCHEMA_VERSAO });
}

export async function gerarRascunho(
  casoId: string,
  {
    origem,
    adminId,
    geracaoIniciada,
  }: {
    origem: OrigemGeracao;
    adminId: string | null;
    /** Geração já começada com iniciarGeracao() (pedido manual no backoffice). */
    geracaoIniciada?: string;
  },
  deps: DepsRascunho,
): Promise<ResultadoGeracao> {
  if (!deps.ativo()) return { estado: "desativado" };

  let geracaoId: string | null;
  try {
    geracaoId = geracaoIniciada ?? (await iniciarGeracao(casoId, origem, adminId, deps));
  } catch (erro) {
    console.error("[rascunho IA] não foi possível iniciar a geração:", erro instanceof Error ? erro.message : erro);
    return { estado: "ignorado" };
  }
  if (!geracaoId) return { estado: "ignorado" };

  const falhar = async (dados: DadosFalha): Promise<ResultadoGeracao> => {
    await deps.falhar(geracaoId, dados).catch((e) => console.error("[rascunho IA] falha ao registar o erro:", e));
    return { estado: "falhou", geracaoId, motivo: dados.motivo };
  };

  try {
    const caso = await deps.carregarCaso(casoId);
    if (!caso) return await falhar({ motivo: "caso_inexistente" });

    if (await deps.orcamentoBloqueado()) return await falhar({ motivo: "orcamento_atingido" });

    const [servicos, fornecedores, regras] = await Promise.all([
      caso.utilizador_id ? deps.carregarServicos(caso.utilizador_id) : Promise.resolve([]),
      deps.carregarFornecedores(),
      deps.carregarRegras(),
    ]);

    const seletor = deps.seletor ?? selecionarRegras;
    const regrasEnviadas = seletor({ setor: caso.sector, categoria: caso.problema_tipo }, regras, deps.hoje()).map(paraEnvio);
    const contexto = construirContexto(caso, servicosDoCaso(caso, servicos, fornecedores));
    const mensagem = montarMensagem(contexto, regrasEnviadas);
    const contextoSha256 = hashContexto(mensagem);

    const chamada = await deps.chamarModelo({ sistema: PROMPT_SISTEMA, mensagem, schema: SCHEMA_RESPOSTA as unknown as Record<string, unknown> });
    if (chamada.uso) await deps.registarUso(chamada.uso, chamada.ok).catch(() => undefined);
    if (!chamada.ok) {
      return await falhar({ motivo: chamada.motivo, detalhe: chamada.detalhe, regrasEnviadas, contextoSha256, uso: chamada.uso });
    }

    const validacao = validarResposta(chamada.bruto, regrasEnviadas);
    if (!validacao.ok) {
      return await falhar({ motivo: validacao.motivo, detalhe: validacao.detalhe, regrasEnviadas, contextoSha256, uso: chamada.uso });
    }

    await deps.concluir(geracaoId, { resposta: validacao.resposta, regrasEnviadas, contextoSha256, uso: chamada.uso });
    // Sem confirmação: nunca substitui texto editado por uma pessoa.
    const aplicacao = await deps.aplicar(geracaoId, adminId).catch((): ResultadoAplicar => "invalido");
    return { estado: "gerado", geracaoId, aplicacao };
  } catch (erro) {
    const detalhe = (erro instanceof Error ? erro.message : String(erro)).slice(0, 300);
    console.error("[rascunho IA] erro inesperado:", detalhe);
    return await falhar({ motivo: "erro_interno", detalhe });
  }
}
