import { CANAIS_ENVIO, mensagemComprovativoCliente, type TipoComprovativo } from "@/lib/textoCaso";
import { TextoIntegral, formatarDataHora } from "@/app/texto/_components/Mensagem";
import { Dado, ListaDados } from "@/components/portal/Dados";
import { Etiqueta } from "@/components/portal/Etiqueta";
import { IconeDescarregar, IconeDocumentoVisto, IconeEnviar } from "@/components/portal/Icones";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CARTAO, METADADOS, TEXTO_SECUNDARIO, TITULO_SECCAO } from "@/components/portal/ui";

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

/** Comprovativo de submissão, apresentado como um documento do processo. */
export function Comprovativo({ comprovativo }: { comprovativo: ComprovativoCliente | null }) {
  const temFicheiro = comprovativo?.tipo === "ficheiro";
  const temIdentificador = !!comprovativo?.identificador_externo && (comprovativo.tipo === "ficheiro" || comprovativo.tipo === "identificador");
  const disponivel = temFicheiro || temIdentificador;
  return (
    <div
      className={`flex flex-col gap-3 rounded-[14px] border p-4 ${
        disponivel ? "border-[var(--v2-line)] bg-[var(--v2-surface)]" : "border-dashed border-[var(--v2-line-strong)] bg-white"
      }`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex min-w-0 gap-3">
          <span
            aria-hidden
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] ${
              disponivel ? "bg-white text-[var(--v2-green)] shadow-[0_1px_2px_rgba(11,37,69,0.08)]" : "bg-[var(--v2-surface)] text-[var(--v2-muted)]"
            }`}
          >
            <IconeDocumentoVisto tamanho={22} />
          </span>
          <div className="min-w-0 self-center">
            <p className="text-[15px] font-bold text-[var(--v2-navy)]">Comprovativo de submissão</p>
            {temIdentificador && (
              <p className="break-words text-[14px] text-[var(--v2-navy)]">N.º da submissão: {comprovativo!.identificador_externo}</p>
            )}
            {comprovativo?.nome && temFicheiro && <p className={`${METADADOS} break-all`}>{comprovativo.nome}</p>}
          </div>
        </div>
        {temFicheiro && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <a href={`/api/comprovativos/${comprovativo!.id}`} target="_blank" rel="noopener noreferrer" className={BOTAO_PRIMARIO}>
              Ver comprovativo
            </a>
            <a href={`/api/comprovativos/${comprovativo!.id}?download=1`} className={BOTAO_SECUNDARIO}>
              <IconeDescarregar tamanho={18} />
              Descarregar
            </a>
          </div>
        )}
      </div>
      {!temFicheiro && !temIdentificador && (
        <p className={TEXTO_SECUNDARIO}>{mensagemComprovativoCliente(comprovativo?.tipo ?? null)}</p>
      )}
    </div>
  );
}

export function ReclamacaoEnviada({ envio, comprovativo }: { envio: EnvioCliente; comprovativo: ComprovativoCliente | null }) {
  return (
    <section aria-labelledby={`envio-${envio.id}`} className={`${CARTAO} flex flex-col gap-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--v2-mint)] text-[var(--v2-green)]">
            <IconeEnviar tamanho={19} />
          </span>
          <h2 id={`envio-${envio.id}`} className={TITULO_SECCAO}>
            Reclamação enviada
          </h2>
        </div>
        <Etiqueta tom="concluido">Enviada</Etiqueta>
      </div>

      <ListaDados colunas={2}>
        <Dado rotulo="Enviada em">{formatarDataHora(envio.enviado_em)}</Dado>
        <Dado rotulo="Por">{CANAIS_ENVIO[envio.canal as keyof typeof CANAIS_ENVIO] ?? envio.canal}</Dado>
        <Dado rotulo="Destinatário" largo>
          {envio.destinatario}
        </Dado>
      </ListaDados>

      <Comprovativo comprovativo={comprovativo} />

      {envio.conteudo && (
        <details className="group rounded-[14px] border border-[var(--v2-line)]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[14.5px] font-semibold text-[var(--v2-navy)] [&::-webkit-details-marker]:hidden">
            <span>Texto exato enviado{envio.versao && envio.versao > 1 ? ` (versão ${envio.versao})` : ""}</span>
            <span aria-hidden className="text-[var(--v2-green)] transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="flex flex-col gap-2 border-t border-[var(--v2-line)] p-4">
            <p className={METADADOS}>Este é o texto exato que foi submetido. Não pode ser alterado.</p>
            <TextoIntegral conteudo={envio.conteudo} />
          </div>
        </details>
      )}

      <p className={METADADOS}>O texto enviado e o comprovativo ficam disponíveis no seu caso no portal.</p>
    </section>
  );
}
