import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { RegistarIndicacaoComConsentimento } from "@/components/indicacoes/RegistarIndicacaoComConsentimento";
import { MARKETING_SITE_URL } from "@/lib/site";
import { indicacoesAtivas, normalizarCodigo } from "@/lib/indicacoes/regras";

export const metadata: Metadata = {
  title: "Ligação de indicação — DoLado",
  robots: { index: false, follow: false },
};

export default async function PaginaIndicacao({ params }: PageProps<"/r/[codigo]">) {
  const codigo = normalizarCodigo((await params).codigo);
  if (!codigo || !indicacoesAtivas()) redirect(`${MARKETING_SITE_URL}/`);

  return (
    <PaginaV2 eventoCtaNavbar="click_nav_reclamacao">
      <RegistarIndicacaoComConsentimento codigo={codigo} />
    </PaginaV2>
  );
}
