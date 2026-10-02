import { requireUser } from "@/lib/auth";
import { alterarPassword, guardarPreferenciasSetor, retirarConsentimentoComunicacoes } from "./actions";

const INPUT_CLASS =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-hairline-strong)] focus:outline-none";

const SETORES = ["Telecomunicações", "Energia", "Água"];

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

  // Autorização ativa para e-mails com novidades e ofertas (RLS: só a própria).
  const { data: comunicacoes } = await supabase
    .from("consentimentos_comunicacoes")
    .select("aceite_em")
    .eq("user_id", user.id)
    .is("retirado_em", null)
    .maybeSingle();

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">
        Gestão de Perfil
      </h1>

      <dl className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 text-sm shadow-[var(--shadow-subtle)]">
        <div>
          <dt className="text-[var(--color-ink-muted)]">Nome</dt>
          <dd className="text-[var(--color-ink)]">{perfil?.nome ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-ink-muted)]">E-mail</dt>
          <dd className="text-[var(--color-ink)]">{user.email}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-subtle)]">
        <h2 className="text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">
          Alterar palavra-passe
        </h2>

        {query.guardado && (
          <p className="text-sm text-[var(--color-status-success)]">
            Palavra-passe atualizada com sucesso.
          </p>
        )}
        {query.erro && <p className="text-sm text-[var(--color-status-danger)]">{query.erro}</p>}

        <form action={alterarPassword} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
            Nova palavra-passe
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[var(--color-ink-muted)]">
            Confirmar nova palavra-passe
            <input
              type="password"
              name="confirmar_password"
              required
              minLength={8}
              className={INPUT_CLASS}
            />
          </label>
          <button
            type="submit"
            className="self-start rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
          >
            Guardar
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-subtle)]">
        <h2 className="text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">
          Receba avisos sobre…
        </h2>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Avisamos-lhe por e-mail sempre que houver uma novidade relevante — como uma subida de
          preços anunciada — no(s) setor(es) que escolher.
        </p>

        {query.preferencias_guardadas && (
          <p className="text-sm text-[var(--color-status-success)]">
            ✓ Vamos avisar-lhe sobre{" "}
            {setoresSubscritos.size > 0 ? Array.from(setoresSubscritos).join(", ") : "nenhum setor por agora"}
            .
          </p>
        )}

        <form action={guardarPreferenciasSetor} className="flex flex-col gap-3">
          {SETORES.map((setor) => (
            <label key={setor} className="flex items-center gap-2.5 text-sm text-[var(--color-ink)]">
              <input
                type="checkbox"
                name="setor"
                value={setor}
                defaultChecked={setoresSubscritos.has(setor)}
                className="h-4 w-4 accent-[var(--color-brand)]"
              />
              {setor}
            </label>
          ))}
          <button
            type="submit"
            className="mt-1 self-start rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-[10px] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
          >
            Guardar preferências
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-subtle)]">
        <h2 className="text-[var(--text-subheading)] font-medium text-[var(--color-ink)]">
          E-mails com novidades e ofertas
        </h2>
        {query.comunicacoes_retiradas && (
          <p className="text-sm text-[var(--color-status-success)]">
            ✓ Deixou de receber e-mails com novidades e ofertas da DoLado.
          </p>
        )}
        {query.erro_comunicacoes && (
          <p className="text-sm text-[var(--color-status-danger)]">{query.erro_comunicacoes}</p>
        )}
        {comunicacoes ? (
          <>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Aceitou receber e-mails da DoLado com novidades e ofertas em{" "}
              {new Date(comunicacoes.aceite_em).toLocaleDateString("pt-PT")}. Pode deixar de os receber a qualquer
              momento.
            </p>
            <form action={retirarConsentimentoComunicacoes}>
              <button
                type="submit"
                className="rounded-[var(--radius-button)] border border-[var(--color-hairline-strong)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)]"
              >
                Deixar de receber
              </button>
            </form>
          </>
        ) : (
          !query.comunicacoes_retiradas && (
            <p className="text-sm text-[var(--color-ink-muted)]">
              Não recebe e-mails da DoLado com novidades e ofertas.
            </p>
          )
        )}
      </div>
    </div>
  );
}
