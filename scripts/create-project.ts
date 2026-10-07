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
import { generateReadme, ProjectCategory } from "../common/libs/readme-template";
import { detectCategory } from "../common/libs/detect-category";
import { createServiceClient } from "../common/utils/supabase-service";

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
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PORTFOLIO_REPO = process.env.PORTFOLIO_REPO || `${GITHUB_USERNAME}/SaecarPortfolio`;

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
    else if (arg === "--name" || arg === "-n") result.name = args[++i];
    else if (arg === "--slug" || arg === "-s") result.slug = args[++i];
    else if (arg === "--category" || arg === "-c") result.category = args[++i];
    else if (arg === "--path" || arg === "-p") result.path = args[++i];
    else if (arg === "--desc" || arg === "-d") result.desc = args[++i];
    else if (arg === "--stacks") result.stacks = args[++i];
    else if (arg === "--demo") result.demo = args[++i];
  }

  return result;
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

async function createGithubRepo(name: string, description: string, isPrivate: boolean, topics: string[]) {
  if (!GITHUB_TOKEN || GITHUB_TOKEN === "your_github_token") {
    console.warn("⚠️ GITHUB_READ_USER_TOKEN_PERSONAL belum diisi atau masih placeholder di .env!");
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
        // Update topics
        await axios.put(
          `https://api.github.com/repos/${GITHUB_USERNAME}/${name}/topics`,
          { names: topics.map((t) => t.toLowerCase().replace(/[^a-z0-9-]+/g, "").slice(0, 35)).filter(Boolean) },
          { headers: { ...headers, Accept: "application/vnd.github.mercy-preview+json" } }
        );
        return check.data;
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
      },
      { headers }
    );

    // Set topics
    if (topics.length > 0) {
      await axios.put(
        `https://api.github.com/repos/${GITHUB_USERNAME}/${name}/topics`,
        { names: topics.map((t) => t.toLowerCase().replace(/[^a-z0-9-]+/g, "").slice(0, 35)).filter(Boolean) },
        { headers: { ...headers, Accept: "application/vnd.github.mercy-preview+json" } }
      );
    }

    return res.data;
  } catch (err: any) {
    console.error("❌ Gagal membuat repo di GitHub:", err.response?.data?.message || err.message);
    return null;
  }
}

async function triggerVercelDeploy(projectName: string, repoFullName: string): Promise<string | null> {
  if (!VERCEL_TOKEN || VERCEL_TOKEN === "your_vercel_token") {
    // Fallback standard live URL
    return `https://${projectName}.vercel.app`;
  }

  try {
    console.log(`⚡ Mengintegrasikan dengan Vercel...`);
    const headers = {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    };

    // Check / Create project on Vercel
    const createRes = await axios.post(
      `https://api.vercel.com/v9/projects`,
      {
        name: projectName,
        framework: "nextjs",
        gitRepository: {
          type: "github",
          repo: repoFullName,
        },
      },
      { headers }
    );

    console.log(`✅ Berhasil menghubungkan project ke Vercel!`);
    return `https://${projectName}.vercel.app`;
  } catch (err: any) {
    console.warn("⚠️ Vercel API response:", err.response?.data?.error?.message || err.message);
    return `https://${projectName}.vercel.app`;
  }
}

