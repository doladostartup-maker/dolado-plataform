import Link from "next/link";
import { destinoSeguro } from "@/lib/destinoAuth";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_SECUNDARIO, TEXTO, TEXTO_SECUNDARIO } from "@/components/portal/ui";

export const metadata = { title: "Confirme o seu e-mail — DoLado", robots: { index: false } };

// Depois de criar a conta por e-mail (registo, criação de conta a seguir ao
// pagamento): a ligação do e-mail abre /auth/callback, que continua no
// destino guardado neste browser. Esta página não recebe dados pessoais.
export default async function ConfirmarEmailPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = destinoSeguro((await searchParams).next);

  return (
    <MolduraConta contexto="Conta criada" titulo="Confirme o seu e-mail">
      <p className={TEXTO}>
        Enviámos-lhe uma mensagem. Para continuar, abra o e-mail e carregue em <strong>Confirmar o meu e-mail</strong>,
        de preferência neste mesmo dispositivo e navegador: continua exatamente onde estava.
      </p>
      <p className={TEXTO_SECUNDARIO}>Não encontra a mensagem? Verifique a pasta de spam ou de promoções.</p>
      <Link href={`/login?next=${encodeURIComponent(next)}`} className={BOTAO_SECUNDARIO}>
        Já confirmei — iniciar sessão
      </Link>
    </MolduraConta>
  );
}
