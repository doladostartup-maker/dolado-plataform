"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Aviso } from "@/components/portal/Aviso";
import { BOTAO_PRIMARIO, CAIXA_SELECAO, CAMPO, ROTULO } from "@/components/portal/ui";
import { prepararUploadEmpresa, registarDocumentoEmpresa } from "@/app/[idioma]/empresa/documentos/actions";

// Carregamento de um documento da empresa: a instalação e o tipo são
// obrigatórios. O ficheiro vai directamente para o Storage por URL assinada
// (caminho decidido no servidor); o servidor regista-o e responde logo — a
// leitura corre depois.

const TIPOS_ACEITES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

type Instalacao = { id: string; nome: string };

export function CarregarDocumentoEmpresa({ instalacoes, configuracaoDisponivel }: { instalacoes: Instalacao[]; configuracaoDisponivel: boolean }) {
  const router = useRouter();
  const ficheiro = useRef<HTMLInputElement>(null);
  const [instalacaoId, setInstalacaoId] = useState(instalacoes.length === 1 ? instalacoes[0].id : "");
  const [tipo, setTipo] = useState<"fatura" | "contrato">("fatura");
  const [configuracao, setConfiguracao] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recebido, setRecebido] = useState(false);
  // Antes de a página estar pronta, o formulário não pode ser enviado (sem o
  // JavaScript seria um envio vazio).
  const pronto = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setRecebido(false);
    const f = ficheiro.current?.files?.[0];
    if (!instalacaoId) return setErro("Escolha a instalação.");
    if (!f) return setErro("Escolha o ficheiro.");
    if (!TIPOS_ACEITES.includes(f.type)) return setErro("Formato não suportado. Envie um PDF ou uma imagem JPG, PNG ou WebP.");
    setAEnviar(true);
    try {
      const p = await prepararUploadEmpresa(f.type, f.size);
      if (!p.ok) return setErro(p.erro);
      const { error } = await createClient().storage.from("documentos-monitor").uploadToSignedUrl(p.caminho, p.token, f);
      if (error) return setErro("Não foi possível enviar o ficheiro. Tente de novo.");
      const r = await registarDocumentoEmpresa({
        caminho: p.caminho,
        nomeFicheiro: f.name,
        tipo,
        instalacaoId,
        configuracaoInicial: tipo === "fatura" && configuracao,
      });
      if (!r.ok) return setErro(r.erro);
      setRecebido(true);
      if (ficheiro.current) ficheiro.current.value = "";
      router.refresh();
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {recebido && <Aviso tom="sucesso">Documento recebido. A análise corre em segundo plano.</Aviso>}
      <label className={ROTULO}>
        Instalação
        <select value={instalacaoId} onChange={(e) => setInstalacaoId(e.target.value)} required className={CAMPO}>
          <option value="">Escolha a instalação</option>
          {instalacoes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[14px] font-semibold">Tipo de documento</legend>
        {(["fatura", "contrato"] as const).map((t) => (
          <label key={t} className="flex min-h-11 items-center gap-3 text-[15px]">
            <input type="radio" name="tipo" checked={tipo === t} onChange={() => setTipo(t)} className="h-[18px] w-[18px] accent-[var(--v2-green)]" />
            {t === "fatura" ? "Factura" : "Contrato"}
          </label>
        ))}
      </fieldset>
      {tipo === "fatura" && configuracaoDisponivel && (
        <label className="flex items-start gap-3 text-[14.5px]">
          <input type="checkbox" checked={configuracao} onChange={(e) => setConfiguracao(e.target.checked)} className={CAIXA_SELECAO} />
          É uma factura antiga, para a configuração inicial (não conta para as facturas do mês; até 3 por serviço, nos primeiros 30 dias).
        </label>
      )}
      <label className={ROTULO}>
        Ficheiro (PDF, JPG, PNG ou WebP, até 10 MB)
        <input ref={ficheiro} type="file" accept={TIPOS_ACEITES.join(",")} required className="text-[15px]" />
      </label>
      <button type="submit" disabled={!pronto || aEnviar} className={BOTAO_PRIMARIO}>
        {aEnviar ? "A enviar…" : "Carregar o documento"}
      </button>
    </form>
  );
}
