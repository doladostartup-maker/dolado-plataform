import { CANAIS_ENVIO, TIPOS_COMPROVATIVO_EQUIPA, type TipoComprovativo } from "@/lib/textoCaso";
import { registarComprovativo } from "../texto-actions";
import { Seccao } from "@/components/backoffice/Blocos";
import { Etiqueta } from "@/components/backoffice/Estado";
import { Aviso } from "@/components/portal/Aviso";
import {
  AJUDA_CAMPO,
  BOTAO_SECUNDARIO,
  CAMPO,
  CAMPO_FICHEIRO,
  CODIGO,
  LIGACAO,
  ROTULO,
  TEXTO_DOCUMENTO,
  TITULO_BLOCO,
} from "@/components/backoffice/ui";

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
  referencia?: string | null;
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
          <a href={`/api/comprovativos/${c.id}`} target="_blank" rel="noopener noreferrer" className={LIGACAO}>
            Ver {c.nome}
          </a>{" "}
          ·{" "}
          <a href={`/api/comprovativos/${c.id}?download=1`} className={LIGACAO}>
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
    <div className="flex flex-col gap-3 border-t border-[var(--v2-line)] pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className={TITULO_BLOCO}>Comprovativo de submissão</p>
        {emVigor ? <Etiqueta tom="sucesso">Associado</Etiqueta> : <Etiqueta tom="aviso">Em falta</Etiqueta>}
      </div>
      <p className="text-[14px] text-[var(--v2-navy)]">
        {emVigor ? <DescricaoComprovativo c={emVigor} /> : "Ainda não associado — o cliente vê uma mensagem neutra."}
      </p>
      {substituidos.length > 0 && (
        <details className="text-[13px] text-[var(--v2-muted)]">
          <summary className="cursor-pointer font-semibold">Registos substituídos ({substituidos.length})</summary>
          <ul className="mt-1 flex flex-col gap-1">
            {substituidos.map((c) => (
              <li key={c.id}>
                <DescricaoComprovativo c={c} /> · substituído {dataHora(c.substituido_em!)}
              </li>
            ))}
          </ul>
        </details>
      )}
      <details open={!emVigor} className="rounded-[12px] border border-[var(--v2-line)]">
        <summary className="flex min-h-10 cursor-pointer items-center px-4 text-[14px] font-semibold text-[var(--v2-navy)]">
          {emVigor ? "Corrigir comprovativo (o atual fica no histórico)" : "Associar comprovativo"}
        </summary>
        <form action={registarComprovativo.bind(null, casoId, envioId)} className="flex flex-col gap-3 border-t border-[var(--v2-line)] p-4">
          <label className={ROTULO}>
            Tipo
            <select name="tipo" required defaultValue="ficheiro" className={CAMPO}>
              {Object.entries(TIPOS_COMPROVATIVO_EQUIPA).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className={ROTULO}>
            Ficheiro <span className={AJUDA_CAMPO}>PDF ou imagem (JPEG, PNG, WebP)</span>
            <input type="file" name="ficheiro" accept="application/pdf,image/jpeg,image/png,image/webp" className={CAMPO_FICHEIRO} />
          </label>
          <label className={ROTULO}>
            N.º da reclamação ou identificador <span className={AJUDA_CAMPO}>(opcional com ficheiro)</span>
            <input name="identificador_externo" maxLength={200} className={CAMPO} />
          </label>
          <label className={ROTULO}>
            Nota interna <span className={AJUDA_CAMPO}>(não visível para o cliente)</span>
            <input name="nota" maxLength={1000} className={CAMPO} />
          </label>
          <div>
            <button type="submit" className={BOTAO_SECUNDARIO}>
              Registar comprovativo
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
      <Seccao
        id="envio"
        titulo="Envio e comprovativo"
        descricao="Ainda não há envio registado no sistema. O envio regista-se em “Reclamação” depois da autorização do cliente."
      >
        <details className="rounded-[12px] border border-[var(--v2-line)]">
          <summary className="flex min-h-10 cursor-pointer items-center px-4 text-[14px] font-semibold text-[var(--v2-navy)]">
            Comprovativo de submissão sem envio registado (casos antigos)
          </summary>
          <div className="flex flex-col gap-2 border-t border-[var(--v2-line)] p-4">
            <p className={AJUDA_CAMPO}>Use apenas para reclamações submetidas antes do registo de envio no backoffice.</p>
            <Comprovativo casoId={casoId} envioId={null} comprovativos={comprovativos} />
          </div>
        </details>
      </Seccao>
    );
  }

  return (
    <Seccao id="envio" titulo="Envio e comprovativo" descricao="Texto exato enviado à empresa (só leitura), data, canal e comprovativo.">
      {envios.map((e, i) => (
        <div key={e.id} className="flex flex-col gap-3">
          <Aviso tom="sucesso" titulo={`${i === 0 ? "Reclamação enviada" : "Nova comunicação enviada"}${e.versao ? ` — versão ${e.versao}` : ""}`}>
            {dataHora(e.enviado_em)} · {CANAIS_ENVIO[e.canal as keyof typeof CANAIS_ENVIO] ?? e.canal} · {e.destinatario}
            {e.referencia ? ` · referência ${e.referencia}` : ""}
            {e.resultado ? ` · ${e.resultado}` : ""}
          </Aviso>
          <p className={CODIGO}>SHA-256 do texto enviado: {e.conteudo_sha256.slice(0, 16)}…</p>
          {e.conteudo && (
            <details className="rounded-[12px] border border-[var(--v2-line)]">
              <summary className="flex min-h-10 cursor-pointer items-center px-4 text-[14px] font-semibold text-[var(--v2-navy)]">Texto enviado (só leitura)</summary>
              <div className="border-t border-[var(--v2-line)] p-3">
                <div className={TEXTO_DOCUMENTO}>{e.conteudo}</div>
              </div>
            </details>
          )}
          <Comprovativo casoId={casoId} envioId={e.id} comprovativos={comprovativos} />
        </div>
      ))}
    </Seccao>
  );
}
