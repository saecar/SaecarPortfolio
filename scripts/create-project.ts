/**
 * Portfolio Project Automation CLI:
 * Generates professional README with Gemini AI, pushes to GitHub,
 * syncs to Supabase, deploys to Vercel, and displays on satriabahari.my.id!
 *
 * Run:
 *   bun run create:project
 *   or: bun run scripts/create-project.ts [options]
 */
import fs from "fs";
import path from "path";
import readline from "readline";
import { execSync } from "child_process";
import axios from "axios";
import { generateReadme, generateApiReadme, ProjectCategory } from "../common/libs/readme-template";
import { createServiceClient } from "../common/utils/supabase-service";
import { detectCategory } from "../common/libs/detect-category";
import sharp from "sharp";

// Load environment variables if not already loaded
if (!process.env.GEMINI_API_KEY && fs.existsSync(path.join(process.cwd(), ".env"))) {
  const envContent = fs.readFileSync(path.join(process.cwd(), ".env"), "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

const GITHUB_USERNAME = process.env.GITHUB_USERNAME || "saecar";
const GITHUB_TOKEN = process.env.GITHUB_READ_USER_TOKEN_PERSONAL || process.env.PORTFOLIO_GITHUB_TOKEN;
const PORTFOLIO_REPO = process.env.PORTFOLIO_REPO || "saecar/SaecarPortfolio";
const portfolioRootDir = path.resolve(__dirname, "..");
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

function isSamePath(p1: string, p2: string): boolean {
  if (!p1 || !p2) return false;
  return path.resolve(p1).toLowerCase().replace(/\\/g, "/") === path.resolve(p2).toLowerCase().replace(/\\/g, "/");
}

function sanitizeTopics(rawTopics: string[]): string[] {
  const specialMap: Record<string, string> = {
    "c++": "cpp",
    "c#": "csharp",
    ".net": "dotnet",
    "node.js": "nodejs",
    "vue.js": "vuejs",
    "react.js": "reactjs",
    "next.js": "nextjs",
    "nest.js": "nestjs",
  };

  const set = new Set<string>();
  for (const raw of rawTopics) {
    if (!raw) continue;
    let t = raw.trim().toLowerCase();
    if (specialMap[t]) {
      t = specialMap[t];
    } else {
      t = t.replace(/\./g, "").replace(/[^a-z0-9-]+/g, "-");
    }
    t = t.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
    if (t.length >= 1 && t.length <= 35 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(t)) {
      set.add(t);
    }
  }

  return Array.from(set).slice(0, 20);
}

function sanitizeSlug(title: string): string {
  const clean = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!clean || clean.length < 2) return "project-" + Date.now();
  return clean.slice(0, 50);
}

function parseArgs(): Record<string, string | boolean> {
  const args = process.argv.slice(2);
  const result: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") result.help = true;
    else if (arg === "--dry-run") result.dryRun = true;
    else if (arg === "--skip-github") result.skipGithub = true;
    else if (arg === "--skip-supabase") result.skipSupabase = true;
    else if (arg === "--skip-vercel") result.skipVercel = true;
    else if (arg === "--update" || arg === "-u") result.update = true;
    else if (arg === "--name" || arg === "-n") result.name = args[++i];
    else if (arg === "--slug" || arg === "-s") result.slug = args[++i];
    else if (arg === "--category" || arg === "-c") result.category = args[++i];
    else if (arg === "--path" || arg === "-p") result.path = args[++i];
    else if (arg === "--desc" || arg === "-d") result.desc = args[++i];
    else if (arg === "--stacks") result.stacks = args[++i];
    else if (arg === "--demo") result.demo = args[++i];
    else if (arg === "--code") result.code = args[++i];
  }

  return result;
}

function scanIotSourceFiles(projectPath: string): { files: string[]; snippet: string } {
  const extensions = [".ino", ".cpp", ".c", ".h", ".hpp", ".py"];
  const targetFiles: string[] = [];

  function walk(dir: string, depth = 0) {
    if (depth > 3) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.name.startsWith(".") ||
          entry.name === "node_modules" ||
          entry.name === ".pio" ||
          entry.name === ".git"
        ) {
          continue;
        }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full, depth + 1);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext) || entry.name === "platformio.ini" || entry.name === "diagram.json") {
            targetFiles.push(full);
          }
        }
      }
    } catch {}
  }

  walk(projectPath);

  if (targetFiles.length === 0) return { files: [], snippet: "" };

  let combined = "";
  for (const file of targetFiles.slice(0, 6)) {
    try {
      const rel = path.relative(projectPath, file);
      const content = fs.readFileSync(file, "utf-8");
      combined += `\n--- FILE: ${rel} ---\n${content.slice(0, 4000)}\n`;
    } catch {}
  }

  return {
    files: targetFiles.map((f) => path.relative(projectPath, f)),
    snippet: combined.slice(0, 15000),
  };
}

