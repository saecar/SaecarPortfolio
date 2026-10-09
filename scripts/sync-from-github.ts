/**
 * Cron fallback: fetch GitHub repos with topic "portfolio", diff vs Supabase,
 * generate README via Gemini, upsert Supabase, push MDX via GitHub Contents API.
 * Run: bun run scripts/sync-from-github.ts  or  npx tsx scripts/sync-from-github.ts
 * Env: GITHUB_READ_USER_TOKEN_PERSONAL, SUPABASE_*, GEMINI_API_KEY, PORTFOLIO_REPO, PORTFOLIO_GITHUB_TOKEN
 */
import axios from "axios";
import { createServiceClient } from "../common/utils/supabase-service";
import { detectCategory } from "../common/libs/detect-category";
import { generateReadme } from "../common/libs/readme-template";
import { buildSyncLog, persistSyncLog } from "../common/libs/sync-logger";

const GITHUB_USERNAME = process.env.GITHUB_USERNAME || "saecar";
const GITHUB_TOKEN = process.env.GITHUB_READ_USER_TOKEN_PERSONAL;
const PORTFOLIO_REPO = process.env.PORTFOLIO_REPO || "saecar/SaecarPortfolio";
const PORTFOLIO_GITHUB_TOKEN = process.env.PORTFOLIO_GITHUB_TOKEN || GITHUB_TOKEN;

function sanitizeSlug(slug: string): string {
  const clean = slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!clean || clean.length < 2 || clean.length > 60) throw new Error(`Invalid slug: ${slug}`);
  return clean;
}

type GhRepo = {
  name: string;
  full_name: string;
  topics: string[];
  description?: string | null;
};

async function fetchPortfolioRepos(): Promise<GhRepo[]> {
  if (!GITHUB_TOKEN) throw new Error("Missing GITHUB_READ_USER_TOKEN_PERSONAL");
  const res = await axios.get(`https://api.github.com/user/repos`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" },
    params: { per_page: 100, sort: "updated", affiliation: "owner" },
  });
  const repos: any[] = res.data;
  // Need topics: fetch each repo topics (or use search API). Simple: filter by topics includes portfolio
  const withTopics: GhRepo[] = [];
  for (const r of repos) {
    // topics may be absent without correct preview; fetch if needed
    let topics: string[] = r.topics || [];
    if (!r.topics) {
      try {
        const t = await axios.get(`https://api.github.com/repos/${r.full_name}/topics`, {
          headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" },
        });
        topics = t.data.names || t.data.topics || [];
      } catch {
        topics = [];
      }
    }
    if (topics.includes("portfolio")) {
      withTopics.push({ name: r.name, full_name: r.full_name, topics, description: r.description });
    }
  }
  return withTopics;
}

async function fetchPackageJson(fullName: string): Promise<Record<string, any> | undefined> {
  if (!GITHUB_TOKEN) return undefined;
  try {
    const res = await axios.get(`https://api.github.com/repos/${fullName}/contents/package.json`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" },
    });
    const content = Buffer.from(res.data.content, "base64").toString("utf-8");
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

async function fetchRepoFileList(fullName: string): Promise<Array<{ path: string }>> {
  if (!GITHUB_TOKEN) return [];
  try {
    const res = await axios.get(`https://api.github.com/repos/${fullName}/git/trees/HEAD`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" },
      params: { recursive: "1" },
    });
    const tree: any[] = res.data.tree || [];
    return tree.slice(0, 500).map((n: any) => ({ path: n.path }));
  } catch {
    return [];
  }
}

async function pushMdx(cleanSlug: string, readme: string) {
  if (!PORTFOLIO_GITHUB_TOKEN) {
    console.warn(`[sync] PORTFOLIO_GITHUB_TOKEN missing — skip MDX push for ${cleanSlug}`);
    return;
  }
  const mdxPath = `contents/projects/${cleanSlug}.mdx`;
  let sha: string | undefined;
  try {
    const check = await axios.get(`https://api.github.com/repos/${PORTFOLIO_REPO}/contents/${mdxPath}`, {
      headers: { Authorization: `token ${PORTFOLIO_GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" },
    });
    sha = check.data.sha;
  } catch (e: any) {
    if (e.response?.status !== 404) console.error(`[sync] check MDX ${cleanSlug}:`, e.message);
  }
  await axios.put(
    `https://api.github.com/repos/${PORTFOLIO_REPO}/contents/${mdxPath}`,
    {
      message: `chore(projects): sync ${cleanSlug} via cron`,
      content: Buffer.from(readme, "utf-8").toString("base64"),
      ...(sha ? { sha } : {}),
    },
    { headers: { Authorization: `token ${PORTFOLIO_GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
  );
}

async function main() {
  const start = Date.now();
  const results: Array<{ slug: string; category: string; action: "created" | "updated" | "skipped" | "failed"; error?: string }> = [];

  if (!GITHUB_TOKEN) throw new Error("Missing GITHUB_READ_USER_TOKEN_PERSONAL");

  const supa = createServiceClient();
  const { data: existing } = await supa.from("projects").select("slug");
  const existingSet = new Set((existing || []).map((r: any) => r.slug));

  const repos = await fetchPortfolioRepos();
  console.log(`[sync] found ${repos.length} repos with topic portfolio`);

  for (const repo of repos) {
    const rawSlug = repo.name;
    let cleanSlug: string;
    try {
      cleanSlug = sanitizeSlug(rawSlug);
    } catch (e: any) {
      results.push({ slug: rawSlug, category: "web", action: "failed", error: e.message });
      continue;
    }

    const pkg = await fetchPackageJson(repo.full_name);
    const files = await fetchRepoFileList(repo.full_name);
    const category = detectCategory({ topics: repo.topics, name: repo.name, files, packageJson: pkg });

    // Skip if already exists and not forced — still push to ensure MDX freshness optionally
    // For cron we upsert always to refresh description via Gemini
    try {
      const { description, readme } = await generateReadme({
        repo: repo.name,
        slug: cleanSlug,
        category,
        topics: repo.topics,
        name: repo.name,
      });

      const row: Record<string, unknown> = {
        slug: cleanSlug,
        title: repo.name,
        description: description || repo.description || "",
        stacks: pkg ? Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).slice(0, 20) : [],
        is_show: true,
      };

      const { error } = await supa.from("projects").upsert(row, { onConflict: "slug" }).select();
      if (error) throw new Error(`Supabase upsert: ${error.message}`);

      await pushMdx(cleanSlug, readme);

      const action = existingSet.has(cleanSlug) ? "updated" : "created";
      results.push({ slug: cleanSlug, category, action });
      console.log(`[sync] ${action} ${cleanSlug} [${category}]`);
    } catch (e: any) {
      console.error(`[sync] failed ${cleanSlug}:`, e.message);
      results.push({ slug: cleanSlug, category, action: "failed", error: e.message });
    }
  }

  const log = buildSyncLog("cron", results, start);
  await persistSyncLog(log);

  const failed = results.filter((r) => r.action === "failed").length;
  if (failed > 0) console.error(`[sync] cron done with ${failed} failures`);
  else console.log(`[sync] cron done OK — ${results.length} processed`);

  // Alert: 0 processed 3 days => handled by workflow checking logs
}

main().catch((e) => {
  console.error("[sync] fatal:", e);
  process.exit(1);
});
