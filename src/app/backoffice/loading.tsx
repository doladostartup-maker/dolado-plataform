export default function BackofficeLoading() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <div className="h-7 w-64 animate-pulse rounded-[8px] bg-[#E9EEF4]" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded-[6px] bg-[#EEF2F6]" />
      <div className="mt-2 h-28 animate-pulse rounded-[14px] bg-[#EEF2F6]" />
      <div className="h-56 animate-pulse rounded-[14px] bg-[#EEF2F6]" />
      <span className="sr-only">A carregar…</span>
    </div>
  );
}
