"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EstadoMfa, FactorResumo } from "@/lib/mfa";
import { FACTORES_NECESSARIOS } from "@/lib/mfa";
import { formatarData } from "@/i18n/formatar";
import { BOTAO_DESTRUTIVO, BOTAO_PEQUENO, BOTAO_PRIMARIO, BOTAO_SECUNDARIO, PAINEL, PAINEL_CORPO } from "@/components/backoffice/ui";
import { inscreverFactor, removerFactor, verificarFactor } from "./actions";

type Inscricao = { factorId: string; nome: string; qrCode: string; segredo: string };

const CAMPO =
  "mt-1 block w-full max-w-[220px] rounded-[10px] border border-[var(--v2-line-strong)] bg-white px-3 py-2 text-[18px] tracking-[0.2em] tabular-nums focus:border-[var(--v2-green)] focus:outline-none";

/** Segredo em grupos de 4 (mais fácil de copiar à mão para a aplicação). */
function agrupar(segredo: string) {
  return segredo.match(/.{1,4}/g)?.join(" ") ?? segredo;
}

function CampoCodigo({ id, valor, onChange }: { id: string; valor: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor={id} className="block text-[14px] font-semibold">
      Código de 6 dígitos
      <input
        id={id}
        name="codigo"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={7}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={CAMPO}
      />
    </label>
  );
}

