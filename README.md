# Portfolioo
> Portfolioo adalah platform web full-stack modern yang dirancang secara profesional untuk menampilkan karya, keahlian, dan perjalanan karir pengembang dengan performa tinggi dan estetika visual yang elegan.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Category](https://img.shields.io/badge/Category-Web%20Fullstack-blue.svg)](https://github.com/saecar/portfolioo)
[![ReactJS](https://img.shields.io/badge/ReactJS-18.x-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

---

## 🌟 Fitur Utama

- ⚡ **Lightning Fast Performance**: Dibangun di atas fondasi ReactJS yang dioptimalkan untuk memastikan waktu muat halaman yang instan dan transisi yang mulus.
- 🎨 **Responsive Modern UI/UX**: Antarmuka yang dirancang dengan TailwindCSS, sepenuhnya responsif di berbagai perangkat (Mobile, Tablet, Desktop) dengan dukungan mode gelap/terang secara dinamis.
- 📬 **Interactive Contact System**: Formulir kontak terintegrasi dengan backend database untuk memastikan setiap pesan dari pengunjung tersimpan dan terkelola dengan baik.
- 📊 **Dynamic Project Management**: Dashboard manajemen konten terpusat yang memungkinkan pembaruan portofolio, artikel, dan daftar keahlian secara real-time tanpa perlu deployment ulang kode frontend.

---

## 🛠 Tech Stack & Komponen

Arsitektur **Portfolioo** dirancang menggunakan paradigma modern **3-Tier Architecture** untuk menjamin skalabilitas, keamanan, dan pemisahan *concern* yang jelas antara antarmuka pengguna, logika bisnis, dan penyimpanan data.

```
[ Client / Browser ] 
       │ (HTTPS / REST)
       ▼
[ Frontend: ReactJS + TailwindCSS (Vercel) ]
       │ (REST API / Supabase Client SDK)
       ▼
[ Backend Logic & Database: Supabase PostgreSQL / Railway ]
```

### 1. Arsitektur 3-Tier Terpadu
- **Frontend Layer**: Menggunakan **ReactJS (Vite)** yang di-deploy secara global pada infrastruktur edge **Vercel**, menyediakan *Single Page Application* (SPA) yang interaktif dan responsif.
- **Backend & API Layer**: Memanfaatkan **Supabase Serverless Functions / Edge Functions** serta RESTful API end-points untuk menangani logika otentikasi, validasi input formulir, dan manajemen data.
- **Database Layer**: Menggunakan **Supabase PostgreSQL** sebagai sistem manajemen basis data relasional yang aman, mendukung *Row Level Security* (RLS) secara *out-of-the-box*.

### 2. Skema Database & Flow Autentikasi
Sistem menggunakan basis data relasional dengan entitas utama sebagai berikut:
- **`users`**: Menyimpan data kredensial administrator (terintegrasi dengan Supabase Auth).
- **`projects`**: Menyimpan informasi proyek portofolio (`id`, `title`, `description`, `tech_stack`, `image_url`, `repo_url`, `live_url`).
- **`messages`**: Menyimpan pesan masuk dari form kontak pengunjung (`id`, `sender_name`, `email`, `message`, `created_at`).

**Flow Autentikasi & Data:**
1. Pengunjung mengakses Frontend -> Mengambil data proyek publik secara langsung dari Supabase via *read-only API key*.
2. Pengunjung mengirim pesan -> Permintaan dikirim ke Backend API -> Data divalidasi dan disimpan ke tabel `messages`.
3. Administrator melakukan login melalui halaman `/admin` -> Supabase Auth memverifikasi token JWT -> Akses penuh diberikan berdasarkan kebijakan RLS (Row Level Security).

### 3. Konfigurasi Environment Variables
Buat file `.env` di direktori root proyek berdasarkan templat `.env.example` berikut sebelum menjalankan aplikasi:

```env
# Konfigurasi Supabase
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Konfigurasi Backend / Railway (Jika menggunakan custom API server)
PORT=5000
NODE_ENV=development
```

### 4. Panduan Deployment Online
- **Frontend (Vercel)**:
  1. Hubungkan repository GitHub `saecar/portfolioo` ke Vercel.
  2. Set Framework Preset ke **Vite / React**.
  3. Masukkan variabel lingkungan (`VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`) pada panel pengaturan Environment Variables di Vercel.
  4. Klik **Deploy**.
- **Backend & Database (Supabase & Railway)**:
  1. Buat proyek baru di [Supabase](https://supabase.com/) dan jalankan migrasi skema SQL untuk tabel `projects` dan `messages`.
  2. Untuk logika backend tambahan (opsional), deploy server Node.js terpisah ke [Railway](https://railway.app/) dengan menghubungkan repository yang sama.

---

## 🚀 Cara Pemasangan & Persiapan

Ikuti langkah-langkah di bawah ini untuk menyiapkan lingkungan pengembangan lokal Anda:

### Prasyarat
Pastikan komputer Anda telah menginstal perangkat lunak berikut:
- **Node.js** (Versi 18.x atau lebih baru)
- **Git**

### Langkah Instalasi

1. **Clone repository ke mesin lokal Anda:**
   ```bash
   git clone https://github.com/saecar/portfolioo.git
   ```

2. **Masuk ke direktori proyek:**
   ```bash
   cd portfolioo
   ```

3. **Install dependensi yang diperlukan:**
   ```bash
   npm install
   ```

4. **Konfigurasi file environment:**
   Salin file contoh environment dan sesuaikan nilainya dengan kredensial Supabase Anda.
   ```bash
   cp .env.example .env
   ```
   *(Buka file `.env` menggunakan teks editor pilihan Anda dan isi variabel yang kosong).*

5. **Jalankan server pengembangan (Development Server):**
   ```bash
   npm run dev
   ```

6. **Buka aplikasi di browser:**
   Akses `http://localhost:5173` untuk melihat hasil aplikasi yang sedang berjalan.

---

## 📂 Struktur Folder

Struktur direktori proyek disusun secara modular untuk memudahkan pemeliharaan kode dan pengembangan lanjutan:

```text
portfolioo/
├── public/                 # Aset statis (favicon, gambar, dll)
├── src/
│   ├── assets/             # Gambar, ikon, dan stylesheet global
│   ├── components/         # Komponen UI modular (Navbar, Footer, ProjectCard, dll)
│   ├── context/            # React Context untuk state management global
│   ├── hooks/              # Custom React Hooks
│   ├── pages/              # Halaman utama aplikasi (Home, About, Projects, Contact, Admin)
│   ├── services/           # Konfigurasi API dan integrasi Supabase client
│   ├── utils/              # Fungsi pembantu / helper functions
│   ├── App.jsx             # Komponen root dengan konfigurasi routing
│   └── main.jsx            # Titik masuk utama aplikasi (DOM mounting)
├── .env.example            # Templat variabel lingkungan
├── .gitignore              # Daftar file yang diabaikan oleh Git
├── package.json            # Daftar dependensi dan skrip npm
├── tailwind.config.js      # Konfigurasi kustom TailwindCSS
└── README.md               # Dokumentasi proyek
```

---

## 🤝 Kontribusi & Lisensi

Kontribusi, isu, dan permintaan fitur (*pull requests*) sangat diterima! 
Silakan buat *issue* terlebih dahulu jika ingin mendiskusikan perubahan besar yang ingin Anda lakukan.

1. Fork Repository ini
2. Buat Branch Fitur Baru (`git checkout -b feature/FiturBaru`)
3. Commit Perubahan Anda (`git commit -m 'Menambahkan Fitur Baru'`)
4. Push ke Branch (`git push origin feature/FiturBaru`)
5. Buka Pull Request

Proyek ini dilisensikan di bawah **MIT License** - lihat file [LICENSE](LICENSE) untuk detail lebih lanjut.