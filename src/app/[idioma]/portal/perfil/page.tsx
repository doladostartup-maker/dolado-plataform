import Link from "@/i18n/Link";
import { formatarDataCurta } from "@/i18n/formatar";
import { tPortal, traduzirMensagemPortal } from "@/i18n/mensagens/portal";
import { rotulo } from "@/i18n/mensagens/rotulos";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { SETORES } from "@/lib/pedidoCaso";
import { obterAcesso, requireUser } from "@/lib/auth";
import { alterarPassword, guardarPreferenciasSetor, retirarConsentimentoComunicacoes } from "./actions";
import { Aviso } from "@/components/portal/Aviso";
import { CabecalhoPagina } from "@/components/portal/Cabecalho";
import { Dado, ListaDados } from "@/components/portal/Dados";
import { Etiqueta } from "@/components/portal/Etiqueta";
import { AreaIndicacao } from "@/components/portal/Indicacao";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAIXA_SELECAO, CAMPO, CARTAO, LIGACAO, ROTULO, TEXTO_SECUNDARIO, TITULO_SECCAO } from "@/components/portal/ui";

export default async function PerfilPage({
  searchParams,
  params,
}: ComIdioma & {
  searchParams: Promise<{
    erro?: string;
    guardado?: string;
    preferencias_guardadas?: string;
    comunicacoes_retiradas?: string;
    erro_comunicacoes?: string;
  }>;
}) {
  const idioma = await idiomaDaPagina(params);
  const t = tPortal[idioma].perfil;
  const query = await searchParams;
  const { supabase, user } = await requireUser();

  const { data: perfil } = await supabase
    .from("utilizadores")
    .select("nome")
    .eq("id", user.id)
    .single();

  const { data: preferencias } = await supabase
    .from("preferencias_setor")
    .select("setor")
    .eq("utilizador_id", user.id);

  const setoresSubscritos = new Set((preferencias ?? []).map((p) => p.setor));

  // O aviso sectorial só é enviado a contas com Proteção ativa
  // (avisos_setor_destinatarios); sem ela, as escolhas não geram avisos.
  const { temProtecao } = await obterAcesso(supabase, user.id);

  // Autorização ativa para e-mails com novidades e ofertas (RLS: só a própria).
  const { data: comunicacoes } = await supabase
    .from("consentimentos_comunicacoes")
    .select("aceite_em")
    .eq("user_id", user.id)
    .is("retirado_em", null)
    .maybeSingle();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <CabecalhoPagina titulo={t.titulo} descricao={t.descricao} />

      <section aria-labelledby="dados" className={`${CARTAO} flex flex-col gap-4`}>
        <h2 id="dados" className={TITULO_SECCAO}>
          {t.dados}
        </h2>
        <ListaDados colunas={2}>
          <Dado rotulo={t.nome}>{perfil?.nome ?? "—"}</Dado>
          <Dado rotulo={t.email}>{user.email}</Dado>
        </ListaDados>
      </section>

      <section id="avisos" aria-labelledby="avisos-titulo" className={`${CARTAO} flex scroll-mt-24 flex-col gap-4`}>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="avisos-titulo" className={TITULO_SECCAO}>
              {t.avisos}
            </h2>
            <Etiqueta tom={temProtecao ? "concluido" : "neutro"}>{temProtecao ? t.incluidoSua : t.incluido}</Etiqueta>
          </div>
          <p className={TEXTO_SECUNDARIO}>{t.avisosTexto}</p>
        </div>

        {!temProtecao && (
          <Aviso
            tom="info"
            acao={
              <Link href="/portal?bloqueado=subscricao" className={LIGACAO}>
                {t.verSubscricoes}
              </Link>
            }
          >
            {t.soComProtecao}
          </Aviso>
        )}

        {query.preferencias_guardadas && (
          <Aviso tom="sucesso">
            {temProtecao
              ? t.vamosAvisar(
                  setoresSubscritos.size > 0
                    ? Array.from(setoresSubscritos)
                        .map((s) => rotulo(idioma, "setores", s))
                        .join(", ")
                    : t.nenhumSetor,
                )
              : t.preferenciasGuardadas}
          </Aviso>
        )}

        <form action={guardarPreferenciasSetor} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-1">
            <legend className="sr-only">{t.setores}</legend>
            {SETORES.map((setor) => (
              <label key={setor} className="flex min-h-11 items-center gap-3 text-[15px] text-[var(--v2-navy)]">
                <input
                  type="checkbox"
                  name="setor"
                  value={setor}
                  defaultChecked={setoresSubscritos.has(setor)}
                  className={CAIXA_SELECAO}
                />
                {rotulo(idioma, "setores", setor)}
              </label>
            ))}
          </fieldset>
          <button type="submit" className={`${BOTAO_PRIMARIO} w-full sm:w-auto sm:self-start`}>
            {t.guardarPreferencias}
          </button>
        </form>
      </section>

      <AreaIndicacao />

      <section aria-labelledby="comunicacoes" className={`${CARTAO} flex flex-col gap-3`}>
        <h2 id="comunicacoes" className={TITULO_SECCAO}>
          {t.comunicacoes}
        </h2>
        {query.comunicacoes_retiradas && <Aviso tom="sucesso">{t.retiradas}</Aviso>}
        {query.erro_comunicacoes && <Aviso tom="erro">{traduzirMensagemPortal(idioma, query.erro_comunicacoes)}</Aviso>}
        {comunicacoes ? (
          <>
            <p className={TEXTO_SECUNDARIO}>{t.aceitou(formatarDataCurta(idioma, comunicacoes.aceite_em))}</p>
            <form action={retirarConsentimentoComunicacoes}>
              <button type="submit" className={BOTAO_SECUNDARIO}>
                {t.deixarDeReceber}
              </button>
            </form>
          </>
        ) : (
          !query.comunicacoes_retiradas && (
            <p className={TEXTO_SECUNDARIO}>{t.naoRecebe}</p>
          )
        )}
      </section>

      <section aria-labelledby="palavra-passe" className={`${CARTAO} flex flex-col gap-4`}>
        <h2 id="palavra-passe" className={TITULO_SECCAO}>
          {t.palavraPasse}
        </h2>

        {query.guardado && <Aviso tom="sucesso">{t.atualizada}</Aviso>}
        {query.erro && <Aviso tom="erro">{traduzirMensagemPortal(idioma, query.erro)}</Aviso>}

        <form action={alterarPassword} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={ROTULO}>
              {t.nova}
              <input type="password" name="password" autoComplete="new-password" required minLength={8} className={CAMPO} />
            </label>
            <label className={ROTULO}>
              {t.confirmar}
              <input
                type="password"
                name="confirmar_password"
                autoComplete="new-password"
                required
                minLength={8}
                className={CAMPO}
              />
            </label>
          </div>
          <button type="submit" className={`${BOTAO_SECUNDARIO} w-full sm:w-auto sm:self-start`}>
            {t.guardar}
          </button>
        </form>
      </section>
    </div>
  );
}
