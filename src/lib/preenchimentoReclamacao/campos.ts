// DoLado — dados de identificação do cliente para o texto da reclamação,
// lidos de uma fatura ou contrato já carregado (sem I/O; `npm test`).
//
// Só regras determinísticas (rótulos comuns e validação de formato), sem IA.
// Os valores encontrados servem apenas para preencher os marcadores do texto
// ([NOME DO CLIENTE], [NIF], [MORADA], [N.º DE CLIENTE OU CONTRATO]) e são
// descartados a seguir: este módulo não guarda, não regista e não envia nada.
//
// Princípio: na dúvida, não preencher. Um valor só é proposto quando é único
// no documento (para o seu rótulo) e tem o formato certo; dois valores
// diferentes, um NIF que não confere com o serviço acompanhado ou um nome
// diferente do indicado no caso ficam como "dúvida" — a pessoa da DoLado
// escolhe ou escreve o valor, ou o marcador fica no texto.

export type CampoIdentificacao = "nome" | "nif" | "morada" | "numero";

/** Marcador do texto (o mesmo que a IA usa: MARCADORES em rascunhoIA/prompt.ts). */
export const MARCADOR: Record<CampoIdentificacao, string> = {
  nome: "[NOME DO CLIENTE]",
  nif: "[NIF]",
  morada: "[MORADA]",
  numero: "[N.º DE CLIENTE OU CONTRATO]",
};

export const ROTULO_CAMPO: Record<CampoIdentificacao, string> = {
  nome: "Nome do titular",
  nif: "NIF",
  morada: "Morada",
  numero: "N.º de cliente ou contrato",
};

// Variantes escritas à mão na revisão (ex.: "[N.º DE CLIENTE]"); comparação
// sem distinguir maiúsculas.
const ALIASES: Record<CampoIdentificacao, string[]> = {
  nome: ["[NOME DO CLIENTE]", "[NOME]", "[NOME DO TITULAR]", "[NOME COMPLETO]"],
  nif: ["[NIF]", "[NIF DO CLIENTE]", "[N.º DE CONTRIBUINTE]", "[NÚMERO DE CONTRIBUINTE]"],
  morada: ["[MORADA]", "[MORADA DO CLIENTE]", "[MORADA COMPLETA]"],
  numero: [
    "[N.º DE CLIENTE OU CONTRATO]",
    "[N.º DE CLIENTE OU DE CONTRATO]",
    "[NÚMERO DE CLIENTE OU CONTRATO]",
    "[N.º DE CLIENTE]",
    "[NÚMERO DE CLIENTE]",
    "[N.º DE CONTRATO]",
    "[NÚMERO DE CONTRATO]",
  ],
};

export const CAMPOS: CampoIdentificacao[] = ["nome", "nif", "morada", "numero"];

/**
 * confirmado — confere com um dado já conhecido (nome do caso, identificador
 *              do serviço acompanhado);
 * provavel   — único no documento, com rótulo e formato válidos;
 * duvida     — mais de um valor, ou um valor que não confere: nunca proposto.
 */
export type Confianca = "confirmado" | "provavel" | "duvida";

export type CampoExtraido = {
  campo: CampoIdentificacao;
  marcador: string;
  /** Valor proposto (null se não foi encontrado ou há dúvida). */
  valor: string | null;
  /** null = não encontrado. */
  confianca: Confianca | null;
  /** De onde veio o valor (rótulo e página), para a pessoa conferir no documento. */
  origem: string | null;
  /** Valores encontrados quando há dúvida (a pessoa escolhe; nunca automático). */
  candidatos: string[];
  avisos: string[];
};

export type Verificacao = "igual" | "diferente" | "sem_dado";

export type OpcoesExtracao = {
  /** Nome indicado pelo cliente no caso (casos.nome). */
  nomeCaso?: string | null;
  /** Compara o NIF (9 algarismos) com o do serviço acompanhado. */
  verificarNif?: (digitos: string) => Verificacao;
  /** Compara um n.º de cliente/conta/contrato com os do serviço acompanhado. */
  verificarNumero?: (valor: string) => Verificacao;
};

