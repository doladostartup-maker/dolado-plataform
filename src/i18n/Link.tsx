"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { localizarHref } from "./config";
import { useIdioma } from "./cliente";

// next/link no idioma atual: "/precario" → "/en/precario" em inglês. Usar em
// todas as páginas do cliente em vez de next/link (o backoffice não usa).

export default function Link({ href, ...resto }: ComponentProps<typeof NextLink>) {
  const idioma = useIdioma();
  const destino =
    typeof href === "string"
      ? localizarHref(idioma, href)
      : href.pathname
        ? { ...href, pathname: localizarHref(idioma, href.pathname) }
        : href;
  return <NextLink href={destino} {...resto} />;
}
