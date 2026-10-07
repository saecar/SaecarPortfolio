import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = () => {
  let cookieStore: ReturnType<typeof cookies> | null = null;
  try {
    cookieStore = cookies();
  } catch {
    // cookies() is unavailable during build-time static generation
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore ? cookieStore.getAll() : [];
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          if (!cookieStore) return;
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore?.set(name, value, options);
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};
