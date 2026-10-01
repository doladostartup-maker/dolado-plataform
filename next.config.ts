import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Uploads do backoffice (anexos e comprovativos) por Server Action: os
    // buckets aceitam até 20 MB; o limite por omissão (1 MB) cortava PDFs.
    serverActions: { bodySizeLimit: "21mb" },
  },
};

export default nextConfig;
