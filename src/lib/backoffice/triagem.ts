// Triagem do backoffice: estado do caso, próxima ação e prazos, para a equipa.
// Só apresentação (sem I/O): os valores de casos.status e de
// casos_textos.estado não mudam, nem as regras que os alteram (Server Actions
// e funções da base de dados). A próxima ação é uma indicação para o operador;
// quem decide o que é permitido continua a ser a base de dados.

import { diasUteisRestantes, formatarDiasRestantes, horasUteisDesdeCriacao } from "../diasUteis.ts";
import type { EstadoTexto } from "../textoCaso.ts";

/**
 * Tons de estado do backoffice. Poucas cores, sempre com texto:
 * acao (precisa da DoLado agora), erro, aviso (prazo/atenção), bloqueado,
 * curso (a decorrer), info, sucesso, neutro.
 */
export type TomBackoffice = "acao" | "erro" | "aviso" | "bloqueado" | "curso" | "info" | "sucesso" | "neutro";

/** Valores de casos.status (a base de dados não muda). */
export const ESTADOS_CASO = [
  "Novo",
  "Em investigação",
  "Aguardando operador",
  "Aguardando decisão cliente",
  "Resolvido",
  "Bloqueado",
] as const;

export const ESTADOS_FINAIS = ["Resolvido", "Bloqueado"];

const ESTADO_CASO: Record<string, { rotulo: string; tom: TomBackoffice }> = {
  Novo: { rotulo: "Novo", tom: "info" },
  "Em investigação": { rotulo: "Em investigação", tom: "curso" },
  "Aguardando operador": { rotulo: "A aguardar o operador", tom: "curso" },
  "Aguardando decisão cliente": { rotulo: "A aguardar decisão do cliente", tom: "aviso" },
  Resolvido: { rotulo: "Resolvido", tom: "sucesso" },
  Bloqueado: { rotulo: "Bloqueado / escalada", tom: "bloqueado" },
};

export function estadoCaso(status: string) {
  return ESTADO_CASO[status] ?? { rotulo: status, tom: "neutro" as TomBackoffice };
}

export const ESTADO_TEXTO_TOM: Record<EstadoTexto, TomBackoffice> = {
  rascunho: "neutro",
  aguardando_aprovacao: "curso",
  alteracoes_solicitadas: "aviso",
  autorizado: "sucesso",
  enviado: "sucesso",
  substituido: "neutro",
};

export type TextoResumo = {
  estado: EstadoTexto;
  origem: "equipa" | "ia";
  revisto_em: string | null;
  versao: number;
};

export type CasoTriagem = {
  status: string;
  email?: string | null;
  created_at?: string | null;
  primeira_resposta_em?: string | null;
  data_envio_reclamacao?: string | null;
  data_fim_fidelidade?: string | null;
  /** Versão mais recente do texto (null: ainda não há texto). */
  texto?: TextoResumo | null;
};

export type ProximaAcao = {
  /** Verbo curto (botão/linha da fila). */
  rotulo: string;
  /** Uma frase com o contexto. */
  descricao: string;
  tom: TomBackoffice;
  /** A próxima ação é da DoLado (true) ou de terceiros (cliente, empresa). */
  interna: boolean;
  /** De quem se espera o próximo passo (null: caso terminado). */
  aguarda: "dolado" | "cliente" | "empresa" | null;
  /** Secção do detalhe do caso onde a ação se faz. */
  ancora: "texto" | "envio" | "decisao" | "dados" | null;
};

/** Próxima ação de um caso, a partir do estado e do texto em curso. */
export function proximaAcao(c: CasoTriagem): ProximaAcao {
  if (c.status === "Resolvido") {
    return { rotulo: "Concluído", descricao: "Caso resolvido. Nada a fazer.", tom: "sucesso", interna: false, aguarda: null, ancora: null };
  }
  if (c.status === "Bloqueado") {
    return {
      rotulo: "Bloqueado / escalada",
      descricao: "O cliente recusou a oferta ou o caso foi escalado. Rever o seguimento.",
      tom: "bloqueado",
      interna: false,
      aguarda: null,
      ancora: "dados",
    };
  }
  if (c.status === "Aguardando decisão cliente") {
    return {
      rotulo: "À espera da decisão do cliente",
      descricao: "Registar a decisão quando o cliente responder à oferta.",
      tom: "curso",
      interna: false,
      aguarda: "cliente",
      ancora: "decisao",
    };
  }

  const t = c.texto ?? null;
  if (!t) {
    return {
      rotulo: c.status === "Novo" ? "Analisar e preparar texto" : "Preparar texto",
      descricao: "Ainda não há texto da reclamação.",
      tom: "acao",
      interna: true, aguarda: "dolado",
      ancora: "texto",
    };
  }

  switch (t.estado) {
    case "rascunho":
      if (t.origem === "ia" && !t.revisto_em) {
        return {
          rotulo: "Rever sugestão da IA",
          descricao: `Versão ${t.versao} sugerida pela IA, ainda não revista por uma pessoa.`,
          tom: "acao",
          interna: true, aguarda: "dolado",
          ancora: "texto",
        };
      }
      if (!c.email) {
        return {
          rotulo: "Caso sem e-mail",
          descricao: "O texto não pode ser enviado ao cliente para revisão sem e-mail.",
          tom: "erro",
          interna: true, aguarda: "dolado",
          ancora: "dados",
        };
      }
      return {
        rotulo: "Enviar texto ao cliente",
        descricao: `Versão ${t.versao} pronta para a revisão do cliente.`,
        tom: "acao",
        interna: true, aguarda: "dolado",
        ancora: "texto",
      };
    case "alteracoes_solicitadas":
      return {
        rotulo: "Rever pedido de alterações",
        descricao: `O cliente pediu alterações à versão ${t.versao}.`,
        tom: "acao",
        interna: true, aguarda: "dolado",
        ancora: "texto",
      };
    case "aguardando_aprovacao":
      return {
        rotulo: "À espera da aprovação do cliente",
        descricao: `Versão ${t.versao} enviada ao cliente para revisão.`,
        tom: "curso",
        interna: false,
        aguarda: "cliente",
        ancora: "texto",
      };
    case "autorizado":
      return {
        rotulo: "Enviar reclamação",
        descricao: `O cliente autorizou a versão ${t.versao}. Enviar e registar o envio.`,
        tom: "acao",
        interna: true, aguarda: "dolado",
        ancora: "texto",
      };
    case "enviado":
      return {
        rotulo: "À espera da resposta da empresa",
        descricao: `Reclamação enviada (versão ${t.versao}).`,
        tom: "curso",
        interna: false,
        aguarda: "empresa",
        ancora: "envio",
      };
    default:
      return { rotulo: "Rever texto", descricao: "Estado do texto inesperado.", tom: "aviso", interna: true, aguarda: "dolado", ancora: "texto" };
  }
}

