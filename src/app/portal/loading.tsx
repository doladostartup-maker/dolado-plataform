export default function PortalLoading() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <div className="h-8 w-56 animate-pulse rounded-[10px] bg-[#E9EEF4]" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded-[8px] bg-[#EEF2F6]" />
      <div className="mt-2 h-32 animate-pulse rounded-[16px] bg-[#EEF2F6]" />
      <div className="h-32 animate-pulse rounded-[16px] bg-[#EEF2F6]" />
      <span className="sr-only">A carregar…</span>
    </div>
  );
}
