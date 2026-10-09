import Link from "@/i18n/Link";
import { tConta, traduzirMensagemConta } from "@/i18n/mensagens/conta";
import { rico } from "@/i18n/Rico";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { ehDestinoSeguro } from "@/lib/destinoAuth";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_PRIMARIO, CAMPO, LIGACAO, ROTULO } from "@/components/portal/ui";
import { registar } from "./actions";

export default async function RegistoPage({
  searchParams,
  params: paramsPagina,
}: {
  searchParams: Promise<{ erro?: string; next?: string }>;
} & ComIdioma) {
  const idioma = await idiomaDaPagina(paramsPagina);
  const t = tConta[idioma].registo;
  const params = await searchParams;
  const next = ehDestinoSeguro(params.next) ? params.next : null;

  return (
    <MolduraConta
      titulo={t.titulo}
      depois={rico(t.jaTemConta, {
        login: (c) => (
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className={LIGACAO}>
            {c}
          </Link>
        ),
      })}
    >
      {params.erro && <Aviso tom="erro">{traduzirMensagemConta(idioma, params.erro)}</Aviso>}

      <form action={registar} className="flex flex-col gap-4">
        {next && <input type="hidden" name="next" value={next} />}
        <label className={ROTULO}>
          {t.nome}
          <input name="nome" type="text" autoComplete="name" required className={CAMPO} />
        </label>
        <label className={ROTULO}>
          {t.email}
          <input name="email" type="email" autoComplete="email" required className={CAMPO} />
        </label>
        <label className={ROTULO}>
          {t.palavraPasse}
          <input name="password" type="password" autoComplete="new-password" required minLength={6} className={CAMPO} />
        </label>
        <button type="submit" className={BOTAO_PRIMARIO}>
          {t.criar}
        </button>
      </form>
    </MolduraConta>
  );
}
