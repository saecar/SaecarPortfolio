type SyncResult = {
  slug: string;
  category: string;
  action: "created" | "updated" | "skipped" | "failed";
  error?: string;
};

type SyncLog = {
  timestamp: string;
  source: "webhook" | "cron" | "manual";
  total: number;
  results: SyncResult[];
  durationMs: number;
};

export function buildSyncLog(
  source: SyncLog["source"],
  results: SyncResult[],
  startMs: number
): SyncLog {
  return {
    timestamp: new Date().toISOString(),
    source,
    total: results.length,
    results,
    durationMs: Date.now() - startMs,
  };
}

// Serverless-safe: log to console (Vercel Log Drain), optional file write only in local dev
export async function persistSyncLog(log: SyncLog) {
  console.log(`[sync-log] ${log.source} ${log.total} in ${log.durationMs}ms`, JSON.stringify(log.results));

  // Only write file when running locally (not on Vercel)
  if (process.env.VERCEL) return;
  try {
    const fs = await import("fs");
    const path = await import("path");
    const dir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const date = log.timestamp.slice(0, 10);
    const file = path.join(dir, `sync-${date}.json`);
    const existing: SyncLog[] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf-8")) : [];
    existing.push(log);
    // keep last 100 entries per file
    const trimmed = existing.slice(-100);
    fs.writeFileSync(file, JSON.stringify(trimmed, null, 2), "utf-8");
  } catch {
    // ignore file write errors on serverless
  }
}
