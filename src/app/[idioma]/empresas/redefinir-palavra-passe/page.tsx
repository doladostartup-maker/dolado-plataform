import { notFound } from "next/navigation";
import Link from "next/link";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { AJUDA_CAMPO, BOTAO_PRIMARIO, CAMPO, LIGACAO, ROTULO } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import {
  MSG_LIGACAO,
  PALAVRA_PASSE_MIN,
  REQUISITOS_PALAVRA_PASSE,
  codigoPkceComFormatoValido,
  estadoLigacaoValido,
  tokenRecuperacaoComFormatoValido,
} from "@/lib/recuperarPalavraPasse";
import { ROTAS_EMPRESA, empresasAtivo } from "@/lib/empresas/registo";
import { redefinirPalavraPasseEmpresa } from "./actions";

export const dynamic = "force-dynamic";
// A ligação do e-mail traz o token no URL: sem indexação e sem Referer.
export const metadata = {
  title: "Nova palavra-passe — DoLado Empresas",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

// Abrir a página não valida nem gasta a ligação (só o POST).
export default async function RedefinirEmpresaPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; code?: string; continuar?: string; erro?: string; ligacao?: string }>;
}) {
  if (!empresasAtivo()) notFound();
  const params = await searchParams;
  const token = tokenRecuperacaoComFormatoValido(params.token_hash) ? params.token_hash : null;
  const codigo = !token && codigoPkceComFormatoValido(params.code) ? params.code : null;

  let podeDefinir = Boolean(token || codigo);
  if (!podeDefinir && params.continuar === "1") {
    const { data } = await (await createClient()).auth.getUser();
    podeDefinir = Boolean(data.user);
  }
  const estadoLigacao = estadoLigacaoValido(params.ligacao) ? params.ligacao : podeDefinir ? null : "invalida";
  const voltarEntrada = (
    <Link href={ROTAS_EMPRESA.entrar} prefetch={false} className={LIGACAO}>
      Voltar à entrada
    </Link>
  );

  if (estadoLigacao) {
    return (
      <MolduraConta semIdioma contexto="DoLado Empresas" titulo="Nova palavra-passe" depois={voltarEntrada}>
        <Aviso tom="atencao" titulo={MSG_LIGACAO[estadoLigacao].titulo}>
          {MSG_LIGACAO[estadoLigacao].texto}
        </Aviso>
        <Link href={ROTAS_EMPRESA.recuperar} prefetch={false} className={BOTAO_PRIMARIO}>
          Pedir uma nova ligação
        </Link>
      </MolduraConta>
    );
  }

  return (
    <MolduraConta
      semIdioma
      contexto="DoLado Empresas"
      titulo="Nova palavra-passe"
      descricao="Escolha a nova palavra-passe e confirme com o código da aplicação de autenticação."
      depois={voltarEntrada}
    >
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}
      <form action={redefinirPalavraPasseEmpresa} className="flex flex-col gap-4">
        {token && <input type="hidden" name="token_hash" value={token} />}
        {codigo && <input type="hidden" name="code" value={codigo} />}
        <label className={ROTULO}>
          Nova palavra-passe
          <input name="password" type="password" autoComplete="new-password" required minLength={PALAVRA_PASSE_MIN} className={CAMPO} />
          <span className={AJUDA_CAMPO}>{REQUISITOS_PALAVRA_PASSE}</span>
        </label>
        <label className={ROTULO}>
          Confirmar a nova palavra-passe
          <input name="confirmar_password" type="password" autoComplete="new-password" required minLength={PALAVRA_PASSE_MIN} className={CAMPO} />
        </label>
        <label className={ROTULO}>
          Código da aplicação de autenticação
          <input name="codigo_totp" inputMode="numeric" autoComplete="one-time-code" maxLength={7} className={CAMPO} />
          <span className={AJUDA_CAMPO}>
            Obrigatório se já inscreveu a autenticação em dois passos. Perdeu os dois factores?{" "}
            <Link href={ROTAS_EMPRESA.recuperacaoAssistida} prefetch={false} className={LIGACAO}>
              Peça ajuda
            </Link>
            .
          </span>
        </label>
        <button type="submit" className={BOTAO_PRIMARIO}>
          Guardar a nova palavra-passe
        </button>
      </form>
    </MolduraConta>
  );
}
