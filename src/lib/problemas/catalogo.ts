// Páginas públicas "Problemas que tratamos" (/problemas, /problemas/<categoria>,
// /problemas/<categoria>/<problema>) — estrutura sem I/O e sem textos.
//
// Fonte única de: rotas estáticas (generateStaticParams), sitemap
// (src/lib/seo/indexacao.ts), ligações internas (relacionados) e
// pré-preenchimento de "Tratar o meu caso". Os textos visíveis vivem em
// src/i18n/mensagens/{pt-PT,en-GB}/problemas.ts, com uma entrada por slug.
//
// Acrescentar um problema: uma linha em `problemas` da categoria + o texto nas
// duas línguas (o teste problemas.test.mjs confirma que nada fica sem texto,
// sem relacionados válidos ou com valores de pré-preenchimento inexistentes).
// Uma categoria só ganha página quando tiver problemas (`problemas` não vazio);
// até lá aparece em /problemas com ligação direta a "Tratar o meu caso".
//
// Nunca páginas por marca (/reclamar/<empresa>) — decisão de 12/10/2026.

export const CAMINHO_PROBLEMAS = "/problemas";
export const CAMINHO_SIMULADOR = "/simulador-elegibilidade";

export type Problema = {
  slug: string;
  /** Valor de "O que aconteceu?" em /tratar-caso (PROBLEMAS_POR_SETOR); vazio = o cliente escolhe. */
  problemaCaso?: string;
  /** 2 a 4 problemas da mesma categoria (slugs). */
  relacionados: string[];
};

export type Categoria = {
  slug: string;
  /** Setor de /tratar-caso (SETORES em src/lib/pedidoCaso.ts). */
  setor: string;
  problemas: Problema[];
};

export const CATEGORIAS: Categoria[] = [
  {
    slug: "telecomunicacoes",
    setor: "Telecomunicações",
    problemas: [
      {
        slug: "aumento-preco",
        problemaCaso: "Aumento de mensalidade",
        relacionados: ["cancelar-fidelizacao", "cobranca-indevida", "servico-nao-funciona"],
      },
      {
        slug: "cancelar-fidelizacao",
        problemaCaso: "Fidelização ou penalização",
        relacionados: ["aumento-preco", "servico-nao-funciona", "cobranca-apos-cancelamento"],
      },
      {
        slug: "cobranca-indevida",
        problemaCaso: "Cobrança indevida",
        relacionados: ["cobranca-apos-cancelamento", "aumento-preco", "servico-nao-funciona"],
      },
      {
        slug: "cobranca-apos-cancelamento",
        problemaCaso: "Cobrança indevida",
        relacionados: ["cobranca-indevida", "cancelar-fidelizacao", "aumento-preco"],
      },
      {
        slug: "servico-nao-funciona",
        problemaCaso: "Corte ou falha de serviço",
        relacionados: ["cancelar-fidelizacao", "cobranca-indevida", "aumento-preco"],
      },
    ],
  },
  {
    slug: "energia",
    setor: "Energia",
    problemas: [
      // "Fatura muito alta" e "consumos estimados" pré-preenchem o tipo
      // "Factura alta, estimativa ou acerto" (20/10/2026) — nunca "cobrança
      // indevida", que pressupõe um valor que não devia estar na factura.
      {
        slug: "fatura-muito-alta",
        problemaCaso: "Factura alta, estimativa ou acerto",
        relacionados: ["consumos-estimados", "cobranca-indevida"],
      },
      {
        slug: "cobranca-indevida",
        problemaCaso: "Cobrança indevida",
        relacionados: ["fatura-muito-alta", "consumos-estimados", "falta-de-luz"],
      },
      {
        slug: "consumos-estimados",
        problemaCaso: "Factura alta, estimativa ou acerto",
        relacionados: ["fatura-muito-alta", "cobranca-indevida"],
      },
      // Falhas de electricidade (20/10/2026): interrupções, compensação na
      // factura e danos — docs/legal/auditoria-interrupcoes-electricidade-2026-10-20.md.
      {
        slug: "falta-de-luz",
        problemaCaso: "Corte ou falha de serviço",
        relacionados: ["fatura-muito-alta", "cobranca-indevida"],
      },
    ],
  },
  {
    slug: "compras-reembolsos",
    setor: "Compras & Reembolsos",
    problemas: [
      {
        slug: "loja-nao-devolve-dinheiro",
        problemaCaso: "Devolução ou reembolso em falta",
        relacionados: ["compra-online", "encomenda-nao-entregue", "produto-com-defeito"],
      },
      { slug: "compra-online", relacionados: ["encomenda-nao-entregue", "loja-nao-devolve-dinheiro", "produto-com-defeito"] },
      {
        slug: "produto-com-defeito",
        problemaCaso: "Produto com defeito",
        relacionados: ["garantia", "loja-nao-devolve-dinheiro", "compra-online"],
      },
      {
        slug: "garantia",
        problemaCaso: "Garantia recusada",
        relacionados: ["produto-com-defeito", "loja-nao-devolve-dinheiro", "compra-online"],
      },
      {
        slug: "encomenda-nao-entregue",
        problemaCaso: "Encomenda não entregue",
        relacionados: ["compra-online", "loja-nao-devolve-dinheiro", "produto-com-defeito"],
      },
    ],
  },
  // Fase seguinte: páginas de problema de Gás e Água. Até lá, sem página de
  // categoria (evita páginas vazias); /problemas mostra-as com ligação direta
  // a "Tratar o meu caso" com o setor pré-preenchido.
  { slug: "gas", setor: "Gás", problemas: [] },
  { slug: "agua", setor: "Água", problemas: [] },
  // Ginásios: setor aceite em /tratar-caso (SETORES) e no Simulador; sem
  // páginas de problema por agora, como Gás e Água (17/10/2026).
  { slug: "ginasios", setor: "Ginásios", problemas: [] },
];

