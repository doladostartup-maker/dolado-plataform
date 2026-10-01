import { CANAIS_ENVIO, TIPOS_COMPROVATIVO_EQUIPA, type TipoComprovativo } from "@/lib/textoCaso";
import { registarComprovativo } from "../texto-actions";

// Reclamação enviada (equipa): texto exato enviado, versão, data,
// destinatário, canal, resultado e comprovativo de submissão. O texto
// enviado é só de leitura (a versão é imutável na base de dados). O
// comprovativo pode ser associado ou corrigido; as correções ficam no
// histórico (nada é apagado).

export type EnvioEquipa = {
  id: string;
  texto_id: string;
  destinatario: string;
  canal: string;
  resultado: string | null;
  enviado_em: string;
  conteudo_sha256: string;
  versao: number | null;
  conteudo: string | null;
};
export type ComprovativoEquipa = {
  id: string;
  envio_id: string | null;
  tipo: TipoComprovativo;
  nome: string | null;
  identificador_externo: string | null;
  nota: string | null;
  tamanho_bytes: number | null;
  created_at: string;
  substituido_em: string | null;
};

const CAIXA = "flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5";
const INPUT = "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)]";
const BOTAO = "rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-[10px] text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]";
const LINK = "text-[var(--color-brand)] underline";

function dataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Lisbon" });
}

function DescricaoComprovativo({ c }: { c: ComprovativoEquipa }) {
  return (
    <span>
      {TIPOS_COMPROVATIVO_EQUIPA[c.tipo]} · registado {dataHora(c.created_at)}
      {c.tipo === "ficheiro" && (
        <>
          {" "}·{" "}
          <a href={`/api/comprovativos/${c.id}`} target="_blank" rel="noopener noreferrer" className={LINK}>
            Ver {c.nome}
          </a>{" "}
          ·{" "}
          <a href={`/api/comprovativos/${c.id}?download=1`} className={LINK}>
            Descarregar
          </a>
        </>
      )}
      {c.identificador_externo ? ` · Identificador: ${c.identificador_externo}` : ""}
      {c.nota ? ` · Nota: ${c.nota}` : ""}
    </span>
  );
}

function Comprovativo({ casoId, envioId, comprovativos }: { casoId: string; envioId: string | null; comprovativos: ComprovativoEquipa[] }) {
  const lista = comprovativos.filter((c) => c.envio_id === envioId);
  const emVigor = lista.find((c) => !c.substituido_em) ?? null;
  const substituidos = lista.filter((c) => c.substituido_em);
  return (
    <div className="flex flex-col gap-2 border-t border-[var(--color-hairline)] pt-3">
      <p className="text-sm font-semibold text-[var(--color-ink)]">Comprovativo de submissão</p>
      <p className="text-[13px] text-[var(--color-ink)]">
        {emVigor ? <DescricaoComprovativo c={emVigor} /> : "Ainda não associado — o cliente vê uma mensagem neutra."}
      </p>
      {substituidos.length > 0 && (
        <details className="text-[12.5px] text-[var(--color-ink-muted)]">
          <summary className="cursor-pointer">Registos substituídos ({substituidos.length})</summary>
          <ul className="mt-1 flex flex-col gap-1">
            {substituidos.map((c) => (
              <li key={c.id}>
                <DescricaoComprovativo c={c} /> · substituído {dataHora(c.substituido_em!)}
              </li>
            ))}
          </ul>
        </details>
      )}
      <details>
        <summary className="cursor-pointer text-[13px] font-medium text-[var(--color-ink)]">
          {emVigor ? "Corrigir comprovativo (o atual fica no histórico)" : "Associar comprovativo"}
        </summary>
        <form action={registarComprovativo.bind(null, casoId, envioId)} className="mt-2 flex flex-col gap-2">
          <select name="tipo" required defaultValue="ficheiro" className={INPUT}>
            {Object.entries(TIPOS_COMPROVATIVO_EQUIPA).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input type="file" name="ficheiro" accept="application/pdf,image/jpeg,image/png,image/webp" className="text-sm" />
          <input name="identificador_externo" maxLength={200} placeholder="N.º da reclamação / identificador (opcional com ficheiro)" className={INPUT} />
          <input name="nota" maxLength={1000} placeholder="Nota interna (não visível para o cliente)" className={INPUT} />
          <div>
            <button type="submit" className={BOTAO}>
              Registar
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}

export function EnviosCaso({
  casoId,
  envios,
  comprovativos,
}: {
  casoId: string;
  envios: EnvioEquipa[];
  comprovativos: ComprovativoEquipa[];
}) {
  if (envios.length === 0) {
    // Caso antigo (submetido antes do fluxo de texto) — o comprovativo pode
    // ser associado ao caso, sem inventar ligação a um envio ou versão.
    return (
      <section className={CAIXA}>
        <p className="text-sm font-semibold text-[var(--color-ink)]">Comprovativo de submissão (sem envio registado no sistema)</p>
        <p className="text-[12.5px] text-[var(--color-ink-muted)]">
          Use apenas para reclamações submetidas antes do registo de envio no backoffice.
        </p>
        <Comprovativo casoId={casoId} envioId={null} comprovativos={comprovativos} />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      {envios.map((e) => (
        <div key={e.id} className={CAIXA}>
          <p className="text-sm font-semibold text-[var(--color-ink)]">Reclamação enviada{e.versao ? ` — versão ${e.versao}` : ""}</p>
          <p className="text-[13px] text-[var(--color-ink)]">
            {dataHora(e.enviado_em)} · {CANAIS_ENVIO[e.canal as keyof typeof CANAIS_ENVIO] ?? e.canal} · {e.destinatario}
            {e.resultado ? ` · ${e.resultado}` : ""}
          </p>
          <p className="text-[12px] text-[var(--color-ink-faint)]">SHA-256 do texto enviado: {e.conteudo_sha256.slice(0, 16)}…</p>
          {e.conteudo && (
            <details>
              <summary className="cursor-pointer text-[13px] font-medium text-[var(--color-ink)]">Texto enviado (só leitura)</summary>
              <div className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-[var(--radius-input)] bg-[var(--color-surface-sunken)] p-3 font-mono text-[13px] text-[var(--color-ink)]">
                {e.conteudo}
              </div>
            </details>
          )}
          <Comprovativo casoId={casoId} envioId={e.id} comprovativos={comprovativos} />
        </div>
      ))}
    </section>
  );
}
