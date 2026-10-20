import { indicacoesAtivas } from "@/lib/indicacoes/regras";
import { formatarDataCurta } from "@/i18n/formatar";
import { tIndicacoes } from "@/i18n/mensagens/indicacoes";
import { obterIdioma } from "@/i18n/servidor";
import { resumoIndicacaoDaConta } from "@/lib/indicacoes/servidor";
import { createClient } from "@/lib/supabase/server";
import { PartilharIndicacao } from "./PartilharIndicacao";
import { CARTAO, CARTAO_INFO, METADADOS, TEXTO_SECUNDARIO, TITULO_SECCAO } from "./ui";

// Programa de indicação no portal (só com INDICACOES_ATIVO=1). Mostra só
// números da própria conta — nunca nomes, e-mails ou qualquer dado das
// pessoas indicadas.

async function resumoDaSessao() {
  if (!indicacoesAtivas()) return null;
  const { data } = await (await createClient()).auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) return null;
  try {
    return await resumoIndicacaoDaConta(userId);
  } catch {
    return null; // a área não aparece; nada mais depende dela
  }
}

/** Área "Indique a DoLado" (Perfil): sempre disponível, sem ser intrusiva. */
export async function AreaIndicacao() {
  const resumo = await resumoDaSessao();
  if (!resumo) return null;
  const idioma = await obterIdioma();
  const t = tIndicacoes[idioma];
  const TEXTOS_INDICACAO = t.textos;
  return (
    <section id="indicar" aria-labelledby="indicar-titulo" className={`${CARTAO} flex scroll-mt-24 flex-col gap-4`}>
      <div className="flex flex-col gap-1">
        <h2 id="indicar-titulo" className={TITULO_SECCAO}>
          {TEXTOS_INDICACAO.titulo}
        </h2>
        <p className="text-[16px] font-bold text-[var(--v2-green-dark)]">{TEXTOS_INDICACAO.mensagem}</p>
        <p className={TEXTO_SECUNDARIO}>{TEXTOS_INDICACAO.apoio}</p>
      </div>

      <PartilharIndicacao url={resumo.url} local="perfil" />

      <div className={`${CARTAO_INFO} flex flex-col gap-1`}>
        <p className="text-[16px] font-bold text-[var(--v2-navy)]">{t.descontosDisponiveis(resumo.disponiveis)}</p>
        {resumo.validades.length > 0 && (
          <ul className="flex flex-col gap-0.5 text-[14px] text-[var(--v2-navy)]">
            {resumo.validades.map((expira, i) => (
              <li key={`${expira}-${i}`}>{t.area.desconto(t.validade(formatarDataCurta(idioma, expira)))}</li>
            ))}
          </ul>
        )}
        <p className={METADADOS}>
          {t.area.concluidas(resumo.concluidas)} · {t.area.usados(resumo.usados)}
          {resumo.expirados > 0 && ` · ${t.area.expirados(resumo.expirados)}`}
          {resumo.emVerificacao > 0 && ` · ${t.area.emVerificacao(resumo.emVerificacao)}`}
        </p>
      </div>

      <p className={METADADOS}>{TEXTOS_INDICACAO.regras}</p>
    </section>
  );
}

/**
 * Convite nos momentos certos do caso: discreto depois do envio da
 * reclamação; em destaque quando o caso fica resolvido.
 */
export async function ConviteIndicacao({ momento }: { momento: "apos_envio" | "resultado_positivo" }) {
  const resumo = await resumoDaSessao();
  if (!resumo) return null;
  const TEXTOS_INDICACAO = tIndicacoes[await obterIdioma()].textos;
  const forte = momento === "resultado_positivo";
  return (
    <section aria-label={TEXTOS_INDICACAO.titulo} className={`${forte ? CARTAO : CARTAO_INFO} flex flex-col gap-3`}>
      <p className={forte ? "text-[16px] font-bold leading-snug text-[var(--v2-navy)]" : TEXTO_SECUNDARIO}>
        {forte ? TEXTOS_INDICACAO.resultadoPositivo : TEXTOS_INDICACAO.aposEnvio}
      </p>
      <PartilharIndicacao url={resumo.url} local={momento} />
    </section>
  );
}
