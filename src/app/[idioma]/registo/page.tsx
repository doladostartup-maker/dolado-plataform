import Link from "@/i18n/Link";
import { tConta, traduzirMensagemConta } from "@/i18n/mensagens/conta";
import { rico } from "@/i18n/Rico";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { ehDestinoSeguro } from "@/lib/destinoAuth";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { CampoPalavraPasse } from "@/components/portal/CampoPalavraPasse";
import { SeparadorOu } from "@/components/portal/SeparadorOu";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, LIGACAO, ROTULO } from "@/components/portal/ui";
import { localizarHref } from "@/i18n/config";
import { origemRegistoDoDestino } from "@/lib/landing30Dias";
import { PALAVRA_PASSE_MIN } from "@/lib/recuperarPalavraPasse";
import { registar } from "./actions";
import { tParceiros } from "@/i18n/mensagens/parceiros";
import { parceirosAtivos } from "@/lib/parceiros/regras";

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
  // Vindo da landing dos 30 dias (activação com origem=landing_30d): o
  // registo fala da oferta e oferece também o Google. Só apresentação — o
  // registo, a confirmação do e-mail e a activação são os de sempre.
  const daLanding = origemRegistoDoDestino(next) !== null;
  const tl = t.protecaoGratuita;
  const tp = tParceiros[idioma].codigo;

  return (
    <MolduraConta
      contexto={daLanding ? tl.contexto : undefined}
      titulo={daLanding ? tl.titulo : t.titulo}
      descricao={daLanding ? tl.descricao : undefined}
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
          <input name="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" required className={CAMPO} />
        </label>
        <label className={ROTULO}>
          {t.palavraPasse}
          <CampoPalavraPasse
            name="password"
            autoComplete="new-password"
            minLength={PALAVRA_PASSE_MIN}
            mostrar={t.mostrar}
            esconder={t.esconder}
            descricao={t.requisitos}
          />
        </label>
        {parceirosAtivos() && (
          // Opcional e pouco usado: recolhido, para não parecer obrigatório.
          <details open={params.erro === tp.invalido}>
            <summary className={`${LIGACAO} min-h-11 cursor-pointer text-[14.5px]`}>{tp.resumo}</summary>
            <label className={`${ROTULO} mt-2`}>
              {tp.campo}
              <input name="codigo_parceiro" type="text" autoComplete="off" maxLength={20} className={`${CAMPO} uppercase`} />
              <span className="text-[13px] font-normal text-[var(--v2-muted)]">{tp.ajuda}</span>
            </label>
          </details>
        )}
        <button type="submit" className={BOTAO_PRIMARIO}>
          {daLanding ? tl.criar : t.criar}
        </button>
      </form>

      {daLanding && next && (
        <>
          <SeparadorOu texto={tConta[idioma].separadorOu} />
          {/* O Google cria a conta já com o e-mail confirmado e volta à activação. */}
          <a href={`/auth/login/google?next=${encodeURIComponent(localizarHref(idioma, next))}`} className={BOTAO_SECUNDARIO}>
            {tl.google}
          </a>
        </>
      )}
    </MolduraConta>
  );
}