// ---------------------------------------------------------------------------
// Utilitários

function semAcentos(t: string) {
  return t.normalize("NFD").replace(/\p{M}/gu, "");
}

function normalizarLinhas(paginas: string[]) {
  return paginas.map((p) =>
    p
      .replace(/\r\n?/g, "\n")
      .replace(/[   ]/g, " ")
      .split("\n")
      .map((l) => l.replace(/[ ]{2,}/g, " ").trim()),
  );
}

const PARTICULAS = new Set(["da", "de", "do", "das", "dos", "e"]);

/** "MARIA JOSÉ DA SILVA" → "Maria José da Silva"; texto misto fica igual. */
export function capitalizar(t: string) {
  if (/\p{Ll}/u.test(t)) return t;
  return t
    .toLowerCase()
    .split(/(\s+)/)
    .map((p, i) => (i > 0 && PARTICULAS.has(p) ? p : p.replace(/^\p{L}/u, (c) => c.toUpperCase())))
    .join("")
    .replace(/(-|’|')(\p{Ll})/gu, (_m, s: string, c: string) => s + c.toUpperCase())
    .replace(/\b(Esq|Dto|Dta|Drt|Fte|Rc|R\/c)\b/gi, (m) => (m.toLowerCase() === "r/c" ? "R/C" : m))
    .replace(/(\d)(º|ª)/g, "$1$2");
}

/** Primeiro e último nome, sem acentos: "Maria J. Silva" ≈ "MARIA JOSÉ SILVA". */
export function chaveNome(nome: string | null | undefined) {
  const palavras = semAcentos(nome ?? "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 1 && !PARTICULAS.has(p));
  if (palavras.length < 2) return null;
  return `${palavras[0]} ${palavras.at(-1)}`;
}

// ---------------------------------------------------------------------------
// NIF

/** Dígito de controlo do NIF português (módulo 11). */
export function nifValido(digitos: string) {
  if (!/^\d{9}$/.test(digitos)) return false;
  let soma = 0;
  for (let i = 0; i < 8; i++) soma += Number(digitos[i]) * (9 - i);
  const resto = soma % 11;
  const controlo = resto < 2 ? 0 : 11 - resto;
  return controlo === Number(digitos[8]);
}

/** NIF de pessoa singular (1, 2, 3 ou 45): o da empresa (5…) nunca é o do cliente. */
export function nifPessoaSingular(digitos: string) {
  return /^[123]/.test(digitos) || digitos.startsWith("45");
}

const ROTULO_NIF =
  "(?:NIF(?:\\s+(?:do\\s+)?(?:cliente|titular|adquirente))?|N\\.?\\s?º?\\s*(?:de\\s+)?contribuinte|N\\.?\\s?º?\\s*(?:de\\s+)?identifica[çc][ãa]o\\s+fiscal|n[úu]mero\\s+de\\s+(?:contribuinte|identifica[çc][ãa]o\\s+fiscal)|contribuinte(?:\\s+fiscal)?(?:\\s+n\\.?\\s?º)?|NIF\\/NIPC|NIPC\\/NIF)";
const PADRAO_NIF = new RegExp(`(?<![\\p{L}])${ROTULO_NIF}(?![\\p{L}])\\s*[:.\\-]?\\s*(?:\\n\\s*)?(?:PT\\s?)?(\\d{3}[ .]?\\d{3}[ .]?\\d{3})(?!\\d)`, "giu");

// ---------------------------------------------------------------------------
// Números de cliente / contrato

const VALOR_NUMERO = "([A-Z]{0,4}[ ./-]?\\d[\\dA-Z./-]{2,28}[\\dA-Z])";
const SEP = "\\s*(?:n\\.?\\s?º|nº|n\\.|número|num\\.?)?\\s*[:.\\-]?\\s*(?:\\n\\s*)?";
const PADROES_CLIENTE = [
  new RegExp(`(?<![\\p{L}])(?:n\\.?\\s?º|nº|n\\.|número|num\\.?|código|c[óo]d\\.?|ref\\.?|refer[êe]ncia)\\s*(?:de\\s+|do\\s+)?(?:cliente|conta)(?![\\p{L}])${SEP}${VALOR_NUMERO}`, "giu"),
  new RegExp(`(?<![\\p{L}])(?:cliente|conta(?:\\s+cliente)?)\\s*(?:n\\.?\\s?º|nº|n\\.|número)\\s*[:.\\-]?\\s*(?:\\n\\s*)?${VALOR_NUMERO}`, "giu"),
  new RegExp(`(?<![\\p{L}])(?:cliente|conta\\s+cliente)\\s*:\\s*(?:\\n\\s*)?${VALOR_NUMERO}`, "giu"),
];
const PADROES_CONTRATO = [
  new RegExp(`(?<![\\p{L}])(?:n\\.?\\s?º|nº|n\\.|número|num\\.?|código|c[óo]d\\.?|ref\\.?|refer[êe]ncia)\\s*(?:de\\s+|do\\s+)?(?:contrato|ades[ãa]o)(?![\\p{L}])${SEP}${VALOR_NUMERO}`, "giu"),
  new RegExp(`(?<![\\p{L}])(?:contrato|conta\\s+(?:de\\s+)?contrato|ades[ãa]o)\\s*(?:n\\.?\\s?º|nº|n\\.|número)\\s*[:.\\-]?\\s*(?:\\n\\s*)?${VALOR_NUMERO}`, "giu"),
  new RegExp(`(?<![\\p{L}])contrato\\s*:\\s*(?:\\n\\s*)?${VALOR_NUMERO}`, "giu"),
];

function limparNumero(v: string) {
  return v.replace(/[./-]+$/, "").trim();
}

/** Para comparar: só letras e algarismos, sem zeros à esquerda. */
function chaveNumero(v: string) {
  const n = semAcentos(v).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^\d+$/.test(n) ? n.replace(/^0+(?=\d)/, "") : n;
}

function pareceData(v: string) {
  return /^\d{1,4}[./-]\d{1,2}[./-]\d{1,4}$/.test(v);
}

// ---------------------------------------------------------------------------
// Nome

const PALAVRA_NOME = "[\\p{Lu}][\\p{L}'’.-]*";
const VALOR_NOME = `(${PALAVRA_NOME}(?:[ ]+(?:(?:d[aeo]s?|e|D[AEO]S?|E)[ ]+)?${PALAVRA_NOME}){1,6})`;
const NOME_COMPLETO = new RegExp(`^${VALOR_NOME}$`, "u");
// Rótulo no início da coluna ("Tipo de cliente: Particular" não conta).
// "Nome" e "Cliente" só com dois pontos; "Titular" também sem.
const ROTULO_NOME = /^(nome\s+do\s+(?:titular|cliente)|titular(?:\s+do\s+contrato)?|nome(?:\s+completo)?|cliente)\s*(:)?\s*(.*)$/iu;

// Palavras que indicam uma entidade (nunca o nome do consumidor).
const PALAVRAS_EMPRESA =
  /\bS\.\s?A\.|\bSA\b|\b(?:Lda\.?|Limitada|Unipessoal|Sociedade|Comunica[çc][õo]es|Telecomunica[çc][õo]es|Energia|Servi[çc]os|Portugal|Comercializa[çc][ãa]o|Distribui[çc][ãa]o|Fatura|Factura|Contrato|Cliente|NIF|NIPC|Morada|Total|Data|Per[íi]odo|Valor|Pagamento|Refer[êe]ncia)\b/i;

function nomePlausivel(nome: string) {
  const palavras = nome.split(/\s+/).filter((p) => !PARTICULAS.has(p.toLowerCase()));
  return palavras.length >= 2 && palavras.length <= 6 && !PALAVRAS_EMPRESA.test(nome) && !/\d/.test(nome) && nome.length <= 80;
}

// ---------------------------------------------------------------------------
// Morada

const POSTAL = /\b(\d{4})\s?-\s?(\d{3})\b[ ]*([\p{L}][\p{L} .'’-]{1,40})?/u;
const ROTULO_MORADA =
  /^(?:(Morada|Endere[çc]o)(?:\s+(?:de\s+)?(fatura[çc][ãa]o|factura[çc][ãa]o|do\s+cliente|do\s+titular|fiscal|de\s+correspond[êe]ncia|de\s+envio|de\s+instala[çc][ãa]o|do\s+local\s+de\s+consumo))?|(Local\s+de\s+(?:consumo|instala[çc][ãa]o|fornecimento)))\s*:?\s*(.*)$/iu;
const MARCAS_EMPRESA_MORADA = /\bS\.\s?A\.|\bSA\b|\b(?:Lda\.?|NIPC|Capital\s+social|Matr[íi]cula|Conservat[óo]ria|Sede|Apartado)\b|www\.|@/iu;
const TIPO_VIA = /^(?:Rua|R\.|Avenida|Av\.?|Travessa|Tv\.?|Largo|Praça|Praceta|Estrada|Estr\.|Alameda|Calçada|Beco|Urbanização|Urb\.|Bairro|Quinta|Lugar|Lg\.|Pct\.|Edifício|Ed\.)\s/iu;

type BlocoMorada = { texto: string; instalacao: boolean };

/** Junta a linha da via e as seguintes até ao código postal (máx. 3 linhas). */
function blocoAteCodigoPostal(linhas: string[], inicio: string, i: number): string | null {
  const partes: string[] = [];
  if (inicio) partes.push(inicio);
  if (inicio && POSTAL.test(inicio)) return partes.join(", ");
  for (let j = i + 1; j < Math.min(linhas.length, i + 4); j++) {
    const l = linhas[j].split("\t")[0].trim();
    if (!l) continue;
    if (ROTULO_MORADA.test(l) || /:\s*$/.test(l)) return null;
    partes.push(l);
    if (POSTAL.test(l)) return partes.join(", ");
  }
  return null;
}

function formatarMorada(t: string) {
  return t
    .split(/\s*,\s*/)
    .filter(Boolean)
    .map((p) => capitalizar(p.replace(/\s+/g, " ").trim()))
    .join(", ")
    .replace(/(\d{4})\s?-\s?(\d{3})/, "$1-$2");
}

function chaveMorada(t: string) {
  return semAcentos(t).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// ---------------------------------------------------------------------------
// Extração

type Achado = { valor: string; pagina: number; rotulo: string };

function distintos<T extends Achado>(achados: T[], chave: (v: string) => string) {
  const mapa = new Map<string, T>();
  for (const a of achados) if (!mapa.has(chave(a.valor))) mapa.set(chave(a.valor), a);
  return [...mapa.values()];
}

const origem = (rotulo: string, pagina: number, total: number) => (total > 1 ? `${rotulo} (página ${pagina})` : rotulo);

function vazio(campo: CampoIdentificacao): CampoExtraido {
  return { campo, marcador: MARCADOR[campo], valor: null, confianca: null, origem: null, candidatos: [], avisos: [] };
}

function extrairNif(paginas: string[][], opcoes: OpcoesExtracao): CampoExtraido {
  const r = vazio("nif");
  const achados: Achado[] = [];
  let invalidos = 0;
  paginas.forEach((linhas, p) => {
    const texto = linhas.join("\n");
    for (const m of texto.matchAll(PADRAO_NIF)) {
      const digitos = m[1].replace(/\D/g, "");
      if (!nifValido(digitos)) {
        invalidos++;
        continue;
      }
      if (!nifPessoaSingular(digitos)) continue;
      achados.push({ valor: digitos, pagina: p + 1, rotulo: `Rótulo «${m[0].split(/[\s:.\-]*\d/)[0].trim()}»` });
    }
  });
  const unicos = distintos(achados, (v) => v);
  if (unicos.length === 0) {
    if (invalidos > 0) r.avisos.push("Foi encontrado um número junto de «NIF», mas não é um NIF válido. Confirme no documento.");
    return r;
  }
  if (unicos.length > 1) {
    r.confianca = "duvida";
    r.candidatos = unicos.map((a) => a.valor);
    r.avisos.push("O documento tem mais de um NIF de pessoa singular. Escolha o do cliente.");
    return r;
  }
  const [a] = unicos;
  const verificacao = opcoes.verificarNif?.(a.valor) ?? "sem_dado";
  if (verificacao === "diferente") {
    r.confianca = "duvida";
    r.candidatos = [a.valor];
    r.avisos.push("Este NIF não confere com o NIF registado no serviço acompanhado. O documento pode ser de outro titular.");
    return r;
  }
  r.valor = a.valor;
  r.confianca = verificacao === "igual" ? "confirmado" : "provavel";
  r.origem = origem(a.rotulo, a.pagina, paginas.length) + (verificacao === "igual" ? " · confere com o serviço acompanhado" : "");
  return r;
}

function extrairNumero(paginas: string[][], opcoes: OpcoesExtracao, nif: string | null): CampoExtraido {
  const r = vazio("numero");
  const ler = (padroes: RegExp[], rotulo: string) => {
    const achados: Achado[] = [];
    paginas.forEach((linhas, p) => {
      const texto = linhas.join("\n");
      for (const padrao of padroes) {
        for (const m of texto.matchAll(padrao)) {
          const valor = limparNumero(m[1]);
          const digitos = valor.replace(/\D/g, "");
          if (digitos.length < 4 || pareceData(valor)) continue;
          if (nif && digitos === nif) continue;
          achados.push({ valor, pagina: p + 1, rotulo });
        }
      }
    });
    return distintos(achados, chaveNumero);
  };
  const clientes = ler(PADROES_CLIENTE, "N.º de cliente");
  const contratos = ler(PADROES_CONTRATO, "N.º de contrato");

  const avaliar = (achados: Achado[]) => {
    if (achados.length !== 1) return null;
    const [a] = achados;
    return { a, verificacao: opcoes.verificarNumero?.(a.valor) ?? "sem_dado" };
  };
  // Preferência: n.º de cliente; senão, n.º de contrato.
  const escolhido = avaliar(clientes) ?? (clientes.length === 0 ? avaliar(contratos) : null);
  if (escolhido) {
    const { a, verificacao } = escolhido;
    r.valor = a.valor;
    r.confianca = verificacao === "igual" ? "confirmado" : "provavel";
    r.origem = origem(`Rótulo «${a.rotulo}»`, a.pagina, paginas.length) + (verificacao === "igual" ? " · confere com o serviço acompanhado" : "");
    if (clientes.length === 1 && contratos.length === 1 && chaveNumero(contratos[0].valor) !== chaveNumero(a.valor)) {
      r.candidatos = [a.valor, contratos[0].valor];
      r.avisos.push(`O documento também indica o n.º de contrato ${contratos[0].valor}.`);
    }
    return r;
  }
  const todos = [...clientes, ...contratos];
  if (todos.length > 0) {
    r.confianca = "duvida";
    r.candidatos = distintos(todos, chaveNumero).map((a) => a.valor);
    r.avisos.push("O documento tem mais de um número de cliente ou de contrato. Escolha o que identifica o cliente nesta reclamação.");
  }
  return r;
}

function extrairNome(paginas: string[][], opcoes: OpcoesExtracao): CampoExtraido & { _linha?: { pagina: number; indice: number } } {
  const r: CampoExtraido & { _linha?: { pagina: number; indice: number } } = vazio("nome");
  const chaveCaso = chaveNome(opcoes.nomeCaso);
  const achados: (Achado & { indice: number })[] = [];

  paginas.forEach((linhas, p) => {
    linhas.forEach((linha, i) => {
      for (const coluna of linha.split("\t")) {
        const m = ROTULO_NOME.exec(coluna.trim());
        if (!m) continue;
        const rotulo = m[1].replace(/\s+/g, " ");
        if (!m[2] && !/^(?:titular|nome do)/i.test(rotulo)) continue;
        // Valor na mesma coluna ou, se vazia, na linha seguinte.
        const valor = (m[3] || (linhas[i + 1] ?? "").split("\t")[0]).trim();
        const indice = m[3] ? i : i + 1;
        if (NOME_COMPLETO.test(valor) && nomePlausivel(valor)) {
          achados.push({ valor: capitalizar(valor), pagina: p + 1, rotulo: `Rótulo «${capitalizar(rotulo)}»`, indice });
        }
      }
    });
  });

  // Sem rótulo: uma linha que é só o nome indicado no caso (bloco do
  // destinatário da fatura, normalmente seguido da morada).
  if (chaveCaso) {
    paginas.forEach((linhas, p) => {
      linhas.forEach((linha, i) => {
        const coluna = linha.split("\t")[0].trim();
        if (/^[\p{L}'’.\s-]+$/u.test(coluna) && nomePlausivel(coluna) && chaveNome(coluna) === chaveCaso) {
          achados.push({ valor: capitalizar(coluna), pagina: p + 1, rotulo: "Bloco do destinatário", indice: i });
        }
      });
    });
  }

  const unicos = distintos(achados, (v) => chaveNome(v) ?? v);
  if (unicos.length === 0) return r;
  if (unicos.length > 1) {
    r.confianca = "duvida";
    r.candidatos = unicos.map((a) => a.valor);
    r.avisos.push("O documento tem mais de um nome. Escolha o do titular.");
    return r;
  }
  const [a] = unicos;
  r._linha = { pagina: a.pagina - 1, indice: a.indice };
  if (chaveCaso && chaveNome(a.valor) !== chaveCaso) {
    r.confianca = "duvida";
    r.candidatos = [a.valor];
    r.avisos.push("O titular do documento não corresponde ao nome indicado no caso. Confirme quem apresenta a reclamação.");
    return r;
  }
  r.valor = a.valor;
  r.confianca = chaveCaso ? "confirmado" : "provavel";
  r.origem = origem(a.rotulo, a.pagina, paginas.length) + (chaveCaso ? " · confere com o nome do caso" : "");
  return r;
}

function extrairMorada(paginas: string[][], linhaNome: { pagina: number; indice: number } | undefined): CampoExtraido {
  const r = vazio("morada");
  const achados: (Achado & BlocoMorada)[] = [];

  paginas.forEach((linhas, p) => {
    linhas.forEach((linha, i) => {
      const coluna = linha.split("\t")[0].trim();
      const m = ROTULO_MORADA.exec(coluna);
      if (!m) return;
      const qualificador = (m[2] ?? m[3] ?? "").toLowerCase();
      const instalacao = /instala|consumo|fornecimento/.test(qualificador);
      const bloco = blocoAteCodigoPostal(linhas, (m[4] ?? "").trim(), i);
      if (!bloco || MARCAS_EMPRESA_MORADA.test(bloco)) return;
      achados.push({ valor: formatarMorada(bloco), pagina: p + 1, rotulo: `Rótulo «${coluna.slice(0, coluna.length - (m[4] ?? "").length).replace(/:\s*$/, "").trim()}»`, texto: bloco, instalacao });
    });
  });

  // Sem rótulo: a via logo a seguir ao nome do titular (bloco do destinatário).
  if (linhaNome) {
    const linhas = paginas[linhaNome.pagina];
    const seguinte = linhas.slice(linhaNome.indice + 1, linhaNome.indice + 3).findIndex((l) => TIPO_VIA.test(l.split("\t")[0].trim()));
    if (seguinte >= 0) {
      const i = linhaNome.indice + 1 + seguinte;
      const bloco = blocoAteCodigoPostal(linhas, linhas[i].split("\t")[0].trim(), i);
      if (bloco && !MARCAS_EMPRESA_MORADA.test(bloco)) {
        achados.push({ valor: formatarMorada(bloco), pagina: linhaNome.pagina + 1, rotulo: "Bloco do destinatário", texto: bloco, instalacao: false });
      }
    }
  }

  const principais = distintos(achados.filter((a) => !a.instalacao), chaveMorada);
  const instalacao = distintos(achados.filter((a) => a.instalacao), chaveMorada);
  if (principais.length === 1) {
    const [a] = principais;
    r.valor = a.valor;
    r.confianca = "provavel";
    r.origem = origem(a.rotulo, a.pagina, paginas.length);
    if (instalacao.some((x) => chaveMorada(x.valor) !== chaveMorada(a.valor))) {
      r.avisos.push("O documento indica também uma morada de instalação/consumo diferente. Confirme qual é a morada do cliente.");
    }
    return r;
  }
  const todas = distintos([...principais, ...instalacao], chaveMorada);
  if (todas.length > 0) {
    r.confianca = "duvida";
    r.candidatos = todas.map((a) => a.valor);
    r.avisos.push(
      principais.length > 1
        ? "O documento tem mais de uma morada. Escolha a do cliente."
        : "Só foi encontrada a morada de instalação/consumo. Confirme se é a morada do cliente.",
    );
  }
  return r;
}

/**
 * Lê os dados de identificação do texto de um documento (uma entrada por
 * página). Os valores devolvidos só existem enquanto quem chama os usa.
 */
export function extrairCampos(paginasTexto: string[], opcoes: OpcoesExtracao = {}): CampoExtraido[] {
  const paginas = normalizarLinhas(paginasTexto);
  const nif = extrairNif(paginas, opcoes);
  const { _linha, ...nome } = extrairNome(paginas, opcoes);
  const morada = extrairMorada(paginas, _linha);
  const numero = extrairNumero(paginas, opcoes, nif.valor ?? nif.candidatos[0] ?? null);
  return [nome, nif, morada, numero];
}

/** Um valor só é inserido por omissão quando não há dúvida. */
export function preSelecionado(c: CampoExtraido) {
  return !!c.valor && (c.confianca === "confirmado" || c.confianca === "provavel");
}

// ---------------------------------------------------------------------------
// Texto da reclamação

function escaparRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function padraoMarcador(campo: CampoIdentificacao) {
  return new RegExp(ALIASES[campo].map(escaparRegex).join("|"), "giu");
}

/** Marcadores de identificação ainda presentes no texto. */
export function marcadoresPresentes(texto: string): CampoIdentificacao[] {
  return CAMPOS.filter((c) => padraoMarcador(c).test(texto));
}

/** Qualquer marcador por preencher ("[NIF]", "[DATA]", …) — aviso antes do envio ao cliente. */
export function marcadoresPorPreencher(texto: string): string[] {
  const encontrados = texto.match(/\[(?:[A-ZÀ-Ý0-9][A-ZÀ-Ý0-9 .ºª\/-]{1,48})\]/gu) ?? [];
  return [...new Set(encontrados)];
}

export type Insercao = { campo: CampoIdentificacao; valor: string; ocorrencias: number };

/** Substitui os marcadores pelos valores escolhidos (só os campos indicados). */
export function inserirValores(texto: string, valores: Partial<Record<CampoIdentificacao, string>>): { texto: string; insercoes: Insercao[] } {
  let t = texto;
  const insercoes: Insercao[] = [];
  for (const campo of CAMPOS) {
    const valor = valores[campo]?.trim();
    if (!valor) continue;
    let ocorrencias = 0;
    t = t.replace(padraoMarcador(campo), () => {
      ocorrencias++;
      return valor;
    });
    if (ocorrencias > 0) insercoes.push({ campo, valor, ocorrencias });
  }
  return { texto: t, insercoes };
}
