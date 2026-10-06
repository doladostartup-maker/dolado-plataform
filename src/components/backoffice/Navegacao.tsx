"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logout } from "@/app/auth/actions";
import {
  IconeBalanca,
  IconeCartao,
  IconeEscudo,
  IconeLupaDocumento,
  IconeMais,
  IconeMegafone,
  IconeMensagem,
  IconePainel,
  IconePasta,
  IconeRelogio,
  IconeSair,
  IconeTrocar,
  IconeVisto,
} from "./Icones";
import { BOTAO_SECUNDARIO } from "./ui";

// Barra lateral do backoffice (computador) e conteúdo do menu móvel. Só
// apresentação: o acesso continua decidido no servidor (requireAdmin no layout
// e em cada página).

export type ContagensNavegacao = {
  acao: number | null;
  documentos: number | null;
  achados: number | null;
  compras: number | null;
  conversoes: number | null;
  naoAssociadas: number | null;
};

type ItemNav = {
  href: string;
  texto: string;
  icone: ReactNode;
  contagem?: number | null;
  critico?: boolean;
  /** Prefixos de rota que NÃO marcam este item como atual. */
  exceto?: string[];
  exato?: boolean;
};

function ativo(pathname: string, i: ItemNav) {
  if (i.exato) return pathname === i.href;
  if (i.exceto?.some((e) => pathname === e || pathname.startsWith(`${e}/`))) return false;
  return pathname === i.href || pathname.startsWith(`${i.href}/`);
}

function Item({ item, pathname }: { item: ItemNav; pathname: string }) {
  const atual = ativo(pathname, item);
  const pendentes = (item.contagem ?? 0) > 0;
  return (
    <Link
      href={item.href}
      prefetch={false}
      aria-current={atual ? "page" : undefined}
      className={`flex min-h-10 items-center gap-2.5 rounded-[10px] px-2.5 text-[14px] font-semibold transition-colors ${
        atual ? "bg-[var(--v2-mint-bg)] text-[var(--v2-green-dark)]" : "text-[var(--v2-muted)] hover:bg-[var(--v2-surface)] hover:text-[var(--v2-navy)]"
      }`}
    >
      <span aria-hidden className={`inline-flex shrink-0 ${atual ? "text-[var(--v2-green)]" : ""}`}>
        {item.icone}
      </span>
      <span className="flex-1 truncate">{item.texto}</span>
      {pendentes && (
        <span
          className={`min-w-6 rounded-full px-1.5 py-px text-center text-[12px] font-bold tabular-nums ${
            item.critico ? "bg-[var(--v2-erro)] text-white" : "bg-[var(--v2-navy)] text-white"
          }`}
        >
          {item.contagem}
          <span className="sr-only"> pendentes</span>
        </span>
      )}
    </Link>
  );
}

function Grupo({ titulo, itens, pathname }: { titulo?: string; itens: ItemNav[]; pathname: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      {titulo && <p className="px-2.5 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#7A889A]">{titulo}</p>}
      <ul className="flex flex-col gap-0.5">
        {itens.map((i) => (
          <li key={i.href}>
            <Item item={i} pathname={pathname} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NavegacaoBackoffice({ contagens, email }: { contagens: ContagensNavegacao; email?: string }) {
  const pathname = usePathname() ?? "";
  const t = 18;

  return (
    <div className="flex flex-1 flex-col">
      <Link href="/backoffice/casos/novo" prefetch={false} className={`${BOTAO_SECUNDARIO} mb-5 w-full`}>
        <IconeMais tamanho={17} />
        Novo caso
      </Link>

      <nav aria-label="Backoffice" className="flex flex-col gap-5">
        <Grupo
          pathname={pathname}
          itens={[{ href: "/backoffice", texto: "Hoje", icone: <IconePainel tamanho={t} />, contagem: contagens.acao, exato: true }]}
        />
        <Grupo
          titulo="Casos"
          pathname={pathname}
          itens={[
            { href: "/backoffice/casos", texto: "Todos os casos", icone: <IconePasta tamanho={t} />, exceto: ["/backoffice/casos/novo"] },
            { href: "/backoffice/revisao", texto: "Fila de revisão", icone: <IconeVisto tamanho={t} /> },
            { href: "/backoffice/urgentes", texto: "Fidelização a terminar", icone: <IconeRelogio tamanho={t} /> },
            { href: "/backoffice/respostas-sem-caso", texto: "Respostas sem caso", icone: <IconeMensagem tamanho={t} />, contagem: contagens.naoAssociadas },
          ]}
        />
        <Grupo
          titulo="Proteção"
          pathname={pathname}
          itens={[
            {
              href: "/backoffice/monitor",
              texto: "Documentos",
              icone: <IconeEscudo tamanho={t} />,
              contagem: contagens.documentos,
              exceto: ["/backoffice/monitor/achados"],
            },
            { href: "/backoffice/monitor/achados", texto: "Situações detetadas", icone: <IconeLupaDocumento tamanho={t} />, contagem: contagens.achados },
          ]}
        />
        <Grupo
          titulo="Pagamentos"
          pathname={pathname}
          itens={[
            { href: "/backoffice/compras", texto: "Compras por rever", icone: <IconeCartao tamanho={t} />, contagem: contagens.compras },
            { href: "/backoffice/conversoes", texto: "Conversões", icone: <IconeTrocar tamanho={t} />, contagem: contagens.conversoes, critico: true },
          ]}
        />
        <Grupo
          titulo="Conteúdos"
          pathname={pathname}
          itens={[
            { href: "/backoffice/avisos", texto: "Avisos setoriais", icone: <IconeMegafone tamanho={t} /> },
            { href: "/backoffice/regras-juridicas", texto: "Base jurídica", icone: <IconeBalanca tamanho={t} /> },
          ]}
        />
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-[var(--v2-line)] pt-4">
        {email && (
          <p className="truncate px-2.5 text-[12.5px] text-[var(--v2-muted)]" title={email}>
            {email}
          </p>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="flex min-h-10 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[14px] font-semibold text-[var(--v2-muted)] hover:bg-[var(--v2-surface)] hover:text-[var(--v2-navy)]"
          >
            <IconeSair tamanho={t} />
            Terminar sessão
          </button>
        </form>
      </div>
    </div>
  );
}
