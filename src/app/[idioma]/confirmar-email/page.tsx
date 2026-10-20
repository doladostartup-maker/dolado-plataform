import Link from "@/i18n/Link";
import { tConta } from "@/i18n/mensagens/conta";
import { rico } from "@/i18n/Rico";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { destinoSeguro } from "@/lib/destinoAuth";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_SECUNDARIO, TEXTO, TEXTO_SECUNDARIO } from "@/components/portal/ui";

export async function generateMetadata({ params }: ComIdioma) {
  return { title: tConta[await idiomaDaPagina(params)].confirmarEmail.metadados, robots: { index: false } };
}

// Depois de criar a conta por e-mail (registo, criação de conta a seguir ao
// pagamento): a ligação do e-mail abre /auth/callback, que continua no
// destino guardado neste browser. Esta página não recebe dados pessoais.
export default async function ConfirmarEmailPage({
  searchParams,
  params,
}: { searchParams: Promise<{ next?: string }> } & ComIdioma) {
  const t = tConta[await idiomaDaPagina(params)].confirmarEmail;
  const next = destinoSeguro((await searchParams).next);

  return (
    <MolduraConta contexto={t.contexto} titulo={t.titulo}>
      <p className={TEXTO}>{rico(t.texto)}</p>
      <p className={TEXTO_SECUNDARIO}>{t.spam}</p>
      <Link href={`/login?next=${encodeURIComponent(next)}`} className={BOTAO_SECUNDARIO}>
        {t.jaConfirmei}
      </Link>
    </MolduraConta>
  );
}
