export default function PortalLoading() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <div className="h-7 w-56 animate-pulse rounded-[var(--radius-input)] bg-[var(--color-surface-sunken)]" />
      <div className="h-32 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-surface-sunken)]" />
      <div className="h-32 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-surface-sunken)]" />
      <span className="sr-only">A carregar…</span>
    </div>
  );
}
