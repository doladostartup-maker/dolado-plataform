import { redirect } from "next/navigation";
import Link from "next/link";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_PRIMARIO, CAMPO, LIGACAO, ROTULO, TEXTO_SECUNDARIO } from "@/components/portal/ui";
import { requireEmpresa } from "@/lib/auth";
import { ROTAS_EMPRESA } from "@/lib/empresas/registo";
import { terminarSessao } from "../../empresa/actions";
import { verificarSegundoFactor } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Código de verificação — DoLado Empresas", robots: { index: false, follow: false } };

// Desafio do segundo factor depois da palavra-passe (DoLado Empresas, Fase 4).
export default async function VerificarEmpresaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { mfa } = await requireEmpresa("empresas/verificar", { mfa: "nenhum" });
  const factores = mfa.factores.filter((f) => f.verificado);
  if (factores.length === 0) redirect(ROTAS_EMPRESA.seguranca);
  if (mfa.nivel === "aal2") redirect(ROTAS_EMPRESA.painel);
  const params = await searchParams;

  return (
    <MolduraConta
      semIdioma
      contexto="DoLado Empresas"
      titulo="Código de verificação"
      descricao="Abra a aplicação de autenticação e introduza o código de 6 dígitos da DoLado."
      depois={
        <>
          Perdeu o acesso aos dois factores?{" "}
          <Link href={ROTAS_EMPRESA.recuperacaoAssistida} prefetch={false} className={LIGACAO}>
            Pedir ajuda para recuperar o acesso
          </Link>
        </>
      }
    >
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}
      <form action={verificarSegundoFactor} className="flex flex-col gap-4">
        {factores.length > 1 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[14px] font-semibold">Factor</legend>
            {factores.map((f, i) => (
              <label key={f.id} className="flex min-h-11 items-center gap-3 text-[15px]">
                <input type="radio" name="factor" value={f.id} defaultChecked={i === 0} required className="h-[18px] w-[18px] accent-[var(--v2-green)]" />
                {f.nome}
              </label>
            ))}
          </fieldset>
        ) : (
          <input type="hidden" name="factor" value={factores[0].id} />
        )}
        <label className={ROTULO}>
          Código de 6 dígitos
          <input name="codigo" inputMode="numeric" autoComplete="one-time-code" required maxLength={7} className={CAMPO} />
        </label>
        <button type="submit" className={BOTAO_PRIMARIO}>
          Verificar
        </button>
      </form>
      <form action={terminarSessao}>
        <button type="submit" className={`${TEXTO_SECUNDARIO} underline underline-offset-4`}>
          Sair
        </button>
      </form>
    </MolduraConta>
  );
}