function ask(rl: readline.Interface, question: string, defaultValue = ""): Promise<string> {
  return new Promise((resolve) => {
    const promptText = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(promptText, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function getGitignoreTemplate(category: ProjectCategory): string {
  if (category === "iot") {
    return `# PlatformIO & Embedded
.pio
.vscode/.browse.c_cpp.db*
.vscode/c_cpp_properties.json
.vscode/launch.json
.vscode/ipch
*.bin
*.hex
*.elf
build/
include/config.h
.env
.env.local
.DS_Store
`;
  }
  if (category === "game") {
    return `# Unity / Godot / Unreal / WebGL
[Ll]ibrary/
[Tt]emp/
[Oo]bj/
[Bb]uild/
[Bb]uilds/
.godot/
*.import/
*.translation
export_presets.cfg
node_modules/
dist/
.env
.env.local
.DS_Store
`;
  }
  return `# Dependencies & Build
node_modules/
.next/
dist/
build/
out/
.env
.env.local
.env.*.local
.vercel
*.log
.DS_Store
`;
}

async function createOrUpdateGithubRepo(
  name: string,
  description: string,
  isPrivate: boolean,
  topics: string[],
  homepage?: string
): Promise<{ data: any; isExisting: boolean } | null> {
  if (!GITHUB_TOKEN || GITHUB_TOKEN === "your_github_token") {
    console.warn("⚠️ GITHUB_READ_USER_TOKEN_PERSONAL belum diisi di .env!");
    console.warn("  -> Melewati pembuatan otomatis repo di GitHub API.");
    return null;
  }

  try {
    const headers = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Portfolio-Automation-CLI",
    };

    // Check if repo already exists
    try {
      const check = await axios.get(`https://api.github.com/repos/${GITHUB_USERNAME}/${name}`, { headers });
      if (check.status === 200) {
        console.log(`ℹ️ Repositori GitHub ${GITHUB_USERNAME}/${name} sudah ada.`);
        console.log(`🔄 Memperbarui metadata repositori GitHub (deskripsi & topics)...`);

        // Update description & homepage
        try {
          await axios.patch(
            `https://api.github.com/repos/${GITHUB_USERNAME}/${name}`,
            {
              description: description || check.data.description,
              homepage: homepage || check.data.homepage || undefined,
            },
            { headers }
          );
        } catch (patchErr: any) {
          console.warn(`⚠️ Catatan: Gagal update deskripsi repo GitHub (${patchErr.message})`);
        }

        // Update topics
        if (topics.length > 0) {
          try {
            const sanitizedTopics = sanitizeTopics(topics);
            if (sanitizedTopics.length > 0) {
              await axios.put(
                `https://api.github.com/repos/${GITHUB_USERNAME}/${name}/topics`,
                { names: sanitizedTopics },
                { headers: { ...headers, Accept: "application/vnd.github+json" } }
              );
            }
          } catch (topicErr: any) {
            console.warn(`⚠️ Catatan: Gagal update topics repo GitHub (${topicErr.response?.data?.message || topicErr.message})`);
          }
        }
        console.log(`✅ Repositori GitHub ${GITHUB_USERNAME}/${name} berhasil diperbarui!`);
        return { data: check.data, isExisting: true };
      }
    } catch (e: any) {
      if (e.response?.status !== 404) throw e;
    }

    // Create repo
    console.log(`🚀 Membuat repositori GitHub: ${GITHUB_USERNAME}/${name}...`);
    const res = await axios.post(
      `https://api.github.com/user/repos`,
      {
        name,
        description,
        private: isPrivate,
        auto_init: false,
        has_issues: true,
        has_projects: true,
        has_wiki: false,
        homepage: homepage || undefined,
      },
      { headers }
    );

    // Set topics
    if (topics.length > 0) {
      try {
        const sanitizedTopics = sanitizeTopics(topics);
        if (sanitizedTopics.length > 0) {
          await axios.put(
            `https://api.github.com/repos/${GITHUB_USERNAME}/${name}/topics`,
            { names: sanitizedTopics },
            { headers: { ...headers, Accept: "application/vnd.github+json" } }
          );
        }
      } catch (topicErr: any) {
        console.warn(`⚠️ Catatan: Gagal set topics repo GitHub (${topicErr.response?.data?.message || topicErr.message})`);
      }
    }

    return { data: res.data, isExisting: false };
  } catch (err: any) {
    console.error("❌ Gagal membuat/mengupdate repo di GitHub:", err.response?.data?.message || err.message);
    return null;
  }
}

// Alias for backwards compatibility
const createGithubRepo = (name: string, description: string, isPrivate: boolean, topics: string[]) =>
  createOrUpdateGithubRepo(name, description, isPrivate, topics).then((r) => r?.data ?? null);

async function fetchRecentGithubRepos(): Promise<any[]> {
  if (!GITHUB_TOKEN) return [];
  try {
    const res = await axios.get(`https://api.github.com/user/repos`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Portfolio-Automation-CLI",
      },
      params: { affiliation: "owner", sort: "updated", per_page: 30 },
    });
    return res.data || [];
  } catch {
    return [];
  }
}

async function fetchSupabaseProjects(): Promise<any[]> {
  try {
    const supa = createServiceClient();
    const { data } = await supa
      .from("projects")
      .select("slug, title, category, stacks, description, link_demo, link_github")
      .order("created_at", { ascending: false });
    return data || [];
  } catch {
    return [];
  }
}

async function triggerVercelDeploy({
  projectName,
  repoFullName,
  envVars = {},
}: {
  projectName: string;
  repoFullName: string;
  envVars?: Record<string, string>;
}): Promise<string | null> {
  if (!VERCEL_TOKEN || VERCEL_TOKEN === "your_vercel_token") {
    console.log("ℹ️ VERCEL_TOKEN belum diatur di .env. Hubungkan repo secara manual di dashboard Vercel.");
    return `https://${projectName}.vercel.app`;
  }

  try {
    console.log(`▲ Mengintegrasikan Frontend dengan Vercel API...`);
    const headers = {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    };

    // 1. Dapatkan atau buat project Vercel
    let projectId: string | null = null;
    let repoId: number | undefined;

    try {
      const existing = await axios.get(`https://api.vercel.com/v9/projects/${projectName}`, { headers });
      projectId = existing.data?.id;
      repoId = existing.data?.link?.repoId;
      console.log(`ℹ️ Project Vercel "${projectName}" sudah terdaftar (ID: ${projectId}).`);
    } catch (e: any) {
      if (e.response?.status === 404) {
        const res = await axios.post(
          `https://api.vercel.com/v9/projects`,
          {
            name: projectName,
            gitRepository: {
              type: "github",
              repo: repoFullName,
            },
          },
          { headers }
        );
        projectId = res.data?.id;
        repoId = res.data?.link?.repoId;
        console.log(`✅ Berhasil membuat project baru di Vercel: ${projectName}`);
      } else {
        throw e;
      }
    }

    // 2. Suntikkan Environment Variables (Supabase / Database) jika ada
    if (projectId && envVars && Object.keys(envVars).length > 0) {
      console.log(`🔑 Menginjeksi environment variables ke project Vercel...`);
      for (const [key, value] of Object.entries(envVars)) {
        if (!value) continue;
        try {
          await axios.post(
            `https://api.vercel.com/v10/projects/${projectId}/env`,
            {
              key,
              value,
              type: "plain",
              target: ["production", "preview", "development"],
            },
            { headers }
          );
          console.log(`   + Envar ${key} ditambahkan`);
        } catch {
          // Abaikan jika sudah ada
        }
      }
    }

    // 3. Picu Deployment ke Vercel
    if (projectId) {
      try {
        await axios.post(
          `https://api.vercel.com/v13/deployments`,
          {
            name: projectName,
            project: projectId,
            gitSource: {
              type: "github",
              ref: "main",
              ...(repoId ? { repoId } : {}),
            },
          },
          { headers }
        );
        console.log(`🚀 Deployment Vercel berhasil dipicu!`);
      } catch {
        console.log(`ℹ️ Project Vercel terhubung ke GitHub (${repoFullName}). Auto-deploy via git push aktif.`);
      }
      return `https://${projectName}.vercel.app`;
    }

    return `https://${projectName}.vercel.app`;
  } catch (err: any) {
    console.warn("⚠️ Vercel API response:", err.response?.data?.error?.message || err.message);
    return `https://${projectName}.vercel.app`;
  }
}

async function triggerRailwayDeploy({
  projectName,
  repoFullName,
  envVars = {},
}: {
  projectName: string;
  repoFullName: string;
  envVars?: Record<string, string>;
}): Promise<string | null> {
  const railwayToken = process.env.RAILWAY_TOKEN || process.env.RAILWAY_API_TOKEN;
  const webhook = process.env.RAILWAY_DEPLOY_WEBHOOK;

  console.log(`🚂 Mengonfigurasi deployment REST API ke Railway...`);

  // 1. Jika ada token Railway via GraphQL API
  if (railwayToken) {
    try {
      const headers = {
        Authorization: `Bearer ${railwayToken}`,
        "Content-Type": "application/json",
      };

      const createProjGql = `
        mutation ProjectCreate($name: String!) {
          projectCreate(input: { name: $name }) {
            id
            name
          }
        }
      `;
      const projRes = await axios.post(
        "https://backboard.railway.app/graphql/v2",
        { query: createProjGql, variables: { name: projectName } },
        { headers }
      );
      const projectId = projRes.data?.data?.projectCreate?.id;

      if (projectId) {
        console.log(`✅ Berhasil membuat project di Railway: ${projectName} (ID: ${projectId})`);

        try {
          const createServiceGql = `
            mutation ServiceCreate($projectId: String!, $source: ServiceSourceInput!) {
              serviceCreate(input: { projectId: $projectId, source: $source }) {
                id
                name
              }
            }
          `;
          await axios.post(
            "https://backboard.railway.app/graphql/v2",
            {
              query: createServiceGql,
              variables: {
                projectId,
                source: { repo: repoFullName },
              },
            },
            { headers }
          );
          console.log(`🚀 Service Railway berhasil dihubungkan ke GitHub (${repoFullName})!`);
        } catch (svcErr: any) {
          console.warn("ℹ️ Railway service note:", svcErr.response?.data || svcErr.message);
        }

        return `https://${projectName}.up.railway.app`;
      }
    } catch (e: any) {
      console.warn("⚠️ Railway API note:", e.response?.data?.errors?.[0]?.message || e.message);
    }
  }

  // 2. Jika ada Webhook Railway
  if (webhook) {
    try {
      await axios.post(webhook);
      console.log(`✅ Berhasil memicu Railway Deploy Webhook!`);
      return `https://${projectName}.up.railway.app`;
    } catch (e: any) {
      console.warn("⚠️ Railway webhook note:", e.message);
    }
  }

  // 3. Fallback: Panduan & 1-Click Deploy Railway
  const oneClickUrl = `https://railway.app/new?repo=${repoFullName}`;
  console.log(`ℹ️ Repositori siap dideploy ke Railway via 1-Click Link:`);
  console.log(`   🔗 ${oneClickUrl}`);
  console.log(`   (Domain live API Anda: https://${projectName}.up.railway.app)`);

  return `https://${projectName}.up.railway.app`;
}

async function configureSupabaseBackend({
  slug,
  title,
}: {
  slug: string;
  title: string;
}): Promise<{ apiUrl: string; dbConnected: boolean }> {
  console.log(`⚡ Mengonfigurasi Supabase Backend & Database...`);
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supaUrl) {
    console.warn("⚠️ NEXT_PUBLIC_SUPABASE_URL belum diatur di .env.");
    return { apiUrl: "", dbConnected: false };
  }

  try {
    const supa = createServiceClient();
    const { error } = await supa.from("projects").select("count", { count: "exact", head: true });
    console.log(`✅ Supabase Database terhubung! Endpoint REST API: ${supaUrl}/rest/v1/`);
    return {
      apiUrl: `${supaUrl}/rest/v1/`,
      dbConnected: !error,
    };
  } catch (err: any) {
    console.warn(`⚠️ Catatan koneksi Supabase: ${err.message}`);
    return { apiUrl: `${supaUrl}/rest/v1/`, dbConnected: false };
  }
}

async function triggerBackendDeploy({
  platform,
  slug,
  repoFullName,
  deployUrl,
}: {
  platform: "render" | "railway" | "vercel" | "supabase" | "custom" | "none";
  slug: string;
  repoFullName: string;
  deployUrl?: string;
}): Promise<string | null> {
  if (platform === "none") return null;

  console.log(`⚙️ Mengonfigurasi deployment Backend (${platform.toUpperCase()})...`);

  if (platform === "railway") {
    return await triggerRailwayDeploy({
      projectName: slug,
      repoFullName,
    });
  }

  if (platform === "supabase") {
    const supa = await configureSupabaseBackend({ slug, title: slug });
    return supa.apiUrl || null;
  }

  if (platform === "render") {
    const hook = deployUrl || process.env.RENDER_DEPLOY_HOOK;
    if (hook) {
      try {
        await axios.post(hook);
        console.log(`✅ Berhasil memicu deploy hook Render!`);
        return (deployUrl && deployUrl.includes("http") && !deployUrl.includes("deploy"))
          ? deployUrl
          : `https://${slug}.onrender.com`;
      } catch (e: any) {
        console.warn(`⚠️ Render deploy hook response:`, e.message);
      }
    } else {
      console.log(`ℹ️ Render: Buat Web Service baru di https://dashboard.render.com dan hubungkan repo https://github.com/${repoFullName}`);
    }
    return deployUrl || null;
  }

  if (platform === "vercel") {
    return await triggerVercelDeploy({
      projectName: `${slug}-api`,
      repoFullName,
    });
  }

  if (platform === "custom" && deployUrl) {
    try {
      await axios.post(deployUrl);
      console.log(`✅ Berhasil memicu custom webhook!`);
      return deployUrl;
    } catch (e: any) {
      console.warn(`⚠️ Custom webhook response:`, e.message);
    }
  }

  return deployUrl || null;
}

function scanBackendSourceFiles(projectPath: string): { files: string[]; snippet: string } {
  const extensions = [".js", ".ts", ".py", ".go", ".json"];
  const targetFiles: string[] = [];

  function walk(dir: string, depth = 0) {
    if (depth > 4) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.name.startsWith(".") ||
          entry.name === "node_modules" ||
          entry.name === "dist" ||
          entry.name === "build" ||
          entry.name === ".git"
        ) {
          continue;
        }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full, depth + 1);
        } else if (entry.isFile()) {
          const lower = entry.name.toLowerCase();
          const ext = path.extname(lower);
          if (
            extensions.includes(ext) &&
            (lower.includes("route") ||
              lower.includes("controller") ||
              lower.includes("api") ||
              lower.includes("handler") ||
              lower.includes("server") ||
              lower === "main.py" ||
              lower === "app.py" ||
              lower === "main.go" ||
              lower.includes("openapi") ||
              lower.includes("swagger"))
          ) {
            targetFiles.push(full);
          }
        }
      }
    } catch {}
  }

  walk(projectPath);

  if (targetFiles.length === 0) return { files: [], snippet: "" };

  let combined = "";
  for (const file of targetFiles.slice(0, 8)) {
    try {
      const rel = path.relative(projectPath, file);
      const content = fs.readFileSync(file, "utf-8");
      combined += `\n--- FILE: ${rel} ---\n${content.slice(0, 3000)}\n`;
    } catch {}
  }

  return {
    files: targetFiles.map((f) => path.relative(projectPath, f)),
    snippet: combined.slice(0, 15000),
  };
}

