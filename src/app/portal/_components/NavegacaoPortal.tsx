"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { IconeCartao, IconeEscudo, IconeMais, IconePainel, IconePasta, IconePessoa, IconeSair } from "@/components/portal/Icones";
import { BOTAO_PRIMARIO } from "@/components/portal/ui";

// Mesma navegação na barra lateral (md e acima) e no menu móvel. Só
// apresentação: o acesso a cada página continua decidido no servidor
// (requireUser / requireProtecao).

const PRINCIPAL = [
  { href: "/portal", texto: "Painel", Icone: IconePainel, exato: true },
  { href: "/portal/casos", texto: "Os meus casos", Icone: IconePasta },
  { href: "/portal/contratos", texto: "Proteção", Icone: IconeEscudo },
] as const;

const CONTA = [
  { href: "/portal/subscricao", texto: "Subscrição", Icone: IconeCartao },
  { href: "/portal/perfil", texto: "Perfil e avisos", Icone: IconePessoa },
] as const;

function ativo(pathname: string, href: string, exato?: boolean) {
  if (exato) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Item({ href, texto, Icone, exato }: { href: string; texto: string; Icone: typeof IconePainel; exato?: boolean }) {
  const pathname = usePathname() ?? "";
  // "Abrir novo caso" tem botão próprio: não marca "Os meus casos".
  const atual = ativo(pathname, href, exato) && pathname !== "/portal/casos/novo";
  return (
    <Link
      href={href}
      aria-current={atual ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[14.5px] font-semibold transition-colors ${
        atual
          ? "bg-[var(--v2-mint-bg)] text-[var(--v2-green-dark)]"
          : "text-[var(--v2-muted)] hover:bg-[var(--v2-surface)] hover:text-[var(--v2-navy)]"
      }`}
    >
      <Icone tamanho={19} className={atual ? "text-[var(--v2-green)]" : undefined} />
      {texto}
    </Link>
  );
}

export function NavegacaoPortal() {
  return (
    <div className="flex flex-1 flex-col">
      <Link href="/portal/casos/novo" className={`${BOTAO_PRIMARIO} mb-6 w-full`}>
        <IconeMais tamanho={18} />
        Abrir novo caso
      </Link>

      <nav aria-label="Portal" className="flex flex-col gap-6">
        <ul className="flex flex-col gap-1">
          {PRINCIPAL.map((i) => (
            <li key={i.href}>
              <Item {...i} />
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#7A889A]">A sua conta</p>
          <ul className="flex flex-col gap-1">
            {CONTA.map((i) => (
              <li key={i.href}>
                <Item {...i} />
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="mt-auto pt-6">
        <form action={logout}>
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[14.5px] font-semibold text-[var(--v2-muted)] hover:bg-[var(--v2-surface)] hover:text-[var(--v2-navy)]"
          >
            <IconeSair tamanho={19} />
            Terminar sessão
          </button>
        </form>
      </div>
    </div>
  );
}
