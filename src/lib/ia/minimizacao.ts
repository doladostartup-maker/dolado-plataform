// DoLado — camada comum de minimização dos dados enviados à Claude API
// (sem I/O; `npm test`). Todos os pedidos à Anthropic passam por aqui:
//
//   prepararParaIA(contexto)  → objeto estruturado já minimizado (PayloadIA)
//   selarMensagemIA(texto)    → mensagem final (MensagemIA), última verificação
//   documentoParaIA(url)      → única exceção: documento do Monitor de Proteção
//
// chamarClaudeJson() (src/lib/claudeJson.ts) só aceita MensagemIA e volta a
// selar a mensagem; lerDocumentoComClaude() (src/lib/monitor/claudeDocumentos.ts)
// só aceita um documento validado por documentoParaIA(). Só estes dois
// ficheiros importam o SDK da Anthropic (verificado em minimizacao.test.mjs).
//
// Princípio: a IA recebe os factos necessários para compreender e tratar o
// problema (empresa, setor, datas, valores, condições, descrição, resposta
// da empresa, regras jurídicas), nunca a identidade do cliente. Os dados
// reais ficam na DoLado; o texto final usa marcadores que a DoLado preenche.
//
// O mascaramento do texto livre é de melhor esforço (não é anonimização
// completa): retira identificadores óbvios sem alterar factos — datas,
// montantes, prazos e nomes de empresas ficam intactos.

/** Marcadores usados no texto enviado à IA (nunca no texto final ao cliente). */
export const MASCARAS = {
  cliente: "[CLIENTE]",
  email: "[EMAIL]",
  telefone: "[TELEFONE]",
  morada: "[MORADA]",
  codigoPostal: "[CÓDIGO POSTAL]",
  nif: "[NIF]",
  iban: "[IBAN]",
  numeroCliente: "[NUMERO_CLIENTE]",
  documento: "[DOCUMENTO_IDENTIFICACAO]",
  dataNascimento: "[DATA_NASCIMENTO]",
  pagamento: "[REFERENCIA_PAGAMENTO]",
  numero: "[NÚMERO]",
  id: "[ID]",
  ip: "[IP]",
} as const;

// ---------------------------------------------------------------------------
// Texto livre

const PARTICULAS = new Set(["da", "de", "do", "das", "dos", "e"]);

// Palavras com maiúscula que não são nomes de pessoas (fórmulas de cortesia).
const NAO_NOMES = new Set([
  "cliente", "clientes", "senhor", "senhora", "senhores", "senhoras", "sr", "sra", "dr", "dra", "eng", "exmo", "exma", "exmos", "exmas",
  "caro", "cara", "estimado", "estimada", "consumidor", "consumidora", "titular", "equipa", "departamento",
]);

const MAIUSCULA = "\\p{Lu}[\\p{Ll}'’-]+";
// 1 a 5 palavras com maiúscula, com partículas pelo meio (ex.: "Maria da Costa").
const NOME_PROPRIO = `${MAIUSCULA}(?:\\s+(?:(?:d[aeo]s?|e)\\s+)?${MAIUSCULA}){0,4}`;

function escaparRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function soMascarasOuCortesia(nome: string) {
  return nome
    .split(/\s+/)
    .every((p) => PARTICULAS.has(p.toLowerCase()) || NAO_NOMES.has(p.toLowerCase().replace(/\.$/, "")));
}

// Nomes apresentados no texto: "Chamo-me X", "o meu nome é X", "Nome: X",
// "Titular: X", "Sou o/a X", fórmulas de cortesia das respostas das empresas
// ("Exmo. Senhor X", "Caro(a) Sr.(a) X", "Estimada Cliente X").
const PADROES_NOME: RegExp[] = [
  new RegExp(`(\\b(?:[Cc]hamo-me|[Oo] meu nome é|[Mm]eu nome é|[Nn]ome(?: completo)?\\s*:|[Tt]itular\\s*:|[Cc]liente\\s*:)\\s*)(${NOME_PROPRIO})`, "gu"),
  new RegExp(`(\\b[Ss]ou\\s+(?:o|a)\\s+)(${NOME_PROPRIO})`, "gu"),
  new RegExp(
    `(\\b(?:Exm[oa]s?\\.?(?:\\(a\\))?|Car[oa](?:\\(a\\))?|Estimad[oa](?:\\(a\\))?|Prezad[oa](?:\\(a\\))?|Sr\\.?(?:\\(a\\))?|Sra\\.?|Senhor(?:\\(a\\))?|Senhora|Dr\\.?(?:\\(a\\))?|Dra\\.?)(?:\\s+(?:Sr\\.?(?:\\(a\\))?|Sra\\.?|Senhor(?:\\(a\\))?|Senhora|Dr\\.?(?:\\(a\\))?|Dra\\.?|Cliente))*\\s+)(${NOME_PROPRIO})`,
    "gu",
  ),
];

