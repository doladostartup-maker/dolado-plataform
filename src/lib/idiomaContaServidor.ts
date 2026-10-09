// Leitura/gravação do idioma preferido de uma conta (servidor, service
// role). Regras em idiomaConta.ts. Só apresentação — ver o comentário aí.

import { createAdminClient } from "@/lib/supabase/admin";
import { IDIOMA_PADRAO, type Idioma } from "@/i18n/config";
import { CHAVE_IDIOMA_CONTA, deveGravarIdiomaNoCallback, preferenciaDosMetadados } from "@/lib/idiomaConta";

/** Idioma guardado na conta, ou null (sem conta, conta antiga sem idioma, erro). */
export async function preferenciaIdiomaDaConta(userId: string | null | undefined): Promise<Idioma | null> {
  if (!userId) return null;
  try {
    const { data, error } = await createAdminClient().auth.admin.getUserById(userId);
    if (error || !data?.user) return null;
    return preferenciaDosMetadados(data.user.user_metadata);
  } catch {
    return null;
  }
}

/**
 * Idioma dos e-mails de uma conta. Sem conta, conta sem idioma ou qualquer
 * erro → português (nunca impede um envio).
 */
export async function idiomaDaConta(userId: string | null | undefined): Promise<Idioma> {
  return (await preferenciaIdiomaDaConta(userId)) ?? IDIOMA_PADRAO;
}

/**
 * Conta nova pelo Google (sem signUp com metadados): grava o idioma do
 * percurso em que foi criada. Contas antigas não mudam. Nunca lança.
 */
export async function gravarIdiomaDeContaNova(
  user: { id: string; user_metadata?: unknown; created_at?: string | null },
  idioma: Idioma,
): Promise<void> {
  if (!deveGravarIdiomaNoCallback(user.user_metadata, user.created_at)) return;
  try {
    // A Supabase junta as chaves aos metadados existentes (não os substitui).
    await createAdminClient().auth.admin.updateUserById(user.id, { user_metadata: { [CHAVE_IDIOMA_CONTA]: idioma } });
  } catch {
    // Só apresentação: sem idioma, os e-mails seguem em português.
  }
}
