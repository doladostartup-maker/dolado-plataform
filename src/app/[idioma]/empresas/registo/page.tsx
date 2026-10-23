import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { CampoPalavraPasse } from "@/components/portal/CampoPalavraPasse";
import { AJUDA_CAMPO, BOTAO_PRIMARIO, CAMPO, LIGACAO, ROTULO, TEXTO_SECUNDARIO } from "@/components/portal/ui";
import { AvisoSessaoParticular } from "@/components/empresas/AvisoSessaoParticular";
import { sessaoNasEntradasEmpresa } from "@/lib/auth";
import { MSG_REGISTO_ENVIADO, ROTAS_EMPRESA, TIPOS_ENTIDADE, empresasAtivo } from "@/lib/empresas/registo";
import { PALAVRA_PASSE_MIN, REQUISITOS_PALAVRA_PASSE } from "@/lib/recuperarPalavraPasse";
import { registarEmpresa } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Registar a empresa — DoLado", robots: { index: false, follow: false } };

// Registo de uma conta de empresa (DoLado Empresas, Fase 4). Só em português (D1).
export default async function RegistoEmpresaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; enviado?: string }>;
}) {
  if (!empresasAtivo()) notFound();
  const sessao = await sessaoNasEntradasEmpresa();
  if (sessao?.tipoConta === "empresa") redirect(ROTAS_EMPRESA.painel);
  const params = await searchParams;

  if (params.enviado === "1") {
    return (
      <MolduraConta semIdioma contexto="DoLado Empresas" titulo="Confirme o seu e-mail">
        <Aviso tom="sucesso">{MSG_REGISTO_ENVIADO}</Aviso>
        <p className={TEXTO_SECUNDARIO}>
          Depois de confirmar o e-mail, vai inscrever a autenticação em dois passos e o pedido segue para aprovação.
        </p>
      </MolduraConta>
    );
  }

  return (
    <MolduraConta
      semIdioma
      contexto="DoLado Empresas"
      titulo="Registar a empresa"
      descricao="Crie a conta da empresa. Depois de confirmar o e-mail e proteger a conta com a autenticação em dois passos, a DoLado analisa o pedido."
      depois={
        <>
          Já tem conta?{" "}
          <Link href={ROTAS_EMPRESA.entrar} prefetch={false} className={LIGACAO}>
            Entrar
          </Link>
        </>
      }
    >
      {sessao?.tipoConta === "particular" && <AvisoSessaoParticular />}
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}

      <form action={registarEmpresa} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold text-[var(--v2-navy)]">Tipo de entidade</legend>
          {Object.entries(TIPOS_ENTIDADE).map(([valor, rotulo], i) => (
            <label key={valor} className="flex min-h-11 items-center gap-3 text-[15px]">
              <input type="radio" name="tipo" value={valor} required defaultChecked={i === 0} className="h-[18px] w-[18px] accent-[var(--v2-green)]" />
              {rotulo}
            </label>
          ))}
        </fieldset>
        <label className={ROTULO}>
          Nome da empresa ou do profissional
          <input name="nome" type="text" autoComplete="organization" required maxLength={200} className={CAMPO} />
        </label>
        <label className={ROTULO}>
          NIPC ou NIF
          <input name="nif" type="text" inputMode="numeric" autoComplete="off" required maxLength={14} className={CAMPO} />
          <span className={AJUDA_CAMPO}>Sociedades: o NIPC. Empresários em nome individual e profissionais independentes: o seu NIF.</span>
        </label>
        <label className={ROTULO}>
          Nome do responsável pela conta
          <input name="responsavel" type="text" autoComplete="name" required maxLength={200} className={CAMPO} />
        </label>
        <label className={ROTULO}>
          E-mail
          <input name="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" required className={CAMPO} />
          <span className={AJUDA_CAMPO}>Tem de ser diferente do e-mail de uma conta particular da DoLado.</span>
        </label>
        <label className={ROTULO}>
          Palavra-passe
          <CampoPalavraPasse
            name="password"
            autoComplete="new-password"
            minLength={PALAVRA_PASSE_MIN}
            mostrar="Mostrar"
            esconder="Esconder"
            descricao={REQUISITOS_PALAVRA_PASSE}
          />
        </label>
        <label className={ROTULO}>
          Confirmar a palavra-passe
          <input name="confirmar_password" type="password" autoComplete="new-password" required minLength={PALAVRA_PASSE_MIN} className={CAMPO} />
        </label>
        <button type="submit" className={BOTAO_PRIMARIO}>
          Criar a conta da empresa
        </button>
      </form>
    </MolduraConta>
  );
}
