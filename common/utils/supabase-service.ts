import { createClient } from "@supabase/supabase-js";

// Service-role client — server only. Bypasses RLS.
// Requires SUPABASE_SERVICE_ROLE_KEY. Never import in client components.
export const createServiceClient = () => {
  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Security Alert: SUPABASE_SERVICE_ROLE_KEY is leaked to public NEXT_PUBLIC_ environment!");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");

  if (serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required in production — anon cannot write (RLS blocks insert)");
  }

  console.warn("[supabase-service] SUPABASE_SERVICE_ROLE_KEY missing, using anon (writes will fail RLS in prod)");
  if (!anonKey) throw new Error("Missing Supabase keys");
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