// Valores identificados por um rótulo explícito. O valor tem de conter
// algarismos, para não apagar texto normal ("contrato de 24 meses" fica).
const VALOR_ID = "(?:[A-Z]{0,4}[ ./-]?)?\\d[\\dA-Z./-]*(?:[ ]\\d[\\dA-Z./-]*)*";
const ROTULO_ID = "\\s*(?:n\\.?\\s?º|nº|n\\.|número|:|-|é)?\\s*(?:n\\.?\\s?º|nº|:)?\\s*";
const PADROES_ROTULO: [RegExp, string][] = [
  [new RegExp(`(\\b(?:NIF|NIPC|n\\.?\\s?º? de contribuinte|número de contribuinte|contribuinte(?: fiscal)?|número de identificação fiscal)${ROTULO_ID})(${VALOR_ID})`, "giu"), MASCARAS.nif],
  [new RegExp(`(\\b(?:IBAN|NIB)${ROTULO_ID})(${VALOR_ID})`, "giu"), MASCARAS.iban],
  [
    new RegExp(
      `(\\b(?:cart[ãa]o de cidad[ãa]o|CC|BI|bilhete de identidade|passaporte|t[íi]tulo de resid[êe]ncia|NISS|n\\.?\\s?º? (?:de )?seguran[çc]a social|n\\.?\\s?º? de utente|SNS)${ROTULO_ID})(${VALOR_ID})`,
      "gu",
    ),
    MASCARAS.documento,
  ],
  [
    new RegExp(
      `(\\b(?:n\\.?\\s?º|nº|número|n\\.|código)\\s+(?:de |do |da )?(?:cliente|conta|contrato|ades[ãa]o|instala[çc][ãa]o|contador)${ROTULO_ID})(${VALOR_ID})`,
      "giu",
    ),
    MASCARAS.numeroCliente,
  ],
  [new RegExp(`(\\b(?:conta(?: cliente)?|contrato|cliente|ades[ãa]o)\\s+(?:n\\.?\\s?º|nº|n\\.|número)\\s*:?\\s*)(${VALOR_ID})`, "giu"), MASCARAS.numeroCliente],
  [new RegExp(`(\\b(?:conta|cliente)\\s*:\\s*)(${VALOR_ID})`, "giu"), MASCARAS.numeroCliente],
  // "relativamente à conta 98765432" (5+ algarismos; nunca uma data).
  [
    new RegExp(`(\\b(?:conta|cliente|contrato|ades[ãa]o)\\s+)(?!\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4})(\\d[\\d./-]{4,}\\d)`, "giu"),
    MASCARAS.numeroCliente,
  ],
  [new RegExp(`(\\b(?:refer[êe]ncia(?: MB| multibanco| de pagamento)?|ref\\.?\\s?MB|entidade)\\s*:?\\s*)(\\d{3}[\\s.]?\\d{3}[\\s.]?\\d{3}|\\d{5})\\b`, "giu"), MASCARAS.pagamento],
  [
    new RegExp(`(\\b(?:data de nascimento|nascid[oa] (?:a|em)|nasci (?:a|em))\\s*:?\\s*)(\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2} de \\p{L}+ de \\d{4})`, "giu"),
    MASCARAS.dataNascimento,
  ],
];

