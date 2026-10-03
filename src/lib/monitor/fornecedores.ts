// DoLado — nome comercial dos fornecedores (sem I/O; `npm test`).
//
// O documento traz muitas vezes a designação jurídica ("Vodafone Portugal,
// Comunicações Pessoais, S.A."); ao cliente mostra-se o nome comercial
// ("Vodafone"). A lista vem da tabela `fornecedores` (nome comercial, nome
// legal e aliases): acrescentar uma empresa é inserir uma linha.
//
// Correspondência determinística, sem IA:
//   1. o nome lido, normalizado, é igual a um nome/alias normalizado; ou
//   2. o nome lido começa por um nome/alias (palavras inteiras) com pelo
//      menos 4 letras — "Vodafone Portugal SA" → Vodafone. Siglas curtas
//      (NOS, EDP, MEO) só por correspondência exata ou alias completo, para
//      "Nossa Energia" nunca virar NOS.
// Vários candidatos: ganha o alias mais longo. Sem correspondência: mantém
// o nome lido — nunca se inventa uma empresa.

export type Fornecedor = {
  id: string;
  nome_comercial: string;
  nome_legal: string | null;
  aliases: string[];
};

// Formas jurídicas e palavras de ligação que não distinguem empresas.
const PALAVRAS_IGNORADAS = new Set([
  "s",
  "a",
  "sa",
  "lda",
  "limitada",
  "unipessoal",
  "sgps",
  "crl",
  "em",
  "e",
  "sucursal",
]);

export function normalizarNomeEmpresa(nome: string | null | undefined): string {
  return (nome ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((p) => p && !PALAVRAS_IGNORADAS.has(p))
    .join(" ");
}

const PREFIXO_MINIMO = 4;

export function encontrarFornecedor(nomeLido: string | null | undefined, lista: Fornecedor[]): Fornecedor | null {
  const lido = normalizarNomeEmpresa(nomeLido);
  if (!lido) return null;

  let melhor: { fornecedor: Fornecedor; tamanho: number } | null = null;
  for (const f of lista) {
    for (const nome of [f.nome_comercial, f.nome_legal, ...f.aliases]) {
      const chave = normalizarNomeEmpresa(nome);
      if (!chave) continue;
      const exato = lido === chave;
      const prefixo = chave.length >= PREFIXO_MINIMO && lido.startsWith(`${chave} `);
      if ((exato || prefixo) && (!melhor || chave.length > melhor.tamanho)) {
        melhor = { fornecedor: f, tamanho: chave.length };
      }
    }
  }
  return melhor?.fornecedor ?? null;
}

/** Nome a apresentar: o comercial, se houver correspondência; senão o lido. */
export function nomeComercial(nomeLido: string | null | undefined, lista: Fornecedor[]): string | null {
  if (!nomeLido) return nomeLido ?? null;
  return encontrarFornecedor(nomeLido, lista)?.nome_comercial ?? nomeLido;
}
