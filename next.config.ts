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
    ];
  },
};

export default nextConfig;