// Moradas: tipo de via + nome + número de porta/andar opcionais, ou o que
// vem depois de "morada:", "moro na/em", "resido na/em", "residente na/em".
const TIPO_VIA =
  "(?:Rua|R\\.|Avenida|Av\\.|Travessa|Tv\\.|Largo|Praça|Praceta|Estrada|Alameda|Calçada|Beco|Urbanização|Urb\\.|Bairro|Quinta)";
const NOME_VIA = `(?:\\s+(?:d[aeo]s?\\s+|de\\s+)?[\\p{Lu}\\d][\\p{L}\\d'’.-]*){1,6}`;
const PORTA = "(?:,?\\s*(?:n\\.?\\s?º|nº|n\\.)?\\s*\\d+[A-Za-z]?(?:\\s*[-–]\\s*\\d+)?(?!\\d|\\.?\\s?º))?";
const ANDAR = "(?:,?\\s*(?:\\d+\\.?\\s?º\\s*(?:andar)?\\s*(?:Esq\\.?|Dt[oa]\\.?|Drt\\.?|Esquerdo|Direito|Frente|Trás|[A-Z])?|r\\/c\\s*(?:Esq\\.?|Dt[oa]\\.?)?|cave|loja\\s*\\d*))?";
const PADRAO_VIA = new RegExp(`\\b${TIPO_VIA}${NOME_VIA}${PORTA}${ANDAR}`, "gu");
const PADRAO_MORADA_ROTULO = new RegExp(
  `(\\b(?:[Mm]orada|[Ee]ndereço|[Rr]esid[êe]ncia)\\s*:\\s*|\\b(?:[Mm]oro|[Rr]esido|[Vv]ivo|[Rr]esidente)\\s+(?:na|no|em)\\s+)([^\\n;]{3,120}?)(?=\\s*(?:[\\n;]|$|\\.\\s+\\p{Lu}|,\\s*(?:e|o|a|tenho|sou|desde)\\b))`,
  "gu",
);

const PADRAO_URL = /\bhttps?:\/\/[^\s"'<>]+/g;

/**
 * Retira do texto livre identificadores óbvios do cliente, preservando os
 * factos. `nomes`: nomes conhecidos (ex.: casos.nome), substituídos palavra a
 * palavra onde aparecerem. Idempotente.
 */
export function mascararTextoLivre(texto: string, { nomes = [] }: { nomes?: (string | null | undefined)[] } = {}): string {
  // Os URL (ex.: fonte de uma regra jurídica) não são texto do cliente.
  const partes = texto.split(PADRAO_URL);
  const urls = texto.match(PADRAO_URL) ?? [];
  return partes.map((p, i) => mascararSemUrl(p, nomes) + (urls[i] ?? "")).join("");
}

function mascararSemUrl(texto: string, nomes: (string | null | undefined)[]): string {
  let t = texto;
  // Identificadores técnicos (UUID, IDs Stripe, IP) e contactos.
  t = t.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, MASCARAS.id);
  t = t.replace(/\b(?:cus|sub|si|pi|ch|cs|in|evt|pm|seti|re|txn|acct|price|prod)_[A-Za-z0-9]{8,}\b/g, MASCARAS.id);
  t = t.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, MASCARAS.ip);
  t = t.replace(/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu, MASCARAS.email);
  t = t.replace(/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g, MASCARAS.iban);

  // Rótulos explícitos (antes dos números soltos, para o marcador certo).
  for (const [padrao, mascara] of PADROES_ROTULO) t = t.replace(padrao, (_m, rotulo: string) => `${rotulo}${mascara}`);

  t = t.replace(/(?:\+|00)\s?351[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{3}\b/g, MASCARAS.telefone);
  t = t.replace(/\b[29]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/g, MASCARAS.telefone);
  // NIF ou outro número de 9 algarismos com pontos/espaços (123.456.789).
  t = t.replace(/\b\d{3}[.\s]\d{3}[.\s]\d{3}\b/g, MASCARAS.numero);
  // Qualquer sequência de 9 ou mais algarismos (NIF, cartão, n.º de cliente):
  // o texto enviado à IA não precisa deles.
  t = t.replace(/\b\d(?:[ -]?\d){8,}\b/g, MASCARAS.numero);

  // Moradas.
  t = t.replace(PADRAO_MORADA_ROTULO, (_m, rotulo: string) => `${rotulo}${MASCARAS.morada}`);
  t = t.replace(PADRAO_VIA, MASCARAS.morada);
  t = t.replace(/\b\d{4}-\d{3}\b/g, MASCARAS.codigoPostal);

  // Nomes apresentados no próprio texto.
  for (const padrao of PADROES_NOME) {
    t = t.replace(padrao, (m, prefixo: string, nome: string) => (soMascarasOuCortesia(nome) ? m : `${prefixo}${MASCARAS.cliente}`));
  }

  // Nomes conhecidos (palavra a palavra: apanha "Sr. Costa" e "Maria").
  const conhecidas = nomes
    .flatMap((n) => (n ?? "").split(/\s+/))
    .map((p) => p.trim().replace(/[.,;:]+$/, ""))
    .filter((p) => p.length >= 3 && !PARTICULAS.has(p.toLowerCase()));
  for (const parte of conhecidas) {
    t = t.replace(new RegExp(`(?<![\\p{L}])${escaparRegex(parte)}(?![\\p{L}])`, "giu"), MASCARAS.cliente);
  }
  // "[CLIENTE] [CLIENTE] [CLIENTE]" → "[CLIENTE]"
  return t.replace(/\[CLIENTE\](?:\s+(?:d[aeo]s?\s+|e\s+)?\[CLIENTE\])+/g, MASCARAS.cliente);
}