async function processAndUploadProjectImage({
  slug,
  title,
  category,
  description,
  stacks = [],
  imageSource,
}: {
  slug: string;
  title: string;
  category: ProjectCategory;
  description: string;
  stacks?: string[];
  imageSource: { type: "file" | "url" | "none"; pathOrUrl?: string };
}): Promise<string | null> {
  const supa = createServiceClient();
  const localDir = path.resolve(__dirname, "..", "public", "images", "projects");
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  const localFilePath = path.join(localDir, `${slug}.webp`);

  let imageBuffer: Buffer | null = null;

  try {
    if (imageSource.type === "file" && imageSource.pathOrUrl) {
      if (fs.existsSync(imageSource.pathOrUrl)) {
        imageBuffer = fs.readFileSync(imageSource.pathOrUrl);
        console.log(`🖼️ Menggunakan file gambar lokal: ${imageSource.pathOrUrl}`);
      } else {
        console.warn(`⚠️ File gambar tidak ditemukan: ${imageSource.pathOrUrl}`);
      }
    } else if (imageSource.type === "url" && imageSource.pathOrUrl) {
      console.log(`📸 Mengambil screenshot UI otomatis dari: ${imageSource.pathOrUrl}...`);
      try {
        const screenshotApiUrl = `https://api.microlink.io/?url=${encodeURIComponent(imageSource.pathOrUrl)}&screenshot=true&meta=false&embed=screenshot.url`;
        const res = await axios.get(screenshotApiUrl, {
          responseType: "arraybuffer",
          timeout: 20000,
          headers: { "User-Agent": "Portfolio-Screenshot-Bot" },
        });
        imageBuffer = Buffer.from(res.data);
        console.log(`✅ Berhasil mengambil screenshot UI frontend!`);
      } catch (err: any) {
        console.warn(`⚠️ Gagal auto-screenshot via URL: ${err.message}`);
      }
    }

    if (!imageBuffer && fs.existsSync(localFilePath)) {
      imageBuffer = fs.readFileSync(localFilePath);
    }

    // AUTO GENERATE DENGAN AI JIKA BELUM ADA GAMBAR (DEFAULT)
    if (!imageBuffer) {
      console.log(`🎨 Menghasilkan visual proyek AI berkualitas tinggi (Flux Engine)...`);
      try {
        let aiPrompt = "";
        const isBackend =
          category === "web-backend" ||
          description.toLowerCase().includes("api") ||
          description.toLowerCase().includes("backend") ||
          stacks.some((s) => ["laravel", "express", "fastapi", "django", "nest", "go", "php"].includes(s.toLowerCase()));

        if (category === "iot") {
          aiPrompt = `Professional macro photography of IoT hardware engineering project workbench, circuit breadboard, microcontroller, sensors, neat jumper wires, sleek dark electronics lab, cyan amber cinematic lighting, 16:9 ratio, photorealistic`;
        } else if (category === "game") {
          aiPrompt = `Cinematic game development concept artwork for ${title}, stylized unreal engine atmosphere, dramatic cinematic lighting, 16:9 ratio, high resolution`;
        } else if (isBackend) {
          aiPrompt = `Modern dark developer workstation displaying RESTful API telemetry and microservice backend network architecture, sleek code terminal, cyan amber glowing nodes, 16:9 ratio, professional commercial tech photography`;
        } else {
          aiPrompt = `Sleek modern web application dashboard interface mockup for ${title}, dark mode, clean glassmorphism UI cards, data charts, elegant typography, 16:9 landscape aspect ratio`;
        }

        const aiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(aiPrompt)}?width=1200&height=675&nologo=true&model=flux`;
        const res = await axios.get(aiUrl, {
          responseType: "arraybuffer",
          timeout: 30000,
          headers: { "User-Agent": "Portfolio-AI-Visualizer" },
        });
        imageBuffer = Buffer.from(res.data);
        console.log(`✅ Berhasil auto-generate visual AI untuk ${title}!`);
      } catch (aiErr: any) {
        console.warn(`⚠️ Gagal auto-generate gambar AI: ${aiErr.message}`);
      }
    }

    if (imageBuffer) {
      const webpBuf = await sharp(imageBuffer)
        .resize(1200, 675, { fit: "cover", position: "center" })
        .webp({ quality: 88 })
        .toBuffer();

      fs.writeFileSync(localFilePath, webpBuf);
      console.log(`💾 Gambar tersimpan di: public/images/projects/${slug}.webp`);

      let publicUrl: string | null = null;
      try {
        const { error } = await supa.storage.from("projects").upload(`${slug}.webp`, webpBuf, {
          contentType: "image/webp",
          upsert: true,
        });

        if (!error) {
          console.log(`☁️ Berhasil upload gambar ke Supabase Storage (projects/${slug}.webp)`);
          const { data: urlData } = supa.storage.from("projects").getPublicUrl(`${slug}.webp`);
          publicUrl = urlData?.publicUrl || null;
        } else {
          console.warn(`⚠️ Supabase Storage upload note: ${error.message}`);
        }
      } catch (uploadErr: any) {
        console.warn(`⚠️ Supabase Storage upload error: ${uploadErr.message}`);
      }

      return publicUrl || `/images/projects/${slug}.webp`;
    }
  } catch (err: any) {
    console.warn(`⚠️ Catatan pemrosesan gambar: ${err.message}`);
  }

  if (fs.existsSync(localFilePath)) {
    return `/images/projects/${slug}.webp`;
  }

  return null;
}

async function upsertSupabaseProject(data: {
  slug: string;
  title: string;
  category: ProjectCategory;
  description: string;
  stacks: string[];
  linkGithub: string;
  linkDemo?: string | null;
  image?: string | null;
}) {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supaUrl || supaUrl.includes("your_supabase_url")) {
    console.warn("⚠️ NEXT_PUBLIC_SUPABASE_URL belum diisi di .env.");
    return false;
  }

  try {
    const supa = createServiceClient();
    const row: Record<string, any> = {
      slug: data.slug,
      title: data.title,
      description: data.description,
      stacks: data.stacks,
      link_github: data.linkGithub,
      link_demo: data.linkDemo || null,
      category: data.category,
      is_show: true,
      auto_generated: true,
      last_synced_at: new Date().toISOString(),
    };
    if (data.image) {
      row.image = data.image;
    }

    const { error } = await supa.from("projects").upsert(row, { onConflict: "slug" }).select();
    if (error) {
      if (error.message.includes("category") || error.message.includes("column")) {
        const { category, auto_generated, last_synced_at, ...legacyRow } = row as any;
        const legacyRes = await supa.from("projects").upsert(legacyRow, { onConflict: "slug" });
        if (legacyRes.error) throw new Error(legacyRes.error.message);
      } else {
        throw new Error(error.message);
      }
    }
    console.log(`✅ Berhasil upsert proyek ke Supabase database!`);
    return true;
  } catch (err: any) {
    if (err.message.includes("schema cache") || err.message.includes("does not exist")) {
      console.warn(`ℹ️ Catatan Supabase: Tabel 'projects' belum dibuat di database Supabase.`);
      console.warn(`   (Jalankan query di supabase/schema.sql untuk membuat tabel kapan saja)`);
    } else {
      console.warn(`⚠️ Gagal upsert ke Supabase: ${err.message}`);
    }
    return false;
  }
}

function detectProjectArchitecture(targetPath: string): {
  detectedCategory: ProjectCategory;
  summary: string;
  recommendedStacks: string[];
} {
  try {
    if (!fs.existsSync(targetPath)) {
      return {
        detectedCategory: "web-fullstack",
        summary: "Direktori Baru (Default: Web Fullstack)",
        recommendedStacks: ["Next.js", "TypeScript", "TailwindCSS", "Supabase"],
      };
    }

    const files: string[] = [];
    const scan = (dir: string, depth = 0) => {
      if (depth > 2) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "vendor") continue;
          const full = path.join(dir, e.name);
          if (e.isDirectory()) scan(full, depth + 1);
          else files.push(e.name.toLowerCase());
        }
      } catch {}
    };
    scan(targetPath);

    // 1. IoT check
    if (files.some((f) => f.endsWith(".ino") || f === "platformio.ini" || f === "diagram.json")) {
      return {
        detectedCategory: "iot",
        summary: "IoT & Hardware (ESP32/Arduino/Sensor/Firmware)",
        recommendedStacks: ["ESP32", "Arduino", "C++", "PlatformIO"],
      };
    }

    // 2. Game check
    if (files.some((f) => f === "project.godot" || f.endsWith(".unity") || f.endsWith(".uproject"))) {
      return {
        detectedCategory: "game",
        summary: "Game Development (Unity / Godot / Unreal)",
        recommendedStacks: ["Godot", "C#", "GDScript"],
      };
    }

    // 3. PHP / Laravel check
    if (files.includes("composer.json")) {
      try {
        const composer = JSON.parse(fs.readFileSync(path.join(targetPath, "composer.json"), "utf-8"));
        const isLaravel = composer.require?.["laravel/framework"];
        return {
          detectedCategory: "web-backend",
          summary: isLaravel ? "Web Backend / REST API (Laravel Framework)" : "Web Backend (PHP)",
          recommendedStacks: isLaravel ? ["Laravel", "PHP", "MySQL", "REST API"] : ["PHP", "MySQL"],
        };
      } catch {}
    }

    // 4. Python check (FastAPI, Flask, Django)
    if (files.includes("requirements.txt") || files.includes("pyproject.toml")) {
      return {
        detectedCategory: "web-backend",
        summary: "Web Backend / REST API (Python / FastAPI / Django)",
        recommendedStacks: ["Python", "FastAPI", "PostgreSQL", "REST API"],
      };
    }

    // 5. Go check
    if (files.includes("go.mod")) {
      return {
        detectedCategory: "web-backend",
        summary: "Web Backend / REST API (Golang Service)",
        recommendedStacks: ["Go", "Gin", "PostgreSQL", "REST API"],
      };
    }

    // 6. Node / JS package.json check
    if (files.includes("package.json")) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(targetPath, "package.json"), "utf-8"));
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

        const hasFrontend = Boolean(deps.next || deps.react || deps.vue || deps.vite || deps.svelte || deps.nuxt || deps.astro);
        const hasBackend = Boolean(deps.express || deps["@nestjs/core"] || deps.fastify || deps.koa || deps.hono);
        const hasDb = Boolean(deps["@prisma/client"] || deps["drizzle-orm"] || deps["@supabase/supabase-js"] || deps.pg || deps.mysql2 || deps.mongoose);

        if (hasFrontend && (hasBackend || hasDb || deps.next)) {
          return {
            detectedCategory: "web-fullstack",
            summary: "Web Fullstack (Frontend UI + Backend API / Supabase DB)",
            recommendedStacks: [deps.next ? "Next.js" : "React", "TypeScript", "TailwindCSS", hasDb ? "Supabase" : "Node.js"],
          };
        }
        if (hasFrontend && !hasBackend && !hasDb) {
          return {
            detectedCategory: "web-frontend",
            summary: "Web Frontend Saja (React / Vite / UI SPA)",
            recommendedStacks: [deps.vite ? "Vite" : "React", "TypeScript", "TailwindCSS"],
          };
        }
        if (hasBackend || hasDb) {
          return {
            detectedCategory: "web-backend",
            summary: "Web Backend / REST API (Express / NestJS / Node.js)",
            recommendedStacks: [deps["@nestjs/core"] ? "NestJS" : "Express", "Node.js", "TypeScript", "REST API"],
          };
        }
      } catch {}
    }

    return {
      detectedCategory: "web-fullstack",
      summary: "Web Application",
      recommendedStacks: ["Next.js", "TypeScript", "TailwindCSS", "Supabase"],
    };
  } catch {
    return {
      detectedCategory: "web-fullstack",
      summary: "Web Application",
      recommendedStacks: ["Next.js", "TypeScript", "TailwindCSS", "Supabase"],
    };
  }
}

async function main() {
  const flags = parseArgs();

  if (flags.help) {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                   PORTFOLIO PROJECT AUTOMATION CLI                        ║
╚═══════════════════════════════════════════════════════════════════════════╝

Otomatisasi pembuatan proyek IoT, Game, dan Web:
- Menghasilkan README.md profesional dengan Gemini AI
- Menginisialisasi Git, .gitignore, dan membuat repo di GitHub
- Melakukan auto-deploy / konfigurasi Vercel & Supabase
- Menampilkan proyek di web satriabahari.my.id (konten MDX & database)

PENGGUNAAN:
  bun run create:project               # Mode Interaktif Wizard (Direkomendasikan)
  bun run create:project [options]     # Mode Argumen CLI

PILIHAN ARGUMEN:
  -n, --name <nama>       Nama proyek (contoh: "Smart Garden ESP32")
  -s, --slug <slug>       Slug URL (contoh: "smart-garden-esp32")
  -c, --category <tipe>   Kategori: "iot", "game", atau "web"
  -p, --path <folder>     Path folder proyek (default: direktori saat ini)
  -d, --desc <teks>       Catatan / deskripsi / hardware yang dipakai
  --stacks <a,b,c>        Tech stack dipisah koma (contoh: "ESP32,C++,PlatformIO")
  --demo <url>            URL Demo / Live Preview
  --code <file|teks>      Path file kode firmware atau kode sumber (auto-deteksi diagram wiring)
  -u, --update            Mode update proyek / repositori yang sudah ada
  --dry-run               Jalankan simulasi tanpa push ke GitHub/Supabase
  --skip-github           Lewati pembuatan repo GitHub
  --skip-supabase         Lewati simpan ke Supabase
  -h, --help              Tampilkan panduan ini
`);
    return;
  }

  console.log(`\n✨ ======================================================== ✨`);
  console.log(`   🚀 SATRIA BAHARI PORTFOLIO PROJECT AUTOMATION SYSTEM      `);
  console.log(`✨ ======================================================== ✨\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // State Variables
  let isUpdateMode = !!flags.update;
  let name = (flags.name as string) || "";
  let slug = (flags.slug as string) || "";
  let category: ProjectCategory = (flags.category as ProjectCategory) || ("" as any);
  let projectPath = (flags.path as string) || "";
  let sourceCodeSnippet = "";
  let sourceCodeFile = "";
  let descriptionHint = (flags.desc as string) || "";
  let stacks: string[] = [];
  let linkDemo = (flags.demo as string) || "";

  // Helper Prompt Functions with robust loops
  async function promptName(): Promise<string> {
    while (true) {
      const val = await ask(rl, "📌 Masukkan Nama Proyek (contoh: Parking System)", name || "New Project");
      if (val.trim()) return val.trim();
      console.log("⚠️ Nama proyek tidak boleh kosong! Coba lagi.");
    }
  }

  async function promptSlug(currentName: string): Promise<string> {
    const recommended = sanitizeSlug(currentName);
    while (true) {
      const val = await ask(rl, "🔗 Masukkan Slug URL", slug || recommended);
      const clean = sanitizeSlug(val);
      if (["iot", "game", "web"].includes(clean)) {
        console.log(`⚠️ Peringatan: "${clean}" adalah nama kategori umum, bukan slug proyek unik.`);
        const useRec = await ask(rl, `Gunakan rekomendasi "${recommended}"? (Y/n)`, "Y");
        if (useRec.toLowerCase() !== "n") {
          return recommended;
        }
      }
      if (clean && clean.length >= 2) return clean;
      console.log("⚠️ Slug URL minimal 2 karakter alfanumerik. Coba lagi.");
    }
  }

  async function promptCategory(defaultCat?: ProjectCategory): Promise<ProjectCategory> {
    while (true) {
      console.log(`\n📂 Pilih Kategori & Arsitektur Proyek:`);
      console.log(`  1) IoT & Hardware (ESP32, Arduino, Sensor, Wiring Schematic, MQTT)`);
      console.log(`  2) Game Development (Unity, Godot, Unreal, Controls, WebGL)`);
      console.log(`  3) Web Frontend Saja (React, Vite, Next.js UI ➔ Auto-Deploy Vercel Saja)`);
      console.log(`  4) Web Backend / RestAPI Saja (Express, Nest, Laravel, FastAPI, Go ➔ Auto-Deploy Railway / Supabase)`);
      console.log(`  5) Web Fullstack (Frontend + Backend + Database ➔ Auto-Deploy Vercel + Supabase / Railway)`);

      const defaultNum =
        defaultCat === "iot" ? "1" :
        defaultCat === "game" ? "2" :
        defaultCat === "web-frontend" ? "3" :
        defaultCat === "web-backend" ? "4" : "5";

      const choice = await ask(rl, "Pilih kategori (1-5)", defaultNum);
      const c = choice.trim().toLowerCase();
      if (c === "1" || c === "iot" || c.includes("hardware")) return "iot";
      if (c === "2" || c === "game") return "game";
      if (c === "3" || c === "web-frontend" || c.includes("frontend")) return "web-frontend";
      if (c === "4" || c === "web-backend" || c.includes("backend") || c.includes("api")) return "web-backend";
      if (c === "5" || c === "web-fullstack" || c === "web" || c.includes("fullstack")) return "web-fullstack";
      console.log(`❌ Pilihan "${choice}" tidak valid. Harap masukkan angka 1 sampai 5.`);
    }
  }

  async function promptProjectPath(): Promise<string> {
    while (true) {
      const defaultDir =
        projectPath ||
        (isUpdateMode && slug && fs.existsSync(path.resolve(process.cwd(), "..", slug))
          ? path.resolve(process.cwd(), "..", slug)
          : process.cwd());
      const val = await ask(rl, "📁 Path folder proyek", defaultDir);
      const resolved = path.resolve(val);

      if (isSamePath(resolved, portfolioRootDir)) {
        console.log(`\nℹ️ Path ini adalah repositori Portfolio utama Anda (satriabahari.my.id / SaecarPortfolio).`);
        const confirmSelf = await ask(
          rl,
          "Apakah Anda ingin memperbarui dokumentasi/data portfolio utama ini sendiri? (Y/n)",
          "Y"
        );
        if (confirmSelf.toLowerCase() !== "n") {
          return resolved;
        } else {
          continue;
        }
      }

      if (!fs.existsSync(resolved)) {
        if (isUpdateMode && slug) {
          console.log(`❓ Folder "${resolved}" belum ada.`);
          const cloneConfirm = await ask(
            rl,
            `Ingin clone repositori dari GitHub (${GITHUB_USERNAME}/${slug}) ke folder ini? (Y/n)`,
            "Y"
          );
          if (cloneConfirm.toLowerCase() !== "n") {
            try {
              console.log(`⏳ Sedang meng-clone https://github.com/${GITHUB_USERNAME}/${slug}.git ke ${resolved}...`);
              const cloneUrl = GITHUB_TOKEN
                ? `https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${slug}.git`
                : `https://github.com/${GITHUB_USERNAME}/${slug}.git`;
              execSync(`git clone ${cloneUrl} "${resolved}"`, { stdio: "inherit" });
              console.log(`✅ Berhasil clone repositori!`);
              return resolved;
            } catch (e: any) {
              console.log(`❌ Gagal clone: ${e.message}.`);
            }
          }
        }

        console.log(`❓ Folder "${resolved}" belum ada.`);
        const create = await ask(rl, "Buat folder baru ini? (Y/n)", "Y");
        if (create.toLowerCase() !== "n") {
          try {
            fs.mkdirSync(resolved, { recursive: true });
            console.log(`📁 Membuat direktori baru: ${resolved}`);
            return resolved;
          } catch (e: any) {
            console.log(`❌ Gagal membuat folder: ${e.message}. Coba masukkan path lain.`);
          }
        } else {
          console.log("Silakan masukkan path folder yang sudah ada.");
        }
        continue;
      }

      if (fs.existsSync(resolved)) {
        // Cek jika folder ada tapi kosong & mode update
        const isGitRepo = fs.existsSync(path.join(resolved, ".git"));
        if (!isGitRepo && isUpdateMode && slug) {
          try {
            const filesInDir = fs.readdirSync(resolved);
            if (filesInDir.length === 0) {
              const cloneConfirm = await ask(
                rl,
                `Folder ini kosong. Ingin clone repositori GitHub (${GITHUB_USERNAME}/${slug}) ke folder ini? (Y/n)`,
                "Y"
              );
              if (cloneConfirm.toLowerCase() !== "n") {
                try {
                  console.log(`⏳ Sedang meng-clone https://github.com/${GITHUB_USERNAME}/${slug}.git ke ${resolved}...`);
                  const cloneUrl = GITHUB_TOKEN
                    ? `https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${slug}.git`
                    : `https://github.com/${GITHUB_USERNAME}/${slug}.git`;
                  execSync(`git clone ${cloneUrl} .`, { cwd: resolved, stdio: "inherit" });
                  console.log(`✅ Berhasil clone repositori!`);
                  return resolved;
                } catch (e: any) {
                  console.log(`❌ Gagal clone: ${e.message}.`);
                }
              }
            }
          } catch {}
        }

        // Cek apakah folder memiliki git remote yang sudah ada
        try {
          const originUrl = execSync("git remote get-url origin", { cwd: resolved, encoding: "utf-8" }).trim();
          if (originUrl) {
            console.log(`📌 Terdeteksi repositori Git yang sudah ada: ${originUrl}`);
            const repoNameMatch = originUrl.match(/[\/:]([^\/:]+?)(?:\.git)?$/);
            if (repoNameMatch && !slug) {
              const detectedRepoName = repoNameMatch[1];
              const useName = await ask(rl, `Gunakan repositori "${detectedRepoName}" untuk update? (Y/n)`, "Y");
              if (useName.toLowerCase() !== "n") {
                if (!name) name = detectedRepoName;
                slug = sanitizeSlug(detectedRepoName);
                isUpdateMode = true;
              }
            }
          }
        } catch {}

        return resolved;
      }
    }
  }

  async function promptIotCode(currentPath: string): Promise<{ snippet: string; file: string }> {
    // 1. Scan folder first
    const scanned = scanIotSourceFiles(currentPath);
    if (scanned.files.length > 0) {
      console.log(`\n🔌 Ditemukan ${scanned.files.length} file firmware di folder: ${scanned.files.join(", ")}`);
      console.log(`   -> AI akan otomatis mengekstrak pinout dan merender diagram wiring Mermaid!`);
      return { snippet: scanned.snippet, file: scanned.files[0] };
    }

    // 2. Ask user for code path if not found in folder
    while (true) {
      console.log(`\n🔌 Belum ada file firmware (.ino/.cpp) di folder proyek.`);
      console.log(`   Jika Anda memiliki file kode, AI dapat otomatis mendeteksi pinout & wiring diagram.`);
      const val = await ask(rl, "Masukkan path file kode sumber (misal D:\\proyek\\sketch.ino) [Enter jika tidak ada]", "");
      if (!val.trim()) {
        return { snippet: "", file: "" };
      }

      const resolved = path.resolve(val);
      if (fs.existsSync(resolved)) {
        try {
          const stat = fs.statSync(resolved);
          if (stat.isFile()) {
            const snippet = fs.readFileSync(resolved, "utf-8").slice(0, 15000);
            console.log(`✅ Berhasil membaca kode sumber dari: ${resolved}`);

            // Salin ke folder proyek src/ jika belum ada
            const targetSrcDir = path.join(currentPath, "src");
            if (!fs.existsSync(targetSrcDir)) fs.mkdirSync(targetSrcDir, { recursive: true });
            const targetFile = path.join(targetSrcDir, path.basename(resolved));
            if (!fs.existsSync(targetFile)) {
              fs.writeFileSync(targetFile, snippet, "utf-8");
              console.log(`📁 Menyalin file kode ke: ${targetFile}`);
            }

            return { snippet, file: resolved };
          }
        } catch (e: any) {
          console.log(`⚠️ Gagal membaca file: ${e.message}`);
        }
      } else {
        console.log(`⚠️ File "${val}" tidak ditemukan di komputer! Periksa kembali path atau tekan Enter.`);
      }
    }
  }

  async function promptDescription(currentCat: ProjectCategory): Promise<string> {
    const hintText =
      currentCat === "iot"
        ? "Deskripsi singkat / Hardware & Sensor (misal: ESP32, DHT22, Servo, MQTT)"
        : currentCat === "game"
        ? "Deskripsi singkat gameplay / Engine (misal: Godot 4 2D platformer)"
        : currentCat === "web-backend"
        ? "Deskripsi singkat REST API (misal: Order API dengan JWT Auth, Laravel, MySQL)"
        : currentCat === "web-frontend"
        ? "Deskripsi singkat antarmuka web (misal: Modern Portfolio Dashboard SPA, TailwindCSS)"
        : "Deskripsi singkat web app & fitur utama (misal: Fullstack E-Commerce, Supabase DB & Auth)";
    return await ask(rl, `📝 ${hintText}`, descriptionHint);
  }

  async function promptStacks(currentCat: ProjectCategory, defaultList?: string[]): Promise<string[]> {
    const fallbackStacks =
      currentCat === "iot"
        ? "Arduino, C++, ESP32"
        : currentCat === "game"
        ? "Godot, C#, Blender"
        : currentCat === "web-frontend"
        ? "React, Vite, TypeScript, TailwindCSS"
        : currentCat === "web-backend"
        ? "Node.js, Express, TypeScript, REST API"
        : "Next.js, TypeScript, TailwindCSS, Supabase";
    const defaultStacks = defaultList && defaultList.length > 0 ? defaultList.join(", ") : fallbackStacks;
    const currentStr = stacks.length ? stacks.join(", ") : defaultStacks;
    const input = await ask(rl, "🛠 Tech Stack (pisahkan dengan koma)", currentStr);
    return input.split(",").map((s) => s.trim()).filter(Boolean);
  }

  // ==========================================================
  // MODE SELECTION: BUAT BARU vs UPDATE REPO YANG SUDAH ADA
  // ==========================================================
  if (!flags.name && !flags.slug && !flags.update) {
    console.log(`Pilih Mode Otomasi:`);
    console.log(`  1) 🆕 Buat Proyek Baru (Inisialisasi repo dari awal)`);
    console.log(`  2) 🔄 Update Proyek / Repositori yang Sudah Ada (GitHub / Supabase / Folder lokal)`);
    const modeChoice = await ask(rl, "Pilih mode (1/2)", "1");
    if (modeChoice.trim() === "2") {
      isUpdateMode = true;
    }
  }

  if (isUpdateMode && !name) {
    console.log(`\n🔍 Mode Update Proyek:`);
    console.log(`  1) 🌐 Pilih dari Repositori GitHub Anda (@${GITHUB_USERNAME})`);
    console.log(`  2) 🗄️ Pilih dari Database Portfolio (Supabase)`);
    console.log(`  3) 📁 Pilih Folder Proyek Lokal (Auto-deteksi Git)`);
    console.log(`  4) ✍️ Masukkan Nama / Slug Proyek Manual`);
    const updateSrc = await ask(rl, "Pilih opsi (1-4)", "1");

    if (updateSrc.trim() === "1") {
      console.log(`⏳ Mengambil daftar repositori dari GitHub @${GITHUB_USERNAME}...`);
      const ghRepos = await fetchRecentGithubRepos();
      if (ghRepos.length > 0) {
        console.log(`\n📂 Daftar Repositori GitHub (@${GITHUB_USERNAME}):`);
        ghRepos.slice(0, 15).forEach((r: any, idx: number) => {
          const desc = r.description ? ` - ${r.description.slice(0, 45)}...` : "";
          console.log(`  ${idx + 1}) ${r.name}${desc}`);
        });
        const pick = await ask(rl, `Pilih nomor repositori (1-${Math.min(15, ghRepos.length)}) atau ketik nama repo`, "1");
        const pickIdx = parseInt(pick.trim(), 10) - 1;
        const selected =
          !isNaN(pickIdx) && ghRepos[pickIdx]
            ? ghRepos[pickIdx]
            : ghRepos.find((r: any) => r.name.toLowerCase() === pick.trim().toLowerCase());
        if (selected) {
          name = selected.name;
          slug = sanitizeSlug(selected.name);
          descriptionHint = selected.description || "";
          linkDemo = selected.homepage || "";
          if (selected.topics && selected.topics.length) {
            category = detectCategory({ topics: selected.topics, name: selected.name }) as any;
          }
          console.log(`✅ Repositori "${selected.name}" terpilih!`);
        } else {
          console.log(`⚠️ Repositori "${pick}" tidak ditemukan dalam daftar.`);
        }
      } else {
        console.log(`⚠️ Tidak dapat mengambil repositori GitHub atau belum ada repo.`);
      }
    } else if (updateSrc.trim() === "2") {
      console.log(`⏳ Mengambil daftar proyek dari Supabase...`);
      const supaProjects = await fetchSupabaseProjects();
      if (supaProjects.length > 0) {
        console.log(`\n🗄️ Daftar Proyek Supabase:`);
        supaProjects.slice(0, 15).forEach((p: any, idx: number) => {
          console.log(`  ${idx + 1}) ${p.title || p.slug} [${(p.category || "web").toUpperCase()}]`);
        });
        const pick = await ask(rl, `Pilih nomor proyek (1-${Math.min(15, supaProjects.length)})`, "1");
        const pickIdx = parseInt(pick.trim(), 10) - 1;
        const selected = !isNaN(pickIdx) && supaProjects[pickIdx] ? supaProjects[pickIdx] : null;
        if (selected) {
          name = selected.title || selected.slug;
          slug = selected.slug;
          category = selected.category as any;
          stacks = Array.isArray(selected.stacks) ? selected.stacks : [];
          descriptionHint = selected.description || "";
          linkDemo = selected.link_demo || "";
          console.log(`✅ Proyek "${name}" terpilih dari Supabase!`);
        } else {
          console.log(`⚠️ Pilihan "${pick}" tidak ditemukan dalam daftar proyek.`);
        }
      } else {
        console.log(`⚠️ Belum ada proyek di Supabase.`);
      }
    } else if (updateSrc.trim() === "3") {
      projectPath = await promptProjectPath();
    } else if (updateSrc.trim() === "4") {
      name = await promptName();
      slug = await promptSlug(name);
    }
  }

  // Initial Wizard Collection
  if (!name) name = await promptName();
  if (!slug) slug = await promptSlug(name);
  if (!projectPath) projectPath = await promptProjectPath();

  // Deteksi otomatis arsitektur proyek dari direktori
  const detectedArch = detectProjectArchitecture(projectPath);

  if (
    !category ||
    !["iot", "game", "web", "web-frontend", "web-backend", "web-fullstack"].includes(category)
  ) {
    console.log(`\n🔍 Analisis Proyek Otomatis: Terdeteksi [${detectedArch.summary}]`);
    category = await promptCategory(detectedArch.detectedCategory);
  }

  if (category === "iot" && !sourceCodeSnippet) {
    if (flags.code) {
      const codeArg = String(flags.code);
      if (fs.existsSync(codeArg)) {
        sourceCodeSnippet = fs.readFileSync(codeArg, "utf-8").slice(0, 15000);
        sourceCodeFile = codeArg;
      } else {
        sourceCodeSnippet = codeArg.slice(0, 15000);
      }
    } else {
      const res = await promptIotCode(projectPath);
      sourceCodeSnippet = res.snippet;
      sourceCodeFile = res.file;
    }
  }

  if (!descriptionHint && !flags.name) descriptionHint = await promptDescription(category);
  if (!stacks.length) {
    if (flags.stacks) {
      stacks = String(flags.stacks).split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      stacks = await promptStacks(category, detectedArch.recommendedStacks);
    }
  }

  // linkDemo tetap kosong kecuali diisi user atau berhasil dideploy
  if (flags.demo) {
    linkDemo = String(flags.demo);
  }

  // Pengaturan Backend & Pendeployan Tambahan
  let backendDeployPlatform: string = "none";
  let backendDeployUrl = "";
  let generateApiDoc = false;

  async function promptBackendConfig(): Promise<void> {
    if (category === "web-frontend") {
      backendDeployPlatform = "none";
      generateApiDoc = false;
      return;
    }

    if (category === "web-backend") {
      generateApiDoc = true;
      console.log(`\n⚡ PENGATURAN BACKEND & REST API DEPLOYMENT:`);
      console.log(`  Proyek ini terdeteksi sebagai REST API / Backend Service.`);
      console.log(`  Pilih Platform Pendeployan:`);
      console.log(`  1) Railway.app (Rekomendasi untuk RestAPI: Node, Python, Go, Laravel, Docker)`);
      console.log(`  2) Supabase (REST API Base Endpoint & PostgreSQL Database)`);
      console.log(`  3) Render.com (via Render Web Service / Deploy Hook)`);
      console.log(`  4) Lewati deployment online (hanya simpan dokumentasi API.md)`);
      const choice = await ask(rl, "Pilihan platform backend (1-4)", "1");
      if (choice === "1") {
        backendDeployPlatform = "railway";
        backendDeployUrl = await ask(rl, "Masukkan Railway Live URL kustom (tekan Enter untuk auto-generate)", "");
      } else if (choice === "2") {
        backendDeployPlatform = "supabase";
      } else if (choice === "3") {
        backendDeployPlatform = "render";
        backendDeployUrl = await ask(rl, "Masukkan Render Deploy Hook / Live URL (tekan Enter jika belum ada)");
      } else {
        backendDeployPlatform = "none";
      }
      return;
    }

    // Untuk web-fullstack atau web
    console.log(`\n⚡ PENGATURAN FULLSTACK DEPLOYMENT (Frontend + Backend + Database):`);
    console.log(`  Database: Supabase PostgreSQL`);
    console.log(`  Frontend: Auto-Deploy ke Vercel (kredensial Supabase otomatis diinjeksi)`);
    const separateBackend = await ask(
      rl,
      "Apakah ada server backend container terpisah (misal container Express/FastAPI/Laravel di Railway)? (y/N)",
      "N"
    );
    if (separateBackend.toLowerCase() === "y") {
      generateApiDoc = true;
      console.log(`Pilih Platform Container Backend Terpisah:`);
      console.log(`  1) Railway.app (Rekomendasi)`);
      console.log(`  2) Render.com`);
      const choice = await ask(rl, "Pilihan (1/2)", "1");
      if (choice === "1") {
        backendDeployPlatform = "railway";
      } else {
        backendDeployPlatform = "render";
        backendDeployUrl = await ask(rl, "Masukkan Render Deploy Hook");
      }
    } else {
      generateApiDoc = true;
      backendDeployPlatform = "supabase";
    }
  }

  // Pengaturan Gambar Proyek
  let imageSource: { type: "file" | "url" | "none"; pathOrUrl?: string } = { type: "none" };

  async function promptImageConfig(): Promise<void> {
    const isFrontendOnly = category === "web-frontend";
    const isFullstack = category === "web-fullstack" || category === "web";
    const isBackendOnly = category === "web-backend";

    if (isFrontendOnly || isFullstack) {
      console.log(`\n📸 PENGATURAN GAMBAR UI (${category.toUpperCase()}):`);
      console.log(`  1) Masukkan path file screenshot lokal UI Anda (PNG/JPG/WebP)`);
      console.log(`  2) Screenshot otomatis dari Live URL Demo / Localhost`);
      console.log(`  3) Auto-generate AI visual preview (Default - jika belum ada screenshot)`);
      const imgChoice = await ask(rl, "Pilihan gambar (1/2/3)", "3");
      if (imgChoice === "1") {
        while (true) {
          const p = await ask(rl, "Masukkan path file screenshot lokal", "");
          if (!p.trim()) {
            imageSource = { type: "none" };
            break;
          }
          const resolved = path.resolve(p.trim().replace(/^['"]|['"]$/g, ""));
          if (fs.existsSync(resolved)) {
            imageSource = { type: "file", pathOrUrl: resolved };
            break;
          }
          console.log(`⚠️ File "${resolved}" tidak ditemukan. Coba lagi.`);
        }
      } else if (imgChoice === "2") {
        const targetUrl = await ask(rl, "URL Web untuk di-screenshot", linkDemo || "http://localhost:3000");
        imageSource = { type: "url", pathOrUrl: targetUrl };
      } else {
        imageSource = { type: "none" };
      }
    } else if (isBackendOnly) {
      console.log(`\n🎨 PENGATURAN GAMBAR REST API & BACKEND:`);
      console.log(`  1) Masukkan file gambar lokal (Diagram arsitektur / Postman / Swagger screenshot)`);
      console.log(`  2) Auto-generate dengan AI (Default - Developer Workstation & Telemetry Art via Flux)`);
      const imgChoice = await ask(rl, "Pilihan gambar (1/2)", "2");
      if (imgChoice === "1") {
        while (true) {
          const p = await ask(rl, "Masukkan path file gambar", "");
          if (!p.trim()) {
            imageSource = { type: "none" };
            break;
          }
          const resolved = path.resolve(p.trim().replace(/^['"]|['"]$/g, ""));
          if (fs.existsSync(resolved)) {
            imageSource = { type: "file", pathOrUrl: resolved };
            break;
          }
          console.log(`⚠️ File "${resolved}" tidak ditemukan. Coba lagi.`);
        }
      } else {
        imageSource = { type: "none" };
      }
    } else {
      console.log(`\n🎨 PENGATURAN GAMBAR PROYEK (${category.toUpperCase()}):`);
      console.log(`  1) Gunakan file gambar sendiri (Foto rakitan IoT / poster game / diagram)`);
      console.log(`  2) Auto-generate dengan AI (Default - Berkualitas tinggi via Flux Engine)`);
      const imgChoice = await ask(rl, "Pilihan gambar (1/2)", "2");
      if (imgChoice === "1") {
        while (true) {
          const p = await ask(rl, "Masukkan path file gambar (PNG/JPG/WebP)", "");
          if (!p.trim()) {
            imageSource = { type: "none" };
            break;
          }
          const resolved = path.resolve(p.trim().replace(/^['"]|['"]$/g, ""));
          if (fs.existsSync(resolved)) {
            imageSource = { type: "file", pathOrUrl: resolved };
            break;
          }
          console.log(`⚠️ File "${resolved}" tidak ditemukan. Coba lagi.`);
        }
      } else {
        imageSource = { type: "none" };
      }
    }
  }

  if (category.startsWith("web") && !flags.name) {
    await promptBackendConfig();
  }
  if (!flags.name) {
    await promptImageConfig();
  }

  // ==========================================================
  // REVIEW & EDIT LOOP (Jika user salah input, BISA DIUBAH!)
  // ==========================================================
  if (!flags.name) {
    while (true) {
      const linkGithub = `https://github.com/${GITHUB_USERNAME}/${slug}`;
      console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
      console.log(`║                   📋 RINGKASAN PROYEK                     ║`);
      console.log(`╚═══════════════════════════════════════════════════════════╝`);
      console.log(`  1. Judul Proyek     : ${name}`);
      console.log(`  2. Slug URL         : ${slug}`);
      console.log(`  3. Kategori         : ${category.toUpperCase()}`);
      console.log(`  4. Folder Proyek    : ${projectPath}`);
      if (category === "iot") {
        console.log(`  5. Kode & Wiring    : ${sourceCodeSnippet ? `Tersedia (${sourceCodeFile || "Code snippet"}) -> Auto-generate Mermaid Diagram` : "Belum ada (Gunakan template standar)"}`);
      }
      console.log(`  6. Tech Stack       : ${stacks.join(", ")}`);
      console.log(`  7. Catatan / Hint   : ${descriptionHint || "-"}`);
      console.log(`  8. Live Demo URL    : ${linkDemo || "-"}`);
      const deploySummary =
        category === "web-frontend"
          ? "Web Frontend Saja ➔ Auto-Deploy Vercel Saja"
          : category === "web-backend"
          ? `RestAPI Saja ➔ Auto-Deploy ${backendDeployPlatform.toUpperCase()} & generate API.md`
          : category === "web-fullstack" || category === "web"
          ? `Web Fullstack ➔ Auto-Deploy Vercel + Supabase DB ${backendDeployPlatform !== "none" && backendDeployPlatform !== "supabase" ? `+ ${backendDeployPlatform.toUpperCase()} Container` : ""}`
          : "Non-Web (Dokumentasi & GitHub Only)";
      console.log(`  9. Backend & Deploy : ${deploySummary}`);
      console.log(` 10. Gambar Proyek    : ${imageSource.type === "url" ? `Auto-Screenshot (${imageSource.pathOrUrl})` : imageSource.type === "file" ? `File Lokal (${path.basename(imageSource.pathOrUrl || "")})` : "Auto-Generate AI (Flux Engine)"}`);
      console.log(`  • GitHub Repo URL   : ${linkGithub}\n`);

      const choice = await ask(rl, "Pilihan: [Y] Lanjutkan | [E] Edit data | [Q] Batalkan (Y/e/q)", "Y");
      const c = choice.trim().toLowerCase();

      if (c === "y" || c === "yes" || c === "") {
        break;
      }

      if (c === "q" || c === "quit") {
        const confirmCancel = await ask(rl, "Yakin ingin membatalkan otomasi? (y/N)", "N");
        if (confirmCancel.toLowerCase() === "y") {
          console.log("❌ Dibatalkan oleh pengguna.");
          rl.close();
          return;
        }
        continue;
      }

      if (c === "e" || c === "edit" || !isNaN(Number(c))) {
        let fieldNum = c;
        if (c === "e" || c === "edit") {
          fieldNum = await ask(rl, "Nomor berapa yang ingin diubah? (1-10)", "1");
        }

        switch (fieldNum.trim()) {
          case "1":
            name = await promptName();
            const changeSlug = await ask(rl, `Update slug otomatis menjadi "${sanitizeSlug(name)}"? (Y/n)`, "Y");
            if (changeSlug.toLowerCase() !== "n") {
              slug = sanitizeSlug(name);
            }
            break;
          case "2":
            slug = await promptSlug(name);
            break;
          case "3":
            category = await promptCategory(category);
            if (category.startsWith("web")) {
              await promptBackendConfig();
            }
            if (category === "iot" && !sourceCodeSnippet) {
              const res = await promptIotCode(projectPath);
              sourceCodeSnippet = res.snippet;
              sourceCodeFile = res.file;
            }
            break;
          case "4":
            projectPath = await promptProjectPath();
            const reScan = detectProjectArchitecture(projectPath);
            console.log(`🔍 Terdeteksi dari folder baru: [${reScan.summary}]`);
            if (category === "iot") {
              const res = await promptIotCode(projectPath);
              if (res.snippet) {
                sourceCodeSnippet = res.snippet;
                sourceCodeFile = res.file;
              }
            }
            break;
          case "5":
            if (category === "iot") {
              const res = await promptIotCode(projectPath);
              sourceCodeSnippet = res.snippet;
              sourceCodeFile = res.file;
            } else {
              console.log("Pilihan ini hanya untuk kategori IoT.");
            }
            break;
          case "6":
            stacks = await promptStacks(category);
            break;
          case "7":
            descriptionHint = await promptDescription(category);
            break;
          case "8":
            linkDemo = await ask(rl, "Masukkan Live Demo URL", linkDemo);
            break;
          case "9":
            if (category.startsWith("web")) {
              await promptBackendConfig();
            } else {
              console.log("Pilihan ini hanya untuk kategori Web.");
            }
            break;
          case "10":
            await promptImageConfig();
            break;
          default:
            console.log(`⚠️ Nomor pilihan tidak dikenal.`);
        }
      }
    }
  }

  rl.close();

  const linkGithub = `https://github.com/${GITHUB_USERNAME}/${slug}`;

  console.log(`\n⏳ Memulai proses otomasi...\n`);

  // ==========================================================
  // STEP 1: GENERATE README VIA GEMINI (Dengan Retry Loop)
  // ==========================================================
  console.log(`🤖 1/7 Membangun README profesional & diagram wiring via Gemini AI...`);
  let generatedData: { description: string; readme: string } | null = null;

  while (!generatedData) {
    try {
      generatedData = await generateReadme({
        repo: slug,
        slug,
        category,
        name,
        topics: ["portfolio", category, ...stacks],
        descriptionHint,
        stacks,
        linkGithub,
        linkDemo,
        sourceCodeSnippet,
      });
    } catch (err: any) {
      console.warn(`\n⚠️ Terjadi kendala saat generate via AI: ${err.message}`);
      const fallbackPrompt = readline.createInterface({ input: process.stdin, output: process.stdout });
      const retryChoice = await ask(fallbackPrompt, "[R] Coba lagi | [F] Gunakan template standar | [Q] Batalkan (R/f/q)", "R");
      fallbackPrompt.close();

      if (retryChoice.toLowerCase() === "f") {
        console.log("Menggunakan template README standar...");
        break;
      } else if (retryChoice.toLowerCase() === "q") {
        console.log("Dibatalkan.");
        return;
      }
    }
  }

  const description = generatedData?.description || `${name} — Proyek ${category.toUpperCase()} inovatif.`;
  const readme = generatedData?.readme || `# ${name}\n\n> ${description}\n`;

  // ==========================================================
  // STEP 2: WRITE README.md, .gitignore & API.md LOCALLY
  // ==========================================================
  console.log(`📄 2/7 Menyimpan README.md dan konfigurasi proyek...`);
  fs.writeFileSync(path.join(projectPath, "README.md"), readme, "utf-8");

  const gitignorePath = path.join(projectPath, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, getGitignoreTemplate(category), "utf-8");
  }

  if (generateApiDoc) {
    console.log(`📑 2b/7 Menghasilkan dokumentasi API.md khusus backend...`);
    const backendScan = scanBackendSourceFiles(projectPath);
    const apiDoc = await generateApiReadme({
      name,
      slug,
      baseUrlLocal: "http://localhost:5000",
      baseUrlProd: linkDemo || `https://${slug}.onrender.com`,
      stacks,
      backendSnippet: backendScan.snippet,
      descriptionHint,
    });
    fs.writeFileSync(path.join(projectPath, "API.md"), apiDoc, "utf-8");
    console.log(`✅ Berhasil membuat file dokumentasi: API.md`);
  }

  // ==========================================================
  // STEP 3: LOCAL GIT INITIALIZATION & COMMIT
  // ==========================================================
  console.log(`📦 3/7 Menginisialisasi Git lokal...`);
  try {
    const isGit = fs.existsSync(path.join(projectPath, ".git"));
    if (!isGit) {
      try {
        execSync("git init -b main", { cwd: projectPath, stdio: "ignore" });
      } catch {
        execSync("git init", { cwd: projectPath, stdio: "ignore" });
        try {
          execSync("git checkout -b main", { cwd: projectPath, stdio: "ignore" });
        } catch {}
      }
    }
    try {
      execSync("git config user.name", { cwd: projectPath, stdio: "ignore" });
    } catch {
      execSync(`git config user.name "${GITHUB_USERNAME}"`, { cwd: projectPath, stdio: "ignore" });
    }
    try {
      execSync("git config user.email", { cwd: projectPath, stdio: "ignore" });
    } catch {
      execSync(`git config user.email "${GITHUB_USERNAME}@users.noreply.github.com"`, { cwd: projectPath, stdio: "ignore" });
    }
    execSync("git add .", { cwd: projectPath, stdio: "ignore" });
    const gitStatus = execSync("git status --porcelain", { cwd: projectPath, encoding: "utf-8" }).trim();
    if (gitStatus) {
      try {
        execSync(`git commit -m "docs: ${isUpdateMode ? "update" : "generate"} professional documentation for ${name}"`, {
          cwd: projectPath,
          stdio: "ignore",
        });
        console.log(`✅ Berhasil commit perubahan dokumentasi ke Git lokal.`);
      } catch {}
    } else {
      console.log(`ℹ️ Tidak ada perubahan file baru untuk di-commit.`);
    }
  } catch (err: any) {
    console.warn("⚠️ Catatan Git lokal:", err.message);
  }

  // ==========================================================
  // STEP 4: CREATE AND PUSH TO GITHUB (Dengan Retry/Skip Loop & Update Safe)
  // ==========================================================
  if (!flags.dryRun && !flags.skipGithub) {
    console.log(`🌐 4/7 Menghubungkan dan push ke GitHub...`);
    const topics = ["portfolio", category, ...stacks.slice(0, 5)];
    await createOrUpdateGithubRepo(slug, description, false, topics, linkDemo);

    let pushSuccess = false;
    while (!pushSuccess) {
      try {
        const isPortfolioRoot = isSamePath(projectPath, portfolioRootDir);
        const targetRemoteUrl = GITHUB_TOKEN
          ? `https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${slug}.git`
          : `https://github.com/${GITHUB_USERNAME}/${slug}.git`;

        if (isPortfolioRoot) {
          console.log(`ℹ️ Berada di repositori portfolio utama. Melakukan push ke origin main...`);
          execSync(`git push origin main`, { cwd: projectPath, stdio: "inherit" });
        } else {
          let currentOriginUrl = "";
          try {
            currentOriginUrl = execSync("git remote get-url origin", { cwd: projectPath, encoding: "utf-8" }).trim();
          } catch {}

          if (!currentOriginUrl) {
            execSync(`git remote add origin ${targetRemoteUrl}`, { cwd: projectPath, stdio: "ignore" });
          } else {
            execSync(`git remote set-url origin ${targetRemoteUrl}`, { cwd: projectPath, stdio: "ignore" });
          }

          try {
            execSync(`git branch -M main`, { cwd: projectPath, stdio: "ignore" });
          } catch {}

          try {
            execSync(`git push -u origin main`, { cwd: projectPath, stdio: "inherit" });
          } catch (normalPushErr: any) {
            console.warn(`\n⚠️ Push standar ditolak (mungkin ada commit baru di remote).`);
            const retryPrompt = readline.createInterface({ input: process.stdin, output: process.stdout });
            const fc = await ask(
              retryPrompt,
              "[P] Pull --rebase lalu push | [F] Force push (--force) | [S] Lewati push (P/f/s)",
              "P"
            );
            retryPrompt.close();

            const c = fc.trim().toLowerCase();
            if (c === "f") {
              execSync(`git push -u origin main --force`, { cwd: projectPath, stdio: "inherit" });
            } else if (c === "p" || c === "") {
              try {
                try {
                  execSync(`git pull --rebase origin main`, { cwd: projectPath, stdio: "inherit" });
                } catch {
                  execSync(`git pull origin main --allow-unrelated-histories --no-rebase -X theirs`, { cwd: projectPath, stdio: "inherit" });
                }
                execSync(`git push -u origin main`, { cwd: projectPath, stdio: "inherit" });
              } catch (rebaseErr: any) {
                console.warn(`⚠️ Rebase/pull belum berhasil: ${rebaseErr.message}`);
                throw rebaseErr;
              }
            } else {
              console.log("Melanjutkan proses tanpa push...");
              break;
            }
          }
        }

        console.log(`✅ Berhasil push ke GitHub: ${linkGithub}`);
        pushSuccess = true;
      } catch (err: any) {
        console.warn(`\n⚠️ Git push belum berhasil: ${err.message}`);
        const retryPrompt = readline.createInterface({ input: process.stdin, output: process.stdout });
        const pChoice = await ask(retryPrompt, "[R] Coba push lagi | [S] Lewati tahap GitHub | [Q] Batalkan (R/s/q)", "S");
        retryPrompt.close();

        if (pChoice.toLowerCase() === "s") {
          console.log("Melanjutkan proses tanpa push GitHub...");
          break;
        } else if (pChoice.toLowerCase() === "q") {
          console.log("Dibatalkan.");
          return;
        }
      }
    }
  } else {
    console.log(`⏭️ 4/7 Melewati GitHub (dry-run / skip-github flag).`);
  }

  // ==========================================================
  // STEP 5: DEPLOYMENTS (TAILORED UNTUK WEB ARCHITECTURE)
  // ==========================================================
  const isFrontendOnly = category === "web-frontend";
  const isBackendOnly = category === "web-backend";
  const isFullstack = category === "web-fullstack" || category === "web";

  if (!flags.dryRun) {
    if (isFrontendOnly) {
      // --------------------------------------------------------
      // KASUS 1: WEB FRONTEND SAJA -> DEPLOY VERCEL SAJA
      // --------------------------------------------------------
      if (!flags.skipVercel) {
        console.log(`▲ 5/7 Mengonfigurasi Deployment Web Frontend (Vercel Saja)...`);
        const liveUrl = await triggerVercelDeploy({
          projectName: slug,
          repoFullName: `${GITHUB_USERNAME}/${slug}`,
        });
        if (liveUrl) linkDemo = liveUrl;
      } else {
        console.log(`⏭️ 5/7 Melewati Vercel (skip-vercel flag).`);
      }
    } else if (isBackendOnly) {
      // --------------------------------------------------------
      // KASUS 2: WEB BACKEND SAJA (REST API) -> RAILWAY ATAU SUPABASE
      // --------------------------------------------------------
      console.log(`⚙️ 5/7 Mengonfigurasi Deployment Backend RestAPI (${backendDeployPlatform.toUpperCase()})...`);
      if (backendDeployPlatform === "railway") {
        const liveUrl = await triggerRailwayDeploy({
          projectName: slug,
          repoFullName: `${GITHUB_USERNAME}/${slug}`,
        });
        if (liveUrl) linkDemo = liveUrl;
      } else if (backendDeployPlatform === "supabase") {
        const supa = await configureSupabaseBackend({ slug, title: name });
        if (supa.apiUrl) linkDemo = supa.apiUrl;
      } else if (backendDeployPlatform !== "none") {
        const liveUrl = await triggerBackendDeploy({
          platform: backendDeployPlatform as any,
          slug,
          repoFullName: `${GITHUB_USERNAME}/${slug}`,
          deployUrl: backendDeployUrl,
        });
        if (liveUrl) linkDemo = liveUrl;
      } else {
        console.log(`ℹ️ Deployment online backend dilewati (dokumentasi API.md tetap dibuat).`);
      }
    } else if (isFullstack) {
      // --------------------------------------------------------
      // KASUS 3: WEB FULLSTACK -> VERCEL + SUPABASE (+ OPTIONAL RAILWAY)
      // --------------------------------------------------------
      console.log(`⚡ 5/7 Mengonfigurasi Deployment Fullstack (Vercel + Supabase)...`);

      // 1. Verifikasi koneksi Supabase Database
      console.log(`🗄️ Menghubungkan database Supabase...`);
      await configureSupabaseBackend({ slug, title: name });

      // 2. Kumpulkan kredensial Supabase untuk diinjeksi ke Vercel
      const supaEnvVars: Record<string, string> = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        DATABASE_URL: process.env.DATABASE_URL || "",
      };

      // 3. Deploy Frontend ke Vercel dengan auto-injeksi envar Supabase
      if (!flags.skipVercel) {
        console.log(`▲ Menghubungkan Frontend ke Vercel & Menginjeksi Kredensial Supabase...`);
        const liveUrl = await triggerVercelDeploy({
          projectName: slug,
          repoFullName: `${GITHUB_USERNAME}/${slug}`,
          envVars: supaEnvVars,
        });
        if (liveUrl) linkDemo = liveUrl;
      }

      // 4. Jika pengguna memilih container backend terpisah (Railway)
      if (backendDeployPlatform === "railway") {
        console.log(`🚂 Mengonfigurasi Backend container tambahan di Railway...`);
        await triggerRailwayDeploy({
          projectName: `${slug}-api`,
          repoFullName: `${GITHUB_USERNAME}/${slug}`,
          envVars: supaEnvVars,
        });
      } else if (backendDeployPlatform === "render") {
        await triggerBackendDeploy({
          platform: "render",
          slug: `${slug}-api`,
          repoFullName: `${GITHUB_USERNAME}/${slug}`,
          deployUrl: backendDeployUrl,
        });
      }
    } else {
      console.log(`⏭️ 5/7 Melewati deployment web untuk kategori ${category.toUpperCase()}.`);
    }
  } else {
    console.log(`⏭️ 5/7 Melewati tahap deployment (dry-run mode).`);
  }

  // ==========================================================
  // STEP 6: PROCESS & UPLOAD PROJECT IMAGE
  // ==========================================================
  let uploadedImageUrl: string | null = null;
  console.log(`🖼️ 6/7 Memproses gambar proyek...`);
  uploadedImageUrl = await processAndUploadProjectImage({
    slug,
    title: name,
    category,
    description,
    stacks,
    imageSource,
  });

  // ==========================================================
  // STEP 7: SUPABASE & PORTFOLIO MDX CONTENT
  // ==========================================================
  if (!flags.dryRun && !flags.skipSupabase) {
    console.log(`🗄️ 7/7 Sinkronisasi ke Supabase & Portfolio website...`);
    await upsertSupabaseProject({
      slug,
      title: name,
      category,
      description,
      stacks,
      linkGithub,
      linkDemo,
      image: uploadedImageUrl,
    });
  }

  // Tulis MDX ke contents/projects/
  const mdxDir = path.join(portfolioRootDir, "contents", "projects");
  if (fs.existsSync(mdxDir)) {
    const mdxFile = path.join(mdxDir, `${slug}.mdx`);
    const safeMdxContent = readme
      .replace(/<img([^>]*?)(?<!\/)>/gi, "<img$1 />")
      .replace(/<br(?!\s*\/)>/gi, "<br />")
      .replace(/<hr(?!\s*\/)>/gi, "<hr />");
    fs.writeFileSync(mdxFile, safeMdxContent, "utf-8");
    console.log(`📝 Berhasil membuat file MDX portfolio: contents/projects/${slug}.mdx`);

    try {
      execSync(`git add contents/projects/${slug}.mdx`, { cwd: portfolioRootDir, stdio: "ignore" });
      const localImagePath = path.join(portfolioRootDir, "public", "images", "projects", `${slug}.webp`);
      if (fs.existsSync(localImagePath)) {
        execSync(`git add public/images/projects/${slug}.webp`, { cwd: portfolioRootDir, stdio: "ignore" });
      }
      const statusPorcelain = execSync("git status --porcelain", { cwd: portfolioRootDir, encoding: "utf-8" }).trim();
      if (statusPorcelain) {
        execSync(`git commit -m "feat(projects): ${isUpdateMode ? "update" : "add"} ${name} [${category}]"`, {
          cwd: portfolioRootDir,
          stdio: "ignore",
        });
        console.log(`🎉 Berhasil commit perubahan ke repositori portfolio!`);
      }
      try {
        execSync(`git push origin main`, { cwd: portfolioRootDir, stdio: "ignore" });
        console.log(`🚀 Berhasil push update MDX ke repositori portfolio online!`);
      } catch (pushErr: any) {
        console.warn(`ℹ️ Push MDX ke origin portfolio dilewati atau gagal: ${pushErr.message}`);
      }
    } catch (gitErr: any) {
      console.warn(`⚠️ Catatan git portfolio: ${gitErr.message}`);
    }
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                      🎉 OTOMASI PROYEK SELESAI! 🎉                       ║
╚═══════════════════════════════════════════════════════════════════════════╝

✅ README Profesional : Dokumentasi standar industri
${generateApiDoc ? `✅ API.md            : Dokumentasi endpoint & spesifikasi RESTful API` : ""}
✅ GitHub Repo        : ${linkGithub} (Topic: portfolio, ${category})
✅ Portfolio Web      : Tampil otomatis di /projects [Kategori: ${category.toUpperCase()}]
✅ Database Supabase  : Proyek tersimpan dan aktif (is_show = true)
${isFrontendOnly ? `✅ Vercel Deploy     : ${linkDemo} (Frontend Saja)` : ""}
${isBackendOnly ? `✅ Backend Deploy    : ${linkDemo} (${backendDeployPlatform.toUpperCase()} RestAPI)` : ""}
${isFullstack ? `✅ Fullstack Deploy  : Frontend Vercel (${linkDemo}) + Supabase DB ${backendDeployPlatform !== "none" && backendDeployPlatform !== "supabase" ? `+ ${backendDeployPlatform.toUpperCase()}` : ""}` : ""}
${uploadedImageUrl ? `✅ Gambar Proyek     : Ter-upload ke Supabase Storage & lokal` : ""}

Langkah Selanjutnya:
1. Mulai kembangkan kode di folder: ${projectPath}
2. Setiap kali git push, repositori Anda sudah memiliki dokumentasi standar industri!
`);
}

main().catch((err) => {
  console.error("\n❌ Terjadi kesalahan:", err.message || err);
  process.exit(1);
});
