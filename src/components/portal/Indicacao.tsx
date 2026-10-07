import { indicacoesAtivas, TEXTOS_INDICACAO, textoDescontosDisponiveis, textoValidade } from "@/lib/indicacoes/regras";
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
        <p className="text-[16px] font-bold text-[var(--v2-navy)]">{textoDescontosDisponiveis(resumo.disponiveis)}</p>
        {resumo.validades.length > 0 && (
          <ul className="flex flex-col gap-0.5 text-[14px] text-[var(--v2-navy)]">
            {resumo.validades.map((expira, i) => (
              <li key={`${expira}-${i}`}>Desconto de 20% — {textoValidade(expira)}</li>
            ))}
          </ul>
        )}
        <p className={METADADOS}>
          {resumo.concluidas === 1 ? "1 indicação concluída" : `${resumo.concluidas} indicações concluídas`} ·{" "}
          {resumo.usados === 1 ? "1 desconto já utilizado" : `${resumo.usados} descontos já utilizados`}
          {resumo.expirados > 0 && ` · ${resumo.expirados === 1 ? "1 desconto expirado" : `${resumo.expirados} descontos expirados`}`}
          {resumo.emVerificacao > 0 && ` · ${resumo.emVerificacao} em verificação pela DoLado`}
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
