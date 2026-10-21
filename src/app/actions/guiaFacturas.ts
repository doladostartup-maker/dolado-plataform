"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { enviarEmailBrevo } from "@/lib/email/brevo";
import { assuntoGuiaFacturas, montarHtmlGuiaFacturas, montarTextoGuiaFacturas } from "@/lib/email/guiaFacturas";
import {
  CAMPOS_GUIA,
  FICHEIRO_GUIA_FACTURAS,
  GUIA_FACTURAS_ID,
  VALOR_COMUNICACOES,
  guiaFacturasAtivo,
  normalizarEmail,
  origemValida,
  utmDoFormulario,
} from "@/lib/guiaFacturas";
import { CONSENTIMENTO_COMUNICACOES_GUIA_VERSAO, TEXTO_CONSENTIMENTO_COMUNICACOES_GUIA } from "@/lib/legal";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarConfirmacaoSePreciso } from "@/lib/comunicacoesComerciais/servidor";
import { normalizarIdioma } from "@/i18n/config";

// Pedido do guia gratuito (/guia-facturas). Sem sessão e sem conta: valida o
// e-mail no servidor, limita pedidos por IP (5 em 10 min, em memória) e
// ignora robôs (campo-armadilha → sucesso fingido, sem gravar nada). O
// registo e a autorização comercial são atómicos na base de dados
// (guia_registar_pedido, só service_role): sem duplicados, e um pedido sem
// a caixa nunca mexe numa autorização já dada. A ligação aparece logo na
// página; o e-mail com a ligação sai depois da resposta (after) e, se a
// Brevo falhar, a reserva é libertada — nunca bloqueia o download.
// Nunca registar o e-mail em logs nem devolvê-lo em mensagens de erro.

export type CodigoErroGuia = "email" | "limite" | "temporario" | "indisponivel";
export type EstadoGuia =
  | { ok: false; erro: CodigoErroGuia | null }
  | { ok: true; ficheiro: string; email: "enviado" | "recente" };

const ESTADO_FINGIDO: EstadoGuia = { ok: true, ficheiro: FICHEIRO_GUIA_FACTURAS, email: "enviado" };

async function obterIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

export async function pedirGuiaFacturas(_anterior: EstadoGuia, form: FormData): Promise<EstadoGuia> {
  if (!guiaFacturasAtivo()) return { ok: false, erro: "indisponivel" };
  if (String(form.get(CAMPOS_GUIA.armadilha) ?? "").trim()) return ESTADO_FINGIDO;

  if (excedeuLimiteTaxa(`guia:${await obterIp()}`)) return { ok: false, erro: "limite" };

  const email = normalizarEmail(form.get(CAMPOS_GUIA.email));
  if (!email) return { ok: false, erro: "email" };

  const idioma = normalizarIdioma(form.get(CAMPOS_GUIA.idioma));
  const comunicacoes = form.get(CAMPOS_GUIA.comunicacoes) === VALOR_COMUNICACOES;

  let resultado: { pedido_id: string; enviar_email: boolean };
  try {
    const { data, error } = await createAdminClient().rpc("guia_registar_pedido", {
      p_guia: GUIA_FACTURAS_ID,
      p_email: email,
      p_idioma: idioma,
      p_origem: origemValida(form.get(CAMPOS_GUIA.origem)),
      p_utm: utmDoFormulario(form),
      // O texto gravado é sempre o português (versão vinculativa), também na página inglesa.
      p_consentimento_texto: comunicacoes ? TEXTO_CONSENTIMENTO_COMUNICACOES_GUIA : null,
      p_consentimento_versao: comunicacoes ? CONSENTIMENTO_COMUNICACOES_GUIA_VERSAO : null,
    });
    if (error || !data) throw Object.assign(new Error("rpc"), { code: error?.code ?? "sem_dados" });
    resultado = data as typeof resultado;
  } catch (erro) {
    console.error(JSON.stringify({ origem: "guia_registar_pedido", erro_codigo: (erro as { code?: string })?.code ?? "erro" }));
    return { ok: false, erro: "temporario" };
  }

  if (resultado.enviar_email) {
    const pedido = resultado.pedido_id;
    after(async () => {
      try {
        await enviarEmailBrevo(email, assuntoGuiaFacturas(idioma), montarHtmlGuiaFacturas(idioma), montarTextoGuiaFacturas(idioma));
      } catch (erro) {
        console.error(JSON.stringify({ origem: "guia_email", erro_codigo: (erro as { code?: string })?.code ?? "erro" }));
        await createAdminClient()
          .rpc("guia_libertar_email", { p_pedido: pedido })
          .then(
            () => undefined,
            () => undefined,
          );
      }
    });
  }

  // Autorização comercial: só vale depois de confirmar o endereço (dupla
  // confirmação). O e-mail de confirmação é separado do guia e sai no máximo
  // uma vez por 24 h; nunca afecta o pedido.
  if (comunicacoes) after(() => enviarConfirmacaoSePreciso(email, idioma));

  return { ok: true, ficheiro: FICHEIRO_GUIA_FACTURAS, email: resultado.enviar_email ? "enviado" : "recente" };
}
