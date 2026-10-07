import { Seccao, Dado, ListaDados } from "@/components/backoffice/Blocos";
import { ConfirmarAcao } from "@/components/backoffice/ConfirmarAcao";
import { Etiqueta } from "@/components/backoffice/Estado";
import { AJUDA_CAMPO, BOTAO_SECUNDARIO, CAMPO_TEXTO_LONGO, LIGACAO, METADADOS, ROTULO, TEXTO_SECUNDARIO } from "@/components/backoffice/ui";
import { ESTADO_ENCERRADO_EXTERNO } from "@/lib/encerramentoExterno";
import { estadoCaso } from "@/lib/backoffice/triagem";
import { encerrarEncaminhamentoExterno, gerarDossie } from "../encerramento-actions";

// Encerramento do caso com encaminhamento externo (equipa). Antes: o
// formulário de encerramento, com motivo interno e confirmação. Depois:
// quem e quando, versões do dossiê (descarga pelo mesmo caminho do cliente,
// /api/dossies/[id]) e "Gerar nova versão". A base de dados decide se a
// transição é permitida e bloqueia novas ações no caso encerrado.

export type EncerramentoResumo = { encerrado_em: string; encerrado_por_nome: string | null; estado_anterior: string; motivo: string };
export type DossieResumo = { id: string; versao: number; nome: string; tamanho_bytes: number; gerado_em: string; modelo_versao: string };

const PODE_ENCERRAR = [
  "Em investigação",
  "Aguardando operador",
  "Resposta em análise",
  "Aguardando cliente",
  "Aguardando decisão cliente",
  "Bloqueado",
  "Encerrado sem resolução",
];

function dataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Lisbon" });
}

export function EncerramentoCaso({
  casoId,
  status,
  comunicacoesPorAnalisar,
  encerramento,
  dossies,
}: {
  casoId: string;
  status: string;
  comunicacoesPorAnalisar: number;
  encerramento: EncerramentoResumo | null;
  dossies: DossieResumo[];
}) {
  const encerrado = status === ESTADO_ENCERRADO_EXTERNO;

  if (encerrado) {
    return (
      <Seccao
        id="encerramento"
        titulo="Encerramento e dossiê"
        estado={<Etiqueta tom="neutro">Encerrado na DoLado</Etiqueta>}
        descricao="O acompanhamento terminou. Sem novas ações neste caso (textos, envios, pedidos, análises); para retomar, use “Corrigir estado”."
      >
        {encerramento && (
          <ListaDados colunas={2}>
            <Dado rotulo="Encerrado em">{dataHora(encerramento.encerrado_em)}</Dado>
            <Dado rotulo="Por">{encerramento.encerrado_por_nome ?? "—"}</Dado>
            <Dado rotulo="Estado anterior">{estadoCaso(encerramento.estado_anterior).rotulo}</Dado>
            <Dado rotulo="Motivo (interno)">
              <span className="whitespace-pre-wrap">{encerramento.motivo}</span>
            </Dado>
          </ListaDados>
        )}
        <div className="flex flex-col gap-2 border-t border-[var(--v2-line)] pt-3">
          <p className="text-[13px] font-semibold">Dossiê do caso (PDF)</p>
          {dossies.length === 0 ? (
            <p className="text-[14px] text-[var(--v2-erro)]">Ainda sem dossiê. O cliente vê que está a ser preparado — gere-o agora.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-[14px]">
              {dossies.map((d, i) => (
                <li key={d.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <a href={`/api/dossies/${d.id}`} className={LIGACAO}>
                    Versão {d.versao}
                  </a>
                  <span className={METADADOS}>
                    gerada {dataHora(d.gerado_em)} · {(d.tamanho_bytes / 1024).toFixed(0)} KB · {d.modelo_versao}
                    {i === 0 ? " · a que o cliente descarrega" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form action={gerarDossie.bind(null, casoId)}>
            <ConfirmarAcao
              className={BOTAO_SECUNDARIO}
              titulo={dossies.length ? "Gerar uma nova versão do dossiê?" : "Gerar o dossiê?"}
              descricao="O PDF reflete o que está no sistema neste momento. As versões anteriores ficam guardadas; o cliente passa a descarregar a mais recente."
              confirmar="Gerar dossiê"
              aDecorrer="A gerar…"
            >
              {dossies.length ? "Gerar nova versão" : "Gerar dossiê"}
            </ConfirmarAcao>
          </form>
        </div>
      </Seccao>
    );
  }

  const disponivel = PODE_ENCERRAR.includes(status);
  return (
    <Seccao
      id="encerramento"
      titulo="Encerrar com encaminhamento externo"
      descricao="Quando a DoLado já fez as ações previstas no serviço e o problema continua sem solução. O caso não fica “Resolvido”: o cliente recebe o dossiê e a informação pública sobre as entidades RAL."
    >
      {!disponivel ? (
        <p className={TEXTO_SECUNDARIO}>Disponível depois de a DoLado ter começado a tratar o caso (e nunca num caso resolvido).</p>
      ) : (
        <form action={encerrarEncaminhamentoExterno.bind(null, casoId)} className="flex flex-col gap-3">
          {comunicacoesPorAnalisar > 0 && (
            <p className="text-[13.5px] text-[var(--v2-erro)]">Há comunicações recebidas por analisar: analise-as antes de encerrar.</p>
          )}
          <label className={ROTULO}>
            Motivo do encerramento (interno)
            <span className={AJUDA_CAMPO}>Fica no registo do encerramento. Não aparece ao cliente nem no dossiê.</span>
            <textarea name="motivo" required minLength={5} maxLength={1000} rows={3} className={CAMPO_TEXTO_LONGO} />
          </label>
          <ul className={`${AJUDA_CAMPO} list-disc pl-5`}>
            <li>Textos por enviar e pedidos de informação em aberto deixam de estar em curso (nada é apagado).</li>
            <li>É gerado o dossiê em PDF e o cliente é avisado por e-mail.</li>
            <li>A DoLado não representa o cliente nem indica a entidade competente: o portal só mostra informação pública.</li>
          </ul>
          <div>
            <ConfirmarAcao
              className={BOTAO_SECUNDARIO}
              disabled={comunicacoesPorAnalisar > 0}
              titulo="Encerrar o caso na DoLado?"
              descricao="O cliente passa a ver “Encerrado na DoLado”, recebe o dossiê e é avisado por e-mail. Deixa de ser possível preparar ou enviar comunicações neste caso."
              confirmar="Encerrar o caso"
              destrutiva
              aDecorrer="A encerrar…"
            >
              Encerrar e gerar dossiê
            </ConfirmarAcao>
          </div>
        </form>
      )}
    </Seccao>
  );
}
