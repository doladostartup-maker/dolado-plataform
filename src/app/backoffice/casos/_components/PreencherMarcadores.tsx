"use client";

import { useRef, useState, useTransition } from "react";
import { Etiqueta } from "@/components/backoffice/Estado";
import { Aviso } from "@/components/portal/Aviso";
import { AJUDA_CAMPO, BOTAO_PEQUENO, BOTAO_SECUNDARIO, CAIXA_SELECAO, CAMPO, METADADOS, TITULO_BLOCO } from "@/components/backoffice/ui";
import {
  ROTULO_CAMPO,
  inserirValores,
  marcadoresPresentes,
  marcadoresPorPreencher,
  preSelecionado,
  type CampoExtraido,
  type CampoIdentificacao,
  type Insercao,
} from "@/lib/preenchimentoReclamacao/campos";
import type { DocumentoCandidato } from "@/lib/preenchimentoReclamacao/servidor";
import { lerDadosDoDocumento } from "../preenchimento-actions";

// Preenche os marcadores de identificação do texto da reclamação com os
// dados de uma fatura ou contrato já carregado. A leitura é feita no
// servidor, sem IA; os valores chegam aqui, a pessoa confere-os (rótulo e
// página de onde vieram) e escolhe o que inserir. Só os valores sem dúvida
// vêm marcados; os outros ficam por escolher ou escrever. Nada é guardado:
// os valores vivem neste componente até serem inseridos no editor (e o texto
// só fica gravado com "Guardar"), e desaparecem ao sair da página.

type Linha = { campo: CampoExtraido; valor: string; inserir: boolean };

const CONFIANCA: Record<string, { tom: "sucesso" | "info" | "aviso" | "neutro"; rotulo: string }> = {
  confirmado: { tom: "sucesso", rotulo: "Confere" },
  provavel: { tom: "info", rotulo: "Encontrado no documento" },
  duvida: { tom: "aviso", rotulo: "Por confirmar" },
  nenhum: { tom: "neutro", rotulo: "Não encontrado" },
};

const TIPO_DOCUMENTO: Record<DocumentoCandidato["tipo"], string> = { fatura: "Fatura", contrato: "Contrato", anexo: "Anexo do caso" };

