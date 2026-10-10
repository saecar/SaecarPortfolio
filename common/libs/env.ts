import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url().optional(),
  ADMIN_EMAILS: z.string().optional(),
  DOMAIN: z.string().optional(),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missingKeys = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    console.warn("⚠️ [Environment Validation Warning]:", missingKeys.join(" | "));
    if (process.env.NODE_ENV === "production") {
      // In production, ensure critical envs are present
      const criticalKeys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
      const missingCritical = result.error.issues.filter((i) => criticalKeys.includes(i.path[0] as string));
      if (missingCritical.length > 0) {
        throw new Error(`Critical environment variables missing in production: ${missingCritical.map((m) => m.path[0]).join(", ")}`);
      }
    }
  }
}

export const env = process.env;
