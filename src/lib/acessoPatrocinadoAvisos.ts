// Avisos da Protecção oferecida por um parceiro (sem efeitos directos;
// testável com `node --test`). Corre de hora a hora, na mesma rota interna
// da Protecção gratuita (/api/internal/protecao-gratuita), e logo depois de
// uma activação (só o aviso de activação dessa conta). O fim dos acessos e
// a desactivação dos dados são feitos na base de dados (pg_cron
// acessos-patrocinados-manutencao); aqui só os e-mails.
//
// Para cada acesso com um marco por enviar (acesso_patrocinado_avisos_pendentes
// — e-mail confirmado da conta): reserva (sem reserva, não envia: nunca sai
// duas vezes), monta, envia pela Brevo e conclui. Recusa da Brevo → nova
// tentativa na execução seguinte (até 3). Resultado incerto → sem nova
// tentativa automática.

import { montarEmailAcessoPatrocinado } from "./email/acessoPatrocinado.ts";
import { ehMarcoAcesso, type MarcoAcesso } from "./acessoPatrocinado.ts";
import { IDIOMA_PADRAO, type Idioma } from "../i18n/config.ts";

export type AvisoAcessoPendente = {
  acesso_id: string;
  user_id: string;
  email: string;
  marco: string;
  inicio_em: string;
  termina_em: string;
  parceiro: string;
};

export interface DependenciasAcessoPatrocinado {
  pendentes(): Promise<AvisoAcessoPendente[]>;
  reservar(acessoId: string, marco: MarcoAcesso): Promise<string | null>;
  idiomaDaConta(userId: string): Promise<Idioma>;
  enviarEmail(destinatario: string, assunto: string, html: string, texto: string): Promise<void>;
  concluir(avisoId: string, enviado: boolean, erro?: string, repetir?: boolean): Promise<void>;
}

export type ResultadoAvisosAcesso = { enviados: number; falhados: number; ignorados: number };

const codigo = (erro: unknown) => {
  const c = (erro as { code?: unknown })?.code;
  return typeof c === "string" && c ? c : "erro";
};

export async function processarAvisosAcessoPatrocinado(
  deps: DependenciasAcessoPatrocinado,
  portalUrl: string,
  opcoes: { soAcesso?: string } = {},
): Promise<ResultadoAvisosAcesso> {
  let enviados = 0;
  let falhados = 0;
  let ignorados = 0;

  const pendentes = (await deps.pendentes()).filter((p) => !opcoes.soAcesso || p.acesso_id === opcoes.soAcesso);
  for (const p of pendentes) {
    if (!ehMarcoAcesso(p.marco)) {
      ignorados += 1;
      continue;
    }
    let aviso: string | null = null;
    try {
      aviso = await deps.reservar(p.acesso_id, p.marco);
      if (!aviso) {
        ignorados += 1;
        continue;
      }
      let email;
      try {
        const idioma = await deps.idiomaDaConta(p.user_id).catch(() => IDIOMA_PADRAO);
        email = montarEmailAcessoPatrocinado({
          marco: p.marco,
          idioma,
          inicio: p.inicio_em,
          fim: p.termina_em,
          parceiro: p.parceiro,
          portalUrl,
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
      console.error(JSON.stringify({ origem: "acesso_patrocinado", marco: p.marco, aviso, erro_codigo: codigo(erro) }));
    }
  }
  return { enviados, falhados, ignorados };
}
