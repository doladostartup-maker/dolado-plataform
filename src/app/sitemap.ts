import type { MetadataRoute } from "next";
import { entradasSitemap } from "@/lib/seo/indexacao";

// /sitemap.xml — páginas públicas indexáveis (pt-PT e en-GB, com hreflang).
// Lista e regras em src/lib/seo/indexacao.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  return entradasSitemap();
}
