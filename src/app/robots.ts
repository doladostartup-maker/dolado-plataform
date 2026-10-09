import type { MetadataRoute } from "next";
import { regrasRobots } from "@/lib/seo/indexacao";

// /robots.txt — servido diretamente em dolado.pt (sem redirecionar para o
// portal; ver o middleware). Regras em src/lib/seo/indexacao.ts.
export default function robots(): MetadataRoute.Robots {
  return regrasRobots();
}
