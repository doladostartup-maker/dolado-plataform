export function SectorChip({ sector }: { sector: string | null }) {
  if (!sector) {
    return <span className="text-[var(--color-ink-faint)]">—</span>;
  }

  return (
    <span className="inline-flex items-center rounded-[var(--radius-input)] bg-[var(--color-brand-wash)] px-[10px] py-[4px] text-[13px] font-medium text-[var(--color-brand)]">
      {sector}
    </span>
  );
}
