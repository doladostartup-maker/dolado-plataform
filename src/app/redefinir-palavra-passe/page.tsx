import Link from "next/link";
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
export const metadata = {
  title: "Definir nova palavra-passe — DoLado",
  robots: { index: false },
  referrer: "no-referrer",
};

// Abrir a página não valida nem gasta a ligação (os verificadores de
// ligações dos clientes de e-mail fazem GET): a ligação só é usada no POST.
export default async function RedefinirPalavraPassePage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; code?: string; continuar?: string; erro?: string; ligacao?: string }>;
}) {
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
    const msg = MSG_LIGACAO[estadoLigacao];
    return (
      <MolduraConta titulo="Definir nova palavra-passe" depois={<LigacaoLogin />}>
        <Aviso tom="atencao" titulo={msg.titulo}>
          {msg.texto}
        </Aviso>
        <Link href={ROTA_RECUPERAR} prefetch={false} className={BOTAO_PRIMARIO}>
          Pedir nova ligação
        </Link>
      </MolduraConta>
    );
  }

  return (
    <MolduraConta
      titulo="Definir nova palavra-passe"
      descricao="Escolha uma nova palavra-passe para a sua conta na DoLado."
      depois={<LigacaoLogin />}
    >
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}

      <form action={redefinirPalavraPasse} className="flex flex-col gap-4">
        {token && <input type="hidden" name="token_hash" value={token} />}
        {codigo && <input type="hidden" name="code" value={codigo} />}
        <label className={ROTULO}>
          Nova palavra-passe
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
            {REQUISITOS_PALAVRA_PASSE}
          </span>
        </label>
        <label className={ROTULO}>
          Confirmar a nova palavra-passe
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
          Guardar nova palavra-passe
        </button>
      </form>
      <p className={TEXTO_SECUNDARIO}>Depois de guardar, pode iniciar sessão com a nova palavra-passe.</p>
    </MolduraConta>
  );
}

function LigacaoLogin() {
  return (
    <Link href="/login" prefetch={false} className={LIGACAO}>
      Voltar ao início de sessão
    </Link>
  );
}
