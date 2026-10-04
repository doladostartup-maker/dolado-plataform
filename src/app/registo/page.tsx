import Link from "next/link";
import { ehDestinoSeguro } from "@/lib/destinoAuth";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_PRIMARIO, CAMPO, LIGACAO, ROTULO } from "@/components/portal/ui";
import { registar } from "./actions";

export default async function RegistoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = ehDestinoSeguro(params.next) ? params.next : null;

  return (
    <MolduraConta
      titulo="Criar conta"
      depois={
        <>
          Já tem conta?{" "}
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className={LIGACAO}>
            Entre
          </Link>
        </>
      }
    >
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}

      <form action={registar} className="flex flex-col gap-4">
        {next && <input type="hidden" name="next" value={next} />}
        <label className={ROTULO}>
          Nome
          <input name="nome" type="text" autoComplete="name" required className={CAMPO} />
        </label>
        <label className={ROTULO}>
          E-mail
          <input name="email" type="email" autoComplete="email" required className={CAMPO} />
        </label>
        <label className={ROTULO}>
          Palavra-passe
          <input name="password" type="password" autoComplete="new-password" required minLength={6} className={CAMPO} />
        </label>
        <button type="submit" className={BOTAO_PRIMARIO}>
          Criar conta
        </button>
      </form>
    </MolduraConta>
  );
}
