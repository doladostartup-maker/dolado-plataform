"use server";

// Registo de uma conta de empresa (DoLado Empresas, Fase 4). Sequência:
// validação → limite por IP → NIPC/NIF já em uso → signUp (conta nova,
// confirmação por e-mail) → empresa_registar (marca a conta como empresa e
// cria a organização, numa só transacção). Se o e-mail já tiver conta, a
// Supabase devolve um utilizador sem identidades: a resposta é a mesma de um
// registo novo (nunca revela se um e-mail está registado) e nada é gravado.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { urlCallbackAuth } from "@/lib/authServidor";
import { mensagemErroConta } from "@/lib/mensagensErro";
import { excedeuLimiteTaxa } from "@/lib/rateLimit";
import { CHAVE_IDIOMA_CONTA } from "@/lib/idiomaConta";
import { MSG_REGISTO_ENVIADO, ROTAS_EMPRESA, mensagemResultadoRegisto, validarRegisto } from "@/lib/empresas/registo";
import { comMensagem, exigirEmpresasAtivo, ipDoPedido } from "@/lib/empresas/sessaoServidor";

const ENVIADO = `${ROTAS_EMPRESA.registo}?enviado=1`;

export async function registarEmpresa(formData: FormData) {
  exigirEmpresasAtivo();
  const v = validarRegisto({
    tipo: formData.get("tipo"),
    nome: formData.get("nome"),
    nif: formData.get("nif"),
    responsavel: formData.get("responsavel"),
    email: formData.get("email"),
    palavraPasse: formData.get("password"),
    confirmar: formData.get("confirmar_password"),
  });
  if (!v.ok) redirect(comMensagem(ROTAS_EMPRESA.registo, "erro", v.erro));
  const d = v.dados;

  if (excedeuLimiteTaxa(`empresas-registo:${await ipDoPedido()}`)) {
    redirect(comMensagem(ROTAS_EMPRESA.registo, "erro", "Demasiadas tentativas. Aguarde alguns minutos e tente novamente."));
  }

  // NIPC/NIF numa organização em curso: recusado antes de criar a conta (a
  // base de dados volta a verificar, com bloqueio, em empresa_registar).
  const admin = createAdminClient();
  const { count, error: erroNif } = await admin
    .from("organizacoes")
    .select("id", { count: "exact", head: true })
    .eq("nif", d.nif)
    .not("estado", "in", "(rejeitada,cancelada,encerrada)");
  if (erroNif) throw new Error(`organizacoes.select: ${erroNif.message}`);
  if ((count ?? 0) > 0) redirect(comMensagem(ROTAS_EMPRESA.registo, "erro", mensagemResultadoRegisto("nif_em_uso")!));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: d.email,
    password: d.palavraPasse,
    options: { emailRedirectTo: urlCallbackAuth(), data: { nome: d.responsavel, [CHAVE_IDIOMA_CONTA]: "pt-PT" } },
  });
  if (error) redirect(comMensagem(ROTAS_EMPRESA.registo, "erro", mensagemErroConta(error.code, error.message)));

  // E-mail já registado: a mesma resposta, nada gravado.
  if (!data.user || (data.user.identities?.length ?? 0) === 0) redirect(ENVIADO);

  const { data: resultado, error: erroRegisto } = await admin.rpc("empresa_registar", {
    p_user: data.user.id,
    p_nome: d.nome,
    p_tipo_entidade: d.tipo,
    p_nif: d.nif,
    p_responsavel: d.responsavel,
  });
  if (erroRegisto) throw new Error(`empresa_registar: ${erroRegisto.message}`);

  if (resultado !== "registada") {
    // A conta não passa a empresa e fica como estava (particular). Termina a
    // sessão, se houver. NIPC registado entre a verificação e a gravação →
    // a mensagem do NIPC; conta já existente (por confirmar, com histórico)
    // → a mesma resposta de sempre.
    if (data.session) await supabase.auth.signOut({ scope: "local" });
    const mensagem = mensagemResultadoRegisto(String(resultado));
    if (mensagem === MSG_REGISTO_ENVIADO) redirect(ENVIADO);
    redirect(comMensagem(ROTAS_EMPRESA.registo, "erro", mensagem ?? "Não foi possível concluir o registo."));
  }

  // Sem confirmação de e-mail activa (stack local), já há sessão.
  if (data.session) redirect(ROTAS_EMPRESA.painel);
  redirect(ENVIADO);
}
