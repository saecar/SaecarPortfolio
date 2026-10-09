import http from "http";
import fs from "fs";
import path from "path";
import os from "os";
import { spawn, execSync, ChildProcess } from "child_process";
import { URL } from "url";
import {
  detectProjectArchitecture,
  fetchSupabaseProjects,
  fetchRecentGithubRepos,
  sanitizeSlug,
} from "./create-project";

// Locate portfolio directory reliably
const defaultPortfolioDir = "C:\\Users\\Dill\\Portfolio-V3\\satriabahari.my.id";
const rootDir =
  process.env.PORTFOLIO_DIR ||
  (fs.existsSync(defaultPortfolioDir) ? defaultPortfolioDir : path.resolve(__dirname, ".."));

// Multi-path .env loader
const envCandidates = [
  path.join(process.cwd(), ".env"),
  path.join(rootDir, ".env"),
  path.join(__dirname, "..", ".env"),
  "C:\\Users\\Dill\\Portfolio-V3\\satriabahari.my.id\\.env",
  "C:\\Users\\Dill\\Portfolio-Automation-Studio\\.env",
];

for (const envFile of envCandidates) {
  if (fs.existsSync(envFile)) {
    try {
      const content = fs.readFileSync(envFile, "utf-8");
      content.split("\n").forEach((line) => {
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
    } catch {}
  }
}

const PORT = Number(process.env.GUI_PORT) || 4040;
let activeChild: ChildProcess | null = null;

// Get local IPv4 address for mobile / Wi-Fi access
function getLocalIpAddress(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
  } catch {}
  return "127.0.0.1";
}

// Get candidate project folders from common directories
function getCandidateFolders(): string[] {
  const candidates = new Set<string>();
  const userProfile = process.env.USERPROFILE || "C:\\Users\\Dill";

  // Check user directory folders
  try {
    const entries = fs.readdirSync(userProfile, { withFileTypes: true });
    for (const e of entries) {
      if (
        e.isDirectory() &&
        !e.name.startsWith(".") &&
        ![
          "AppData",
          "Application Data",
          "Cookies",
          "Local Settings",
          "NetHood",
          "PrintHood",
          "Recent",
          "SendTo",
          "Start Menu",
          "Templates",
          "Music",
          "Videos",
          "Pictures",
          "Searches",
          "Saved Games",
          "Favorites",
          "Links",
        ].includes(e.name)
      ) {
        candidates.add(path.join(userProfile, e.name));
      }
    }
  } catch {}

  // Check parent of current workspace
  try {
    const parentDir = path.resolve(rootDir, "..");
    const entries = fs.readdirSync(parentDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith(".")) {
        candidates.add(path.join(parentDir, e.name));
      }
    }
  } catch {}

  return Array.from(candidates).slice(0, 30);
}

// Read sync logs
function getSyncLogs(): any[] {
  const logsDir = path.join(rootDir, "logs");
  if (!fs.existsSync(logsDir)) return [];
  try {
    const files = fs
      .readdirSync(logsDir)
      .filter((f) => f.startsWith("sync-") && f.endsWith(".json"))
      .sort()
      .reverse();
    const result: any[] = [];
    for (const file of files.slice(0, 5)) {
      try {
        const raw = fs.readFileSync(path.join(logsDir, file), "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          result.push(...parsed);
        } else {
          result.push(parsed);
        }
      } catch {}
    }
    return result.slice(0, 20);
  } catch {
    return [];
  }
}

// Windows native folder dialog picker
function openWindowsFolderPicker(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
        $dlg.Description = "Pilih Folder Proyek untuk Diotomasi"
        $dlg.ShowNewFolderButton = $true
        if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
          Write-Output $dlg.SelectedPath
        }
      `;
      const child = spawn("powershell", ["-NoProfile", "-Command", psScript]);
      let out = "";
      child.stdout.on("data", (d) => (out += d.toString()));
      child.on("close", () => {
        resolve(out.trim());
      });
      child.on("error", () => resolve(""));
    } catch {
      resolve("");
    }
  });
}

// SVG App Icon for PWA / Favicon
const SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="#0f172a" />
  <path d="M52 14 L24 54 L46 54 L36 86 L76 44 L54 44 Z" fill="url(#grad)" />
</svg>`;

// PWA Web Manifest JSON
function getManifestJson(): string {
  return JSON.stringify({
    name: "Portfolio Automation Studio",
    short_name: "AutoPortfolio",
    description: "Studio Otomasi Portofolio Satria Bahari (AI README, GitHub & Deployment)",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#10b981",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.svg",
        sizes: "192x192 512x512",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  });
}

