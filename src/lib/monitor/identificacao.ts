// DoLado — a que serviço pertence um documento? (sem I/O; `npm test`).
//
// O fornecedor sozinho nunca chega: "Vodafone" + "Vodafone" não é o mesmo
// contrato. Compara-se a identificação lida no documento (NIF e nome do
// titular, número de cliente/conta/contrato, número de serviço, CPE/CUI) com
// a de cada serviço acompanhado. Determinístico, sem IA.
//
//   confirmada — um identificador estável coincide e nenhum é diferente
//   possivel   — não há identificadores suficientes, ou há uma diferença
//                isolada: o cliente decide (associação explícita e auditada)
//   conflito   — fornecedor ou NIF diferente, ou duas diferenças: parece
//                outro serviço ou outro cliente; nada é alterado
//
// O NIF e o nome do titular nunca ficam em texto: guarda-se só o hash (basta
// para comparar) e uma apresentação mascarada.

import { createHash } from "node:crypto";

export const TIPOS_IDENTIFICADOR = [
  "nif_titular",
  "titular",
  "numero_cliente",
  "referencia_conta",
  "referencia_contrato",
  "numero_servico",
  "cpe",
  "cui",
] as const;
export type TipoIdentificador = (typeof TIPOS_IDENTIFICADOR)[number];

export type IdentificadorLido = { tipo: TipoIdentificador; valor: string };
export type Identificador = { tipo: TipoIdentificador; valorNormalizado: string; apresentacao: string | null };

// Famílias: números de cliente/conta/contrato aparecem com rótulos diferentes
// conforme o documento ("Conta", "N.º de cliente", "Contrato"); comparam-se
// entre si. O mesmo para o número do serviço (telefone, CPE, CUI).
const FAMILIA: Record<TipoIdentificador, "nif" | "titular" | "conta" | "servico"> = {
  nif_titular: "nif",
  titular: "titular",
  numero_cliente: "conta",
  referencia_conta: "conta",
  referencia_contrato: "conta",
  numero_servico: "servico",
  cpe: "servico",
  cui: "servico",
};

function hash(prefixo: string, valor: string) {
  return `sha256:${createHash("sha256").update(`${prefixo}:${valor}`).digest("hex")}`;
}

