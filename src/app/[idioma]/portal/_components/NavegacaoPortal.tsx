"use client";

import Link from "@/i18n/Link";
import { usePathname } from "next/navigation";
import { SeletorIdioma } from "@/components/idioma/SeletorIdioma";
import { separarIdioma } from "@/i18n/config";
import { useTextos } from "@/i18n/cliente";
import { tPortal } from "@/i18n/mensagens/portal";
import { logout } from "@/app/auth/actions";
import { IconeCartao, IconeEscudo, IconeMais, IconePainel, IconePasta, IconePessoa, IconeSair } from "@/components/portal/Icones";
import { BOTAO_PRIMARIO } from "@/components/portal/ui";

// Mesma navegação na barra lateral (md e acima) e no menu móvel. Só
// apresentação: o acesso a cada página continua decidido no servidor
// (requireUser / requireProtecao).

const PRINCIPAL = [
  { href: "/portal", chave: "painel", Icone: IconePainel, exato: true },
  { href: "/portal/casos", chave: "casos", Icone: IconePasta },
  { href: "/portal/contratos", chave: "protecao", Icone: IconeEscudo },
] as const;

const CONTA = [
  { href: "/portal/subscricao", chave: "subscricao", Icone: IconeCartao },
  { href: "/portal/perfil", chave: "perfil", Icone: IconePessoa },
] as const;

function ativo(pathname: string, href: string, exato?: boolean) {
  if (exato) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Item({ href, texto, Icone, exato }: { href: string; texto: string; Icone: typeof IconePainel; exato?: boolean }) {
  // Caminho sem o prefixo de idioma (/en/portal → /portal).
  const pathname = separarIdioma(usePathname() ?? "").caminho;
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
  const t = useTextos(tPortal).navegacao;
  return (
    <div className="flex flex-1 flex-col">
      <Link href="/portal/casos/novo" className={`${BOTAO_PRIMARIO} mb-6 w-full`}>
        <IconeMais tamanho={18} />
        {t.novoCaso}
      </Link>

      <nav aria-label={t.rotulo} className="flex flex-col gap-6">
        <ul className="flex flex-col gap-1">
          {PRINCIPAL.map(({ chave, ...i }) => (
            <li key={i.href}>
              <Item {...i} texto={t[chave]} />
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#7A889A]">{t.aSuaConta}</p>
          <ul className="flex flex-col gap-1">
            {CONTA.map(({ chave, ...i }) => (
              <li key={i.href}>
                <Item {...i} texto={t[chave]} />
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="mt-auto flex flex-col gap-2 pt-6">
        <SeletorIdioma className="px-2" />
        <form action={logout}>
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[14.5px] font-semibold text-[var(--v2-muted)] hover:bg-[var(--v2-surface)] hover:text-[var(--v2-navy)]"
          >
            <IconeSair tamanho={19} />
            {t.terminarSessao}
          </button>
        </form>
      </div>
    </div>
  );
}
