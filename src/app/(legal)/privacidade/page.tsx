import type { Metadata } from "next";
import { PRIVACIDADE_VERSAO } from "@/lib/legal";
import { VERSOES_PRIVACIDADE } from "./_versoes";

export const metadata: Metadata = {
  title: "Política de Privacidade — DoLado",
};

/** Versão em vigor (PRIVACIDADE_VERSAO). As anteriores estão em /privacidade/<versão>. */
export default function PrivacidadePage() {
  const Politica = VERSOES_PRIVACIDADE[PRIVACIDADE_VERSAO];
  return <Politica />;
}
