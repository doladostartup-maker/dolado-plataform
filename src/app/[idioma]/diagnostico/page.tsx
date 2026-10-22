import { SeletorIdioma } from "@/components/idioma/SeletorIdioma";
import { Logotipo } from "@/components/marketing-v2/Logotipo";
import { fonteV2 } from "@/components/marketing-v2/fonte";
import { tDiagnostico } from "@/i18n/mensagens/diagnostico";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { utilizadorAtual } from "@/lib/auth";
import { associarDiagnosticosDaSessao } from "@/lib/diagnostico/cookie";
import { diagnosticoAtivo } from "@/lib/diagnostico/regras";
import { ORIGEM_ANALISAR_FATURA } from "@/lib/analisarFatura";
import { ResultadoDiagnostico } from "./ResultadoDiagnostico";

export async function generateMetadata({ params }: ComIdioma) {
  return { title: tDiagnostico[await idiomaDaPagina(params)].pagina.metadados, robots: { index: false } };
}

export const dynamic = "force-dynamic";

// Resultado do diagnóstico gratuito sem registo, em portal.dolado.pt (onde a
// conta é criada). Sem sessão: só a sessão anónima do cookie (o mesmo browser)
// abre o diagnóstico. Com sessão: os diagnósticos concluídos deste browser
// ficam ligados à conta (ex.: regresso do registo por "Guardar o meu
// resultado"). Sem medição no browser: o portal não tem Cookiebot.
export default async function DiagnosticoPage({
  searchParams,
  params,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> } & ComIdioma) {
  await idiomaDaPagina(params);
  const consulta = await searchParams;
  const id = typeof consulta.id === "string" && /^[0-9a-f-]{36}$/i.test(consulta.id) ? consulta.id : null;
  // Só a origem conhecida (landing /analisar-fatura) muda a apresentação.
  const origem = consulta.origem === ORIGEM_ANALISAR_FATURA ? ORIGEM_ANALISAR_FATURA : null;
  const { user } = await utilizadorAtual();
  if (user) await associarDiagnosticosDaSessao(user.id);

  return (
    <div className={`tema-portal ${fonteV2.className} flex min-h-screen flex-col bg-[#F7F9FC] text-[var(--v2-navy)] antialiased`}>
      <header className="border-b border-[var(--v2-line)] bg-white">
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center justify-between gap-3 px-4">
          <Logotipo />
          <SeletorIdioma compacto />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:py-10">
        <ResultadoDiagnostico id={id} temConta={!!user} ativo={diagnosticoAtivo()} origem={origem} />
      </main>
    </div>
  );
}
