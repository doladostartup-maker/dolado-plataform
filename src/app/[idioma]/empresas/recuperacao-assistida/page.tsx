import { notFound } from "next/navigation";
import Link from "next/link";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { AJUDA_CAMPO, BOTAO_PRIMARIO, CAMPO, LIGACAO, ROTULO, TEXTO_SECUNDARIO } from "@/components/portal/ui";
import { MSG_PEDIDO_RECUPERACAO_ASSISTIDA, ROTAS_EMPRESA, empresasAtivo } from "@/lib/empresas/registo";
import { pedirRecuperacaoAssistida } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recuperar o acesso — DoLado Empresas", robots: { index: false, follow: false } };

// Perda dos dois factores: pedido sem sessão. A DoLado confirma a identidade
// pelos contactos oficiais da empresa antes de repor o acesso.
export default async function RecuperacaoAssistidaPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; erro?: string }>;
}) {
  if (!empresasAtivo()) notFound();
  const params = await searchParams;
  const voltar = (
    <Link href={ROTAS_EMPRESA.entrar} prefetch={false} className={LIGACAO}>
      Voltar à entrada
    </Link>
  );

  if (params.enviado === "1") {
    return (
      <MolduraConta semIdioma contexto="DoLado Empresas" titulo="Pedido recebido" depois={voltar}>
        <Aviso tom="sucesso">{MSG_PEDIDO_RECUPERACAO_ASSISTIDA}</Aviso>
      </MolduraConta>
    );
  }

  return (
    <MolduraConta
      semIdioma
      contexto="DoLado Empresas"
      titulo="Recuperar o acesso"
      descricao="Use este pedido só se perdeu o acesso aos dois factores da autenticação em dois passos. Se ainda tem um deles, entre com ele e inscreva um novo."
      depois={voltar}
    >
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}
      <form action={pedirRecuperacaoAssistida} className="flex flex-col gap-4">
        <label className={ROTULO}>
          E-mail da conta da empresa
          <input name="email" type="email" autoComplete="email" required maxLength={254} className={CAMPO} />
        </label>
        <label className={ROTULO}>
          NIPC ou NIF da empresa
          <input name="nif" type="text" inputMode="numeric" autoComplete="off" maxLength={14} className={CAMPO} />
        </label>
        <label className={ROTULO}>
          Mensagem (opcional)
          <textarea name="mensagem" rows={3} maxLength={1000} className={CAMPO} />
          <span className={AJUDA_CAMPO}>Não escreva palavras-passe nem códigos.</span>
        </label>
        <div aria-hidden="true" className="hidden">
          <label>
            Website
            <input name="website" type="text" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <button type="submit" className={BOTAO_PRIMARIO}>
          Enviar o pedido
        </button>
      </form>
      <p className={TEXTO_SECUNDARIO}>
        Por segurança, contactamos a empresa pelo telefone oficial ou pela morada fiscal e confirmamos os dados do registo
        antes de repor o acesso.
      </p>
    </MolduraConta>
  );
}
