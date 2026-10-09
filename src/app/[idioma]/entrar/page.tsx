import Link from "@/i18n/Link";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, LIGACAO } from "@/components/portal/ui";
import { tConta } from "@/i18n/mensagens/conta";
import { rico } from "@/i18n/Rico";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { redirecionarSeComSessao } from "@/lib/auth";

export default async function EntrarPage({ params }: ComIdioma) {
  const idioma = await idiomaDaPagina(params);
  // Já com sessão (ex.: portal.dolado.pt/ → /entrar): segue para o Painel.
  await redirecionarSeComSessao(idioma);
  const t = tConta[idioma].entrar;
  return (
    <MolduraConta
      contexto={t.contexto}
      titulo={t.titulo}
      descricao={t.descricao}
      depois={rico(t.temProblema, {
        tratar: (c) => (
          <Link href="/tratar-caso" className={LIGACAO}>
            {c}
          </Link>
        ),
      })}
    >
      <div className="flex flex-col gap-3">
        <Link href="/login" className={BOTAO_PRIMARIO}>
          {t.iniciarSessao}
        </Link>
        <Link href="/registo" className={BOTAO_SECUNDARIO}>
          {t.criarConta}
        </Link>
      </div>
    </MolduraConta>
  );
}
