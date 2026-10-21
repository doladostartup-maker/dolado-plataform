// Excepções documentadas à verificação da ortografia tradicional
// (varrimento.mjs). Cada entrada tem de dizer porquê. Acrescentar aqui só
// texto que tem mesmo de ficar como está — nunca para calar o teste.

/** Ficheiros fora da verificação (caminhos a partir da raiz do repositório). */
export const FICHEIROS_EXCLUIDOS: (string | RegExp)[] = [
  // Versões legais já publicadas: imutáveis (prova do que o cliente aceitou),
  // na grafia em que foram publicadas. As versões novas são verificadas.
  /^src\/app\/\[idioma\]\/\(legal\)\/termos\/_versoes\/v2026-(09-\d\d|10-0\d|10-1[0-8])[a-z]?\.tsx$/,
  /^src\/app\/\[idioma\]\/\(legal\)\/privacidade\/_versoes\/v2026-((09-\d\d|10-0\d|10-1[0-8])[a-z]?|10-19)\.tsx$/,
  // Nomes e preços congelados para essas versões publicadas.
  "src/app/[idioma]/(legal)/termos/_versoes/planosAte20261019.ts",
  "src/app/[idioma]/(legal)/termos/_versoes/precosAte20261018.ts",
  // As próprias regras de conversão e esta lista.
  "src/lib/normaLinguistica/ortografia.ts",
  "src/lib/normaLinguistica/excecoes.ts",
];

/** Textos fora da verificação: `contem` é um excerto do texto; `ficheiro` "*" = qualquer. */
export const EXCECOES: { ficheiro: string; contem: string; motivo: string }[] = [
  {
    ficheiro: "src/lib/monitor/extracaoContrato.ts",
    contem: "És um extrator de dados da DoLado",
    motivo:
      "Prompt de extracção factual (contrato_prompt_v5): não produz texto para o cliente e mudar o texto obriga a nova versão das leituras. Rever na próxima versão do prompt.",
  },
  {
    ficheiro: "src/lib/monitor/extracaoFatura.ts",
    contem: "És um extrator de dados da DoLado",
    motivo:
      "Prompt de extracção factual (fatura_prompt_v3, reutilizado na v4): não produz texto para o cliente e mudar o texto obriga a nova versão das leituras. Rever na próxima versão do prompt.",
  },
  {
    ficheiro: "src/lib/monitor/energia.ts",
    contem: "Bloco \"energia\" (só em facturas de electricidade",
    motivo:
      "Parte do prompt de extracção fatura_prompt_v4: cita os valores fixos do schema (\"eletricidade\", \"gas\"), que são identificadores técnicos e não texto para o cliente.",
  },
  {
    ficheiro: "src/lib/monitor/servidor.ts",
    contem: "Extrai os dados desta fatura.",
    motivo: "Mensagem do mesmo pedido de extracção (versionado com o prompt acima).",
  },
];
