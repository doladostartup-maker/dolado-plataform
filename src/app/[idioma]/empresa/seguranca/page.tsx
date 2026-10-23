import Link from "next/link";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_PRIMARIO, TEXTO_SECUNDARIO } from "@/components/portal/ui";
import { GestaoMfa } from "@/components/mfa/GestaoMfa";
import { requireEmpresa } from "@/lib/auth";
import { estadoMfa } from "@/lib/mfa";
import { ROTAS_EMPRESA } from "@/lib/empresas/registo";
import { inscreverFactorEmpresa, removerFactorEmpresa, verificarFactorEmpresa } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Segurança da conta — DoLado Empresas", robots: { index: false, follow: false } };

// Autenticação em dois passos da conta de empresa: obrigatória, com dois
// factores TOTP (o principal e o de reserva). Sem eles a conta não avança.
export default async function SegurancaEmpresaPage() {
  const { organizacao, mfa } = await requireEmpresa("empresa/seguranca", { mfa: "inscricao" });
  const verificados = mfa.factores.filter((f) => f.verificado);
  const estado = estadoMfa(mfa.nivel, mfa.factores);

  return (
    <MolduraConta
      semIdioma
      contexto={organizacao.nome}
      titulo="Autenticação em dois passos"
      descricao="Para proteger os dados da empresa, a conta usa uma aplicação de autenticação (por exemplo, Google Authenticator, Microsoft Authenticator ou um gestor de palavras-passe) além da palavra-passe."
    >
      <GestaoMfa
        estado={estado}
        factores={verificados}
        acoes={{ inscrever: inscreverFactorEmpresa, verificar: verificarFactorEmpresa, remover: removerFactorEmpresa }}
        textoSemFactores="Inscreva primeiro o factor principal e, logo a seguir, um factor de reserva noutro dispositivo ou num gestor de palavras-passe. Os dois são obrigatórios: se perder o telemóvel, é o de reserva que lhe permite entrar."
      />
      {estado === "completo" ? (
        <Link href={ROTAS_EMPRESA.painel} prefetch={false} className={BOTAO_PRIMARIO}>
          Continuar
        </Link>
      ) : (
        <p className={TEXTO_SECUNDARIO}>Os dois factores são obrigatórios para continuar.</p>
      )}
    </MolduraConta>
  );
}
