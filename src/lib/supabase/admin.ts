import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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
    },
  );
}
