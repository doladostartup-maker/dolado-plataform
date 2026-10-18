// Job da Proteção gratuita (sem efeitos diretos; testável com `node --test`).
// Corre de hora a hora (pg_cron → /api/internal/protecao-gratuita) e logo
// depois de uma ativação (só o e-mail do dia 0 dessa conta).
//
//   1. manutenção: termina os períodos que já passaram do fim (e desativa os
//      dados como no fim de uma subscrição) e apaga pseudónimos expirados —
//      o acesso já terminou pela data, isto só acerta o estado;
//   2. e-mails: para cada período com um marco por enviar
//      (protecao_gratuita_avisos_pendentes — e-mail confirmado da conta),
//      reserva (sem reserva, não envia: nunca sai duas vezes), monta, envia
//      pela Brevo e conclui (enviado / falhou).
// Recusa da Brevo → nova tentativa na execução seguinte (até 3). Resultado
// incerto (tempo esgotado) → sem nova tentativa automática: pode ter saído.

import { montarEmailProtecaoGratuita } from "./email/protecaoGratuita.ts";
import { ehMarco, marcoOpcional, type MarcoAviso } from "./protecaoGratuita.ts";
import { IDIOMA_PADRAO, type Idioma } from "../i18n/config.ts";

export type AvisoPendente = {
  gratuita_id: string;
  user_id: string;
  email: string;
  marco: string;
  inicio_em: string;
  termina_em: string;
};

export interface DependenciasProtecaoGratuita {
  manutencao(): Promise<{ terminadas: number; pseudonimos_apagados: number }>;
  pendentes(): Promise<AvisoPendente[]>;
  reservar(gratuitaId: string, marco: MarcoAviso): Promise<string | null>;
  idiomaDaConta(userId: string): Promise<Idioma>;
  /** Documentos já adicionados à Proteção (só a contagem). */
  contarDocumentos(userId: string): Promise<number>;
  /** Ligação para deixar de receber os lembretes (dias 7 e 25). */
  urlLembretes(gratuitaId: string): string;
  enviarEmail(destinatario: string, assunto: string, html: string, texto: string): Promise<void>;
  concluir(avisoId: string, enviado: boolean, erro?: string, repetir?: boolean): Promise<void>;
}

export type ResultadoJob = { terminadas: number; pseudonimosApagados: number; enviados: number; falhados: number; ignorados: number };

const codigo = (erro: unknown) => {
  const c = (erro as { code?: unknown })?.code;
  return typeof c === "string" && c ? c : "erro";
};

export async function processarProtecaoGratuita(
  deps: DependenciasProtecaoGratuita,
  portalUrl: string,
  opcoes: { soGratuita?: string; semManutencao?: boolean } = {},
): Promise<ResultadoJob> {
  const m = opcoes.semManutencao ? { terminadas: 0, pseudonimos_apagados: 0 } : await deps.manutencao();
  let enviados = 0;
  let falhados = 0;
  let ignorados = 0;

  const pendentes = (await deps.pendentes()).filter((p) => !opcoes.soGratuita || p.gratuita_id === opcoes.soGratuita);
  for (const p of pendentes) {
    if (!ehMarco(p.marco)) {
      ignorados += 1;
      continue;
    }
    let aviso: string | null = null;
    try {
      aviso = await deps.reservar(p.gratuita_id, p.marco);
      if (!aviso) {
        ignorados += 1;
        continue;
      }
      let email;
      try {
        const [idioma, documentos] = await Promise.all([
          deps.idiomaDaConta(p.user_id).catch(() => IDIOMA_PADRAO),
          p.marco === "d7" ? deps.contarDocumentos(p.user_id) : Promise.resolve(0),
        ]);
        email = montarEmailProtecaoGratuita({
          marco: p.marco,
          idioma,
          inicio: p.inicio_em,
          fim: p.termina_em,
          documentos,
          portalUrl,
          urlLembretes: marcoOpcional(p.marco) ? deps.urlLembretes(p.gratuita_id) : null,
        });
      } catch (erro) {
        await deps.concluir(aviso, false, `dados_${codigo(erro)}`, true);
        throw erro;
      }
      try {
        await deps.enviarEmail(p.email, email.assunto, email.html, email.texto);
      } catch (erro) {
        const c = codigo(erro);
        const recusado = c.startsWith("brevo_");
        await deps.concluir(aviso, false, recusado ? c : "envio_incerto", recusado);
        throw erro;
      }
      await deps.concluir(aviso, true);
      enviados += 1;
    } catch (erro) {
      falhados += 1;
      // Sem dados pessoais nos registos: só o marco, a reserva e o código.
      console.error(JSON.stringify({ origem: "protecao_gratuita", marco: p.marco, aviso, erro_codigo: codigo(erro) }));
    }
  }

  return { terminadas: m.terminadas, pseudonimosApagados: m.pseudonimos_apagados, enviados, falhados, ignorados };
}
