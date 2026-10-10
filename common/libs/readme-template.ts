import axios from "axios";

export type ProjectCategory =
  | "iot"
  | "game"
  | "web"
  | "web-frontend"
  | "web-backend"
  | "web-fullstack";

export interface GenerateReadmeOptions {
  repo: string;
  slug: string;
  category: ProjectCategory;
  topics?: string[];
  name?: string;
  descriptionHint?: string;
  stacks?: string[];
  linkGithub?: string;
  linkDemo?: string;
  sourceCodeSnippet?: string;
}

function fallbackReadme({
  repo,
  slug,
  category,
  topics = [],
  name = repo,
  descriptionHint,
  stacks = [],
  linkGithub = `https://github.com/saecar/${slug}`,
  linkDemo,
  sourceCodeSnippet,
}: GenerateReadmeOptions) {
  const stackBadges = (stacks.length ? stacks : topics)
    .map((s) => `\`${s}\``)
    .join(" • ") || "`Open Source`";

  if (category === "iot") {
    const description =
      descriptionHint ||
      `Sistem Internet of Things (IoT) berbasis mikrokontroler dengan integrasi sensor dan pemantauan data real-time.`;
    const readme = `# ${name}

> ${description}

[![Category](https://img.shields.io/badge/Category-IoT-emerald.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
${linkDemo ? `[![Live Demo](https://img.shields.io/badge/Demo-Live_Preview-success.svg)](${linkDemo})` : ""}

Proyek **${name}** adalah solusi hardware cerdas berbasis mikrokontroler (ESP32/Arduino) yang dirancang untuk otomasi dan telemetri data sensor melalui protokol IoT modern.

---

## 🌟 Fitur Utama
- **Real-time Telemetri**: Pembacaan sensor berulang dengan latensi rendah.
- **Konektivitas Fleksibel**: Mendukung protokol WiFi, MQTT, dan HTTP REST API.
- **Fail-safe Operation**: Auto-reconnect dan watchdog timer untuk keandalan 24/7.
- **Low Power Consumption**: Fitur deep sleep untuk efisiensi daya baterai.

## 🛠 Hardware & Tech Stack
- **Mikrokontroler**: ESP32 / ESP8266 / Arduino
- **Framework & IDE**: PlatformIO / Arduino IDE / C++
- **Tech Stack**: ${stackBadges}

### 🔌 Skema Pinout & Diagram Rangkaian (Wiring)

\`\`\`mermaid
graph LR
  subgraph MCU["ESP32 Development Board"]
    P_3V3["3.3V (VCC)"]
    P_GND["GND (Ground)"]
    P_GPIO4["GPIO 4 (Signal/Data)"]
    P_I2C_SDA["GPIO 21 (SDA)"]
    P_I2C_SCL["GPIO 22 (SCL)"]
  end

  subgraph Sensor["Sensor Modul"]
    S_VCC["VCC"]
    S_GND["GND"]
    S_DAT["DATA / OUT"]
  end

  P_3V3 --> S_VCC
  P_GND --> S_GND
  P_GPIO4 --> S_DAT
\`\`\`

| Komponen / Sensor | Pin Sensor | Pin Mikrokontroler (ESP32) | Keterangan |
| :--- | :--- | :--- | :--- |
| VCC / Power | VCC | 3.3V / 5V | Sumber Tegangan |
| GND / Ground | GND | GND | Ground Bersama |
| Data / Signal | DATA / OUT | GPIO 4 / GPIO 21 | Sinyal Digital / I2C (SDA) |
| Clock / SCL | SCL | GPIO 22 | Jalur I2C Clock |

---

## 📦 Cara Pemasangan & Persiapan

### 1. Persiapan Perangkat Lunak
- Pasang [VS Code](https://code.visualstudio.com/) dengan ekstensi **PlatformIO IDE** (atau [Arduino IDE 2.x](https://www.arduino.cc/en/software)).
- Pastikan driver USB-to-UART (CH340 atau CP2102) sudah terinstal di komputer.

### 2. Kloning Repositori
\`\`\`bash
git clone ${linkGithub}.git
cd ${slug}
\`\`\`

### 3. Konfigurasi Kredensial
Salin file konfigurasi (jika tersedia):
\`\`\`bash
cp include/config.example.h include/config.h
\`\`\`
Sesuaikan pengaturan WiFi (SSID, Password) dan broker MQTT/API URL.

### 4. Build & Flash Firmware
Jika menggunakan **PlatformIO CLI**:
\`\`\`bash
# Compile firmware
pio run

# Upload ke board mikrokontroler
pio run -t upload

# Buka Serial Monitor (115200 baud)
pio device monitor -b 115200
\`\`\`

---

## 📂 Struktur Folder
\`\`\`
├── .pio/               # Cache build PlatformIO
├── include/            # Header file & konfigurasi pin
├── lib/                # Library kustom / sensor driver
├── src/                # Kode sumber utama (main.cpp)
├── platformio.ini      # Konfigurasi board & dependensi library
└── README.md           # Dokumentasi proyek
\`\`\`

## 📄 Lisensi
Didistribusikan di bawah lisensi **MIT**. Lihat \`LICENSE\` untuk informasi lebih lanjut.
`;
    return { description, readme };
  }

  if (category === "game") {
    const description =
      descriptionHint ||
      `Proyek game interaktif dengan gameplay seru, mekanik responsif, dan aset visual memukau.`;
    const readme = `# ${name}

> ${description}

[![Category](https://img.shields.io/badge/Category-Game-purple.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
${linkDemo ? `[![Play Game](https://img.shields.io/badge/Play-Live_Demo-purple.svg)](${linkDemo})` : ""}

**${name}** adalah game yang dikembangkan dengan fokus pada pengalaman bermain yang seru, kontrol responsif, serta atmosfer visual dan audio yang memikat.

---

## 🎮 Gameplay & Fitur Utama
- **Mekanik Halus**: Sistem gerak dan fisika yang presisi dan responsif.
- **Level & Tantangan**: Beragam rintangan dan musuh dengan pola unik.
- **Audio & Visual**: Efek suara dan partikel yang memperkuat atmosfer game.
- **Cross-Platform**: Kompatibel untuk Desktop (Windows/Linux) dan WebGL browser.

## 🕹 Kontrol Permainan
| Aksi | Keyboard | Gamepad |
| :--- | :--- | :--- |
| Gerak Karakter | WASD / Tombol Panah | D-Pad / Analog Kiri |
| Lompat / Interaksi | Spacebar / E | Tombol A / Cross |
| Serang / Aksi Utama | J / Klik Kiri Mouse | Tombol X / Square |
| Pause / Menu | Escape | Tombol Start / Menu |

## 🛠 Engine & Tech Stack
- **Game Engine**: Unity / Godot Engine / Phaser / Three.js
- **Tech Stack**: ${stackBadges}

---

## 🚀 Cara Menjalankan & Membangun Game

### 1. Kloning Repositori
\`\`\`bash
git clone ${linkGithub}.git
cd ${slug}
\`\`\`

### 2. Buka di Game Engine
1. Buka Game Engine yang sesuai (Unity Hub / Godot Editor).
2. Pilih opsi **Import Project** dan arahkan ke folder repositori ini.
3. Tunggu hingga proses import aset selesai.

### 3. Jalankan / Build
- **Playtest**: Tekan tombol **Play / Run** (\`F5\` di Godot, \`Ctrl+P\` di Unity) untuk bermain langsung di editor.
- **Build**: Masuk ke menu \`Project > Export / Build Settings\`, pilih target platform (Windows / WebGL) lalu klik **Build**.

---

## 📂 Struktur Proyek
\`\`\`
├── assets/             # Tekstur, sprite, audio, dan model 3D
├── scenes/             # Level dan hierarchy tampilan game
├── scripts/            # Logika script gameplay dan state management
├── builds/             # Output kompilasi executable / WebGL
└── README.md
\`\`\`

## 📄 Lisensi
Didistribusikan di bawah lisensi **MIT**. Seluruh aset audio/visual terikat lisensi masing-masing kreator.
`;
    return { description, readme };
  }

  if (category === "web-frontend") {
    const description =
      descriptionHint ||
      `Antarmuka web modern (Frontend UI) yang responsif, berkecepatan tinggi, dan dioptimasi untuk UX terbaik.`;
    const readme = `# ${name}

> ${description}

[![Category](https://img.shields.io/badge/Category-Frontend_Web-blue.svg)](#)
[![Deploy with Vercel](https://img.shields.io/badge/Deploy-Vercel-black.svg?logo=vercel)](${linkDemo || "#"})
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
${linkDemo ? `[![Live Demo](https://img.shields.io/badge/Demo-Live_Preview-success.svg)](${linkDemo})` : ""}

**${name}** adalah aplikasi web frontend modular yang dibangun untuk menyajikan antarmuka pengguna interaktif, responsif, dan optimal di berbagai ukuran layar.

---

## ⚡ Fitur Utama
- **UI/UX Interaktif & Responsif**: Tampilan mulus di perangkat mobile, tablet, dan desktop.
- **Fast Build & Instant HMR**: Toolchain modern untuk pengalaman pengembang yang cepat.
- **Komponen Modular**: Struktur komponen yang terisolasi dan mudah di-maintain.
- **Optimasi Aset & SEO**: Skor Core Web Vitals tinggi dan waktu muat instan.

## 🛠 Tech Stack
- **Framework & Libraries**: ${stackBadges}
- **Deployment Platform**: Vercel

---

## 🚀 Cara Pemasangan & Menjalankan Proyek

\`\`\`bash
# 1. Kloning repositori
git clone ${linkGithub}.git
cd ${slug}

# 2. Instal dependensi
bun install # atau npm install

# 3. Jalankan development server
bun dev # atau npm run dev
\`\`\`

Buka [http://localhost:3000](http://localhost:3000) di browser Anda untuk melihat hasilnya.

## 🌐 Deployment (Auto Deploy ke Vercel Saja)
Aplikasi frontend ini di-deploy secara otomatis ke Vercel melalui integrasi GitHub. Setiap \`git push\` akan memicu preview/production build secara otomatis.

## 📂 Struktur Folder
\`\`\`
├── src/ / components/  # Komponen UI dan layout modular
├── public/             # Asset statis (gambar, font, ikon)
└── README.md
\`\`\`

## 📄 Lisensi
Didistribusikan di bawah lisensi **MIT**.
`;
    return { description, readme };
  }

  if (category === "web-backend") {
    const description =
      descriptionHint ||
      `Layanan RESTful API & Backend berkecepatan tinggi dengan arsitektur scalable, routing modular, dan database terintegrasi.`;
    const readme = `# ${name}

> ${description}

[![Category](https://img.shields.io/badge/Category-Backend_API-indigo.svg)](#)
[![Deploy on Railway](https://img.shields.io/badge/Deploy-Railway-black.svg?logo=railway)](${linkDemo || "#"})
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
${linkDemo ? `[![API Endpoint](https://img.shields.io/badge/API-Live_Endpoint-success.svg)](${linkDemo})` : ""}

**${name}** menyediakan layanan RESTful API dengan struktur routing modular, middleware autentikasi, serta integrasi database yang andal.

---

## ⚡ Fitur Utama
- **RESTful Architecture**: Routing terstruktur dengan representasi JSON standar.
- **Autentikasi & Otorisasi**: Proteksi endpoint dengan token JWT / API key.
- **Validasi Data & Sanitasi**: Validasi payload request yang ketat.
- **Database ORM / Migrasi**: Pengelolaan skema database yang aman dan teruji.

## 🛠 Tech Stack & Environment
- **Runtime / Framework**: ${stackBadges}
- **Database & Cloud**: Supabase / PostgreSQL / Railway

---

## 🚀 Cara Pemasangan & Menjalankan Proyek

\`\`\`bash
# 1. Kloning repositori
git clone ${linkGithub}.git
cd ${slug}

# 2. Instal dependensi
bun install # atau npm install / composer install

# 3. Konfigurasi Environment Variables
cp .env.example .env

# 4. Jalankan server lokal
bun run start # atau php artisan serve / uvicorn main:app
\`\`\`

## 🌐 Deployment (Railway / Supabase)
Layanan backend ini siap di-deploy secara otomatis sebagai container di Railway atau REST API di Supabase.

## 📂 Struktur Folder
\`\`\`
├── src/ / app/         # Controllers, Routes, Services & Models
├── config/             # Konfigurasi database & environment
├── API.md              # Dokumentasi lengkap spesifikasi API
└── README.md
\`\`\`

## 📄 Lisensi
Didistribusikan di bawah lisensi **MIT**.
`;
    return { description, readme };
  }

  // Web Fullstack default
  const description =
    descriptionHint ||
    `Aplikasi web modern dengan performa tinggi, UI/UX interaktif, dan arsitektur scalable.`;
  const readme = `# ${name}

> ${description}

[![Category](https://img.shields.io/badge/Category-Web-blue.svg)](#)
[![Deploy with Vercel](https://img.shields.io/badge/Deploy-Vercel-black.svg?logo=vercel)](${linkDemo || "#"})
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
${linkDemo ? `[![Live Demo](https://img.shields.io/badge/Demo-Live_Preview-success.svg)](${linkDemo})` : ""}

**${name}** adalah aplikasi web modern yang dibangun dengan arsitektur scalable, performa tinggi, dan pengalaman pengguna yang intuitif.

---

## ⚡ Fitur Utama
- **Desain Modern & Responsif**: Tampilan optimal di semua ukuran layar (Mobile, Tablet, Desktop).
- **Performa Cepat**: Rendering yang dioptimasi untuk waktu muat instan dan SEO terbaik.
- **Integrasi Database & API**: Terhubung secara aman dengan backend dan layanan cloud.
- **Security & Best Practices**: Validasi tipe data ketat dan arsitektur kode modular.

## 🛠 Tech Stack
- **Frontend & Framework**: Next.js / React / TypeScript / Tailwind CSS
- **Database & Cloud**: Supabase / PostgreSQL / Vercel
- **Tech Stack**: ${stackBadges}

---

## 🚀 Cara Pemasangan & Menjalankan Proyek

### 1. Kloning Repositori
\`\`\`bash
git clone ${linkGithub}.git
cd ${slug}
\`\`\`

### 2. Instal Dependensi
Gunakan salah satu package manager favorit Anda:
\`\`\`bash
# Menggunakan Bun (Direkomendasikan)
bun install

# Atau menggunakan NPM / PNPM
npm install
\`\`\`

### 3. Konfigurasi Environment Variables
Salin file template environment:
\`\`\`bash
cp .env.example .env.local
\`\`\`
Isi variabel yang diperlukan (misalnya URL database, API keys).

### 4. Jalankan Server Development
\`\`\`bash
bun dev
# atau: npm run dev
\`\`\`
Buka [http://localhost:3000](http://localhost:3000) di browser Anda untuk melihat hasilnya.

### 5. Build untuk Produksi
\`\`\`bash
bun run build
bun start
\`\`\`

---

## 🌐 Deployment (Auto Deploy ke Vercel)
Aplikasi ini dioptimalkan untuk di-deploy di [Vercel](https://vercel.com):
1. Push kode Anda ke GitHub.
2. Impor repositori ke Vercel Dashboard.
3. Atur Environment Variables sesuai kebutuhan.
4. Klik **Deploy**. Setiap \`git push\` berikutnya akan memicu auto-deploy otomatis!

## 📂 Struktur Folder
\`\`\`
├── app/ / pages/       # Routing dan halaman aplikasi
├── components/         # Komponen UI modular yang dapat digunakan kembali
├── lib/ / utils/       # Utility functions dan client helpers
├── public/             # Asset statis (gambar, font, ikon)
└── README.md
\`\`\`

## 📄 Lisensi
Didistribusikan di bawah lisensi **MIT**. Lihat \`LICENSE\` untuk detail lengkap.
`;
  return { description, readme };
}

export async function generateReadme(
  options: GenerateReadmeOptions
): Promise<{ description: string; readme: string }> {
  const {
    repo,
    slug,
    category,
    topics = [],
    name = repo,
    descriptionHint,
    stacks = [],
    linkGithub = `https://github.com/saecar/${slug}`,
    linkDemo,
    sourceCodeSnippet,
  } = options;

  const apiKey = process.env.GEMINI_API_KEY;
  // Gunakan model yang stabil
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  if (!apiKey || apiKey === "your_gemini_api_key") {
    return fallbackReadme(options);
  }

  const safeTopics = (topics || []).slice(0, 20).join(", ");
  const safeStacks = (stacks || []).slice(0, 20).join(", ");

  let categoryGuide = "";
  if (category === "iot") {
    const codeContext = sourceCodeSnippet
      ? `
ANALISIS KODE SUMBER FIRMWARE / HARDWARE (Ditemukan dari file proyek):
\`\`\`cpp
${sourceCodeSnippet}
\`\`\`
INSTRUKSI DETEKSI WIRING & PINOUT DARI KODE:
- Telaah baris-baris kode di atas secara seksama (temukan deklarasi pin seperti #define, const int, pinMode, Wire.begin(SDA, SCL), SPI, Serial, library sensor seperti DHT, Adafruit_BME280, Servo, Relay, dsb).
- Ekstrak seluruh komponen/sensor yang digunakan dan pin GPIO mikrokontroler yang terhubung!
`
      : "";

    categoryGuide = `
Spesifik Kategori IoT:
${codeContext}
- WAJIB BUAT DIAGRAM WIRING INTERAKTIF / RANGKAIAN MENGGUNAKAN MERMAID (GitHub merender diagram ini secara visual otomatis).
  Format contoh:
  \`\`\`mermaid
  graph LR
    subgraph MCU["ESP32 / Mikrokontroler"]
      MCU_3V3["3.3V (VCC)"]
      MCU_GND["GND (Ground)"]
      MCU_P4["GPIO 4 (Signal/Data)"]
      MCU_P5["GPIO 5 (Relay IN)"]
    end
    subgraph Sensor1["DHT22 / Sensor"]
      S1_VCC["VCC"]
      S1_GND["GND"]
      S1_DAT["DATA"]
    end
    MCU_3V3 --> S1_VCC
    MCU_GND --> S1_GND
    MCU_P4 --> S1_DAT
  \`\`\`
- Buat TABEL WIRING / PINOUT LENGKAP yang mendampingi diagram (Nama Komponen/Sensor, Pin Sensor/Modul, Pin Mikrokontroler, Level Tegangan, Keterangan / Fungsi).
- Tuliskan tabel komponen hardware & sensor (Bill of Materials).
- Jelaskan step pemasangan menggunakan PlatformIO CLI / VS Code dan Arduino IDE.
- Tuliskan langkah upload firmware (misal: "pio run -t upload", buka Serial Monitor pada baud rate 115200).
- Jelaskan konfigurasi WiFi/MQTT/Cloud database jika relevan.
- Berikan tips troubleshooting hardware umum.`;
  } else if (category === "game") {
    categoryGuide = `
Spesifik Kategori Game:
- Jelaskan konsep gameplay, objektif game, dan core mechanics.
- Buat TABEL KONTROL (Aksi, Keyboard/Mouse, Gamepad).
- Jelaskan versi Engine yang dibutuhkan (Unity / Godot / Unreal / Phaser / Three.js).
- Jelaskan langkah setup editor, import project, serta cara export / build ke Windows Executable dan WebGL.
- Tuliskan struktur scene dan hierarki aset.`;
  } else if (category === "web-frontend") {
    categoryGuide = `
Spesifik Kategori Web Frontend:
- Jelaskan arsitektur antarmuka pengguna (UI/UX), komponen modular, state management, dan styling (Tailwind CSS/CSS modules).
- Tekankan aspek performa frontend: Core Web Vitals, responsive design di mobile/tablet/desktop, dan aksesibilitas.
- Berikan langkah instalasi & build frontend (bun install, bun dev, bun run build).
- Sertakan instruksi deploy online ke Vercel (Auto Deploy via GitHub/Vercel).`;
  } else if (category === "web-backend") {
    categoryGuide = `
Spesifik Kategori Web Backend / REST API:
- Jelaskan arsitektur server backend (Express/Nest/Laravel/FastAPI/Go), routing modular, middleware, dan koneksi database.
- Tuliskan TABEL ENDPOINTS RESTFUL API LENGKAP (Method, Endpoint Path, Deskripsi, Request Payload, Status Code).
- Berikan contoh request cURL dan contoh response JSON.
- Jelaskan mekanisme keamanan (JWT authentication, rate limiting, CORS, input sanitization).
- Sertakan instruksi deployment online container ke Railway (atau Supabase PostgREST / Edge Functions).`;
  } else if (category === "web-fullstack") {
    categoryGuide = `
Spesifik Kategori Web Fullstack:
- Jelaskan arsitektur 3-tier terpadu: Frontend (Next.js/React di Vercel), Backend Logic / API, dan Database (Supabase PostgreSQL / Railway).
- Jelaskan skema database, relasi entitas, dan flow autentikasi data.
- Buat petunjuk konfigurasi environment variables (.env.example untuk Vercel & Supabase).
- Sertakan panduan deployment online: Frontend otomatis di Vercel terhubung ke Database Supabase & Backend di Railway.`;
  } else {
    categoryGuide = `
Spesifik Kategori Web:
- Jelaskan arsitektur web (Frontend, Backend, Database, Auth).
- Buat petunjuk environment variables (.env.example).
- Berikan langkah instalasi lengkap (git clone, bun/npm install, konfigurasi .env, bun dev, bun run build).
- Sertakan instruksi deploy otomatis ke Vercel dan integrasi Supabase / Railway.`;
  }

  const prompt = `Anda adalah Software Engineer & Technical Writer handal. Buatlah README.md yang SANGAT PROFESIONAL, LENGKAP, dan BERSIH untuk proyek open-source:
- Nama Proyek: "${name}"
- Slug: "${slug}"
- Kategori: "${category}" (IoT / Game / Web)
- Tech Stack: ${safeStacks || "-"}
- GitHub Repo: ${linkGithub}
- Live Demo / Preview: ${linkDemo || "-"}
- Catatan Tambahan: ${descriptionHint || "-"}
- Topics: ${safeTopics || "-"}

ATURAN STRUKTUR OUTPUT (Wajib Markdown Valid):
1. Judul "# ${name}" di baris paling awal.
2. Di baris berikutnya persis, berikan blockquote (> ...) berisi 1 kalimat ringkasan profesional dalam Bahasa Indonesia yang menjelaskan apa itu proyek ini dan tujuannya. Kalimat ini akan dipakai sebagai deskripsi kartu portfolio web!
3. Badges (Shields.io: License MIT, Category, Tech Stack, Live Demo).
4. ## 🌟 Fitur Utama (minimal 4 bullet point dengan icon menarik).
5. ## 🛠 Tech Stack & Komponen (berikan detail).
6. ${categoryGuide}
7. ## 🚀 Cara Pemasangan & Persiapan (Wajib step-by-step detail dengan bash codeblock yang benar dan urut).
8. ## 📂 Struktur Folder (diagram tree teks yang rapi).
9. ## 🤝 Kontribusi & Lisensi (MIT).

Catatan Penting:
- Jangan tambahkan backtick triple markdown di luar konten (jangan wrap output dalam \`\`\`markdown ... \`\`\`).
- Buat panduan instalasi yang benar-benar siap diikuti oleh orang awam maupun developer profesional.
- Bahasa: Campuran profesional Bahasa Indonesia dan istilah teknis standar industri.`;

  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2500,
        },
      },
      { signal: AbortSignal.timeout(20000) }
    );

    let text: string =
      res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text.trim()) return fallbackReadme(options);

    // Sanitasi: strip wrapping ```markdown or ```
    text = text.replace(/^```markdown\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/g, "");
    let sanitized = text
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, "")
      .replace(/javascript:[^\s)'"]*/gi, "#");
    // Ensure all <img> tags are valid self-closing JSX
    sanitized = sanitized.replace(/<img([^>]*?)(?<!\/)>/gi, "<img$1 />");

    // Ambil deskripsi dari blockquote pertama atau baris pertama non-heading
    const lines = sanitized.split("\n");
    let description = "";
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith("#") || t.startsWith("```") || t.startsWith("[!")) continue;
      if (t.startsWith(">")) {
        description = t.replace(/^>\s*/, "").trim();
        break;
      }
    }

    if (!description) {
      for (const line of lines) {
        const t = line.trim();
        if (!t || t.startsWith("#") || t.startsWith("```") || t.startsWith("[") || t.startsWith("!")) continue;
        description = t;
        break;
      }
    }

    if (!description || description.length < 10) {
      description = descriptionHint || `${name} — Proyek ${category.toUpperCase()} inovatif dengan dokumentasi lengkap.`;
    }

    return { description, readme: sanitized };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[readme-template] Gemini API note (falling back to template):", msg);
    return fallbackReadme(options);
  }
}

export interface GenerateApiReadmeOptions {
  name: string;
  slug: string;
  baseUrlLocal?: string;
  baseUrlProd?: string;
  stacks?: string[];
  backendSnippet?: string;
  descriptionHint?: string;
}

export async function generateApiReadme(options: GenerateApiReadmeOptions): Promise<string> {
  const {
    name,
    slug,
    baseUrlLocal = "http://localhost:5000",
    baseUrlProd = `https://api-${slug}.onrender.com`,
    stacks = ["Node.js", "Express", "REST API"],
    backendSnippet,
    descriptionHint,
  } = options;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key") {
    return fallbackApiReadme(options);
  }

  const prompt = `Anda adalah Backend Architect & Technical Writer senior.
Buatlah dokumentasi API lengkap dan profesional berformat Markdown murni (untuk file API.md) untuk proyek berikut:

- Nama Layanan: ${name} API
- Slug: ${slug}
- Base URL Lokal: ${baseUrlLocal}
- Base URL Production: ${baseUrlProd}
- Tech Stack: ${stacks.join(", ")}
- Deskripsi: ${descriptionHint || "RESTful Web API Service"}
${backendSnippet ? `\n--- KODE SUMBER BACKEND (ROUTES / CONTROLLERS) ---\n${backendSnippet.slice(0, 8000)}\n` : ""}

STRUKTUR DOKUMENTASI WAJIB:
1. # ${name} API Reference
2. Blockquote ringkasan fungsionalitas
3. ## 🌐 Base URL (Tabel Environment Development & Production)
4. ## 🔐 Autentikasi (Format header Bearer Token / API Key, contoh Authorization header)
5. ## 📋 Daftar Endpoint (Tabel: Method, Path, Keterangan, Auth)
6. ## 🔍 Detail Spesifikasi Endpoint (Setiap endpoint utama memiliki Method, Path, Headers, Query Params / Body JSON, Response 200/201 JSON, Response 400/401/404/500 JSON, dan contoh perintah cURL)
7. ## ⚠️ Kode Error & Penanganan

ATURAN FORMAT:
- Berikan HANYA teks markdown langsung tanpa membungkus dengan backticks \`\`\`markdown di awal/akhir.
- Semua tag <img> harus self-closing <img ... /> jika ada.
- Gunakan bahasa Indonesia profesional dan terminologi teknis baku.`;

  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 3000,
        },
      },
      { signal: AbortSignal.timeout(25000) }
    );

    let text: string = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text.trim()) return fallbackApiReadme(options);

    text = text.replace(/^```markdown\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/g, "");
    text = text.replace(/<img([^>]*?)(?<!\/)>/gi, "<img$1 />");
    return text.trim();
  } catch (err: unknown) {
    return fallbackApiReadme(options);
  }
}

export function fallbackApiReadme(options: GenerateApiReadmeOptions): string {
  const {
    name,
    baseUrlLocal = "http://localhost:5000",
    baseUrlProd = "https://api.example.com",
  } = options;

  return `# ${name} API Reference

> Dokumentasi antarmuka pemrograman aplikasi (RESTful API) untuk layanan ${name}.

---

## 🌐 Base URL

| Environment | URL | Keterangan |
| :--- | :--- | :--- |
| **Development** | \`${baseUrlLocal}\` | Server pengembangan lokal |
| **Production** | \`${baseUrlProd}\` | Server produksi live |

---

## 🔐 Autentikasi

Semua permintaan ke endpoint terproteksi wajib menyertakan header **Bearer Token**:

\`\`\`http
Authorization: Bearer <token_akses_anda>
Content-Type: application/json
Accept: application/json
\`\`\`

---

## 📋 Daftar Endpoint Utama

| Method | Endpoint | Deskripsi | Auth |
| :---: | :--- | :--- | :---: |
| \`GET\` | \`/api/health\` | Pengecekan status dan uptime server | Publik |
| \`GET\` | \`/api/v1/data\` | Mendapatkan seluruh daftar data | Wajib |
| \`POST\` | \`/api/v1/data\` | Membuat data baru | Wajib |
| \`GET\` | \`/api/v1/data/:id\` | Mendapatkan detail data berdasarkan ID | Wajib |
| \`PUT\` | \`/api/v1/data/:id\` | Memperbarui data yang ada | Wajib |
| \`DELETE\` | \`/api/v1/data/:id\` | Menghapus entri data | Wajib |

---

## 📦 Format Respons Standar

### Respons Sukses (HTTP 200 / 201)
\`\`\`json
{
  "success": true,
  "message": "Permintaan berhasil diproses",
  "data": {}
}
\`\`\`

### Respons Kesalahan (HTTP 400 / 401 / 404 / 500)
\`\`\`json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Data yang diminta tidak ditemukan"
  }
}
\`\`\`

---

## 🧪 Contoh Pengujian dengan cURL

\`\`\`bash
# 1. Pengecekan Server Health
curl -X GET "${baseUrlLocal}/api/health"

# 2. Mengambil data dengan Authorization
curl -X GET "${baseUrlLocal}/api/v1/data" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Accept: application/json"
\`\`\`
`;
}