// HTML Dashboard UI
function renderDashboardHtml(localIp: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Portfolio Automation Studio — Standalone App</title>
  
  <!-- PWA & Mobile Web APK Meta Tags -->
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/svg+xml" href="/icon.svg">
  <meta name="theme-color" content="#10b981">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="AutoPortfolio">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace'],
          },
          colors: {
            brand: {
              50: '#eefcf5',
              100: '#d7f7e6',
              500: '#10b981',
              600: '#059669',
              700: '#047857',
            }
          }
        }
      }
    }
  </script>
  <style>
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #0f172a; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #475569; }
    .terminal-scroll { scroll-behavior: smooth; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-emerald-500 selection:text-white">

  <!-- TOP HEADER -->
  <header class="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <span class="text-xl">⚡</span>
        </div>
        <div>
          <h1 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            Portfolio Automation Studio
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Standalone App</span>
          </h1>
          <p class="text-xs text-slate-400">Otomasi 1-Klik README AI, GitHub, Supabase & Deployment</p>
        </div>
      </div>

      <!-- ACTIONS & CREDENTIALS -->
      <div class="flex flex-wrap items-center gap-2.5">
        <!-- APK / Mobile Access Button -->
        <button onclick="openMobileModal()" class="px-3 py-1.5 rounded-lg bg-teal-950/70 hover:bg-teal-900 border border-teal-700/80 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition">
          <span>📱</span> Akses HP / APK
        </button>

        <!-- Status Badges -->
        <div id="env-badges" class="hidden sm:flex items-center gap-2 text-xs">
          <div class="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5 text-slate-300">
            <span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" id="dot-gemini"></span>
            <span>Gemini AI</span>
          </div>
          <div class="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5 text-slate-300">
            <span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" id="dot-github"></span>
            <span>GitHub</span>
          </div>
          <div class="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5 text-slate-300">
            <span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" id="dot-supabase"></span>
            <span>Supabase</span>
          </div>
          <div class="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5 text-slate-300">
            <span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" id="dot-vercel"></span>
            <span>Vercel</span>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- NAVIGATION TABS -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
    <div class="flex border-b border-slate-800 gap-2 overflow-x-auto">
      <button onclick="switchTab('create')" id="tab-btn-create" class="px-5 py-2.5 font-medium text-sm rounded-t-xl border-b-2 border-emerald-500 bg-slate-900 text-emerald-400 flex items-center gap-2 whitespace-nowrap transition">
        <span>🚀</span> Otomasi Proyek (Buat / Update)
      </button>
      <button onclick="switchTab('sync')" id="tab-btn-sync" class="px-5 py-2.5 font-medium text-sm rounded-t-xl border-b-2 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 flex items-center gap-2 whitespace-nowrap transition">
        <span>🔄</span> Sinkronisasi GitHub (Cron)
      </button>
      <button onclick="switchTab('projects')" id="tab-btn-projects" class="px-5 py-2.5 font-medium text-sm rounded-t-xl border-b-2 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 flex items-center gap-2 whitespace-nowrap transition">
        <span>📋</span> Daftar Proyek Aktif
      </button>
    </div>
  </div>

  <!-- MAIN CONTAINER -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

    <!-- TAB 1: OTOMASI PROYEK -->
    <div id="tab-content-create" class="space-y-6">
      
      <!-- CARD 1: FOLDER SOURCE -->
      <section class="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="text-xl text-emerald-400">📁</span>
            <h2 class="text-base font-semibold text-white">Langkah 1: Sumber Folder Proyek</h2>
          </div>
          <span class="text-xs text-slate-400 hidden sm:inline">Pilih folder proyek di komputer lokal</span>
        </div>

        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row gap-2">
            <div class="relative flex-1">
              <input type="text" id="input-path" placeholder="C:\\Users\\Dill\\NamaProyek atau path folder..." 
                class="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono transition" />
            </div>
            <button onclick="browseFolderNative()" class="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-slate-700 transition">
              <span>📂</span> Pilih Folder...
            </button>
            <button onclick="scanCurrentFolder()" class="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition">
              <span>🔍</span> Pindai Otomatis (Scan)
            </button>
          </div>

          <!-- QUICK SUGGESTIONS DROPDOWN -->
          <div class="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span class="text-slate-400">💡 Folder Cepat Terdeteksi:</span>
            <div id="quick-folder-chips" class="flex flex-wrap gap-1.5">
              <span class="text-slate-500 italic">Memuat folder...</span>
            </div>
          </div>

          <!-- DETECTED SUMMARY BANNER -->
          <div id="scan-result-banner" class="hidden p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-sm flex items-start gap-3">
            <span class="text-xl">✨</span>
            <div class="flex-1 space-y-1">
              <div class="font-semibold text-emerald-200" id="scan-banner-title">Proyek Berhasil Dipindai!</div>
              <div class="text-xs text-emerald-300/90" id="scan-banner-desc">Arsitektur terdeteksi secara otomatis.</div>
            </div>
          </div>
        </div>
      </section>

      <!-- CARD 2: INFORMASI PROYEK -->
      <section class="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="text-xl text-cyan-400">📝</span>
            <h2 class="text-base font-semibold text-white">Langkah 2: Informasi & Metadata Proyek</h2>
          </div>
          <span class="text-xs text-slate-400 hidden sm:inline">Data yang akan tampil di portofolio dan README</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Judul Proyek -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Nama Proyek</label>
            <input type="text" id="input-name" placeholder="contoh: Smart Parking System" oninput="autoUpdateSlug()"
              class="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition" />
            <p class="text-xs text-slate-400 mt-1">Nama resmi proyek yang mudah dibaca.</p>
          </div>

          <!-- Slug URL -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Slug URL Portofolio</label>
            <input type="text" id="input-slug" placeholder="smart-parking-system"
              class="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono transition" />
            <p class="text-xs text-slate-400 mt-1">Digunakan untuk URL: /projects/<span class="font-mono text-cyan-400">slug</span> dan nama repo GitHub.</p>
          </div>

          <!-- Kategori -->
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Kategori Proyek</label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <label class="cursor-pointer border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 p-3 rounded-xl flex items-center gap-2.5 transition">
                <input type="radio" name="project-category" value="web-fullstack" checked class="text-emerald-500 focus:ring-0" />
                <div>
                  <div class="font-semibold text-slate-200">🌐 Web Fullstack</div>
                  <div class="text-[10px] text-slate-400">Next.js + Supabase</div>
                </div>
              </label>
              <label class="cursor-pointer border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 p-3 rounded-xl flex items-center gap-2.5 transition">
                <input type="radio" name="project-category" value="web-frontend" class="text-emerald-500 focus:ring-0" />
                <div>
                  <div class="font-semibold text-slate-200">🎨 Frontend Saja</div>
                  <div class="text-[10px] text-slate-400">Vercel React / UI</div>
                </div>
              </label>
              <label class="cursor-pointer border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 p-3 rounded-xl flex items-center gap-2.5 transition">
                <input type="radio" name="project-category" value="web-backend" class="text-emerald-500 focus:ring-0" />
                <div>
                  <div class="font-semibold text-slate-200">⚙️ Web Backend / API</div>
                  <div class="text-[10px] text-slate-400">RestAPI / Railway</div>
                </div>
              </label>
              <label class="cursor-pointer border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 p-3 rounded-xl flex items-center gap-2.5 transition">
                <input type="radio" name="project-category" value="iot" class="text-emerald-500 focus:ring-0" />
                <div>
                  <div class="font-semibold text-slate-200">🤖 IoT & Embedded</div>
                  <div class="text-[10px] text-slate-400">ESP32 / Arduino</div>
                </div>
              </label>
              <label class="cursor-pointer border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 p-3 rounded-xl flex items-center gap-2.5 transition">
                <input type="radio" name="project-category" value="game" class="text-emerald-500 focus:ring-0" />
                <div>
                  <div class="font-semibold text-slate-200">🎮 Game Dev</div>
                  <div class="text-[10px] text-slate-400">Godot / Unity</div>
                </div>
              </label>
              <label class="cursor-pointer border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 p-3 rounded-xl flex items-center gap-2.5 transition">
                <input type="radio" name="project-category" value="ai" class="text-emerald-500 focus:ring-0" />
                <div>
                  <div class="font-semibold text-slate-200">🧠 AI & Machine Learning</div>
                  <div class="text-[10px] text-slate-400">Python / PyTorch</div>
                </div>
              </label>
              <label class="cursor-pointer border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 p-3 rounded-xl flex items-center gap-2.5 transition">
                <input type="radio" name="project-category" value="mobile" class="text-emerald-500 focus:ring-0" />
                <div>
                  <div class="font-semibold text-slate-200">📱 Mobile App</div>
                  <div class="text-[10px] text-slate-400">Flutter / React Native</div>
                </div>
              </label>
              <label class="cursor-pointer border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 p-3 rounded-xl flex items-center gap-2.5 transition">
                <input type="radio" name="project-category" value="library" class="text-emerald-500 focus:ring-0" />
                <div>
                  <div class="font-semibold text-slate-200">📦 CLI / Library</div>
                  <div class="text-[10px] text-slate-400">Package / Modul</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Tech Stacks -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Tech Stacks (Teknologi)</label>
            <input type="text" id="input-stacks" placeholder="Next.js, TypeScript, TailwindCSS, Supabase"
              class="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition" />
            <p class="text-xs text-slate-400 mt-1">Pisahkan dengan koma (misal: Next.js, Python, PostgreSQL).</p>
          </div>

          <!-- Live Demo URL -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Live Demo URL (Opsional)</label>
            <input type="text" id="input-demo" placeholder="https://proyek-kamu.vercel.app"
              class="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition" />
            <p class="text-xs text-slate-400 mt-1">Tinggalkan kosong jika ingin auto-generate dari Vercel/Railway.</p>
          </div>

          <!-- Deskripsi Singkat -->
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Deskripsi Singkat / Ringkasan Proyek</label>
            <textarea id="input-desc" rows="3" placeholder="Jelaskan apa fungsi proyek ini, masalah apa yang diselesaikan, atau fitur unggulannya..."
              class="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition"></textarea>
            <p class="text-xs text-slate-400 mt-1">Catatan ini akan diolah Gemini AI menjadi README standar industri yang lengkap.</p>
          </div>
        </div>
      </section>

      <!-- CARD 3: KONFIGURASI DEPLOY & GAMBAR -->
      <section class="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="text-xl text-indigo-400">⚙️</span>
            <h2 class="text-base font-semibold text-white">Langkah 3: Opsi Deployment & Media</h2>
          </div>
          <span class="text-xs text-slate-400 hidden sm:inline">Pengaturan server deploy dan visual kartu</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <!-- Backend Platform -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Target Backend / RestAPI</label>
            <select id="select-backend" class="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition">
              <option value="supabase">Supabase Database & API (Default)</option>
              <option value="railway">Railway.app Container</option>
              <option value="render">Render.com Web Service</option>
              <option value="none">Tidak Ada / Lewati Deploy Backend</option>
            </select>
          </div>

          <!-- Image Source -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Gambar / Thumbnail Proyek</label>
            <select id="select-image-type" class="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition" onchange="toggleImageInput()">
              <option value="none">🎨 Auto-Generate AI Visual (Flux Engine)</option>
              <option value="file">📁 Upload File Gambar Lokal (Screenshot)</option>
              <option value="url">🌐 Screenshot Otomatis dari URL Web</option>
            </select>
          </div>

          <!-- Extra Image Input (hidden by default) -->
          <div id="image-extra-container" class="md:col-span-2 hidden">
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5" id="image-extra-label">Path File / URL</label>
            <input type="text" id="input-image-path" placeholder="C:\\path\\screenshot.png"
              class="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition" />
          </div>
        </div>

        <!-- CHECKBOXES -->
        <div class="border-t border-slate-800/80 pt-4">
          <div class="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">Opsi Tambahan:</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <label class="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer">
              <input type="checkbox" id="check-update" class="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0" />
              <span>🔄 <strong>Mode Update</strong> (perbarui proyek eksis)</span>
            </label>
            <label class="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer">
              <input type="checkbox" id="check-dryrun" class="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0" />
              <span>🧪 <strong>Dry Run</strong> (simulasi tanpa eksekusi nyata)</span>
            </label>
            <label class="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer">
              <input type="checkbox" id="check-apidoc" checked class="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0" />
              <span>📑 <strong>Buat API.md</strong> (khusus RestAPI)</span>
            </label>
            <label class="flex items-center gap-2 text-slate-400 hover:text-slate-200 cursor-pointer">
              <input type="checkbox" id="check-skipgithub" class="rounded bg-slate-950 border-slate-700 text-slate-500 focus:ring-0" />
              <span>⏭ Lewati GitHub</span>
            </label>
            <label class="flex items-center gap-2 text-slate-400 hover:text-slate-200 cursor-pointer">
              <input type="checkbox" id="check-skipsupabase" class="rounded bg-slate-950 border-slate-700 text-slate-500 focus:ring-0" />
              <span>⏭ Lewati Supabase</span>
            </label>
            <label class="flex items-center gap-2 text-slate-400 hover:text-slate-200 cursor-pointer">
              <input type="checkbox" id="check-skipvercel" class="rounded bg-slate-950 border-slate-700 text-slate-500 focus:ring-0" />
              <span>⏭ Lewati Vercel</span>
            </label>
          </div>
        </div>

        <!-- ACTION BUTTONS -->
        <div class="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div class="text-xs text-slate-400 flex items-center gap-1.5">
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            Siap untuk dieksekusi secara otomatis
          </div>
          <div class="flex items-center gap-3">
            <button onclick="abortProcess()" id="btn-abort" disabled class="px-5 py-3 rounded-xl font-semibold text-sm bg-rose-950/50 hover:bg-rose-900 border border-rose-800 text-rose-300 disabled:opacity-40 disabled:cursor-not-allowed transition">
              ⏹ Batalkan
            </button>
            <button onclick="startProjectAutomation()" id="btn-run" class="px-7 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition transform active:scale-95">
              <span>🚀</span> Jalankan Otomasi Sekarang
            </button>
          </div>
        </div>
      </section>

    </div>

    <!-- TAB 2: SINKRONISASI GITHUB (CRON) -->
    <div id="tab-content-sync" class="hidden space-y-6">
      <section class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="text-xl text-teal-400">🔄</span>
            <h2 class="text-base font-semibold text-white">Sinkronisasi Repositori GitHub</h2>
          </div>
          <span class="text-xs text-slate-400">Sync repositori bertag 'portfolio' ke Supabase</span>
        </div>

        <p class="text-sm text-slate-300 mb-6 leading-relaxed">
          Fitur ini memeriksa seluruh repositori GitHub Anda yang memiliki topik/tag <code class="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono text-xs">portfolio</code>.
          Jika ada repositori baru atau pembaruan kode, AI Gemini akan otomatis memperbarui dokumentasi MDX dan database Supabase Anda.
        </p>

        <div class="flex flex-wrap items-center gap-3 mb-8">
          <button onclick="startSync(true)" class="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-medium text-sm flex items-center gap-2 transition">
            <span>🔍</span> Cek Saja (Dry Run)
          </button>
          <button onclick="startSync(false)" class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition">
            <span>⚡</span> Sinkronkan Semua Sekarang
          </button>
        </div>

        <div class="border-t border-slate-800 pt-5">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">Riwayat Sinkronisasi Terakhir:</h3>
          <div id="sync-history-container" class="space-y-2">
            <div class="text-xs text-slate-500 italic">Memuat riwayat...</div>
          </div>
        </div>
      </section>
    </div>

    <!-- TAB 3: DAFTAR PROYEK AKTIF -->
    <div id="tab-content-projects" class="hidden space-y-6">
      <section class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-800 gap-3">
          <div class="flex items-center gap-2">
            <span class="text-xl text-indigo-400">📋</span>
            <h2 class="text-base font-semibold text-white">Daftar Proyek di Portofolio</h2>
          </div>
          <button onclick="loadProjectsList()" class="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 self-start transition">
            <span>🔄</span> Refresh Data
          </button>
        </div>

        <div id="projects-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="text-xs text-slate-500 italic">Memuat daftar proyek...</div>
        </div>
      </section>
    </div>

    <!-- LIVE TERMINAL CONSOLE -->
    <section class="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur">
      <div class="bg-slate-950/80 px-4 py-3 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2.5">
          <div class="flex gap-1.5">
            <span class="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
            <span class="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span class="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>
          <span class="text-xs font-semibold text-slate-300 font-mono">Terminal Output & Execution Log</span>
          <span id="process-badge" class="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">Idle (Siap)</span>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <button onclick="copyLog()" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition">📋 Salin</button>
          <button onclick="clearLog()" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition">🧹 Bersihkan</button>
        </div>
      </div>
      <div id="terminal-output" class="p-4 font-mono text-xs leading-relaxed text-slate-300 h-80 overflow-y-auto bg-slate-950 terminal-scroll select-text space-y-0.5">
        <div class="text-slate-500">// Menunggu instruksi otomasi. Pilih folder dan klik 'Jalankan Otomasi Sekarang' atau tombol sinkronisasi.</div>
      </div>
    </section>

  </main>

  <!-- MODAL: MOBILE ACCESS / ANDROID APK -->
  <div id="mobile-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-2">
          <span class="text-2xl">📱</span>
          <h3 class="text-base font-bold text-white">Buka di HP & Install APK</h3>
        </div>
        <button onclick="closeMobileModal()" class="text-slate-400 hover:text-white text-lg font-bold">&times;</button>
      </div>

      <p class="text-xs text-slate-300 leading-relaxed">
        Kamu bisa mengakses dan mengontrol GUI otomasi ini langsung dari layar HP kamu lewat Wi-Fi lokal, dan memasangnya sebagai <strong>Aplikasi (Web APK)</strong> di layar utama Android!
      </p>

      <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center space-y-3">
        <div class="text-xs text-slate-400 font-medium">Scan QR Code ini menggunakan Kamera HP / Google Lens:</div>
        <div class="flex justify-center">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=http://${localIp}:${PORT}" 
               alt="QR Code" class="w-44 h-44 rounded-lg bg-white p-2 border border-slate-700" />
        </div>
        <div class="pt-2 text-xs">
          <div class="text-slate-400">Atau buka alamat ini di Chrome Android:</div>
          <div class="font-mono text-emerald-400 font-bold text-sm bg-slate-900 py-1.5 px-3 rounded-lg mt-1 select-all border border-slate-800">
            http://${localIp}:${PORT}
          </div>
        </div>
      </div>

      <div class="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 space-y-1">
        <div class="font-semibold text-emerald-200">✨ Cara Pasang Jadi APK di Android:</div>
        <div>1. Buka link di atas pada Google Chrome di HP Anda.</div>
        <div>2. Ketuk ikon menu titik tiga (<strong class="text-white">⋮</strong>) di pojok kanan atas Chrome.</div>
        <div>3. Pilih <strong class="text-white">"Install Aplikasi"</strong> atau <strong class="text-white">"Tambahkan ke Layar Utama"</strong>.</div>
        <div>4. Ikon aplikasi akan langsung muncul di menu HP Anda seperti file APK!</div>
      </div>

      <button onclick="closeMobileModal()" class="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-xs transition">
        Tutup
      </button>
    </div>
  </div>

  <!-- JAVASCRIPT LOGIC -->
  <script>
    let activeTab = 'create';

    function openMobileModal() {
      document.getElementById('mobile-modal').classList.remove('hidden');
    }

    function closeMobileModal() {
      document.getElementById('mobile-modal').classList.add('hidden');
    }

    function switchTab(tab) {
      activeTab = tab;
      document.getElementById('tab-content-create').classList.toggle('hidden', tab !== 'create');
      document.getElementById('tab-content-sync').classList.toggle('hidden', tab !== 'sync');
      document.getElementById('tab-content-projects').classList.toggle('hidden', tab !== 'projects');

      const tabs = ['create', 'sync', 'projects'];
      tabs.forEach(t => {
        const btn = document.getElementById('tab-btn-' + t);
        if (t === tab) {
          btn.className = "px-5 py-2.5 font-medium text-sm rounded-t-xl border-b-2 border-emerald-500 bg-slate-900 text-emerald-400 flex items-center gap-2 whitespace-nowrap transition";
        } else {
          btn.className = "px-5 py-2.5 font-medium text-sm rounded-t-xl border-b-2 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 flex items-center gap-2 whitespace-nowrap transition";
        }
      });

      if (tab === 'projects') loadProjectsList();
      if (tab === 'sync') loadSyncHistory();
    }

    function toggleImageInput() {
      const type = document.getElementById('select-image-type').value;
      const extra = document.getElementById('image-extra-container');
      const label = document.getElementById('image-extra-label');
      if (type === 'file') {
        extra.classList.remove('hidden');
        label.innerText = "Path File Gambar Screenshot Lokal (PNG / JPG / WebP)";
      } else if (type === 'url') {
        extra.classList.remove('hidden');
        label.innerText = "Target URL Halaman Web untuk Di-screenshot";
      } else {
        extra.classList.add('hidden');
      }
    }

    function autoUpdateSlug() {
      const name = document.getElementById('input-name').value;
      const slugInput = document.getElementById('input-slug');
      if (!slugInput.dataset.manual) {
        slugInput.value = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
      }
    }

    document.getElementById('input-slug').addEventListener('input', function() {
      this.dataset.manual = "true";
    });

    function appendLog(line) {
      const term = document.getElementById('terminal-output');
      const div = document.createElement('div');
      
      if (line.includes('✅') || line.includes('Berhasil') || line.includes('SELESAI')) {
        div.className = "text-emerald-400 font-semibold";
      } else if (line.includes('⚠️') || line.includes('Catatan') || line.includes('Peringatan')) {
        div.className = "text-amber-300";
      } else if (line.includes('❌') || line.includes('Gagal') || line.includes('Error')) {
        div.className = "text-rose-400 font-semibold";
      } else if (line.includes('🚀') || line.includes('Memulai') || line.includes('Membuat')) {
        div.className = "text-cyan-300 font-medium";
      } else if (line.includes('--- FILE:') || line.includes('---')) {
        div.className = "text-indigo-400";
      } else {
        div.className = "text-slate-300";
      }

      div.textContent = line;
      term.appendChild(div);
      term.scrollTop = term.scrollHeight;
    }

    function clearLog() {
      document.getElementById('terminal-output').innerHTML = '<div class="text-slate-500">// Terminal dibersihkan.</div>';
    }

    function copyLog() {
      const term = document.getElementById('terminal-output');
      navigator.clipboard.writeText(term.innerText);
      alert('Log terminal berhasil disalin ke clipboard!');
    }

    function setRunningState(isRunning) {
      const runBtn = document.getElementById('btn-run');
      const abortBtn = document.getElementById('btn-abort');
      const badge = document.getElementById('process-badge');
      if (isRunning) {
        runBtn.disabled = true;
        runBtn.classList.add('opacity-50', 'cursor-not-allowed');
        abortBtn.disabled = false;
        badge.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1"></span> Sedang Berjalan...';
        badge.className = "text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40";
      } else {
        runBtn.disabled = false;
        runBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        abortBtn.disabled = true;
        badge.innerText = 'Idle (Siap)';
        badge.className = "text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
      }
    }

    async function loadStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();

        const setBadge = (id, ok) => {
          const el = document.getElementById(id);
          if (el) {
            el.className = ok ? "inline-block w-2 h-2 rounded-full bg-emerald-400" : "inline-block w-2 h-2 rounded-full bg-slate-500";
          }
        };

        setBadge('dot-gemini', data.hasGemini);
        setBadge('dot-github', data.hasGithub);
        setBadge('dot-supabase', data.hasSupabase);
        setBadge('dot-vercel', data.hasVercel);

        if (data.candidateFolders && data.candidateFolders.length) {
          const chipsContainer = document.getElementById('quick-folder-chips');
          chipsContainer.innerHTML = '';
          data.candidateFolders.slice(0, 8).forEach(folder => {
            const btn = document.createElement('button');
            const basename = folder.split(/[\\\\/]/).pop();
            btn.className = "px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 font-mono transition text-[11px]";
            btn.innerText = basename;
            btn.onclick = () => {
              document.getElementById('input-path').value = folder;
              scanCurrentFolder();
            };
            chipsContainer.appendChild(btn);
          });
        }
      } catch (err) {
        console.error('Failed to load status:', err);
      }
    }

    async function browseFolderNative() {
      appendLog("📂 Membuka jendela dialog pemilih folder Windows...");
      try {
        const res = await fetch('/api/browse-folder', { method: 'POST' });
        const data = await res.json();
        if (data.path) {
          document.getElementById('input-path').value = data.path;
          appendLog("📁 Folder terpilih: " + data.path);
          scanCurrentFolder();
        } else {
          appendLog("ℹ️ Pemilihan folder dibatalkan.");
        }
      } catch (err) {
        appendLog("❌ Gagal membuka pemilih folder: " + err.message);
      }
    }

    async function scanCurrentFolder() {
      const folderPath = document.getElementById('input-path').value.trim();
      if (!folderPath) {
        alert("Masukkan path folder proyek terlebih dahulu!");
        return;
      }

      appendLog("🔍 Memindai folder proyek: " + folderPath + " ...");
      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: folderPath })
        });
        const data = await res.json();
        if (!data.exists) {
          appendLog("⚠️ Folder tidak ditemukan: " + folderPath);
          alert("Folder tidak ditemukan di komputer!");
          return;
        }

        if (data.name) {
          document.getElementById('input-name').value = data.name;
          document.getElementById('input-slug').value = data.slug;
        }
        if (data.category) {
          const catRadio = document.querySelector('input[name="project-category"][value="' + data.category + '"]');
          if (catRadio) catRadio.checked = true;
        }
        if (data.stacks && data.stacks.length) {
          document.getElementById('input-stacks').value = data.stacks.join(', ');
        }
        if (data.description) {
          document.getElementById('input-desc').value = data.description;
        }
        if (data.isGit && data.gitRemote) {
          document.getElementById('check-update').checked = true;
        }

        const banner = document.getElementById('scan-result-banner');
        banner.classList.remove('hidden');
        document.getElementById('scan-banner-title').innerText = "Proyek: " + (data.name || "Terdeteksi");
        document.getElementById('scan-banner-desc').innerText = "Arsitektur: " + data.summary + " | Stacks: " + (data.stacks ? data.stacks.join(', ') : '-');

        appendLog("✅ Hasil pemindaian: [" + data.summary + "]");
        appendLog("   Nama Proyek  : " + data.name);
        appendLog("   Kategori     : " + data.category);
        appendLog("   Rekomendasi  : " + (data.stacks ? data.stacks.join(', ') : '-'));
      } catch (err) {
        appendLog("❌ Gagal memindai folder: " + err.message);
      }
    }

    async function startProjectAutomation() {
      const pathVal = document.getElementById('input-path').value.trim();
      const nameVal = document.getElementById('input-name').value.trim();
      const slugVal = document.getElementById('input-slug').value.trim();

      if (!pathVal) {
        alert("Pilih folder proyek terlebih dahulu!");
        return;
      }
      if (!nameVal) {
        alert("Nama proyek harus diisi!");
        return;
      }

      const catRadio = document.querySelector('input[name="project-category"]:checked');
      const categoryVal = catRadio ? catRadio.value : 'web-fullstack';

      const stacksVal = document.getElementById('input-stacks').value.trim();
      const demoVal = document.getElementById('input-demo').value.trim();
      const descVal = document.getElementById('input-desc').value.trim();
      const backendVal = document.getElementById('select-backend').value;
      const imgTypeVal = document.getElementById('select-image-type').value;
      const imgPathVal = document.getElementById('input-image-path').value.trim();

      const isUpdate = document.getElementById('check-update').checked;
      const isDryRun = document.getElementById('check-dryrun').checked;
      const isApiDoc = document.getElementById('check-apidoc').checked;
      const skipGithub = document.getElementById('check-skipgithub').checked;
      const skipSupabase = document.getElementById('check-skipsupabase').checked;
      const skipVercel = document.getElementById('check-skipvercel').checked;

      setRunningState(true);
      appendLog("==================================================================");
      appendLog("🚀 MEMULAI OTOMASI PROYEK: " + nameVal + " [" + categoryVal.toUpperCase() + "]");
      appendLog("==================================================================");

      try {
        const res = await fetch('/api/run-project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: pathVal,
            name: nameVal,
            slug: slugVal,
            category: categoryVal,
            stacks: stacksVal,
            demo: demoVal,
            desc: descVal,
            backendPlatform: backendVal,
            imageType: imgTypeVal,
            imagePath: imgPathVal,
            apiDoc: isApiDoc,
            update: isUpdate,
            dryRun: isDryRun,
            skipGithub,
            skipSupabase,
            skipVercel
          })
        });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\\n');
          for (const line of lines) {
            if (line.trim()) appendLog(line);
          }
        }
      } catch (err) {
        appendLog("❌ Kesalahan saat menjalankan proses: " + err.message);
      } finally {
        setRunningState(false);
      }
    }

    async function startSync(dryRun) {
      setRunningState(true);
      appendLog("==================================================================");
      appendLog("🔄 MEMULAI SINKRONISASI GITHUB " + (dryRun ? "(DRY RUN)" : "(PENUH)") + "...");
      appendLog("==================================================================");

      try {
        const res = await fetch('/api/run-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dryRun })
        });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\\n');
          for (const line of lines) {
            if (line.trim()) appendLog(line);
          }
        }
      } catch (err) {
        appendLog("❌ Kesalahan saat sinkronisasi: " + err.message);
      } finally {
        setRunningState(false);
        loadSyncHistory();
      }
    }

    async function abortProcess() {
      try {
        appendLog("🛑 Mengirim sinyal pembatalan ke proses...");
        await fetch('/api/abort', { method: 'POST' });
        appendLog("ℹ️ Proses dibatalkan oleh pengguna.");
      } catch (err) {
        appendLog("⚠️ Gagal membatalkan: " + err.message);
      } finally {
        setRunningState(false);
      }
    }

    async function loadProjectsList() {
      const container = document.getElementById('projects-grid');
      container.innerHTML = '<div class="text-xs text-slate-500 italic">Memuat data proyek dari database...</div>';
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        if (!data || !data.length) {
          container.innerHTML = '<div class="text-xs text-slate-400">Belum ada proyek yang terdaftar. Buat proyek pertama Anda!</div>';
          return;
        }

        container.innerHTML = '';
        data.forEach(p => {
          const card = document.createElement('div');
          card.className = "bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition";
          
          const stacksList = Array.isArray(p.stacks) ? p.stacks.slice(0, 4).join(', ') : (p.stacks || '-');
          
          card.innerHTML = \`
            <div class="space-y-2">
              <div class="flex items-start justify-between gap-2">
                <h4 class="font-bold text-sm text-white">\${p.title || p.slug}</h4>
                <span class="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700/60">\${p.category || 'web'}</span>
              </div>
              <p class="text-xs text-slate-400 line-clamp-2">\${p.description || 'Tidak ada deskripsi.'}</p>
              <div class="text-[11px] text-slate-500 font-mono">Stacks: \${stacksList}</div>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                \${p.link_github ? \`<a href="\${p.link_github}" target="_blank" class="text-xs text-slate-400 hover:text-white">GitHub ↗</a>\` : ''}
                \${p.link_demo ? \`<a href="\${p.link_demo}" target="_blank" class="text-xs text-cyan-400 hover:text-cyan-300">Demo ↗</a>\` : ''}
              </div>
              <button class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs rounded-lg font-medium transition" onclick='loadProjectIntoForm(\${JSON.stringify(p).replace(/'/g, "&#39;")})'>
                ⚡ Muat ke Form
              </button>
            </div>
          \`;
          container.appendChild(card);
        });
      } catch (err) {
        container.innerHTML = '<div class="text-xs text-rose-400">Gagal memuat proyek: ' + err.message + '</div>';
      }
    }

    function loadProjectIntoForm(p) {
      switchTab('create');
      document.getElementById('input-name').value = p.title || p.slug;
      document.getElementById('input-slug').value = p.slug;
      if (p.category) {
        const catRadio = document.querySelector('input[name="project-category"][value="' + p.category + '"]');
        if (catRadio) catRadio.checked = true;
      }
      if (p.stacks) {
        document.getElementById('input-stacks').value = Array.isArray(p.stacks) ? p.stacks.join(', ') : p.stacks;
      }
      if (p.description) {
        document.getElementById('input-desc').value = p.description;
      }
      if (p.link_demo) {
        document.getElementById('input-demo').value = p.link_demo;
      }
      document.getElementById('check-update').checked = true;
      appendLog("⚡ Data proyek '" + (p.title || p.slug) + "' dimuat ke formulir otomasi (Mode Update diaktifkan).");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function loadSyncHistory() {
      const container = document.getElementById('sync-history-container');
      try {
        const res = await fetch('/api/sync-history');
        const logs = await res.json();
        if (!logs || !logs.length) {
          container.innerHTML = '<div class="text-xs text-slate-500 italic">Belum ada riwayat sinkronisasi.</div>';
          return;
        }

        container.innerHTML = '';
        logs.forEach(l => {
          const div = document.createElement('div');
          div.className = "bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1";
          const dateStr = l.timestamp ? new Date(l.timestamp).toLocaleString('id-ID') : '-';
          const items = Array.isArray(l.results) ? l.results.map(r => \`\${r.slug} (\${r.action})\`).join(', ') : '-';
          div.innerHTML = \`
            <div class="flex items-center justify-between text-slate-400">
              <span class="font-mono text-[11px] text-slate-300">\${dateStr}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-teal-400 font-semibold">\${l.source || 'cron'}</span>
            </div>
            <div class="text-slate-300">Hasil: <span class="font-mono text-emerald-400">\${items}</span></div>
          \`;
          container.appendChild(div);
        });
      } catch (err) {
        container.innerHTML = '<div class="text-xs text-rose-400">Gagal memuat log sync: ' + err.message + '</div>';
      }
    }

    loadStatus();
  </script>
</body>
</html>
`;
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || "/", `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  const localIp = getLocalIpAddress();

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // PWA Manifest
  if (req.method === "GET" && pathname === "/manifest.json") {
    res.writeHead(200, { "Content-Type": "application/manifest+json; charset=utf-8" });
    res.end(getManifestJson());
    return;
  }

  // SVG Icon
  if (req.method === "GET" && (pathname === "/icon.svg" || pathname === "/favicon.ico")) {
    res.writeHead(200, { "Content-Type": "image/svg+xml; charset=utf-8" });
    res.end(SVG_ICON);
    return;
  }

  // GET or HEAD / -> Serve HTML
  if ((req.method === "GET" || req.method === "HEAD") && (pathname === "/" || pathname === "/index.html")) {
    const html = renderDashboardHtml(localIp);
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": Buffer.byteLength(html),
    });
    if (req.method === "HEAD") {
      res.end();
    } else {
      res.end(html);
    }
    return;
  }

  // GET /api/status
  if (req.method === "GET" && pathname === "/api/status") {
    const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key");
    const hasGithub = Boolean(
      (process.env.GITHUB_READ_USER_TOKEN_PERSONAL || process.env.PORTFOLIO_GITHUB_TOKEN) &&
      process.env.GITHUB_READ_USER_TOKEN_PERSONAL !== "your_github_token"
    );
    const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
    const hasVercel = Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_TOKEN !== "your_vercel_token");
    const candidateFolders = getCandidateFolders();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        hasGemini,
        hasGithub,
        hasSupabase,
        hasVercel,
        candidateFolders,
        localIp,
        username: process.env.GITHUB_USERNAME || "saecar",
      })
    );
    return;
  }

  // POST /api/browse-folder
  if (req.method === "POST" && pathname === "/api/browse-folder") {
    const folder = await openWindowsFolderPicker();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ path: folder }));
    return;
  }

  // POST /api/scan
  if (req.method === "POST" && pathname === "/api/scan") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { path: targetPath } = JSON.parse(body || "{}");
        if (!targetPath || !fs.existsSync(targetPath)) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ exists: false }));
          return;
        }

        const resolvedPath = path.resolve(targetPath);
        const folderName = path.basename(resolvedPath);
        const detected = detectProjectArchitecture(resolvedPath);

        let detectedName = folderName
          .split(/[-_]/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        let detectedSlug = sanitizeSlug(folderName);
        let detectedDescription = "";
        let gitRemote = "";
        let isGit = fs.existsSync(path.join(resolvedPath, ".git"));

        const pkgPath = path.join(resolvedPath, "package.json");
        if (fs.existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
            if (pkg.name) {
              detectedSlug = sanitizeSlug(pkg.name);
              detectedName = pkg.name
                .split(/[-_]/)
                .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");
            }
            if (pkg.description) detectedDescription = pkg.description;
          } catch {}
        }

        if (isGit) {
          try {
            gitRemote = execSync("git remote get-url origin", { cwd: resolvedPath, encoding: "utf-8" }).trim();
          } catch {}
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            exists: true,
            name: detectedName,
            slug: detectedSlug,
            category: detected.detectedCategory,
            summary: detected.summary,
            stacks: detected.recommendedStacks,
            description: detectedDescription,
            isGit,
            gitRemote,
          })
        );
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // GET /api/projects
  if (req.method === "GET" && pathname === "/api/projects") {
    try {
      const supaProjects = await fetchSupabaseProjects();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(supaProjects));
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/sync-history
  if (req.method === "GET" && pathname === "/api/sync-history") {
    const logs = getSyncLogs();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(logs));
    return;
  }

  // POST /api/run-project (Streaming)
  if (req.method === "POST" && pathname === "/api/run-project") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const createScript = path.join(rootDir, "scripts", "create-project.ts");
        const args: string[] = ["run", createScript, "--non-interactive"];

        if (payload.name) args.push("--name", String(payload.name));
        if (payload.slug) args.push("--slug", String(payload.slug));
        if (payload.category) args.push("--category", String(payload.category));
        if (payload.path) args.push("--path", String(payload.path));
        if (payload.desc) args.push("--desc", String(payload.desc));
        if (payload.stacks) args.push("--stacks", String(payload.stacks));
        if (payload.demo) args.push("--demo", String(payload.demo));
        if (payload.backendPlatform) args.push("--backend-platform", String(payload.backendPlatform));
        if (payload.imageType) args.push("--image-type", String(payload.imageType));
        if (payload.imagePath) args.push("--image-path", String(payload.imagePath));
        if (payload.apiDoc) args.push("--api-doc");
        if (payload.update) args.push("--update");
        if (payload.dryRun) args.push("--dry-run");
        if (payload.skipGithub) args.push("--skip-github");
        if (payload.skipSupabase) args.push("--skip-supabase");
        if (payload.skipVercel) args.push("--skip-vercel");

        res.writeHead(200, {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "X-Content-Type-Options": "nosniff",
        });

        res.write(`Menjalankan perintah: bun ${args.join(" ")}\n\n`);

        activeChild = spawn("bun", args, {
          cwd: rootDir,
          env: process.env,
        });

        activeChild.stdout?.on("data", (data) => {
          res.write(data.toString());
        });

        activeChild.stderr?.on("data", (data) => {
          res.write(data.toString());
        });

        activeChild.on("close", (code) => {
          activeChild = null;
          res.write(`\n[Selesai dengan status kode: ${code}]\n`);
          res.end();
        });

        activeChild.on("error", (err) => {
          activeChild = null;
          res.write(`\n[Kesalahan Proses: ${err.message}]\n`);
          res.end();
        });
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(`Error: ${err.message}`);
      }
    });
    return;
  }

  // POST /api/run-sync (Streaming)
  if (req.method === "POST" && pathname === "/api/run-sync") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const syncScript = path.join(rootDir, "scripts", "sync-from-github.ts");
        const args: string[] = ["run", syncScript];
        if (payload.dryRun) args.push("--dry-run");

        res.writeHead(200, {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "X-Content-Type-Options": "nosniff",
        });

        res.write(`Menjalankan sinkronisasi: bun ${args.join(" ")}\n\n`);

        activeChild = spawn("bun", args, {
          cwd: rootDir,
          env: process.env,
        });

        activeChild.stdout?.on("data", (data) => {
          res.write(data.toString());
        });

        activeChild.stderr?.on("data", (data) => {
          res.write(data.toString());
        });

        activeChild.on("close", (code) => {
          activeChild = null;
          res.write(`\n[Sinkronisasi selesai dengan status kode: ${code}]\n`);
          res.end();
        });

        activeChild.on("error", (err) => {
          activeChild = null;
          res.write(`\n[Kesalahan Proses: ${err.message}]\n`);
          res.end();
        });
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(`Error: ${err.message}`);
      }
    });
    return;
  }

  // POST /api/abort
  if (req.method === "POST" && pathname === "/api/abort") {
    if (activeChild) {
      try {
        activeChild.kill("SIGINT");
      } catch {}
      activeChild = null;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "aborted" }));
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "idle" }));
    }
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

// Start Server on 0.0.0.0
server.listen(PORT, "0.0.0.0", () => {
  const localUrl = `http://localhost:${PORT}`;
  const networkUrl = `http://${getLocalIpAddress()}:${PORT}`;

  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                 🎉 PORTFOLIO AUTOMATION STUDIO GUI 🎉                    ║
╚═══════════════════════════════════════════════════════════════════════════╝

  ✅ Desktop Access (PC) : \x1b[36m${localUrl}\x1b[0m
  ✅ Mobile / APK (Wi-Fi) : \x1b[32m${networkUrl}\x1b[0m
  ✅ Portfolio Target     : ${rootDir}

  Membuka jendela aplikasi...
`);

  // Launch native app window using Microsoft Edge app mode or browser
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  if (fs.existsSync(edgePath)) {
    try {
      spawn(
        edgePath,
        [
          `--app=${localUrl}`,
          "--window-size=1260,860",
          `--user-data-dir=${path.join(os.tmpdir(), "portfolio-gui-edge-profile")}`,
        ],
        {
          detached: true,
          stdio: "ignore",
        }
      ).unref();
      return;
    } catch {}
  }

  try {
    spawn("powershell", ["-NoProfile", "-Command", `Start-Process "${localUrl}"`], {
      detached: true,
      stdio: "ignore",
    }).unref();
  } catch {}
});
