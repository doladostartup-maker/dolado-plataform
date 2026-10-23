import Link from "next/link";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { CARTAO_INFO, LIGACAO, TEXTO, TEXTO_SECUNDARIO } from "@/components/portal/ui";
import { requireEmpresa } from "@/lib/auth";
import { APRESENTACAO_ESTADO, ROTAS_EMPRESA } from "@/lib/empresas/registo";
import { CONTACTO_EMAIL } from "@/lib/site";
import { terminarSessao } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "A sua empresa — DoLado Empresas", robots: { index: false, follow: false } };

// Estado da conta da empresa (DoLado Empresas, Fase 4). O portal empresarial
// é a Fase 7: até lá, e sempre antes da aprovação, só o estado do pedido.
export default async function PainelEmpresaPage() {
  const { organizacao } = await requireEmpresa("empresa");
  const estado = APRESENTACAO_ESTADO[organizacao.estado];

  return (
    <MolduraConta
      semIdioma
      contexto={organizacao.nome}
      titulo={estado.titulo}
      depois={
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link href={ROTAS_EMPRESA.seguranca} prefetch={false} className={LIGACAO}>
            Autenticação em dois passos
          </Link>
          <form action={terminarSessao}>
            <button type="submit" className={`${TEXTO_SECUNDARIO} underline underline-offset-4`}>
              Sair
            </button>
          </form>
        </div>
      }
    >
      <p className={TEXTO}>{estado.texto}</p>
      <div className={CARTAO_INFO}>
        <p className={TEXTO_SECUNDARIO}>
          Dúvidas? Escreva-nos para{" "}
          <a href={`mailto:${CONTACTO_EMAIL}`} className={LIGACAO}>
            {CONTACTO_EMAIL}
          </a>
          .
        </p>
      </div>
    </MolduraConta>
  );
}