// ---------------------------------------------------------------------------
// Objetos estruturados

/** Erro de programação: o objeto a enviar contém dados que nunca podem sair. */
export class ErroPayloadIA extends Error {
  constructor(motivo: string) {
    super(`Dados não permitidos no pedido à Claude API: ${motivo}`);
    this.name = "ErroPayloadIA";
  }
}

// Chaves que nunca podem ir para a IA (identidade do cliente, identificadores
// internos ou externos, autenticação, pagamentos). Comparação sem acentos e
// sem distinguir maiúsculas.
const CHAVES_PROIBIDAS =
  /^(?:id|uuid|nome|name|full_name|primeiro_nome|apelido|titular|email|e_mail|telefone|telemovel|phone|morada|endereco|address|codigo_postal|nif|nipc|iban|nib|cartao|card|password|palavra_passe|senha|token|access_token|refresh_token|ip|ip_address|data_nascimento|birthdate|referencia|referencia_mb|numero_cliente|numero_contrato|numero_conta|numero_servico|cpe|cui|storage_path|bucket|app_metadata|user_metadata|identities)$|(?:_id|_ids|_email|_telefone|_nif|_iban|_token|_secret|_hash|_uuid)$|^(?:stripe|customer|subscription|checkout|payment|invoice)/;

/** Chaves que terminam em "_id" mas não são identificadores internos. */
const CHAVES_PERMITIDAS = new Set(["rule_id"]);

function normalizarChave(chave: string) {
  return chave
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

declare const marcaPayload: unique symbol;
/** Objeto já minimizado por prepararParaIA(). */
export type PayloadIA<T = unknown> = T & { readonly [marcaPayload]: true };

/**
 * Prepara um objeto para ser enviado à IA: recusa chaves proibidas e objetos
 * completos de utilizador/Supabase/Stripe (ErroPayloadIA — erro de
 * programação, cai no caminho manual), e mascara todo o texto livre.
 * Datas, montantes, booleanos e números ficam como estão.
 */
export function prepararParaIA<T>(valor: T, opcoes: { nomes?: (string | null | undefined)[] } = {}): PayloadIA<T> {
  return percorrer(valor, opcoes, "$", 0) as PayloadIA<T>;
}

function percorrer(valor: unknown, opcoes: { nomes?: (string | null | undefined)[] }, caminho: string, nivel: number): unknown {
  if (nivel > 12) throw new ErroPayloadIA(`${caminho}: objeto demasiado profundo`);
  if (valor === null || valor === undefined || typeof valor === "boolean") return valor ?? null;
  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) return null;
    // Um número inteiro de 9+ algarismos é um identificador, não um valor.
    if (Number.isInteger(valor) && Math.abs(valor) >= 100_000_000) throw new ErroPayloadIA(`${caminho}: número com forma de identificador`);
    return valor;
  }
  if (typeof valor === "string") return mascararTextoLivre(valor, opcoes);
  if (valor instanceof Date) return valor.toISOString();
  if (Array.isArray(valor)) return valor.map((v, i) => percorrer(v, opcoes, `${caminho}[${i}]`, nivel + 1));
  if (typeof valor === "object") {
    const obj = valor as Record<string, unknown>;
    if (typeof obj.object === "string") throw new ErroPayloadIA(`${caminho}: objeto Stripe (${obj.object})`);
    if ("aud" in obj || "app_metadata" in obj || "user_metadata" in obj) throw new ErroPayloadIA(`${caminho}: objeto de utilizador`);
    const saida: Record<string, unknown> = {};
    for (const [chave, v] of Object.entries(obj)) {
      const k = normalizarChave(chave);
      if (!CHAVES_PERMITIDAS.has(k) && CHAVES_PROIBIDAS.test(k)) throw new ErroPayloadIA(`${caminho}.${chave}`);
      saida[chave] = percorrer(v, opcoes, `${caminho}.${chave}`, nivel + 1);
    }
    return saida;
  }
  throw new ErroPayloadIA(`${caminho}: tipo ${typeof valor}`);
}