/** Categoria com página própria (tem pelo menos um problema). */
export function temPagina(categoria: Categoria) {
  return categoria.problemas.length > 0;
}

export function categoriasComPagina() {
  return CATEGORIAS.filter(temPagina);
}

export function obterCategoria(slug: string) {
  return CATEGORIAS.find((c) => c.slug === slug && temPagina(c)) ?? null;
}

export function obterProblema(categoria: string, slug: string) {
  const c = obterCategoria(categoria);
  const p = c?.problemas.find((x) => x.slug === slug);
  return c && p ? { categoria: c, problema: p } : null;
}

export function caminhoCategoria(categoria: string) {
  return `${CAMINHO_PROBLEMAS}/${categoria}`;
}

export function caminhoProblema(categoria: string, problema: string) {
  return `${CAMINHO_PROBLEMAS}/${categoria}/${problema}`;
}

/** Todos os caminhos públicos destas páginas (sitemap, testes). */
export function caminhosProblemas(): string[] {
  return [
    CAMINHO_PROBLEMAS,
    ...categoriasComPagina().flatMap((c) => [caminhoCategoria(c.slug), ...c.problemas.map((p) => caminhoProblema(c.slug, p.slug))]),
  ];
}

/** /problemas e tudo o que estiver por baixo (middleware). */
export function ehCaminhoDeProblemas(caminho: string) {
  return caminho === CAMINHO_PROBLEMAS || caminho.startsWith(`${CAMINHO_PROBLEMAS}/`);
}

/**
 * Parâmetros de /tratar-caso: a origem é sempre a página (pedidos_caso.origem
 * — é assim que se mede o negócio vindo destas páginas), com o setor e, quando
 * existe correspondência exata, o tipo de problema. /tratar-caso só aceita
 * valores das listas fechadas.
 */
export function parametrosTratarCaso(origem: string, setor: string, problemaCaso?: string) {
  const p = new URLSearchParams({ origem, setor });
  if (problemaCaso) p.set("problema", problemaCaso);
  return p.toString();
}
