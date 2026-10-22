"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";
import { lerSessaoDiagnostico, sessaoDiagnosticoOuNova } from "@/lib/diagnostico/cookie";
import { utilizadorAtual } from "@/lib/auth";
import { canalDeOrigem, diagnosticoAtivo, dispositivoDe, normalizarPagina, normalizarUtm } from "@/lib/diagnostico/regras";
import {
  confirmarDiagnostico,
  estadoDiagnostico,
  prepararDiagnostico,
  processarDiagnostico,
  registarEscolha,
  type EstadoPublico,
  type ResultadoPreparar,
} from "@/lib/diagnostico/servidor";

// Diagnóstico gratuito sem registo (src/lib/diagnostico/). Sem conta, sem
// e-mail: a sessão é o cookie funcional dolado_diagnostico. O browser só
// envia o tipo e o tamanho do ficheiro e a origem (UTM e anfitrião de
// origem, normalizados aqui); o modelo, o caminho e os limites decide-os o
// servidor. Limite por IP em memória (5 em 10 min) e diário na base de dados.

async function obterIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

export async function prepararDiagnosticoAction(dados: {
  mime: string;
  tamanho: number;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
  pagina?: string | null;
}): Promise<ResultadoPreparar | { ok: false; erro: "indisponivel" }> {
  if (!diagnosticoAtivo()) return { ok: false, erro: "indisponivel" };
  if (excedeuLimiteTaxa(`diagnostico:${await obterIp()}`)) return { ok: false, erro: "limite" };

  const utmSource = normalizarUtm(dados.utmSource);
  const utmMedium = normalizarUtm(dados.utmMedium);
  const sessao = await sessaoDiagnosticoOuNova();
  return prepararDiagnostico(
    sessao,
    { mime: String(dados.mime ?? ""), tamanho: Number(dados.tamanho) },
    {
      canal: canalDeOrigem({ utmSource, utmMedium, referrer: typeof dados.referrer === "string" ? dados.referrer : null }),
      utmSource,
      utmMedium,
      utmCampaign: normalizarUtm(dados.utmCampaign),
      paginaEntrada: normalizarPagina(dados.pagina),
      dispositivo: dispositivoDe((await headers()).get("user-agent")),
    },
  );
}

export async function confirmarDiagnosticoAction(id: string): Promise<{ ok: boolean }> {
  if (!diagnosticoAtivo()) return { ok: false };
  const sessao = await lerSessaoDiagnostico();
  if (!sessao) return { ok: false };
  const r = await confirmarDiagnostico(sessao, String(id));
  if (r.ok) after(() => processarDiagnostico(String(id)));
  return { ok: r.ok };
}

/** O browser onde o documento foi carregado ou, sem ele, o dono com sessão iniciada. */
export async function estadoDiagnosticoAction(id: string): Promise<EstadoPublico | null> {
  const sessao = await lerSessaoDiagnostico();
  const doBrowser = sessao ? await estadoDiagnostico({ sessao }, String(id)) : null;
  if (doBrowser) return doBrowser;
  const { user } = await utilizadorAtual();
  return user ? estadoDiagnostico({ contaId: user.id }, String(id)) : null;
}

export async function escolhaDiagnosticoAction(id: string, escolha: "protecao" | "guardar"): Promise<void> {
  const sessao = await lerSessaoDiagnostico();
  if (sessao && (escolha === "protecao" || escolha === "guardar")) await registarEscolha(sessao, String(id), escolha);
}
