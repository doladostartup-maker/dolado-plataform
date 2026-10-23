import Link from "next/link";
import { requireAdminSemMfa } from "@/lib/auth";
import { estadoMfa } from "@/lib/mfa";
import { lerMfa } from "@/lib/mfaServidor";
import { LIGACAO_DISCRETA, PAINEL, PAINEL_CORPO } from "@/components/backoffice/ui";
import { GestaoMfa } from "@/components/mfa/GestaoMfa";
import { inscreverFactor, removerFactor, verificarFactor } from "./actions";

export const dynamic = "force-dynamic";

export default async function MfaPage() {
  const { supabase, user } = await requireAdminSemMfa();
  const { nivel, factores } = await lerMfa(supabase);
  const verificados = factores.filter((f) => f.verificado);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.015em]">Segurança da conta</h1>
        <p className="mt-1 text-[14px] text-[var(--v2-muted)]">
          Autenticação em dois passos com uma aplicação de autenticação (TOTP) — {user.email}
        </p>
      </div>

      <section className={`${PAINEL} ${PAINEL_CORPO}`} aria-labelledby="estado-sessao">
        <h2 id="estado-sessao" className="text-[16px] font-bold">
          Estado desta sessão
        </h2>
        <p className="mt-2 text-[14px]" data-nivel={nivel}>
          {nivel === "aal2"
            ? "Sessão verificada com o segundo factor (aal2)."
            : "Sessão só com a palavra-passe (aal1)."}
        </p>
        <p className="mt-1 text-[14px] text-[var(--v2-muted)]">
          {verificados.length === 0
            ? "Ainda não tem nenhum factor inscrito."
            : `${verificados.length} ${verificados.length === 1 ? "factor inscrito" : "factores inscritos"}.`}
        </p>
      </section>

      <GestaoMfa
        estado={estadoMfa(nivel, factores)}
        factores={verificados}
        acoes={{ inscrever: inscreverFactor, verificar: verificarFactor, remover: removerFactor }}
        textoSemFactores="Inscreva primeiro o factor principal e, logo a seguir, um factor de reserva noutro dispositivo ou num gestor de palavras-passe. Os dois são necessários antes de o backoffice passar a exigir a verificação."
      />

      <p className="text-[13px] text-[var(--v2-muted)]">
        Perdeu o acesso a todos os factores? Siga o procedimento de recuperação em{" "}
        <code>docs/operacao/recuperacao-mfa-admin.md</code>.{" "}
        <Link href="/backoffice" prefetch={false} className={LIGACAO_DISCRETA}>
          Voltar ao backoffice
        </Link>
      </p>
    </div>
  );
}
