import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Uploads do backoffice (anexos e comprovativos) por Server Action: os
    // buckets aceitam até 20 MB; o limite por omissão (1 MB) cortava PDFs.
    serverActions: { bodySizeLimit: "21mb" },
  },
  // Páginas antigas que abriam casos sem pagamento: os links que ainda
  // existam passam a levar ao início de "Tratar o meu caso" (ou à homepage).
  async redirects() {
    return [
      { source: "/pedido-classico", destination: "/tratar-caso", permanent: true },
      { source: "/home-anterior", destination: "/", permanent: true },
      // O Simulador de Elegibilidade saiu do portal (01/10/2026): é público,
      // sem conta. Redirect aqui, antes do middleware e do login do portal.
      { source: "/portal/elegibilidade", destination: "/simulador-elegibilidade", permanent: true },
      // "Porquê subscrever" (02/10/2026): página órfã desde que "Planos" passou
      // a apontar para o preçário, com um alerta grátis que nenhuma rotina
      // enviava. Os alertas de fidelização são da Proteção (/portal/contratos).
      { source: "/por-que-assinar", destination: "/precario", permanent: true },
      // Página de teste da homepage V2 (04/10/2026): passou a ser a homepage "/".
      { source: "/landing-v2", destination: "/", permanent: false },
      // Monitor de Proteção (PR B): alertas de fidelização, de promoção e
      // comparador de faturas passaram a "Os meus contratos".
      { source: "/portal/alertas/:caminho*", destination: "/portal/contratos", permanent: true },
      { source: "/portal/promocoes/:caminho*", destination: "/portal/contratos", permanent: true },
      { source: "/portal/faturas/:caminho*", destination: "/portal/contratos", permanent: true },
      { source: "/backoffice/faturas/:caminho*", destination: "/backoffice/monitor", permanent: true },
    ];
  },
};

export default nextConfig;
