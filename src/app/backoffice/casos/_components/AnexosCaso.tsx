import { ConfirmarAcao } from "@/components/backoffice/ConfirmarAcao";
import { IconeClipe, IconeLixo } from "@/components/backoffice/Icones";
import { BOTAO_DESTRUTIVO, BOTAO_PEQUENO, BOTAO_SECUNDARIO, CAMPO_FICHEIRO, LIGACAO, ROTULO, AJUDA_CAMPO } from "@/components/backoffice/ui";

type Anexo = {
  id: string;
  nome_ficheiro: string;
  tamanho_bytes: number | null;
  created_at: string;
  apagarAction: (formData: FormData) => void;
};

function formatarTamanho(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function data(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" });
}

// Anexos do caso (DocumentCard): abrir, apagar (com confirmação — não se
// recupera) e carregar.
export function AnexosCaso({
  anexos,
  carregarAction,
}: {
  anexos: Anexo[];
  carregarAction: (formData: FormData) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {anexos.length === 0 ? (
        <p className="text-[14px] text-[var(--v2-muted)]">Sem anexos.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {anexos.map((anexo) => (
            <li
              key={anexo.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--v2-line)] bg-white px-3.5 py-2.5"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span aria-hidden className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--v2-surface)] text-[var(--v2-muted)]">
                  <IconeClipe tamanho={16} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <a href={`/api/anexos/${anexo.id}`} target="_blank" rel="noopener noreferrer" className={`${LIGACAO} truncate text-[14px]`}>
                    {anexo.nome_ficheiro}
                  </a>
                  <span className="text-[12.5px] text-[var(--v2-muted)]">
                    {[formatarTamanho(anexo.tamanho_bytes), `carregado a ${data(anexo.created_at)}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </span>
              <form action={anexo.apagarAction}>
                <ConfirmarAcao
                  className={`${BOTAO_DESTRUTIVO} ${BOTAO_PEQUENO}`}
                  titulo="Apagar este anexo?"
                  descricao={
                    <>
                      O ficheiro <strong className="text-[var(--v2-navy)]">{anexo.nome_ficheiro}</strong> é apagado de forma permanente e não pode ser recuperado.
                    </>
                  }
                  confirmar="Apagar anexo"
                  destrutiva
                  aDecorrer="A apagar…"
                >
                  <IconeLixo tamanho={15} />
                  Apagar
                </ConfirmarAcao>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={carregarAction} className="flex flex-col gap-2 rounded-[12px] border border-dashed border-[var(--v2-line-strong)] p-3.5 sm:flex-row sm:items-end">
        <label className={`${ROTULO} flex-1`}>
          Carregar anexo
          <input type="file" name="ficheiro" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" className={CAMPO_FICHEIRO} />
          <span className={AJUDA_CAMPO}>PDF, imagem, Word ou Excel.</span>
        </label>
        <button type="submit" className={BOTAO_SECUNDARIO}>
          Carregar
        </button>
      </form>
    </div>
  );
}
