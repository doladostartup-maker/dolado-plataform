"use client";

import { useTextos } from "@/i18n/cliente";
import { tPortal } from "@/i18n/mensagens/portal";

export default function PortalLoading() {
  const t = useTextos(tPortal);
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <div className="h-8 w-56 animate-pulse rounded-[10px] bg-[#E9EEF4]" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded-[8px] bg-[#EEF2F6]" />
      <div className="mt-2 h-32 animate-pulse rounded-[16px] bg-[#EEF2F6]" />
      <div className="h-32 animate-pulse rounded-[16px] bg-[#EEF2F6]" />
      <span className="sr-only">{t.aCarregar}</span>
    </div>
  );
}
