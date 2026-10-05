import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/auth/actions";
import { Dado, ListaDados } from "@/components/portal/Dados";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_FANTASMA, BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "@/components/portal/ui";

export default async function ContaPage() {
  const { supabase, user } = await requireUser();

  const { data: perfil } = await supabase.from("utilizadores").select("nome, role").eq("id", user.id).single();

  return (
    <MolduraConta titulo="A sua conta">
      <ListaDados>
        <Dado rotulo="E-mail">{user.email}</Dado>
        <Dado rotulo="Nome">{perfil?.nome ?? "—"}</Dado>
        <Dado rotulo="Perfil">{perfil?.role ?? "cliente"}</Dado>
      </ListaDados>
      <div className="flex flex-col gap-3">
        {perfil?.role === "admin" && (
          <Link href="/backoffice" className={BOTAO_PRIMARIO}>
            Ir para o backoffice
          </Link>
        )}
        <Link href="/portal/casos" className={perfil?.role === "admin" ? BOTAO_SECUNDARIO : BOTAO_PRIMARIO}>
          Ver os meus casos
        </Link>
        <form action={logout}>
          <button type="submit" className={`${BOTAO_FANTASMA} w-full`}>
            Terminar sessão
          </button>
        </form>
      </div>
    </MolduraConta>
  );
}
