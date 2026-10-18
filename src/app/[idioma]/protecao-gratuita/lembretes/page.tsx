import { SeletorIdioma } from "@/components/idioma/SeletorIdioma";
import { Logotipo } from "@/components/marketing-v2/Logotipo";
import { fonteV2 } from "@/components/marketing-v2/fonte";
import { CARTAO, TEXTO_SECUNDARIO, TITULO_PAGINA } from "@/components/portal/ui";
import { tProtecaoGratuita } from "@/i18n/mensagens/protecaoGratuita";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { FormularioLembretes } from "./FormularioLembretes";

export async function generateMetadata({ params }: ComIdioma) {
  return { title: tProtecaoGratuita[await idiomaDaPagina(params)].lembretes.metadados, robots: { index: false } };
}

// Ligação "Deixar de receber" dos lembretes opcionais (dias 7 e 25) da
// Proteção gratuita. O GET nunca altera nada (verificadores de ligações dos
// clientes de e-mail): só o botão (POST) e só com o token certo.
export default async function LembretesProtecaoGratuitaPage({
  params,
  searchParams,
}: ComIdioma & { searchParams: Promise<{ id?: string; t?: string }> }) {
  const t = tProtecaoGratuita[await idiomaDaPagina(params)].lembretes;
  const { id = "", t: token = "" } = await searchParams;
  return (
    <div className={`tema-portal ${fonteV2.className} flex min-h-screen flex-col bg-[#F7F9FC] text-[var(--v2-navy)] antialiased`}>
      <header className="border-b border-[var(--v2-line)] bg-white">
        <div className="mx-auto flex h-16 w-full max-w-md items-center justify-between gap-3 px-4">
          <Logotipo />
          <SeletorIdioma compacto />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className={`${CARTAO} flex flex-col gap-5`}>
          <h1 className={TITULO_PAGINA}>{t.titulo}</h1>
          <p className={TEXTO_SECUNDARIO}>{t.texto}</p>
          <FormularioLembretes id={id} token={token} />
        </div>
      </main>
    </div>
  );
}
