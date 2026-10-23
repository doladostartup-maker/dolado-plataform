import { notFound } from "next/navigation";
import Link from "next/link";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_PRIMARIO, CAMPO, LIGACAO, ROTULO } from "@/components/portal/ui";
import { MSG_PEDIDO_RECENTE, MSG_PEDIDO_RECUPERACAO } from "@/lib/recuperarPalavraPasse";
import { ROTAS_EMPRESA, empresasAtivo } from "@/lib/empresas/registo";
import { pedirRecuperacaoEmpresa } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recuperar a palavra-passe — DoLado Empresas", robots: { index: false, follow: false } };

export default async function RecuperarEmpresaPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; recente?: string; erro?: string }>;
}) {
  if (!empresasAtivo()) notFound();
  const params = await searchParams;
  const enviado = params.enviado === "1";

  return (
    <MolduraConta
      semIdioma
      contexto="DoLado Empresas"
      titulo={enviado ? "Verifique o seu e-mail" : "Recuperar a palavra-passe"}
      descricao={enviado ? undefined : "Indique o e-mail da conta da empresa. Para entrar depois, continua a precisar do código da aplicação de autenticação."}
      depois={
        <Link href={ROTAS_EMPRESA.entrar} prefetch={false} className={LIGACAO}>
          Voltar à entrada
        </Link>
      }
    >
      {enviado ? (
        <Aviso tom={params.recente === "1" ? "atencao" : "sucesso"}>
          {params.recente === "1" ? MSG_PEDIDO_RECENTE : MSG_PEDIDO_RECUPERACAO}
        </Aviso>
      ) : (
        <>
          {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}
          <form action={pedirRecuperacaoEmpresa} className="flex flex-col gap-4">
            <label className={ROTULO}>
              E-mail
              <input name="email" type="email" autoComplete="email" required maxLength={254} className={CAMPO} />
            </label>
            <button type="submit" className={BOTAO_PRIMARIO}>
              Enviar a ligação
            </button>
          </form>
        </>
      )}
    </MolduraConta>
  );
}
