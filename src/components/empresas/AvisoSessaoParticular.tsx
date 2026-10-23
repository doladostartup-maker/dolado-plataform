import { Aviso } from "@/components/portal/Aviso";
import { BOTAO_SECUNDARIO } from "@/components/portal/ui";
import { terminarSessao } from "@/app/[idioma]/empresa/actions";

/** Sessão de uma conta particular aberta neste navegador (uma sessão por navegador). */
export function AvisoSessaoParticular() {
  return (
    <Aviso tom="atencao" titulo="Tem uma sessão aberta com uma conta particular">
      <p>Para usar a conta da empresa, termine primeiro essa sessão neste navegador.</p>
      <form action={terminarSessao} className="mt-3">
        <button type="submit" className={BOTAO_SECUNDARIO}>
          Terminar a sessão particular
        </button>
      </form>
    </Aviso>
  );
}
