import type { Metadata } from "next";
import { TERMOS_VERSAO } from "@/lib/legal";
import { VERSOES_TERMOS } from "./_versoes";

export const metadata: Metadata = {
  title: "Termos e Condições — DoLado",
};

/** Versão em vigor (TERMOS_VERSAO). As anteriores estão em /termos/<versão>. */
export default function TermosPage() {
  const Termos = VERSOES_TERMOS[TERMOS_VERSAO];
  return <Termos />;
}
