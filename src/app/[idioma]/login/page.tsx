import Link from "@/i18n/Link";
import { localizarHref } from "@/i18n/config";
import { tConta, traduzirMensagemConta } from "@/i18n/mensagens/conta";
import { rico } from "@/i18n/Rico";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { ehDestinoSeguro } from "@/lib/destinoAuth";
import { MSG_PALAVRA_PASSE_ALTERADA, ROTA_RECUPERAR } from "@/lib/recuperarPalavraPasse";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta, SeparadorOu } from "@/components/portal/MolduraConta";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, LIGACAO, ROTULO } from "@/components/portal/ui";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
  params: paramsPagina,
}: {
  searchParams: Promise<{ erro?: string; info?: string; next?: string; alterada?: string }>;
} & ComIdioma) {
  const idioma = await idiomaDaPagina(paramsPagina);
  const t = tConta[idioma].login;
  const msg = (m: string) => traduzirMensagemConta(idioma, m);
  const params = await searchParams;
  const next = ehDestinoSeguro(params.next) ? params.next : null;

  return (
    <MolduraConta
      titulo={t.titulo}
      depois={rico(t.naoTemConta, {
        registo: (c) => (
          <Link href={next ? `/registo?next=${encodeURIComponent(next)}` : "/registo"} className={LIGACAO}>
            {c}
          </Link>
        ),
        tratar: (c) => (
          <Link href="/tratar-caso" className={LIGACAO}>
            {c}
          </Link>
        ),
      })}
    >
      {params.alterada === "1" && <Aviso tom="sucesso">{msg(MSG_PALAVRA_PASSE_ALTERADA)}</Aviso>}
      {params.info && <Aviso tom="info">{msg(params.info)}</Aviso>}
      {params.erro && <Aviso tom="erro">{msg(params.erro)}</Aviso>}

      <form action={login} className="flex flex-col gap-4">
        {next && <input type="hidden" name="next" value={next} />}
        <label className={ROTULO}>
          {t.email}
          <input name="email" type="email" autoComplete="email" required className={CAMPO} />
        </label>
        <label className={ROTULO}>
          {t.palavraPasse}
          <input name="password" type="password" autoComplete="current-password" required className={CAMPO} />
        </label>
        <Link href={ROTA_RECUPERAR} prefetch={false} className={`${LIGACAO} -mt-1 self-start text-[14px]`}>
          {t.esqueceu}
        </Link>
        <button type="submit" className={BOTAO_PRIMARIO}>
          {t.entrar}
        </button>
      </form>

      <SeparadorOu texto={tConta[idioma].separadorOu} />

      <a
        href={next ? `/auth/login/google?next=${encodeURIComponent(localizarHref(idioma, next))}` : "/auth/login/google"}
        className={BOTAO_SECUNDARIO}
      >
        {t.google}
      </a>
    </MolduraConta>
  );
}
