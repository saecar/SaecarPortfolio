# satriabahari.my.id (Portfolio v3.1)

> Production-grade personal portfolio and engineering showcase built with Next.js 14 App Router, TypeScript, Tailwind CSS, Framer Motion, and Supabase.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14.1-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

---

## 🌟 Key Features

- ⚡ **High-Performance Architecture**: Zero legacy bloat (no GSAP/Lenis/AOS), unified Framer Motion animation engine, route-level code splitting, responsive blur image placeholders, and incremental static regeneration (ISR).
- 🛡️ **Robust Security**: Strict Content Security Policy (CSP), automated rate limiting (sliding window memory store), Zod input validation, DOMPurify HTML sanitization, build-time environment checks, and Supabase Row Level Security (RLS).
- 🎛️ **Admin UI Dashboard**: Fully protected graphical admin portal (`/admin`) for project CRUD, image uploads with Sharp optimization, and GitHub synchronization.
- 🌐 **Internationalization (i18n)**: Seamless multi-language support (`en` and `id`) powered by `next-intl`.
- 📦 **Automated Backups**: Point-in-time recovery via daily automated database dumps to JSON artifacts and simple one-command restore.
- 🔍 **Automated SEO**: Dynamic `sitemap.xml` and `robots.txt` generation with JSON-LD structured data and OpenGraph tags.
- 🎨 **Design System & a11y**: Token-based spacing & typography, smooth page transitions, system preference dark/light mode persistence, and WCAG accessibility standards.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Database & Storage**: [Supabase](https://supabase.com/) (PostgreSQL & Storage Buckets)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (Google & GitHub OAuth)
- **Internationalization**: [next-intl](https://next-intl-docs.vercel.app/)
- **Package Manager / Runtime**: [Bun](https://bun.sh/) or [Node.js](https://nodejs.org/)

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18.17+
- A [Supabase](https://supabase.com/) project with the schema configured from `supabase/schema.sql`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/saecar/portfolioo.git
   cd portfolioo
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase credentials, NextAuth secrets, and admin email allowlist:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   NEXTAUTH_SECRET=your-32-character-secret
   NEXTAUTH_URL=http://localhost:3000

   ADMIN_EMAILS=your-email@example.com
   ```

4. **Run development server:**
   ```bash
   bun run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the portfolio.

---

## 📋 Available Scripts

| Command | Description |
| :--- | :--- |
| `bun run dev` | Starts local Next.js development server |
| `bun run build` | Builds optimized production bundle |
| `bun run start` | Starts production server |
| `bun run lint` | Runs ESLint validation |
| `bun run analyze` | Runs bundle analyzer (`@next/bundle-analyzer`) |
| `bun run generate:blur` | Generates blur base64 placeholders for project images |
| `bun run backup` | Dumps Supabase projects table to `backups/projects-YYYY-MM-DD.json` |
| `bun run backup:restore` | Restores database from `backups/latest.json` or custom file |

---

## 📦 Database Backup & Restore

### Creating a Backup
Run the backup script manually:
```bash
bun run backup
```
This saves a timestamped JSON file to the `backups/` directory and creates `backups/latest.json`. Daily automated backups are also scheduled via GitHub Actions (`.github/workflows/backup.yml`).

### Restoring from Backup
To restore data into Supabase:
```bash
# Restore from backups/latest.json
bun run backup:restore

# Or restore from a specific snapshot:
bun run backup:restore backups/projects-2026-10-10.json
```

---

## 🔒 Security Policy

- **Content Security Policy**: Configured in `next.config.mjs` restricting unauthorized script execution.
- **Rate Limiting**: In-memory rate limiting protects contact forms, chat endpoints, and webhook triggers.
- **Admin Access**: Access to `/admin` is restricted to authorized emails specified in `ADMIN_EMAILS`.
- **Database Rules**: Supabase Row Level Security (RLS) ensures public clients can only read published (`is_show = true`) projects.

---

## 📄 License

Distributed under the [MIT License](LICENSE).