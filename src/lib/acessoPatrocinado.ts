// Protecção oferecida por um Parceiro de Distribuição (acesso patrocinado) —
// regras sem I/O (testáveis com `node --test`). Base de dados:
// 20261021090000_programa_parceiros.sql; servidor:
// src/lib/acessoPatrocinadoServidor.ts. Especificação:
// docs/especificacoes/PROGRAMA_PARCEIROS_FASE1.md.
//
// Como a Protecção gratuita: estado interno, sem Stripe (sem Customer,
// subscrição nem fatura). Começa quando o beneficiário activa o código e
// termina sozinho, sem cobrança. Decisões de Thiago (20/10/2026): recusado a
// quem já tem subscrição paga activa (o código fica por usar) e conta como
// "já teve Protecção" para os 30 dias gratuitos.
//
// Nunca decide acesso sozinho: o acesso vem da base de dados
// (conta_tem_protecao) e de src/lib/acesso.ts, que usa estas regras.

const DIA_MS = 24 * 60 * 60 * 1000;

/** Caminho da página de activação (portal.dolado.pt). */
export const ROTA_ATIVAR_CODIGO = "/ativar-codigo";

/** A funcionalidade está ligada (ACESSOS_PATROCINADOS_ATIVO=1). Desligada por omissão. */
export function acessosPatrocinadosLigados(env: { ACESSOS_PATROCINADOS_ATIVO?: string }) {
  return env.ACESSOS_PATROCINADOS_ATIVO === "1";
}

// ---------------------------------------------------------------------------
// Códigos de activação: 12 caracteres sem 0/O/1/I (~60 bits). A base de
// dados guarda só o SHA-256; o código em claro só existe na emissão.

export const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const COMPRIMENTO_CODIGO_ACESSO = 12;
/** Máximo de códigos por emissão (uma exportação). */
export const MAXIMO_CODIGOS_POR_EMISSAO = 1000;

/**
 * Gera um código a partir de bytes aleatórios (crypto.randomBytes no
 * servidor). O alfabeto tem 32 caracteres, por isso cada byte & 31 é
 * uniforme.
 */
export function gerarCodigoAcesso(bytes: Uint8Array): string {
  if (bytes.length < COMPRIMENTO_CODIGO_ACESSO) throw new Error("bytes insuficientes");
  let codigo = "";
  for (let i = 0; i < COMPRIMENTO_CODIGO_ACESSO; i++) codigo += ALFABETO_CODIGO[bytes[i] & 31];
  return codigo;
}

/** Normaliza o que o beneficiário escreveu (espaços, hífenes, minúsculas). null = formato impossível. */
export function normalizarCodigoAcesso(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const codigo = valor.toUpperCase().replace(/[\s-]/g, "");
  if (codigo.length !== COMPRIMENTO_CODIGO_ACESSO) return null;
  for (const c of codigo) if (!ALFABETO_CODIGO.includes(c)) return null;
  return codigo;
}

/** Apresentação em grupos de 4 (XXXX-XXXX-XXXX), como aparece na exportação. */
export function formatarCodigoAcesso(codigo: string) {
  return codigo.match(/.{1,4}/g)?.join("-") ?? codigo;
}

