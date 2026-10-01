import { CANAIS_ENVIO, EVENTOS_CASO, mensagemComprovativoCliente, type TipoComprovativo } from "@/lib/textoCaso";
import { TextoIntegral, formatarDataHora } from "@/app/texto/_components/Mensagem";

// Pós-envio, visto pelo cliente. O texto mostrado é SEMPRE o da versão
// apontada pelo registo de envio (imutável na base de dados) — nunca a
// versão mais recente nem uma editável. O comprovativo abre por
// /api/comprovativos/[id], que confirma a posse e usa uma URL assinada curta.

export type EnvioCliente = {
  id: string;
  enviado_em: string;
  canal: string;
  destinatario: string;
  versao: number | null;
  conteudo: string | null;
};
export type ComprovativoCliente = {
  id: string;
  envio_id: string | null;
  tipo: TipoComprovativo;
  nome: string | null;
  identificador_externo: string | null;
};

const CAIXA =
  "flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-subtle)]";
const BOTAO =
  "inline-flex min-h-11 items-center rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";
const BOTAO_SEC =
  "inline-flex min-h-11 items-center rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]";

export function Comprovativo({ comprovativo }: { comprovativo: ComprovativoCliente | null }) {
  const temFicheiro = comprovativo?.tipo === "ficheiro";
  const temIdentificador = !!comprovativo?.identificador_externo && (comprovativo.tipo === "ficheiro" || comprovativo.tipo === "identificador");
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] font-semibold text-[var(--color-ink)]">Comprovativo de submissão</p>
      {temIdentificador && (
        <p className="text-[13.5px] text-[var(--color-ink)]">N.º da submissão: {comprovativo!.identificador_externo}</p>
      )}
      {temFicheiro && (
        <div className="flex flex-wrap gap-3">
          <a href={`/api/comprovativos/${comprovativo!.id}`} target="_blank" rel="noopener noreferrer" className={BOTAO}>
            Ver comprovativo
          </a>
          <a href={`/api/comprovativos/${comprovativo!.id}?download=1`} className={BOTAO_SEC}>
            Descarregar
          </a>
        </div>
      )}
      {!temFicheiro && !temIdentificador && (
        <p className="text-[13.5px] text-[var(--color-ink-muted)]">{mensagemComprovativoCliente(comprovativo?.tipo ?? null)}</p>
      )}
    </div>
  );
}

export function ReclamacaoEnviada({ envio, comprovativo }: { envio: EnvioCliente; comprovativo: ComprovativoCliente | null }) {
  return (
    <section className={CAIXA}>
      <div>
        <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Reclamação enviada</h2>
        <p className="text-[13.5px] text-[var(--color-ink)]">Enviada em {formatarDataHora(envio.enviado_em)}</p>
        <p className="text-[13px] text-[var(--color-ink-muted)]">
          {CANAIS_ENVIO[envio.canal as keyof typeof CANAIS_ENVIO] ?? envio.canal} · {envio.destinatario}
        </p>
      </div>
      {envio.conteudo && (
        <details>
          <summary className="cursor-pointer text-[14px] font-semibold text-[var(--color-brand)]">
            Ver reclamação enviada{envio.versao && envio.versao > 1 ? ` (versão ${envio.versao})` : ""}
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-[13px] text-[var(--color-ink-muted)]">Este é o texto exato que foi submetido. Não pode ser alterado.</p>
            <TextoIntegral conteudo={envio.conteudo} />
          </div>
        </details>
      )}
      <Comprovativo comprovativo={comprovativo} />
      <p className="text-[12.5px] text-[var(--color-ink-faint)]">
        O texto enviado e o comprovativo ficam disponíveis no seu caso no portal.
      </p>
    </section>
  );
}

export function HistoricoCaso({ eventos }: { eventos: { tipo: string; created_at: string }[] }) {
  if (eventos.length === 0) return null;
  return (
    <section className={CAIXA}>
      <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Histórico do caso</h2>
      <ol className="flex flex-col gap-1 text-[13px] text-[var(--color-ink-muted)]">
        {eventos.map((e, i) => (
          <li key={i}>
            {formatarDataHora(e.created_at)} · {EVENTOS_CASO[e.tipo] ?? e.tipo}
          </li>
        ))}
      </ol>
    </section>
  );
}