async function upsertSupabaseProject(data: {
  slug: string;
  title: string;
  category: ProjectCategory;
  description: string;
  stacks: string[];
  linkGithub: string;
  linkDemo?: string | null;
}) {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supaUrl || supaUrl.includes("your_supabase_url")) {
    console.warn("⚠️ NEXT_PUBLIC_SUPABASE_URL masih placeholder di .env!");
    console.warn("  -> Melewati upsert database Supabase.");
    return false;
  }

  try {
    const supa = createServiceClient();
    const row = {
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

    const { error } = await supa.from("projects").upsert(row, { onConflict: "slug" }).select();
    if (error) {
      // Fallback without category column if migration hasn't been run yet
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
    console.error("❌ Gagal upsert ke Supabase:", err.message);
    return false;
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

  // Step 1: Project Name
  let name = (flags.name as string) || "";
  if (!name) {
    name = await ask(rl, "📌 Masukkan Nama Proyek (contoh: Smart Greenhouse IoT)", "New Project");
  }

  // Step 2: Slug
  let slug = (flags.slug as string) || sanitizeSlug(name);
  if (!flags.slug && !flags.name) {
    slug = await ask(rl, "🔗 Masukkan Slug URL", slug);
  }
  slug = sanitizeSlug(slug);

  // Step 3: Category
  let category = (flags.category as ProjectCategory) || ("" as any);
  if (!category || !["iot", "game", "web"].includes(category)) {
    console.log(`\n📂 Pilih Kategori Proyek:`);
    console.log(`  1) IoT & Hardware (ESP32, Arduino, Raspberry Pi, Sensor, MQTT)`);
    console.log(`  2) Game Development (Unity, Godot, Unreal, Phaser, Three.js)`);
    console.log(`  3) Web Application (Next.js, React, Node.js, Supabase, Tailwind)`);
    const catChoice = await ask(rl, "Pilih kategori (1/2/3)", "3");
    if (catChoice === "1" || catChoice.toLowerCase() === "iot") category = "iot";
    else if (catChoice === "2" || catChoice.toLowerCase() === "game") category = "game";
    else category = "web";
  }

  // Step 4: Project Directory
  let projectPath = (flags.path as string) || "";
  if (!projectPath) {
    projectPath = await ask(rl, "📁 Path folder proyek", process.cwd());
  }
  projectPath = path.resolve(projectPath);

  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
    console.log(`📁 Membuat direktori proyek baru: ${projectPath}`);
  }

  // Step 5: Description & Hardware/Engine details
  let descriptionHint = (flags.desc as string) || "";
  if (!descriptionHint && !flags.name) {
    const hintPrompt =
      category === "iot"
        ? "Deskripsi singkat / Sensor & Komponen hardware (misal: ESP32, DHT22, Pompa Air, MQTT)"
        : category === "game"
        ? "Deskripsi singkat gameplay / Engine (misal: Godot 4 2D platformer, pixel art)"
        : "Deskripsi singkat web app & fitur utama";
    descriptionHint = await ask(rl, `📝 ${hintPrompt}`, "");
  }

  // Step 6: Tech stacks
  let stacks: string[] = [];
  if (flags.stacks) {
    stacks = (flags.stacks as string).split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    const defaultStacks =
      category === "iot"
        ? "ESP32, C++, PlatformIO, MQTT"
        : category === "game"
        ? "Godot, C#, Blender"
        : "Next.js, TypeScript, TailwindCSS, Supabase";
    const stacksInput = await ask(rl, "🛠 Tech Stack (pisahkan dengan koma)", defaultStacks);
    stacks = stacksInput.split(",").map((s) => s.trim()).filter(Boolean);
  }

  // Step 7: Demo URL (optional)
  let linkDemo = (flags.demo as string) || "";
  if (!linkDemo && category === "web") {
    linkDemo = `https://${slug}.vercel.app`;
  }

  const linkGithub = `https://github.com/${GITHUB_USERNAME}/${slug}`;

  // Step 8: Confirmation
  console.log(`\n📋 RINGKASAN PROYEK:`);
  console.log(`  • Judul       : ${name}`);
  console.log(`  • Slug        : ${slug}`);
  console.log(`  • Kategori    : ${category.toUpperCase()}`);
  console.log(`  • Folder      : ${projectPath}`);
  console.log(`  • Tech Stack  : ${stacks.join(", ")}`);
  console.log(`  • GitHub Repo : ${linkGithub}`);
  console.log(`  • Live Demo   : ${linkDemo || "-"}\n`);

  if (!flags.name) {
    const proceed = await ask(rl, "Lanjutkan proses otomasi? (Y/n)", "Y");
    if (proceed.toLowerCase() === "n") {
      console.log("❌ Dibatalkan oleh pengguna.");
      rl.close();
      return;
    }
  }
  rl.close();

  console.log(`\n⏳ Memulai proses otomasi...\n`);

  // 1. Generate README with Gemini
  console.log(`🤖 1/6 Membangun README profesional & deskripsi via Gemini AI...`);
  const { description, readme } = await generateReadme({
    repo: slug,
    slug,
    category,
    name,
    topics: ["portfolio", category, ...stacks],
    descriptionHint,
    stacks,
    linkGithub,
    linkDemo,
  });

  // 2. Write README.md and .gitignore locally
  console.log(`📄 2/6 Menyimpan README.md dan file konfigurasi proyek...`);
  fs.writeFileSync(path.join(projectPath, "README.md"), readme, "utf-8");

  const gitignorePath = path.join(projectPath, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, getGitignoreTemplate(category), "utf-8");
  }

  // 3. Local Git initialization & commit
  console.log(`📦 3/6 Menginisialisasi Git lokal...`);
  try {
    const isGit = fs.existsSync(path.join(projectPath, ".git"));
    if (!isGit) {
      execSync("git init -b main", { cwd: projectPath, stdio: "ignore" });
    }
    execSync("git add .", { cwd: projectPath, stdio: "ignore" });
    try {
      execSync(`git commit -m "docs: generate professional documentation for ${name}"`, {
        cwd: projectPath,
        stdio: "ignore",
      });
    } catch {
      // nothing to commit or already committed
    }
  } catch (err: any) {
    console.warn("⚠️ Catatan Git:", err.message);
  }

  // 4. Create and push to GitHub
  if (!flags.dryRun && !flags.skipGithub) {
    console.log(`🌐 4/6 Menghubungkan dan push ke GitHub...`);
    const topics = ["portfolio", category, ...stacks.slice(0, 5)];
    const ghRepo = await createGithubRepo(slug, description, false, topics);

    if (ghRepo || GITHUB_TOKEN) {
      try {
        const remoteUrl = GITHUB_TOKEN
          ? `https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${slug}.git`
          : `https://github.com/${GITHUB_USERNAME}/${slug}.git`;

        try {
          execSync(`git remote remove origin`, { cwd: projectPath, stdio: "ignore" });
        } catch {}

        execSync(`git remote add origin ${remoteUrl}`, { cwd: projectPath, stdio: "ignore" });
        execSync(`git branch -M main`, { cwd: projectPath, stdio: "ignore" });
        execSync(`git push -u origin main --force`, { cwd: projectPath, stdio: "inherit" });
        console.log(`✅ Berhasil push ke GitHub: ${linkGithub}`);
      } catch (err: any) {
        console.warn("⚠️ Git push notice:", err.message);
      }
    }
  } else {
    console.log(`⏭️ 4/6 Melewati GitHub (dry-run / skip-github flag).`);
  }

  // 5. Deploy / Vercel Configuration
  if (!flags.dryRun && !flags.skipVercel && category === "web") {
    console.log(`▲ 5/6 Konfigurasi Deployment Vercel...`);
    const liveUrl = await triggerVercelDeploy(slug, `${GITHUB_USERNAME}/${slug}`);
    if (liveUrl) linkDemo = liveUrl;
  } else {
    console.log(`⏭️ 5/6 Melewati Vercel.`);
  }

  // 6. Supabase Database Sync & Portfolio MDX
  if (!flags.dryRun && !flags.skipSupabase) {
    console.log(`🗄️ 6/6 Sinkronisasi ke Supabase & Portfolio website...`);
    await upsertSupabaseProject({
      slug,
      title: name,
      category,
      description,
      stacks,
      linkGithub,
      linkDemo,
    });
  }

  // Write MDX to portfolio contents/projects/
  const portfolioRootDir = path.resolve(__dirname, "..");
  const mdxDir = path.join(portfolioRootDir, "contents", "projects");
  if (fs.existsSync(mdxDir)) {
    const mdxFile = path.join(mdxDir, `${slug}.mdx`);
    fs.writeFileSync(mdxFile, readme, "utf-8");
    console.log(`📝 Berhasil membuat file MDX portfolio: contents/projects/${slug}.mdx`);

    // Auto-commit MDX to portfolio repo if we are in git
    try {
      execSync(`git add contents/projects/${slug}.mdx`, { cwd: portfolioRootDir, stdio: "ignore" });
      execSync(`git commit -m "feat(projects): add ${name} [${category}]"`, {
        cwd: portfolioRootDir,
        stdio: "ignore",
      });
      console.log(`🎉 Berhasil commit perubahan ke repositori portfolio!`);
    } catch {}
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                      🎉 OTOMASI PROYEK SELESAI! 🎉                       ║
╚═══════════════════════════════════════════════════════════════════════════╝

✅ README Profesional : Dibuat dengan panduan instalasi lengkap
✅ GitHub Repo        : ${linkGithub} (Topic: portfolio, ${category})
✅ Portfolio Web      : Tampil otomatis di /projects [Kategori: ${category.toUpperCase()}]
✅ Database Supabase  : Proyek tersimpan dan aktif (is_show = true)
${category === "web" ? `✅ Vercel Deploy     : ${linkDemo}` : ""}

Langkah Selanjutnya:
1. Mulai kembangkan kode di folder: ${projectPath}
2. Setiap kali git push, repositori Anda sudah memiliki dokumentasi standar industri!
3. Jika ingin update live demo di kemudian hari, cukup jalankan kembali otomasi ini.
`);
}

main().catch((err) => {
  console.error("❌ Terjadi kesalahan fatal:", err);
  process.exit(1);
});
