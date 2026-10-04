import Link from "next/link";
import { ehDestinoSeguro } from "@/lib/destinoAuth";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta, SeparadorOu } from "@/components/portal/MolduraConta";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, LIGACAO, ROTULO } from "@/components/portal/ui";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; info?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = ehDestinoSeguro(params.next) ? params.next : null;

  return (
    <MolduraConta
      titulo="Iniciar sessão"
      depois={
        <>
          Não tem conta?{" "}
          <Link href={next ? `/registo?next=${encodeURIComponent(next)}` : "/registo"} className={LIGACAO}>
            Registe-se
          </Link>
          {" "}· Para tratar um caso,{" "}
          <Link href="/tratar-caso" className={LIGACAO}>
            comece aqui
          </Link>
        </>
      }
    >
      {params.info && <Aviso tom="info">{params.info}</Aviso>}
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}

      <form action={login} className="flex flex-col gap-4">
        {next && <input type="hidden" name="next" value={next} />}
        <label className={ROTULO}>
          E-mail
          <input name="email" type="email" autoComplete="email" required className={CAMPO} />
        </label>
        <label className={ROTULO}>
          Palavra-passe
          <input name="password" type="password" autoComplete="current-password" required className={CAMPO} />
        </label>
        <button type="submit" className={BOTAO_PRIMARIO}>
          Entrar
        </button>
      </form>

      <SeparadorOu />

      <a
        href={next ? `/auth/login/google?next=${encodeURIComponent(next)}` : "/auth/login/google"}
        className={BOTAO_SECUNDARIO}
      >
        Entrar com Google
      </a>
    </MolduraConta>
  );
}
