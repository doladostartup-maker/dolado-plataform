import { MENSAGENS_TEXTO, type ResultadoAcaoTexto } from "@/lib/textoCaso";

export function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

export function MensagemTexto({ resultado, autorizadoEm }: { resultado: ResultadoAcaoTexto; autorizadoEm?: string | null }) {
  const m = MENSAGENS_TEXTO[resultado];
  const sucesso = resultado === "autorizado" || resultado === "pedido_registado" || resultado === "ja_autorizado";
  return (
    <div
      role="status"
      className={`rounded-[var(--radius-card)] border-l-[3px] px-5 py-4 ${
        sucesso ? "border-[var(--color-brand)] bg-[var(--color-brand-wash)]" : "border-[var(--color-hairline-strong)] bg-[var(--color-surface-sunken)]"
      }`}
    >
      <p className="mb-1 text-[15px] font-semibold text-[var(--color-ink)]">{m.titulo}</p>
      <p className="text-[14px] leading-relaxed text-[var(--color-ink)]">
        {resultado === "ja_autorizado" && autorizadoEm
          ? `Este texto já foi autorizado em ${formatarDataHora(autorizadoEm)}. A DoLado pode proceder ao envio em seu nome.`
          : m.texto}
      </p>
    </div>
  );
}

/** Texto integral, como texto simples (nunca HTML). */
export function TextoIntegral({ conteudo }: { conteudo: string }) {
  return (
    <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 text-[14.5px] leading-relaxed text-[var(--color-ink)]">
      {conteudo}
    </div>
  );
}
