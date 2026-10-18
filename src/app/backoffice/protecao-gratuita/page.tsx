import { requireAdmin } from "@/lib/auth";
import { protecaoGratuitaDisponivel } from "@/lib/protecaoGratuitaServidor";
import { CabecalhoPagina, TituloSeccao } from "@/components/backoffice/Cabecalho";
import { Aviso } from "@/components/portal/Aviso";
import { METADADOS, PAINEL, PAINEL_CORPO } from "@/components/backoffice/ui";

// Proteção gratuita (30 dias): números do funil a partir da base de dados
// (protecao_gratuita_metricas(), só admin, sem dados pessoais). As visitas à
// oferta e os cliques no CTA ficam no GA4 (eventos protecao_gratuita_vista e
// protecao_gratuita_clique, só com consentimento, em dolado.pt): o portal
// não tem banner do Cookiebot, por isso tudo o que acontece lá é contado
// aqui.

type Metricas = {
  ativadas: number;
  ativas_agora: number;
  contas_novas: number;
  com_documentos: number;
  com_analise: number;
  chegaram_ao_fim: number;
  convertidas: number;
  convertidas_durante: number;
  convertidas_caso_protecao: number;
  cancelamentos_posteriores: number;
  por_origem: Record<string, number>;
};

const NOMES_ORIGEM: Record<string, string> = {
  homepage: "Homepage",
  precario: "Preçário",
  protecao: "Página da Proteção",
  portal: "Portal",
  outro: "Outra",
};

function percentagem(parte: number, total: number) {
  return total > 0 ? `${((parte / total) * 100).toFixed(1).replace(".", ",")}%` : "—";
}

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: string | number; detalhe?: string }) {
  return (
    <div className={`${PAINEL} ${PAINEL_CORPO} flex flex-col gap-1`}>
      <p className={METADADOS}>{rotulo}</p>
      <p className="text-[22px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">{valor}</p>
      {detalhe && <p className={METADADOS}>{detalhe}</p>}
    </div>
  );
}

export default async function ProtecaoGratuitaBackofficePage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("protecao_gratuita_metricas");
  const m = (data ?? null) as Metricas | null;

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        contexto="Pagamentos"
        titulo="Proteção gratuita"
        descricao="30 dias de Proteção sem cartão, uma vez por conta e por e-mail. Termina sozinha, sem cobrança; a adesão é sempre expressa. Nada é criado no Stripe durante o período gratuito."
      />
      {!protecaoGratuitaDisponivel() && (
        <Aviso tom="info">
          A oferta está desligada (PROTECAO_GRATUITA_ATIVA e PROTECAO_GRATUITA_CHAVE). Os períodos já ativados continuam até ao fim.
        </Aviso>
      )}
      {error && <Aviso tom="erro">Não foi possível ler as métricas.</Aviso>}
      {m && (
        <section aria-labelledby="numeros" className="flex flex-col gap-3">
          <TituloSeccao id="numeros" titulo="Números" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Numero rotulo="Proteções gratuitas ativadas" valor={m.ativadas} detalhe={`${m.ativas_agora} em curso agora`} />
            <Numero
              rotulo="Contas criadas para a oferta"
              valor={m.contas_novas}
              detalhe={`Conta criada até 24 h antes da ativação · ${percentagem(m.contas_novas, m.ativadas)}`}
            />
            <Numero rotulo="Adicionaram documentos" valor={m.com_documentos} detalhe={percentagem(m.com_documentos, m.ativadas)} />
            <Numero rotulo="Receberam uma análise" valor={m.com_analise} detalhe={percentagem(m.com_analise, m.ativadas)} />
            <Numero rotulo="Chegaram ao fim dos 30 dias" valor={m.chegaram_ao_fim} />
            <Numero
              rotulo="Conversões para subscrição paga"
              valor={m.convertidas}
              detalhe={`${percentagem(m.convertidas, m.chegaram_ao_fim)} de quem chegou ao fim · ${m.convertidas_durante} durante o período · ${m.convertidas_caso_protecao} para Caso + Proteção`}
            />
            <Numero
              rotulo="Cancelamentos posteriores"
              valor={m.cancelamentos_posteriores}
              detalhe={percentagem(m.cancelamentos_posteriores, m.convertidas)}
            />
            <Numero
              rotulo="Ativações por origem"
              valor={m.ativadas}
              detalhe={Object.entries(m.por_origem)
                .map(([o, n]) => `${NOMES_ORIGEM[o] ?? o}: ${n}`)
                .join(" · ") || undefined}
            />
          </div>
          <p className={METADADOS}>
            Visitas à oferta e cliques no CTA: GA4, eventos protecao_gratuita_vista e protecao_gratuita_clique (só com consentimento).
          </p>
        </section>
      )}
    </div>
  );
}