function semAcentos(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Normaliza um identificador lido; null se não servir para comparar. */
export function normalizarIdentificador(tipo: TipoIdentificador, valor: string | null | undefined): Identificador | null {
  const bruto = (valor ?? "").trim();
  if (!bruto) return null;

  if (tipo === "nif_titular") {
    const digitos = bruto.replace(/^PT/i, "").replace(/\D/g, "");
    if (!/^\d{9}$/.test(digitos)) return null;
    return { tipo, valorNormalizado: hash("nif", digitos), apresentacao: `NIF terminado em ${digitos.slice(-3)}` };
  }

  if (tipo === "titular") {
    // Primeiro e último nome: "Maria J. Silva" e "MARIA JOSÉ SILVA" coincidem.
    const palavras = semAcentos(bruto).toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((p) => p.length > 1);
    if (palavras.length === 0) return null;
    const chave = palavras.length === 1 ? palavras[0] : `${palavras[0]} ${palavras.at(-1)}`;
    if (chave.length < 3) return null;
    return { tipo, valorNormalizado: hash("titular", chave), apresentacao: null };
  }

  let normalizado = semAcentos(bruto).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (tipo === "numero_servico" && /^351\d{9}$/.test(normalizado)) normalizado = normalizado.slice(3);
  if (/^\d+$/.test(normalizado)) normalizado = normalizado.replace(/^0+(?=\d)/, "");
  if (normalizado.length < 4 || normalizado.length > 120) return null;
  return { tipo, valorNormalizado: normalizado, apresentacao: normalizado.slice(0, 60) };
}

export function normalizarIdentificadores(lidos: IdentificadorLido[]): Identificador[] {
  const vistos = new Set<string>();
  const out: Identificador[] = [];
  for (const l of lidos) {
    const n = normalizarIdentificador(l.tipo, l.valor);
    if (!n) continue;
    const chave = `${n.tipo}|${n.valorNormalizado}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    out.push(n);
  }
  return out;
}

export type EstadoAssociacao = "confirmada" | "possivel" | "conflito";

export type ResultadoAssociacao = {
  estado: EstadoAssociacao;
  /** 0–1, só indicativo (guardado para auditoria). */
  confianca: number;
  /** O que coincide, em português, para mostrar ao cliente. */
  motivos: string[];
  /** O que é diferente. */
  conflitos: string[];
};

export type IdentidadeDocumento = { fornecedorChave: string | null; ids: Identificador[] };
export type IdentidadeServico = { id: string; fornecedorChave: string | null; ids: Identificador[] };

type Comparacao = "igual" | "diferente" | "sem_dados";

function comparar(familia: "nif" | "titular" | "conta" | "servico", a: Identificador[], b: Identificador[]): Comparacao {
  const va = new Set(a.filter((i) => FAMILIA[i.tipo] === familia).map((i) => i.valorNormalizado));
  const vb = new Set(b.filter((i) => FAMILIA[i.tipo] === familia).map((i) => i.valorNormalizado));
  if (va.size === 0 || vb.size === 0) return "sem_dados";
  for (const v of va) if (vb.has(v)) return "igual";
  return "diferente";
}

const TEXTO_IGUAL = {
  nif: "O NIF do titular é o mesmo",
  titular: "O nome do titular é o mesmo",
  conta: "O número de cliente, de conta ou de contrato é o mesmo",
  servico: "O número do serviço é o mesmo",
} as const;

const TEXTO_DIFERENTE = {
  nif: "O NIF do titular é diferente",
  titular: "O nome do titular é diferente",
  conta: "O número de cliente, de conta ou de contrato é diferente",
  servico: "O número do serviço é diferente",
} as const;

export function avaliarAssociacao(doc: IdentidadeDocumento, servico: Omit<IdentidadeServico, "id">): ResultadoAssociacao {
  const motivos: string[] = [];
  const conflitos: string[] = [];

  if (doc.fornecedorChave && servico.fornecedorChave) {
    if (doc.fornecedorChave !== servico.fornecedorChave) {
      return { estado: "conflito", confianca: 0.05, motivos, conflitos: ["O fornecedor é diferente"] };
    }
    motivos.push("O fornecedor é o mesmo");
  }

  const r = {
    nif: comparar("nif", doc.ids, servico.ids),
    titular: comparar("titular", doc.ids, servico.ids),
    conta: comparar("conta", doc.ids, servico.ids),
    servico: comparar("servico", doc.ids, servico.ids),
  };
  for (const f of ["nif", "conta", "servico", "titular"] as const) {
    if (r[f] === "igual") motivos.push(TEXTO_IGUAL[f]);
    if (r[f] === "diferente") conflitos.push(TEXTO_DIFERENTE[f]);
  }

  const fortesDiferentes = (["conta", "servico"] as const).filter((f) => r[f] === "diferente").length;
  if (r.nif === "diferente" || (fortesDiferentes >= 1 && (r.titular === "diferente" || fortesDiferentes >= 2))) {
    return { estado: "conflito", confianca: 0.1, motivos, conflitos };
  }
  if (conflitos.length > 0) return { estado: "possivel", confianca: 0.4, motivos, conflitos };

  const fortesIguais = (["nif", "conta", "servico"] as const).filter((f) => r[f] === "igual").length;
  if (fortesIguais > 0) {
    return { estado: "confirmada", confianca: Math.min(0.99, 0.85 + 0.05 * fortesIguais), motivos, conflitos };
  }
  if (motivos.length <= 1) conflitos.push("Não encontrámos dados de identificação suficientes para confirmar");
  return { estado: "possivel", confianca: r.titular === "igual" ? 0.6 : 0.5, motivos, conflitos };
}

export type DecisaoAssociacao =
  | { acao: "associar"; servicoId: string; resultado: ResultadoAssociacao }
  | { acao: "perguntar"; servicoId: string; resultado: ResultadoAssociacao; alternativaId: string | null }
  | { acao: "novo_servico"; resultado: ResultadoAssociacao | null };

/**
 * Decide o destino de um documento entre os serviços do cliente.
 * - Escolhido no upload (página de um serviço): só se associa se a
 *   identificação o confirmar; senão pergunta-se (com outro serviço
 *   confirmado como alternativa, se houver).
 * - Carregado na lista: um único serviço confirmado → associa; algum possível
 *   → pergunta; nenhum (ou só conflitos) → serviço novo.
 */
export function escolherServico(doc: IdentidadeDocumento, servicos: IdentidadeServico[], escolhidoId?: string | null): DecisaoAssociacao {
  const avaliados = servicos.map((s) => ({ id: s.id, r: avaliarAssociacao(doc, s) }));
  const confirmados = avaliados.filter((a) => a.r.estado === "confirmada");

  if (escolhidoId) {
    const escolhido = avaliados.find((a) => a.id === escolhidoId);
    if (escolhido?.r.estado === "confirmada") return { acao: "associar", servicoId: escolhidoId, resultado: escolhido.r };
    const alternativa = confirmados.find((a) => a.id !== escolhidoId);
    return {
      acao: "perguntar",
      servicoId: escolhidoId,
      resultado: escolhido?.r ?? { estado: "possivel", confianca: 0.5, motivos: [], conflitos: [] },
      alternativaId: alternativa?.id ?? null,
    };
  }

  if (confirmados.length === 1) return { acao: "associar", servicoId: confirmados[0].id, resultado: confirmados[0].r };
  const candidatos = [...confirmados, ...avaliados.filter((a) => a.r.estado === "possivel")].sort((a, b) => b.r.confianca - a.r.confianca);
  if (candidatos.length > 0) {
    const r = confirmados.length > 1 ? { ...candidatos[0].r, estado: "possivel" as const, conflitos: ["Há mais de um serviço com esta identificação"] } : candidatos[0].r;
    return { acao: "perguntar", servicoId: candidatos[0].id, resultado: r, alternativaId: null };
  }
  const conflito = avaliados.find((a) => a.r.estado === "conflito" && !a.r.conflitos.includes("O fornecedor é diferente"));
  return { acao: "novo_servico", resultado: conflito?.r ?? null };
}

export const ROTULO_IDENTIFICADOR: Record<TipoIdentificador, string> = {
  nif_titular: "NIF do titular",
  titular: "Titular",
  numero_cliente: "Número de cliente",
  referencia_conta: "Conta",
  referencia_contrato: "Número do contrato",
  numero_servico: "Número do serviço",
  cpe: "CPE",
  cui: "CUI",
};
