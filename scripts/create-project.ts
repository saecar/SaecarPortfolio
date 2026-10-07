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
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

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

async function createGithubRepo(name: string, description: string, isPrivate: boolean, topics: string[]) {
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
    return `https://${projectName}.vercel.app`;
  }

  try {
    console.log(`⚡ Mengintegrasikan Frontend dengan Vercel...`);
    const headers = {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    };

    await axios.post(
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

    console.log(`✅ Berhasil menghubungkan Frontend ke Vercel!`);
    return `https://${projectName}.vercel.app`;
  } catch (err: any) {
    console.warn("⚠️ Vercel API response:", err.response?.data?.error?.message || err.message);
    return `https://${projectName}.vercel.app`;
  }
}

async function triggerBackendDeploy({
  platform,
  slug,
  repoFullName,
  deployUrl,
}: {
  platform: "render" | "railway" | "vercel" | "custom";
  slug: string;
  repoFullName: string;
  deployUrl?: string;
}): Promise<string | null> {
  console.log(`⚡ Menginisialisasi deployment Backend (${platform.toUpperCase()})...`);

  if (platform === "render") {
    const hook = deployUrl || process.env.RENDER_DEPLOY_HOOK;
    if (hook) {
      try {
        await axios.post(hook);
        console.log(`✅ Berhasil memicu deploy hook Render!`);
      } catch (e: any) {
        console.warn(`⚠️ Render deploy hook response:`, e.message);
      }
    }
    return `https://${slug}.onrender.com`;
  }

  if (platform === "railway") {
    const hook = deployUrl || process.env.RAILWAY_DEPLOY_WEBHOOK;
    if (hook) {
      try {
        await axios.post(hook);
        console.log(`✅ Berhasil memicu webhook Railway!`);
      } catch (e: any) {
        console.warn(`⚠️ Railway webhook response:`, e.message);
      }
    }
    return `https://${slug}.up.railway.app`;
  }

  if (platform === "vercel") {
    return await triggerVercelDeploy(`${slug}-api`, repoFullName);
  }

  if (platform === "custom" && deployUrl) {
    try {
      await axios.post(deployUrl);
      console.log(`✅ Berhasil memicu custom webhook!`);
    } catch (e: any) {
      console.warn(`⚠️ Custom webhook response:`, e.message);
    }
    return deployUrl;
  }

  return null;
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
  imageSource,
}: {
  slug: string;
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

    if (imageBuffer) {
      const webpBuf = await sharp(imageBuffer)
        .resize(1200, 675, { fit: "cover", position: "center" })
        .webp({ quality: 88 })
        .toBuffer();

      fs.writeFileSync(localFilePath, webpBuf);
      console.log(`💾 Gambar tersimpan di: public/images/projects/${slug}.webp`);

      const { error } = await supa.storage.from("projects").upload(`${slug}.webp`, webpBuf, {
        contentType: "image/webp",
        upsert: true,
      });

      if (!error) {
        console.log(`☁️ Berhasil upload gambar ke Supabase Storage (projects/${slug}.webp)`);
        const { data: urlData } = supa.storage.from("projects").getPublicUrl(`${slug}.webp`);
        return urlData.publicUrl;
      } else {
        console.warn(`⚠️ Supabase Storage upload note: ${error.message}`);
      }
    }
  } catch (err: any) {
    console.warn(`⚠️ Catatan pemrosesan gambar: ${err.message}`);
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
    const row = {
      slug: data.slug,
      title: data.title,
      description: data.description,
      stacks: data.stacks,
      link_github: data.linkGithub,
      link_demo: data.linkDemo || null,
      image: data.image || null,
      category: data.category,
      is_show: true,
      auto_generated: true,
      last_synced_at: new Date().toISOString(),
    };

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

  async function promptCategory(): Promise<ProjectCategory> {
    while (true) {
      console.log(`\n📂 Pilih Kategori Proyek:`);
      console.log(`  1) IoT & Hardware (ESP32, Arduino, Sensor, Wiring Schematic, MQTT)`);
      console.log(`  2) Game Development (Unity, Godot, Unreal, Controls, WebGL)`);
      console.log(`  3) Web Application (Next.js, React, Node.js, Supabase, Tailwind)`);
      const choice = await ask(rl, "Pilih kategori (1/2/3)", category === "iot" ? "1" : category === "game" ? "2" : "3");
      const c = choice.trim().toLowerCase();
      if (c === "1" || c === "iot" || c.includes("hardware")) return "iot";
      if (c === "2" || c === "game") return "game";
      if (c === "3" || c === "web") return "web";
      console.log(`❌ Pilihan "${choice}" tidak valid. Harap masukkan angka 1, 2, atau 3.`);
    }
  }

  async function promptProjectPath(): Promise<string> {
    while (true) {
      const defaultDir = projectPath || process.cwd();
      const val = await ask(rl, "📁 Path folder proyek", defaultDir);
      const resolved = path.resolve(val);

      if (fs.existsSync(resolved)) {
        return resolved;
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
        : "Deskripsi singkat web app & fitur utama";
    return await ask(rl, `📝 ${hintText}`, descriptionHint);
  }

  async function promptStacks(currentCat: ProjectCategory): Promise<string[]> {
    const defaultStacks =
      currentCat === "iot"
        ? "Arduino, C++, ESP32"
        : currentCat === "game"
        ? "Godot, C#, Blender"
        : "Next.js, TypeScript, TailwindCSS, Supabase";
    const currentStr = stacks.length ? stacks.join(", ") : defaultStacks;
    const input = await ask(rl, "🛠 Tech Stack (pisahkan dengan koma)", currentStr);
    return input.split(",").map((s) => s.trim()).filter(Boolean);
  }

  // Initial Wizard Collection
  if (!name) name = await promptName();
  if (!slug) slug = await promptSlug(name);
  if (!category || !["iot", "game", "web"].includes(category)) category = await promptCategory();
  if (!projectPath) projectPath = await promptProjectPath();

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
      stacks = await promptStacks(category);
    }
  }

  if (!linkDemo && category === "web") {
    linkDemo = `https://${slug}.vercel.app`;
  }

  // Pengaturan Backend & Pendeployan Tambahan
  let backendDeployPlatform: string = "none";
  let backendDeployUrl = "";
  let generateApiDoc = false;

  async function promptBackendConfig(): Promise<void> {
    console.log(`\n⚡ PENGATURAN BACKEND & API DEPLOYMENT:`);
    const askApi = await ask(rl, "Apakah proyek ini memiliki backend / REST API? (y/N)", "N");
    if (askApi.toLowerCase() === "y") {
      generateApiDoc = true;
      console.log(`\nPilih Platform Pendeployan Backend:`);
      console.log(`  1) Monolith / Serverless Vercel (Frontend & Backend jadi 1 di Vercel)`);
      console.log(`  2) Render.com (via Render Deploy Hook)`);
      console.log(`  3) Railway.app (via Railway Webhook)`);
      console.log(`  4) Vercel Project ke-2 (folder /backend atau microservice terpisah)`);
      console.log(`  5) Custom Deploy Webhook`);
      console.log(`  6) Lewati deployment backend`);
      const choice = await ask(rl, "Pilihan platform backend (1-6)", "1");
      if (choice === "2") {
        backendDeployPlatform = "render";
        backendDeployUrl = await ask(rl, "Masukkan Render Deploy Hook URL (tekan Enter jika belum ada)");
      } else if (choice === "3") {
        backendDeployPlatform = "railway";
        backendDeployUrl = await ask(rl, "Masukkan Railway Webhook URL (tekan Enter jika belum ada)");
      } else if (choice === "4") {
        backendDeployPlatform = "vercel";
      } else if (choice === "5") {
        backendDeployPlatform = "custom";
        backendDeployUrl = await ask(rl, "Masukkan Custom Webhook URL");
      } else {
        backendDeployPlatform = "none";
      }
    } else {
      generateApiDoc = false;
      backendDeployPlatform = "none";
      backendDeployUrl = "";
    }
  }

  // Pengaturan Gambar Proyek
  let imageSource: { type: "file" | "url" | "none"; pathOrUrl?: string } = { type: "none" };

  async function promptImageConfig(): Promise<void> {
    const isFrontend = category === "web" || category === "web-frontend" || category === "web-fullstack";
    if (isFrontend) {
      console.log(`\n📸 PENGATURAN GAMBAR FRONTEND (Wajib dari UI Frontend asli, BUKAN AI slop):`);
      console.log(`  1) Screenshot otomatis dari Live URL Demo / Localhost`);
      console.log(`  2) Masukkan path file screenshot lokal (PNG/JPG/WebP)`);
      console.log(`  3) Lewati (gunakan default)`);
      const imgChoice = await ask(rl, "Pilihan gambar (1/2/3)", linkDemo ? "1" : "2");
      if (imgChoice === "1") {
        const targetUrl = await ask(rl, "URL Web untuk di-screenshot", linkDemo || "http://localhost:3000");
        imageSource = { type: "url", pathOrUrl: targetUrl };
      } else if (imgChoice === "2") {
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
      } else {
        imageSource = { type: "none" };
      }
    } else {
      console.log(`\n🎨 PENGATURAN GAMBAR PROYEK (${category.toUpperCase()}):`);
      console.log(`  1) Gunakan file gambar sendiri (Foto rakitan IoT / poster game / diagram)`);
      console.log(`  2) Lewati (gunakan default atau gambar yang sudah ada)`);
      const imgChoice = await ask(rl, "Pilihan gambar (1/2)", "1");
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

  if (category === "web" && !flags.name) {
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
      console.log(`  9. Backend & API    : ${generateApiDoc ? `Dokumentasi API.md Aktif | Deploy: ${backendDeployPlatform.toUpperCase()}` : "Tidak ada backend terpisah"}`);
      console.log(` 10. Gambar Proyek    : ${imageSource.type === "url" ? `Auto-Screenshot (${imageSource.pathOrUrl})` : imageSource.type === "file" ? `File Lokal (${path.basename(imageSource.pathOrUrl || "")})` : "Gunakan default"}`);
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
            category = await promptCategory();
            if (category === "iot" && !sourceCodeSnippet) {
              const res = await promptIotCode(projectPath);
              sourceCodeSnippet = res.snippet;
              sourceCodeFile = res.file;
            }
            break;
          case "4":
            projectPath = await promptProjectPath();
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
            await promptBackendConfig();
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
      execSync("git init -b main", { cwd: projectPath, stdio: "ignore" });
    }
    execSync("git add .", { cwd: projectPath, stdio: "ignore" });
    try {
      execSync(`git commit -m "docs: generate professional documentation for ${name}"`, {
        cwd: projectPath,
        stdio: "ignore",
      });
    } catch {}
  } catch (err: any) {
    console.warn("⚠️ Catatan Git lokal:", err.message);
  }

  // ==========================================================
  // STEP 4: CREATE AND PUSH TO GITHUB (Dengan Retry/Skip Loop)
  // ==========================================================
  if (!flags.dryRun && !flags.skipGithub) {
    console.log(`🌐 4/7 Menghubungkan dan push ke GitHub...`);
    const topics = ["portfolio", category, ...stacks.slice(0, 5)];
    await createGithubRepo(slug, description, false, topics);

    let pushSuccess = false;
    while (!pushSuccess) {
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
  // STEP 5: DEPLOYMENTS (FRONTEND & BACKEND)
  // ==========================================================
  if (!flags.dryRun && !flags.skipVercel && (category === "web" || category === "web-frontend" || category === "web-fullstack")) {
    console.log(`▲ 5/7 Konfigurasi Deployment Frontend (Vercel)...`);
    const liveUrl = await triggerVercelDeploy(slug, `${GITHUB_USERNAME}/${slug}`);
    if (liveUrl) linkDemo = liveUrl;
  } else {
    console.log(`⏭️ 5/7 Melewati Vercel.`);
  }

  if (!flags.dryRun && backendDeployPlatform !== "none") {
    console.log(`⚙️ 5b/7 Memicu pendeployan Backend (${backendDeployPlatform.toUpperCase()})...`);
    await triggerBackendDeploy({
      platform: backendDeployPlatform as any,
      slug,
      repoFullName: `${GITHUB_USERNAME}/${slug}`,
      deployUrl: backendDeployUrl,
    });
  }

  // ==========================================================
  // STEP 6: PROCESS & UPLOAD PROJECT IMAGE
  // ==========================================================
  let uploadedImageUrl: string | null = null;
  console.log(`🖼️ 6/7 Memproses gambar proyek...`);
  uploadedImageUrl = await processAndUploadProjectImage({
    slug,
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
  const portfolioRootDir = path.resolve(__dirname, "..");
  const mdxDir = path.join(portfolioRootDir, "contents", "projects");
  if (fs.existsSync(mdxDir)) {
    const mdxFile = path.join(mdxDir, `${slug}.mdx`);
    const safeMdxContent = readme.replace(/<img([^>]*?)(?<!\/)>/gi, "<img$1 />");
    fs.writeFileSync(mdxFile, safeMdxContent, "utf-8");
    console.log(`📝 Berhasil membuat file MDX portfolio: contents/projects/${slug}.mdx`);

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

✅ README Profesional : Dokumentasi standar industri
${generateApiDoc ? `✅ API.md            : Dokumentasi endpoint & spesifikasi RESTful API` : ""}
✅ GitHub Repo        : ${linkGithub} (Topic: portfolio, ${category})
✅ Portfolio Web      : Tampil otomatis di /projects [Kategori: ${category.toUpperCase()}]
✅ Database Supabase  : Proyek tersimpan dan aktif (is_show = true)
${category === "web" ? `✅ Vercel Deploy     : ${linkDemo}` : ""}
${backendDeployPlatform !== "none" ? `✅ Backend Deploy    : Platform ${backendDeployPlatform.toUpperCase()}` : ""}
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
