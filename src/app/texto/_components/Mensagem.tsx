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
      className={`rounded-[14px] border px-4 py-3.5 ${
        sucesso ? "border-[#CDE9D9] bg-[var(--v2-mint-bg)]" : "border-[var(--v2-line)] bg-[var(--v2-surface)]"
      }`}
    >
      <p className="mb-1 text-[15px] font-semibold text-[var(--v2-navy)]">{m.titulo}</p>
      <p className="text-[14.5px] leading-relaxed text-[var(--v2-navy)]">
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
    <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words rounded-[14px] border border-[var(--v2-line)] bg-white p-5 text-[15px] leading-relaxed text-[var(--v2-navy)]">
      {conteudo}
    </div>
  );
}
