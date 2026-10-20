"use client";

import { useActionState } from "react";
import { emitirCodigos, type EstadoEmissao } from "../actions";
import { BOTAO_PEQUENO, BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, METADADOS, ROTULO } from "@/components/backoffice/ui";
import { Aviso } from "@/components/portal/Aviso";

function descarregar(conteudo: string, nome: string) {
  const url = URL.createObjectURL(new Blob([`﻿${conteudo}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Emissão de códigos: os códigos em claro só existem nesta resposta — o
 * ficheiro tem de ser descarregado agora (não volta a ser mostrado).
 */
export function EmitirCodigos({ pacoteId, maximo }: { pacoteId: string; maximo: number }) {
  const [estado, submeter, aSubmeter] = useActionState<EstadoEmissao, FormData>(emitirCodigos.bind(null, pacoteId), {
    tipo: "inicio",
  });

  if (estado.tipo === "emitidos") {
    return (
      <div className="flex flex-col gap-2">
        <Aviso tom="sucesso" titulo={`${estado.quantidade} códigos emitidos.`}>
          Descarregue o ficheiro agora: os códigos não ficam guardados e não voltam a ser mostrados. Entregue-o à empresa por um
          canal seguro.
        </Aviso>
        <button type="button" onClick={() => descarregar(estado.csv, estado.nomeFicheiro)} className={`${BOTAO_PRIMARIO} self-start`}>
          Descarregar os códigos (CSV)
        </button>
      </div>
    );
  }

  return (
    <form action={submeter} className="flex flex-wrap items-end gap-2">
      <label className={ROTULO}>
        Códigos a emitir
        <input type="number" name="quantidade" min={1} max={maximo} defaultValue={maximo} required className={`${CAMPO} w-32`} />
      </label>
      <button type="submit" disabled={aSubmeter || maximo < 1} className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>
        {aSubmeter ? "A emitir…" : "Emitir códigos"}
      </button>
      {estado.tipo === "erro" && <p className={`${METADADOS} w-full text-[var(--v2-erro)]`}>{estado.mensagem}</p>}
    </form>
  );
}

/** Descarga de um CSV já montado (relatório agregado). */
export function DescarregarCsv({ conteudo, nome, texto }: { conteudo: string; nome: string; texto: string }) {
  return (
    <button type="button" onClick={() => descarregar(conteudo, nome)} className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO} self-start`}>
      {texto}
    </button>
  );
}
