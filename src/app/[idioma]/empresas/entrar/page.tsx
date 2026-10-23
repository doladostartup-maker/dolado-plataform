import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_PRIMARIO, CAMPO, LIGACAO, ROTULO } from "@/components/portal/ui";
import { AvisoSessaoParticular } from "@/components/empresas/AvisoSessaoParticular";
import { sessaoNasEntradasEmpresa } from "@/lib/auth";
import { MOTIVO_CONTA_EMPRESA } from "@/lib/empresas/contas";
import { ROTAS_EMPRESA, empresasAtivo } from "@/lib/empresas/registo";
import { entrarEmpresa } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar — DoLado Empresas", robots: { index: false, follow: false } };

// Entrada das contas de empresa (DoLado Empresas, Fase 4). Só em português (D1).
export default async function EntrarEmpresaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; motivo?: string; alterada?: string }>;
}) {
  if (!empresasAtivo()) notFound();
  const sessao = await sessaoNasEntradasEmpresa();
  if (sessao?.tipoConta === "empresa") redirect(ROTAS_EMPRESA.painel);
  const params = await searchParams;

  return (
    <MolduraConta
      semIdioma
      contexto="DoLado Empresas"
      titulo="Entrar na conta da empresa"
      depois={
        <>
          Ainda não tem conta?{" "}
          <Link href={ROTAS_EMPRESA.registo} prefetch={false} className={LIGACAO}>
            Registar a empresa
          </Link>
          <br />
          É particular?{" "}
          <Link href="/login" prefetch={false} className={LIGACAO}>
            Entrar como particular
          </Link>
        </>
      }
    >
      {sessao?.tipoConta === "particular" && <AvisoSessaoParticular />}
      {params.motivo === MOTIVO_CONTA_EMPRESA && (
        <Aviso tom="info">Esta conta é de empresa. Entre aqui, com a palavra-passe e o código da aplicação de autenticação.</Aviso>
      )}
      {params.motivo === "conta_particular" && (
        <Aviso tom="atencao">
          Esta conta é particular. Para entrar como particular, use a{" "}
          <Link href="/login" prefetch={false} className={LIGACAO}>
            página de entrada dos particulares
          </Link>
          .
        </Aviso>
      )}
      {params.alterada === "1" && (
        <Aviso tom="sucesso">A palavra-passe foi alterada. Entre com a nova palavra-passe.</Aviso>
      )}
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}

      <form action={entrarEmpresa} className="flex flex-col gap-4">
        <label className={ROTULO}>
          E-mail
          <input name="email" type="email" autoComplete="email" required className={CAMPO} />
        </label>
        <label className={ROTULO}>
          Palavra-passe
          <input name="password" type="password" autoComplete="current-password" required className={CAMPO} />
        </label>
        <Link href={ROTAS_EMPRESA.recuperar} prefetch={false} className={`${LIGACAO} -mt-1 self-start text-[14px]`}>
          Esqueceu-se da palavra-passe?
        </Link>
        <button type="submit" className={BOTAO_PRIMARIO}>
          Entrar
        </button>
      </form>
    </MolduraConta>
  );
}
