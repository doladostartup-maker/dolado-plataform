// Landing das campanhas Meta Ads "Sabe mesmo o que está a pagar?"
// (/analisar-fatura, 22/10/2026) — regras sem I/O (analisarFatura.test.mjs).
//
// Substitui /30-dias-gratis como destino dos anúncios: a proposta deixa de
// ser experimentar a Protecção e passa a ser a análise gratuita de uma
// factura (o diagnóstico gratuito sem registo, src/lib/diagnostico/). Com o
// diagnóstico ligado (DIAGNOSTICO_GRATUITO_ATIVO), o middleware leva
// /30-dias-gratis para aqui com os mesmos parâmetros (UTM, fbclid); sem ele,
// esta página leva à página da Protecção e a landing antiga continua.

export const CAMINHO_ANALISAR_FATURA = "/analisar-fatura";
/** Origem do resultado aberto a partir desta landing (só apresentação: muda a secção da Protecção). */
export const ORIGEM_ANALISAR_FATURA = "analisar_fatura";

/** Destino de /30-dias-gratis (mantém o prefixo /en, se existir). */
export function caminhoAnalisarFaturaDe(pathname: string): string {
  return pathname.startsWith("/en/") ? `/en${CAMINHO_ANALISAR_FATURA}` : CAMINHO_ANALISAR_FATURA;
}

/**
 * Exemplo ilustrativo da landing (factura de electricidade fictícia), em
 * cêntimos. O total e as cobranças que não se repetem são calculados, nunca
 * escritos à mão. As chaves das linhas são os textos do dicionário.
 */
export const EXEMPLO_FACTURA = [
  { chave: "energia", valorCents: 4125, recorrente: true },
  { chave: "potencia", valorCents: 1032, recorrente: true },
  { chave: "taxas", valorCents: 1186, recorrente: true },
  { chave: "acerto", valorCents: 740, recorrente: false },
] as const;

export function totaisExemplo() {
  const totalCents = EXEMPLO_FACTURA.reduce((s, l) => s + l.valorCents, 0);
  const pontuais = EXEMPLO_FACTURA.filter((l) => !l.recorrente);
  return { totalCents, pontuaisCents: pontuais.reduce((s, l) => s + l.valorCents, 0), pontuais: pontuais.length };
}
