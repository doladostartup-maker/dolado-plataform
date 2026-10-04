import Link from "next/link";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, LIGACAO } from "@/components/portal/ui";

export default function EntrarPage() {
  return (
    <MolduraConta
      contexto="Área de cliente"
      titulo="Entre na sua conta"
      descricao="Acompanhe os seus casos, o que a DoLado está a fazer por si e a sua Proteção."
      depois={
        <>
          Tem um problema para tratar?{" "}
          <Link href="/tratar-caso" className={LIGACAO}>
            Comece aqui
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Link href="/login" className={BOTAO_PRIMARIO}>
          Iniciar sessão
        </Link>
        <Link href="/registo" className={BOTAO_SECUNDARIO}>
          Criar conta
        </Link>
      </div>
    </MolduraConta>
  );
}