export function PreencherMarcadores({ casoId, documentos }: { casoId: string; documentos: DocumentoCandidato[] }) {
  const raiz = useRef<HTMLDivElement>(null);
  const legiveis = documentos.filter((d) => d.legivel);
  const [escolhido, setEscolhido] = useState(legiveis[0] ? `${legiveis[0].fonte}:${legiveis[0].id}` : "");
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [lido, setLido] = useState<{ nome: string; metodo: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [inseridos, setInseridos] = useState<{ insercoes: Insercao[]; restantes: string[] } | null>(null);
  /** Marcadores no texto do editor no momento da leitura. */
  const [presentes, setPresentes] = useState<CampoIdentificacao[]>([]);
  const [aLer, iniciar] = useTransition();

  const editor = () => raiz.current?.closest("form")?.querySelector<HTMLTextAreaElement>('textarea[name="conteudo"]') ?? null;

  function ler() {
    const [fonte, id] = escolhido.split(":");
    if (!fonte || !id) return;
    setErro(null);
    setInseridos(null);
    setLinhas(null);
    iniciar(async () => {
      const r = await lerDadosDoDocumento(casoId, fonte as DocumentoCandidato["fonte"], id).catch(() => null);
      if (!r || !r.ok) {
        setErro(r?.erro ?? "Não foi possível ler o documento. Preencha os dados manualmente.");
        return;
      }
      setPresentes(marcadoresPresentes(editor()?.value ?? ""));
      setLido(r.documento);
      setLinhas(r.campos.map((c) => ({ campo: c, valor: preSelecionado(c) ? (c.valor ?? "") : "", inserir: preSelecionado(c) })));
    });
  }

  function alterar(campo: CampoIdentificacao, mudanca: Partial<Linha>) {
    setLinhas((atuais) => atuais?.map((l) => (l.campo.campo === campo ? { ...l, ...mudanca } : l)) ?? null);
  }

  function inserir() {
    const area = editor();
    if (!area || !linhas) return;
    const valores = Object.fromEntries(linhas.filter((l) => l.inserir && l.valor.trim()).map((l) => [l.campo.campo, l.valor.trim()]));
    const { texto, insercoes } = inserirValores(area.value, valores);
    area.value = texto;
    area.dispatchEvent(new Event("input", { bubbles: true }));
    // Os valores lidos deixam de existir aqui; fica só o resumo do que foi
    // inserido, para a pessoa confirmar no texto.
    setLinhas(null);
    setLido(null);
    setInseridos({ insercoes, restantes: marcadoresPorPreencher(texto) });
    area.focus();
  }

  return (
    <div ref={raiz} className="flex flex-col gap-3 rounded-[12px] border border-[var(--v2-line)] bg-[var(--v2-surface)] p-4">
      <div className="flex flex-col gap-0.5">
        <p className={TITULO_BLOCO}>Dados do cliente a partir do documento</p>
        <p className={AJUDA_CAMPO}>
          Lê a fatura ou o contrato no servidor da DoLado, sem IA, e propõe os valores para os marcadores. Nada fica guardado: confira os valores, insira-os no
          texto e guarde.
        </p>
      </div>

      {legiveis.length === 0 ? (
        <p className={METADADOS}>
          {documentos.length === 0
            ? "Este caso não tem fatura nem contrato carregado. Preencha os marcadores manualmente."
            : "Os documentos deste caso não estão num formato legível (PDF, JPG, PNG ou WEBP). Preencha os marcadores manualmente."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex min-w-0 flex-col gap-1.5 text-[13px] font-semibold text-[var(--v2-navy)]">
            Documento
            <select value={escolhido} onChange={(e) => setEscolhido(e.target.value)} className={CAMPO} disabled={aLer}>
              {legiveis.map((d) => (
                <option key={`${d.fonte}:${d.id}`} value={`${d.fonte}:${d.id}`}>
                  {TIPO_DOCUMENTO[d.tipo]} · {d.nome} · {new Date(d.data).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" })}
                </option>
              ))}
            </select>
          </label>
          <div>
            <button type="button" onClick={ler} disabled={aLer || !escolhido} className={BOTAO_SECUNDARIO}>
              {aLer ? "A ler o documento…" : "Ler dados do documento"}
            </button>
          </div>
        </div>
      )}

      {aLer && <p className={METADADOS}>Um documento digitalizado pode demorar até um minuto a ler.</p>}
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {linhas && lido && (
        <div className="flex flex-col gap-3">
          <p className={METADADOS}>
            Lido de “{lido.nome}” {lido.metodo === "ocr" ? "por reconhecimento de texto (documento digitalizado) — confira com atenção" : "(texto do PDF)"}.
          </p>
          <ul className="flex flex-col gap-2">
            {linhas.map((l) => {
              const c = l.campo;
              const conf = CONFIANCA[c.confianca ?? "nenhum"];
              const noTexto = presentes.includes(c.campo);
              const opcoes = c.candidatos.length > 0 ? c.candidatos : [];
              return (
                <li key={c.campo} className="flex flex-col gap-2 rounded-[10px] border border-[var(--v2-line)] bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13.5px] font-semibold text-[var(--v2-navy)]">
                      {ROTULO_CAMPO[c.campo]} <span className="font-mono text-[12px] font-normal text-[var(--v2-muted)]">{c.marcador}</span>
                    </span>
                    <Etiqueta tom={conf.tom}>{conf.rotulo}</Etiqueta>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      value={l.valor}
                      onChange={(e) => alterar(c.campo, { valor: e.target.value, inserir: !!e.target.value.trim() })}
                      placeholder={c.confianca === "duvida" ? "Escolha ou escreva o valor" : "Escreva o valor, se o souber"}
                      aria-label={`Valor para ${c.marcador}`}
                      className={`${CAMPO} min-w-0 flex-1`}
                      autoComplete="off"
                    />
                    <label className="flex items-center gap-2 text-[13px] text-[var(--v2-navy)]">
                      <input
                        type="checkbox"
                        className={CAIXA_SELECAO}
                        checked={l.inserir}
                        disabled={!l.valor.trim() || !noTexto}
                        onChange={(e) => alterar(c.campo, { inserir: e.target.checked })}
                      />
                      Inserir
                    </label>
                  </div>
                  {opcoes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={METADADOS}>Valores no documento:</span>
                      {opcoes.map((v) => (
                        <button key={v} type="button" className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`} onClick={() => alterar(c.campo, { valor: v, inserir: true })}>
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                  {c.origem && <p className={METADADOS}>Origem: {c.origem}</p>}
                  {c.avisos.map((a) => (
                    <p key={a} className="text-[12.5px] text-[var(--v2-aviso)]">
                      {a}
                    </p>
                  ))}
                  {!noTexto && <p className={METADADOS}>O marcador {c.marcador} não está no texto.</p>}
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={inserir} disabled={!linhas.some((l) => l.inserir && l.valor.trim())} className={BOTAO_SECUNDARIO}>
              Inserir os valores escolhidos no texto
            </button>
            <button type="button" onClick={() => (setLinhas(null), setLido(null))} className={`${BOTAO_SECUNDARIO} border-transparent`}>
              Descartar
            </button>
          </div>
        </div>
      )}

      {inseridos && (
        <Aviso tom={inseridos.insercoes.length ? "sucesso" : "atencao"} titulo={inseridos.insercoes.length ? "Valores inseridos no texto (ainda não guardado)." : "Nenhum valor foi inserido."}>
          <div className="flex flex-col gap-1.5">
            {inseridos.insercoes.length > 0 && (
              <ul className="flex flex-col gap-0.5">
                {inseridos.insercoes.map((i) => (
                  <li key={i.campo}>
                    {ROTULO_CAMPO[i.campo]}: <strong>{i.valor}</strong>
                    {i.ocorrencias > 1 ? ` (${i.ocorrencias} vezes)` : ""}
                  </li>
                ))}
              </ul>
            )}
            <p>Confirme no texto que cada valor ficou no sítio certo e guarde.</p>
            {inseridos.restantes.length > 0 && <p>Marcadores ainda por preencher: {inseridos.restantes.join(", ")}.</p>}
          </div>
        </Aviso>
      )}
    </div>
  );
}
