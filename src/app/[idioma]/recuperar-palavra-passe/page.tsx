import Link from "@/i18n/Link";
import { tConta, traduzirMensagemConta } from "@/i18n/mensagens/conta";
import { rico } from "@/i18n/Rico";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, LIGACAO, ROTULO, TEXTO_SECUNDARIO } from "@/components/portal/ui";
import { MSG_PEDIDO_RECENTE, MSG_PEDIDO_RECUPERACAO } from "@/lib/recuperarPalavraPasse";
import { pedirRecuperacao } from "./actions";

export async function generateMetadata({ params }: ComIdioma) {
  return { title: tConta[await idiomaDaPagina(params)].recuperar.metadados, robots: { index: false } };
}

// Pedido do e-mail de recuperação. Nunca mostra o e-mail introduzido nem
// indica se tem conta (ver src/lib/recuperarPalavraPasse.ts).
export default async function RecuperarPalavraPassePage({
  searchParams,
  params: paramsPagina,
}: {
  searchParams: Promise<{ enviado?: string; recente?: string; erro?: string }>;
} & ComIdioma) {
  const idioma = await idiomaDaPagina(paramsPagina);
  const t = tConta[idioma].recuperar;
  const msg = (m: string) => traduzirMensagemConta(idioma, m);
  const params = await searchParams;
  const enviado = params.enviado === "1";

  return (
    <MolduraConta
      titulo={enviado ? t.tituloEnviado : t.titulo}
      descricao={enviado ? undefined : t.descricao}
      depois={rico(t.lembrou, {
        login: (c) => (
          <Link href="/login" prefetch={false} className={LIGACAO}>
            {c}
          </Link>
        ),
      })}
    >
      {enviado ? (
        <>
          {params.recente === "1" ? (
            <Aviso tom="atencao">{msg(MSG_PEDIDO_RECENTE)}</Aviso>
          ) : (
            <Aviso tom="sucesso">{msg(MSG_PEDIDO_RECUPERACAO)}</Aviso>
          )}
          <p className={TEXTO_SECUNDARIO}>{t.explicacao}</p>
          <Link href="/recuperar-palavra-passe" prefetch={false} className={BOTAO_SECUNDARIO}>
            {t.pedirNova}
          </Link>
        </>
      ) : (
        <>
          {params.erro && <Aviso tom="erro">{msg(params.erro)}</Aviso>}
          <form action={pedirRecuperacao} className="flex flex-col gap-4">
            <label className={ROTULO}>
              {t.email}
              <input name="email" type="email" autoComplete="email" required maxLength={254} className={CAMPO} />
            </label>
            <button type="submit" className={BOTAO_PRIMARIO}>
              {t.enviar}
            </button>
          </form>
        </>
      )}
    </MolduraConta>
  );
}
