import Link from "@/i18n/Link";
import { tConta, traduzirMensagemConta } from "@/i18n/mensagens/conta";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import {
  AJUDA_CAMPO,
  BOTAO_PRIMARIO,
  CAMPO,
  LIGACAO,
  ROTULO,
  TEXTO_SECUNDARIO,
} from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import {
  MSG_LIGACAO,
  PALAVRA_PASSE_MIN,
  REQUISITOS_PALAVRA_PASSE,
  ROTA_RECUPERAR,
  codigoPkceComFormatoValido,
  estadoLigacaoValido,
  tokenRecuperacaoComFormatoValido,
} from "@/lib/recuperarPalavraPasse";
import { redefinirPalavraPasse } from "./actions";

// A ligação do e-mail traz o token no URL: sem indexação e sem Referer para
// as ligações externas da página (rodapé).
export async function generateMetadata({ params }: ComIdioma) {
  return {
    title: tConta[await idiomaDaPagina(params)].redefinir.metadados,
    robots: { index: false },
    referrer: "no-referrer" as const,
  };
}

// Abrir a página não valida nem gasta a ligação (os verificadores de
// ligações dos clientes de e-mail fazem GET): a ligação só é usada no POST.
export default async function RedefinirPalavraPassePage({
  searchParams,
  params: paramsPagina,
}: {
  searchParams: Promise<{ token_hash?: string; code?: string; continuar?: string; erro?: string; ligacao?: string }>;
} & ComIdioma) {
  const idioma = await idiomaDaPagina(paramsPagina);
  const t = tConta[idioma].redefinir;
  const params = await searchParams;
  const token = tokenRecuperacaoComFormatoValido(params.token_hash) ? params.token_hash : null;
  const codigo = !token && codigoPkceComFormatoValido(params.code) ? params.code : null;

  let podeDefinir = Boolean(token || codigo);
  if (!podeDefinir && params.continuar === "1") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    podeDefinir = Boolean(data.user);
  }

  const estadoLigacao = estadoLigacaoValido(params.ligacao) ? params.ligacao : podeDefinir ? null : "invalida";

  if (estadoLigacao) {
    // MSG_LIGACAO (português) é a fonte; o texto mostrado vem do idioma da página.
    const msg = idioma === "pt-PT" ? MSG_LIGACAO[estadoLigacao] : t.ligacao[estadoLigacao];
    return (
      <MolduraConta titulo={t.titulo} depois={<LigacaoLogin texto={t.voltarLogin} />}>
        <Aviso tom="atencao" titulo={msg.titulo}>
          {msg.texto}
        </Aviso>
        <Link href={ROTA_RECUPERAR} prefetch={false} className={BOTAO_PRIMARIO}>
          {t.pedirNova}
        </Link>
      </MolduraConta>
    );
  }

  return (
    <MolduraConta
      titulo={t.titulo}
      descricao={t.descricao}
      depois={<LigacaoLogin texto={t.voltarLogin} />}
    >
      {params.erro && <Aviso tom="erro">{traduzirMensagemConta(idioma, params.erro)}</Aviso>}

      <form action={redefinirPalavraPasse} className="flex flex-col gap-4">
        {token && <input type="hidden" name="token_hash" value={token} />}
        {codigo && <input type="hidden" name="code" value={codigo} />}
        <label className={ROTULO}>
          {t.nova}
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={PALAVRA_PASSE_MIN}
            aria-describedby="requisitos-palavra-passe"
            className={CAMPO}
          />
          <span id="requisitos-palavra-passe" className={AJUDA_CAMPO}>
            {idioma === "pt-PT" ? REQUISITOS_PALAVRA_PASSE : t.requisitos}
          </span>
        </label>
        <label className={ROTULO}>
          {t.confirmar}
          <input
            name="confirmar_password"
            type="password"
            autoComplete="new-password"
            required
            minLength={PALAVRA_PASSE_MIN}
            className={CAMPO}
          />
        </label>
        <button type="submit" className={BOTAO_PRIMARIO}>
          {t.guardar}
        </button>
      </form>
      <p className={TEXTO_SECUNDARIO}>{t.depois}</p>
    </MolduraConta>
  );
}

function LigacaoLogin({ texto }: { texto: string }) {
  return (
    <Link href="/login" prefetch={false} className={LIGACAO}>
      {texto}
    </Link>
  );
}
