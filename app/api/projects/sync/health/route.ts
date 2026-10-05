import { NextResponse } from "next/server";
import { createServiceClient } from "@/common/utils/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // 1) Env secrets check
  checks.secrets = {
    ok: !!(
      process.env.GITHUB_WEBHOOK_SECRET &&
      process.env.SYNC_SECRET &&
      process.env.GEMINI_API_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    detail: "Required env vars",
  };

  // 2) Supabase connectivity
  try {
    const supa = createServiceClient();
    const { error } = await supa.from("projects").select("slug").limit(1);
    checks.supabase = { ok: !error, detail: error?.message };
  } catch (e: any) {
    checks.supabase = { ok: false, detail: e.message };
  }

  // 3) Gemini config
  checks.gemini = {
    ok: !!process.env.GEMINI_API_KEY,
    detail: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  };

  // 4) Portfolio GitHub token
  checks.portfolioGithub = {
    ok: !!(process.env.PORTFOLIO_GITHUB_TOKEN || process.env.GITHUB_READ_USER_TOKEN_PERSONAL),
    detail: process.env.PORTFOLIO_REPO || "satriabahari/satriabahari.my.id",
  };

  // 5) Recent sync log (Fase 2)
  try {
    if (!process.env.VERCEL) {
      const fs = await import("fs");
      const path = await import("path");
      const dir = path.join(process.cwd(), "logs");
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter((f) => f.startsWith("sync-")).sort().reverse();
        if (files.length > 0) {
          const latest = JSON.parse(fs.readFileSync(path.join(dir, files[0]), "utf-8"));
          const last = latest[latest.length - 1];
          checks.lastSync = {
            ok: last ? last.results.filter((r: any) => r.action === "failed").length === 0 : true,
            detail: last ? `${last.source} ${last.total} ${last.timestamp}` : "no sync yet",
          };
          // Alert: zero processed 3 days — look at last 3 files
          const recentTotals = latest.slice(-3).map((l: any) => l.total);
          if (recentTotals.length >= 3 && recentTotals.every((n: number) => n === 0)) {
            checks.syncStale = { ok: false, detail: "No projects synced in last 3 runs — check GitHub topics / token" };
          }
        }
      }
    }
  } catch {
    // ignore
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    { ok: allOk, checks, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 }
  );
}