// ---------------------------------------------------------------------------
// Mensagem final

declare const marcaMensagem: unique symbol;
/** Texto final do pedido à IA, já verificado por selarMensagemIA(). */
export type MensagemIA = string & { readonly [marcaMensagem]: true };

/**
 * Última verificação da mensagem completa (instruções + JSON dos blocos):
 * mascara identificadores técnicos e contactos que tenham escapado (UUID,
 * IDs Stripe, IP, e-mails, IBAN, sequências longas de algarismos). Não
 * aplica as regras de rótulos, moradas e nomes — essas precisam do texto
 * original e correm em prepararParaIA(). Idempotente.
 */
export function selarMensagemIA(texto: string): MensagemIA {
  const partes = texto.split(PADRAO_URL);
  const urls = texto.match(PADRAO_URL) ?? [];
  const selado = partes
    .map((p) => {
      let t = p;
      t = t.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, MASCARAS.id);
      t = t.replace(/\b(?:cus|sub|si|pi|ch|cs|in|evt|pm|seti|re|txn|acct|price|prod)_[A-Za-z0-9]{8,}\b/g, MASCARAS.id);
      t = t.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, MASCARAS.ip);
      t = t.replace(/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu, MASCARAS.email);
      t = t.replace(/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g, MASCARAS.iban);
      t = t.replace(/\b\d(?:[ -]?\d){8,}\b/g, MASCARAS.numero);
      return t;
    })
    .map((p, i) => p + (urls[i] ?? ""))
    .join("");
  return selado as MensagemIA;
}

// ---------------------------------------------------------------------------
// Documentos (Monitor de Proteção)

declare const marcaDocumento: unique symbol;
export type DocumentoIA = string & { readonly [marcaDocumento]: true };

// Única exceção ao envio de dados minimizados: para ler as condições de um
// contrato ou os valores de uma fatura, o modelo tem de ver o documento que
// o cliente carregou (o servidor não tem OCR próprio). O documento pode
// conter nome, morada, NIF ou IBAN do cliente; o prompt pede só os campos do
// schema, e o NIF e o nome do titular são substituídos por um pseudónimo
// antes de qualquer gravação (protegerExtracao). Só documentos do bucket
// privado do Monitor, por URL assinada de curta duração — nunca anexos de
// casos, comprovativos nem respostas das empresas.
const URL_DOCUMENTO_MONITOR = /^https:\/\/[a-z0-9.-]+\/storage\/v1\/object\/sign\/documentos-monitor\/[^?#]+\?token=[\w.-]+$/;

export function documentoParaIA(urlAssinada: string): DocumentoIA {
  const local = /^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/storage\/v1\/object\/sign\/documentos-monitor\//.test(urlAssinada);
  if (!local && !URL_DOCUMENTO_MONITOR.test(urlAssinada)) throw new ErroPayloadIA("documento fora do bucket do Monitor de Proteção");
  return urlAssinada as DocumentoIA;
}
