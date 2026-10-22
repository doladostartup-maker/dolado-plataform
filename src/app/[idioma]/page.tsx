import type { Metadata } from "next";
import { HomepageDiagnostico } from "@/components/homepage-v2/HomepageDiagnostico";
import { HomepageV2 } from "@/components/homepage-v2/HomepageV2";
import { PaginaV2 } from "@/components/marketing-v2/PaginaV2";
import { metadadosPublicos } from "@/i18n/metadados";
import { tInicio } from "@/i18n/mensagens/inicio";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { diagnosticoAtivo } from "@/lib/diagnostico/regras";
import { ofertaProtecaoGratuitaPublica } from "@/lib/site";

export async function generateMetadata({ params }: ComIdioma): Promise<Metadata> {
  const idioma = await idiomaDaPagina(params);
  const t = tInicio[idioma].metadados;
  return metadadosPublicos(idioma, "/", { title: t.titulo, description: t.descricao });
}

export default async function LandingPage({ params }: ComIdioma) {
  await idiomaDaPagina(params);
  return (
    <PaginaV2 eventoCtaNavbar="click_nav_reclamacao" chatEmDireto ctaNavbarDiscreto={diagnosticoAtivo()}>
      {/* Com a análise gratuita ligada (lido no build), a homepage abre pelo
          carregamento do documento; sem ela, fica a entrada "Tratar do meu caso". */}
      {diagnosticoAtivo() ? (
        <HomepageDiagnostico protecaoGratuita={ofertaProtecaoGratuitaPublica()} />
      ) : (
        <HomepageV2 protecaoGratuita={ofertaProtecaoGratuitaPublica()} />
      )}
    </PaginaV2>
  );
}