export function GestaoMfa({ estado, factores }: { estado: EstadoMfa; factores: FactorResumo[] }) {
  const router = useRouter();
  const [aDecorrer, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [inscricao, setInscricao] = useState<Inscricao | null>(null);
  const [codigo, setCodigo] = useState("");
  const [factorEscolhido, setFactorEscolhido] = useState(factores[0]?.id ?? "");

  function comecarInscricao() {
    setErro(null);
    iniciar(async () => {
      const r = await inscreverFactor();
      if (r.ok) {
        setInscricao({ factorId: r.factorId, nome: r.nome, qrCode: r.qrCode, segredo: r.segredo });
        setCodigo("");
      } else setErro(r.erro);
    });
  }

  function verificar(factorId: string) {
    setErro(null);
    iniciar(async () => {
      const r = await verificarFactor(factorId, codigo);
      if (r.ok) {
        setInscricao(null);
        setCodigo("");
        router.refresh();
      } else setErro(r.erro);
    });
  }

  function retirar(factor: FactorResumo) {
    if (!window.confirm(`Retirar o factor «${factor.nome}»? A aplicação deixa de servir para entrar.`)) return;
    setErro(null);
    iniciar(async () => {
      const r = await removerFactor(factor.id);
      if (r.ok) router.refresh();
      else setErro(r.erro);
    });
  }

  const mensagemErro = erro && (
    <p role="alert" className="mt-3 text-[14px] font-semibold text-[var(--v2-erro)]">
      {erro}
    </p>
  );

  // 1. Inscrição em curso: QR code + segredo + primeiro código.
  if (inscricao) {
    return (
      <section className={`${PAINEL} ${PAINEL_CORPO}`} aria-labelledby="inscrever">
        <h2 id="inscrever" className="text-[16px] font-bold">
          Inscrever o factor «{inscricao.nome}»
        </h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px]">
          <li>Abra a aplicação de autenticação (no telemóvel ou num gestor de palavras-passe).</li>
          <li>Leia o código QR ou introduza a chave manualmente.</li>
          <li>Escreva o código de 6 dígitos que a aplicação mostrar.</li>
        </ol>
        <div className="mt-4 flex flex-wrap items-start gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG em data URL gerado pela Supabase */}
          <img src={inscricao.qrCode} alt="Código QR para a aplicação de autenticação" width={180} height={180} className="rounded-[10px] border border-[var(--v2-line)] bg-white p-2" />
          <div className="min-w-0">
            <p className="text-[13px] text-[var(--v2-muted)]">Chave para introdução manual</p>
            <p className="mt-1 break-all font-mono text-[14px]">{agrupar(inscricao.segredo)}</p>
          </div>
        </div>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            verificar(inscricao.factorId);
          }}
        >
          <CampoCodigo id="codigo-inscricao" valor={codigo} onChange={setCodigo} />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={aDecorrer} className={BOTAO_PRIMARIO}>
              {aDecorrer ? "A verificar…" : "Confirmar factor"}
            </button>
            <button type="button" disabled={aDecorrer} onClick={() => setInscricao(null)} className={BOTAO_SECUNDARIO}>
              Cancelar
            </button>
          </div>
        </form>
        {mensagemErro}
      </section>
    );
  }

  // 2. Sessão aal1 com factores: verificar um código.
  if (estado === "por_verificar") {
    return (
      <section className={`${PAINEL} ${PAINEL_CORPO}`} aria-labelledby="verificar">
        <h2 id="verificar" className="text-[16px] font-bold">
          Verificar esta sessão
        </h2>
        <p className="mt-1 text-[14px] text-[var(--v2-muted)]">Escolha o factor e introduza o código da aplicação.</p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            verificar(factorEscolhido);
          }}
        >
          {factores.length > 1 && (
            <fieldset className="space-y-1 text-[14px]">
              <legend className="font-semibold">Factor</legend>
              {factores.map((f) => (
                <label key={f.id} className="flex items-center gap-2">
                  <input type="radio" name="factor" value={f.id} checked={factorEscolhido === f.id} onChange={() => setFactorEscolhido(f.id)} />
                  {f.nome}
                </label>
              ))}
            </fieldset>
          )}
          <CampoCodigo id="codigo-verificacao" valor={codigo} onChange={setCodigo} />
          <button type="submit" disabled={aDecorrer} className={BOTAO_PRIMARIO}>
            {aDecorrer ? "A verificar…" : "Verificar"}
          </button>
        </form>
        {mensagemErro}
      </section>
    );
  }

  // 3. Sem factores, só o principal, ou completo.
  return (
    <section className={`${PAINEL} ${PAINEL_CORPO}`} aria-labelledby="factores">
      <h2 id="factores" className="text-[16px] font-bold">
        Factores inscritos
      </h2>
      {estado === "sem_factores" && (
        <p className="mt-2 text-[14px]">
          Inscreva primeiro o factor principal e, logo a seguir, um factor de reserva noutro dispositivo ou num gestor de
          palavras-passe. Os dois são necessários antes de o backoffice passar a exigir a verificação.
        </p>
      )}
      {estado === "so_principal" && (
        <p className="mt-2 rounded-[10px] bg-[#FFF6E5] p-3 text-[14px]">
          Falta o factor de reserva. Inscreva-o noutro dispositivo ou num gestor de palavras-passe: se perder o telemóvel,
          é ele que lhe permite entrar.
        </p>
      )}
      {estado === "completo" && (
        <p className="mt-2 text-[14px]">Tem o factor principal e o de reserva inscritos.</p>
      )}

      {factores.length > 0 && (
        <ul className="mt-4 divide-y divide-[var(--v2-line)] rounded-[10px] border border-[var(--v2-line)]">
          {factores.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-[14px]">
              <span>
                <span className="font-semibold">{f.nome}</span>{" "}
                <span className="text-[var(--v2-muted)]">— inscrito a {formatarData("pt-PT", f.criadoEm)}</span>
              </span>
              {factores.length >= FACTORES_NECESSARIOS && (
                <button type="button" disabled={aDecorrer} onClick={() => retirar(f)} className={`${BOTAO_DESTRUTIVO} ${BOTAO_PEQUENO}`}>
                  Retirar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <button type="button" disabled={aDecorrer} onClick={comecarInscricao} className={`mt-4 ${estado === "completo" ? BOTAO_SECUNDARIO : BOTAO_PRIMARIO}`}>
        {aDecorrer
          ? "A preparar…"
          : estado === "sem_factores"
            ? "Inscrever o factor principal"
            : estado === "so_principal"
              ? "Inscrever o factor de reserva"
              : "Acrescentar outro factor"}
      </button>
      {mensagemErro}
    </section>
  );
}