/** CSV da emissão (só os códigos; nunca dados de pessoas). */
export function csvCodigos(dados: { pacote: string; validade: string; codigos: string[] }) {
  const escapar = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [
    ["codigo", "pacote", "ativar_ate"].join(","),
    ...dados.codigos.map((c) => [escapar(formatarCodigoAcesso(c)), escapar(dados.pacote), dados.validade].join(",")),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Acesso da conta

export type LinhaAcessoPatrocinado = {
  id?: string;
  estado: string;
  inicio_em: string;
  termina_em: string;
};

export type AcessoPatrocinado = {
  /** Em curso agora (estado ativo e fim no futuro) — dá Protecção. */
  emCurso: boolean;
  inicio: string;
  fim: string;
  diasRestantes: number;
};

export function acessoPatrocinadoDe(
  linha: LinhaAcessoPatrocinado | null | undefined,
  agora: Date = new Date(),
): AcessoPatrocinado | null {
  if (!linha) return null;
  const fim = new Date(linha.termina_em).getTime();
  const emCurso = linha.estado === "ativo" && fim > agora.getTime();
  return {
    emCurso,
    inicio: linha.inicio_em,
    fim: linha.termina_em,
    diasRestantes: emCurso ? Math.max(1, Math.ceil((fim - agora.getTime()) / DIA_MS)) : 0,
  };
}

/**
 * Período de Protecção sem custo em curso (gratuita ou patrocinada) que
 * termina mais tarde — é até lá que uma adesão à Protecção adia a 1.ª
 * cobrança (trial_end). null = nenhum em curso.
 */
export function periodoSemCusto(
  ...periodos: Array<{ emCurso: boolean; fim: string } | null | undefined>
): { emCurso: true; fim: string } | null {
  let melhor: string | null = null;
  for (const p of periodos) {
    if (p?.emCurso && (!melhor || new Date(p.fim).getTime() > new Date(melhor).getTime())) melhor = p.fim;
  }
  return melhor ? { emCurso: true, fim: melhor } : null;
}

// ---------------------------------------------------------------------------
// Activação (decidida na base de dados — acesso_patrocinado_ativar)

export const MOTIVOS_ATIVACAO = [
  "ativado",
  "ja_ativado",
  "demasiadas_tentativas",
  "codigo_invalido",
  "codigo_expirado",
  "protecao_ativa",
  "acesso_ativo",
  "email_nao_confirmado",
  "conta_invalida",
] as const;
export type MotivoAtivacao = (typeof MOTIVOS_ATIVACAO)[number];

/** Resposta da base de dados → motivo conhecido (desconhecido = código inválido). */
export function lerMotivoAtivacao(valor: unknown): MotivoAtivacao {
  return typeof valor === "string" && (MOTIVOS_ATIVACAO as readonly string[]).includes(valor)
    ? (valor as MotivoAtivacao)
    : "codigo_invalido";
}

// ---------------------------------------------------------------------------
// Avisos ao beneficiário (calculados na base de dados — acesso_patrocinado_marco_atual)

export const MARCOS_ACESSO = ["ativacao", "d15", "fim"] as const;
export type MarcoAcesso = (typeof MARCOS_ACESSO)[number];

export function ehMarcoAcesso(valor: unknown): valor is MarcoAcesso {
  return typeof valor === "string" && (MARCOS_ACESSO as readonly string[]).includes(valor);
}

// ---------------------------------------------------------------------------
// Relatório de um Parceiro de Distribuição: só contagens. Em grupos pequenos
// as activações podiam identificar pessoas (a empresa sabe a quem deu cada
// código), por isso abaixo do limiar mostra-se "menos de 5".

export const LIMIAR_AGREGADOS = 5;

export type RelatorioDistribuicao = {
  adquiridos: number;
  emitidos: number;
  ativados: number;
  disponiveis: number;
  expirados: number;
  anulados: number;
  ativos_agora: number;
};

export type LinhaRelatorio = { indicador: string; valor: string };

function contagemProtegida(n: number) {
  return n > 0 && n < LIMIAR_AGREGADOS ? `menos de ${LIMIAR_AGREGADOS}` : String(n);
}

/** Relatório para entregar à empresa (protegido contra reidentificação). */
export function relatorioParaEmpresa(r: RelatorioDistribuicao): LinhaRelatorio[] {
  const poucos = r.ativados > 0 && r.ativados < LIMIAR_AGREGADOS;
  const taxa = r.emitidos > 0 && !poucos ? `${((r.ativados / r.emitidos) * 100).toFixed(1).replace(".", ",")}%` : "—";
  return [
    { indicador: "Acessos adquiridos", valor: String(r.adquiridos) },
    { indicador: "Códigos emitidos", valor: String(r.emitidos) },
    { indicador: "Códigos utilizados", valor: contagemProtegida(r.ativados) },
    { indicador: "Códigos disponíveis", valor: poucos ? "—" : String(r.disponiveis) },
    { indicador: "Códigos expirados", valor: poucos ? "—" : String(r.expirados) },
    { indicador: "Taxa de activação", valor: taxa },
    { indicador: "Acessos patrocinados activos", valor: contagemProtegida(r.ativos_agora) },
  ];
}

export function csvRelatorio(linhas: LinhaRelatorio[]) {
  return ["indicador,valor", ...linhas.map((l) => `"${l.indicador}","${l.valor}"`)].join("\n");
}
