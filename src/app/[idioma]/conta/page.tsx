import Link from "@/i18n/Link";
import { tConta } from "@/i18n/mensagens/conta";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/auth/actions";
import { Dado, ListaDados } from "@/components/portal/Dados";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_FANTASMA, BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "@/components/portal/ui";

export default async function ContaPage({ params }: ComIdioma) {
  const t = tConta[await idiomaDaPagina(params)].aSuaConta;
  const { supabase, user } = await requireUser();

  const { data: perfil } = await supabase.from("utilizadores").select("nome, role").eq("id", user.id).single();

  return (
    <MolduraConta titulo={t.titulo}>
      <ListaDados>
        <Dado rotulo={t.email}>{user.email}</Dado>
        <Dado rotulo={t.nome}>{perfil?.nome ?? "—"}</Dado>
        <Dado rotulo={t.perfil}>{perfil?.role === "admin" ? t.perfis.admin : t.perfis.cliente}</Dado>
      </ListaDados>
      <div className="flex flex-col gap-3">
        {perfil?.role === "admin" && (
          <Link href="/backoffice" className={BOTAO_PRIMARIO}>
            {t.backoffice}
          </Link>
        )}
        <Link href="/portal/casos" className={perfil?.role === "admin" ? BOTAO_SECUNDARIO : BOTAO_PRIMARIO}>
          {t.verCasos}
        </Link>
        <form action={logout}>
          <button type="submit" className={`${BOTAO_FANTASMA} w-full`}>
            {t.terminarSessao}
          </button>
        </form>
      </div>
    </MolduraConta>
  );
}