export type NivelPrazo = "ok" | "proximo" | "vencido";

export type Prazo = {
  tipo: "primeira_resposta" | "resposta_empresa" | "fidelizacao";
  rotulo: string;
  detalhe: string;
  nivel: NivelPrazo;
};

function diasCorridosAte(data: string, hoje: Date) {
  const inicio = new Date(hoje);
  inicio.setHours(0, 0, 0, 0);
  const alvo = new Date(`${data}T00:00:00`);
  return Math.round((alvo.getTime() - inicio.getTime()) / 86400000);
}

/**
 * Prazos de um caso em curso: 1.ª resposta ao cliente (48 horas úteis),
 * resposta da empresa (15 dias úteis desde o envio) e fim da fidelização
 * (urgente a 15 dias). Casos resolvidos ou bloqueados não têm prazos.
 */
export function prazosCaso(c: CasoTriagem, hoje: Date = new Date()): Prazo[] {
  if (ESTADOS_FINAIS.includes(c.status)) return [];
  const prazos: Prazo[] = [];

  if (!c.primeira_resposta_em && c.created_at) {
    const horas = horasUteisDesdeCriacao(c.created_at);
    prazos.push({
      tipo: "primeira_resposta",
      rotulo: "1.ª resposta",
      detalhe: horas >= 48 ? `${Math.floor(horas)}h úteis (prazo de 48h ultrapassado)` : `${Math.floor(horas)}h úteis de 48h`,
      nivel: horas >= 48 ? "vencido" : horas >= 36 ? "proximo" : "ok",
    });
  }

  const dias = diasUteisRestantes(c.data_envio_reclamacao ?? null);
  if (dias !== null) {
    prazos.push({
      tipo: "resposta_empresa",
      rotulo: "Resposta da empresa",
      detalhe: dias < 0 ? formatarDiasRestantes(dias) : `${formatarDiasRestantes(dias)} úteis restantes`,
      nivel: dias < 0 ? "vencido" : dias <= 5 ? "proximo" : "ok",
    });
  }

  if (c.data_fim_fidelidade) {
    const d = diasCorridosAte(c.data_fim_fidelidade, hoje);
    prazos.push({
      tipo: "fidelizacao",
      rotulo: "Fim da fidelização",
      detalhe: d < 0 ? `Terminou há ${-d} ${d === -1 ? "dia" : "dias"}` : d === 0 ? "Termina hoje" : `Faltam ${d} ${d === 1 ? "dia" : "dias"}`,
      nivel: d < 0 ? "vencido" : d <= 15 ? "proximo" : "ok",
    });
  }

  return prazos;
}

const ORDEM_NIVEL: Record<NivelPrazo, number> = { vencido: 0, proximo: 1, ok: 2 };

/** O prazo que mais pede atenção (vencido > próximo > em dia), ou null. */
export function prazoPrincipal(prazos: Prazo[]): Prazo | null {
  return [...prazos].sort((a, b) => ORDEM_NIVEL[a.nivel] - ORDEM_NIVEL[b.nivel])[0] ?? null;
}

/**
 * Chave de prioridade (menor = primeiro): ação interna antes de espera,
 * depois prazo vencido/próximo, depois o caso mais antigo.
 */
export function prioridade(c: CasoTriagem, hoje: Date = new Date()): number {
  const acao = proximaAcao(c);
  const prazo = prazoPrincipal(prazosCaso(c, hoje));
  const grupo = ESTADOS_FINAIS.includes(c.status) ? 3 : acao.interna ? 0 : 1;
  const nivel = prazo ? ORDEM_NIVEL[prazo.nivel] : 3;
  const idade = c.created_at ? new Date(c.created_at).getTime() / 1e13 : 0.9;
  return grupo * 10 + nivel + idade;
}

/** Vistas da lista de casos. */
export const VISTAS_CASOS = {
  acao: "Precisam de ação",
  espera: "À espera de terceiros",
  concluidos: "Concluídos",
  todos: "Todos",
} as const;
export type VistaCasos = keyof typeof VISTAS_CASOS;

export function pertenceVista(c: CasoTriagem, vista: VistaCasos): boolean {
  if (vista === "todos") return true;
  const final = ESTADOS_FINAIS.includes(c.status);
  if (vista === "concluidos") return final;
  if (final) return false;
  return vista === "acao" ? proximaAcao(c).interna : !proximaAcao(c).interna;
}
