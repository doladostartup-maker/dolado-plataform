// DoLado — validação de valores lidos dos documentos (sem I/O). Partilhado
// pela leitura das facturas (extracaoFatura.ts) e pelo bloco de electricidade
// e gás (energia.ts), sem dependências circulares entre os dois.

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function dataValida(v: unknown): v is string {
  if (typeof v !== "string" || !DATA_ISO.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

// Aceita número ou texto numérico ("42.99", "42,99").
export function paraCents(v: unknown): number | null {
  if (typeof v === "string") {
    const t = v.trim().replace(",", ".");
    if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
    v = Number(t);
  }
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.round(v * 100);
}

export function textoCurto(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}
