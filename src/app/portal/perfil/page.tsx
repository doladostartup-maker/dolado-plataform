import Link from "next/link";
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
}: {
  searchParams: Promise<{
    erro?: string;
    guardado?: string;
    preferencias_guardadas?: string;
    comunicacoes_retiradas?: string;
    erro_comunicacoes?: string;
  }>;
}) {
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
      <CabecalhoPagina titulo="Perfil e avisos" descricao="Os seus dados, os avisos que recebe por e-mail e a sua palavra-passe." />

      <section aria-labelledby="dados" className={`${CARTAO} flex flex-col gap-4`}>
        <h2 id="dados" className={TITULO_SECCAO}>
          Os seus dados
        </h2>
        <ListaDados colunas={2}>
          <Dado rotulo="Nome">{perfil?.nome ?? "—"}</Dado>
          <Dado rotulo="E-mail">{user.email}</Dado>
        </ListaDados>
      </section>

      <section id="avisos" aria-labelledby="avisos-titulo" className={`${CARTAO} flex scroll-mt-24 flex-col gap-4`}>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="avisos-titulo" className={TITULO_SECCAO}>
              Avisos do setor
            </h2>
            <Etiqueta tom={temProtecao ? "concluido" : "neutro"}>{temProtecao ? "Incluído na sua Proteção" : "Incluído na Proteção"}</Etiqueta>
          </div>
          <p className={TEXTO_SECUNDARIO}>
            Avisamos-lhe por e-mail sempre que houver uma novidade relevante — como uma subida de preços anunciada — no(s)
            setor(es) que escolher.
          </p>
        </div>

        {!temProtecao && (
          <Aviso
            tom="info"
            acao={
              <Link href="/portal?bloqueado=subscricao" className={LIGACAO}>
                Ver subscrições
              </Link>
            }
          >
            O aviso sectorial está incluído na Proteção: só enviamos avisos enquanto tiver uma subscrição ativa.
          </Aviso>
        )}

        {query.preferencias_guardadas && (
          <Aviso tom="sucesso">
            {temProtecao ? (
              <>
                Vamos avisar-lhe sobre{" "}
                {setoresSubscritos.size > 0 ? Array.from(setoresSubscritos).join(", ") : "nenhum setor por agora"}.
              </>
            ) : (
              "Preferências guardadas."
            )}
          </Aviso>
        )}

        <form action={guardarPreferenciasSetor} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-1">
            <legend className="sr-only">Setores</legend>
            {SETORES.map((setor) => (
              <label key={setor} className="flex min-h-11 items-center gap-3 text-[15px] text-[var(--v2-navy)]">
                <input
                  type="checkbox"
                  name="setor"
                  value={setor}
                  defaultChecked={setoresSubscritos.has(setor)}
                  className={CAIXA_SELECAO}
                />
                {setor}
              </label>
            ))}
          </fieldset>
          <button type="submit" className={`${BOTAO_PRIMARIO} w-full sm:w-auto sm:self-start`}>
            Guardar preferências
          </button>
        </form>
      </section>

      <AreaIndicacao />

      <section aria-labelledby="comunicacoes" className={`${CARTAO} flex flex-col gap-3`}>
        <h2 id="comunicacoes" className={TITULO_SECCAO}>
          E-mails com novidades e ofertas
        </h2>
        {query.comunicacoes_retiradas && (
          <Aviso tom="sucesso">Deixou de receber e-mails com novidades e ofertas da DoLado.</Aviso>
        )}
        {query.erro_comunicacoes && <Aviso tom="erro">{query.erro_comunicacoes}</Aviso>}
        {comunicacoes ? (
          <>
            <p className={TEXTO_SECUNDARIO}>
              Aceitou receber e-mails da DoLado com novidades e ofertas em{" "}
              {new Date(comunicacoes.aceite_em).toLocaleDateString("pt-PT")}. Pode deixar de os receber a qualquer
              momento.
            </p>
            <form action={retirarConsentimentoComunicacoes}>
              <button type="submit" className={BOTAO_SECUNDARIO}>
                Deixar de receber
              </button>
            </form>
          </>
        ) : (
          !query.comunicacoes_retiradas && (
            <p className={TEXTO_SECUNDARIO}>Não recebe e-mails da DoLado com novidades e ofertas.</p>
          )
        )}
      </section>

      <section aria-labelledby="palavra-passe" className={`${CARTAO} flex flex-col gap-4`}>
        <h2 id="palavra-passe" className={TITULO_SECCAO}>
          Alterar palavra-passe
        </h2>

        {query.guardado && <Aviso tom="sucesso">Palavra-passe atualizada com sucesso.</Aviso>}
        {query.erro && <Aviso tom="erro">{query.erro}</Aviso>}

        <form action={alterarPassword} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={ROTULO}>
              Nova palavra-passe
              <input type="password" name="password" autoComplete="new-password" required minLength={8} className={CAMPO} />
            </label>
            <label className={ROTULO}>
              Confirmar nova palavra-passe
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
            Guardar palavra-passe
          </button>
        </form>
      </section>
    </div>
  );
}
