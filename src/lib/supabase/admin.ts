import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { fetchComLimite } from "./fetchComLimite";

/**
 * Cliente com a secret key — contorna RLS. Nunca importar em código
 * que corra no browser; só em Server Actions / Route Handlers do backoffice.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      // 60 s: cobre uploads de anexos até 20 MB a partir do servidor.
      global: { fetch: fetchComLimite(60_000) },
    },
  );
}
