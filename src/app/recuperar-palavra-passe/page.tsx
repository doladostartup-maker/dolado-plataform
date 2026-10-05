import Link from "next/link";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, LIGACAO, ROTULO, TEXTO_SECUNDARIO } from "@/components/portal/ui";
import { MSG_PEDIDO_RECENTE, MSG_PEDIDO_RECUPERACAO } from "@/lib/recuperarPalavraPasse";
import { pedirRecuperacao } from "./actions";

export const metadata = { title: "Recuperar a palavra-passe — DoLado", robots: { index: false } };

// Pedido do e-mail de recuperação. Nunca mostra o e-mail introduzido nem
// indica se tem conta (ver src/lib/recuperarPalavraPasse.ts).
export default async function RecuperarPalavraPassePage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; recente?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const enviado = params.enviado === "1";

  return (
    <MolduraConta
      titulo={enviado ? "Verifique o seu e-mail" : "Recuperar a palavra-passe"}
      descricao={
        enviado ? undefined : "Indique o e-mail da sua conta. Enviamos-lhe uma ligação para definir uma nova palavra-passe."
      }
      depois={
        <>
          Lembrou-se da palavra-passe?{" "}
          <Link href="/login" prefetch={false} className={LIGACAO}>
            Iniciar sessão
          </Link>
        </>
      }
    >
      {enviado ? (
        <>
          {params.recente === "1" ? (
            <Aviso tom="atencao">{MSG_PEDIDO_RECENTE}</Aviso>
          ) : (
            <Aviso tom="sucesso">{MSG_PEDIDO_RECUPERACAO}</Aviso>
          )}
          <p className={TEXTO_SECUNDARIO}>
            A ligação é válida durante um período limitado e só pode ser usada uma vez. O e-mail pode demorar alguns minutos a
            chegar; verifique também a pasta de spam ou de promoções. Cada novo pedido anula a ligação anterior: use sempre a
            do e-mail mais recente.
          </p>
          <Link href="/recuperar-palavra-passe" prefetch={false} className={BOTAO_SECUNDARIO}>
            Pedir nova ligação
          </Link>
        </>
      ) : (
        <>
          {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}
          <form action={pedirRecuperacao} className="flex flex-col gap-4">
            <label className={ROTULO}>
              E-mail
              <input name="email" type="email" autoComplete="email" required maxLength={254} className={CAMPO} />
            </label>
            <button type="submit" className={BOTAO_PRIMARIO}>
              Enviar ligação
            </button>
          </form>
        </>
      )}
    </MolduraConta>
  );
}
