/** Separador "ou" entre o formulário e o acesso com Google. */
export function SeparadorOu({ texto = "ou" }: { texto?: string }) {
  return (
    <div className="flex items-center gap-3 text-[13px] text-[var(--v2-muted)]">
      <span className="h-px flex-1 bg-[var(--v2-line)]" />
      {texto}
      <span className="h-px flex-1 bg-[var(--v2-line)]" />
    </div>
  );
}
