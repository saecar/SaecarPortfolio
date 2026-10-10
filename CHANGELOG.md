# Changelog

All notable changes to **satriabahari.my.id** are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.1.0] - 2026-10-10

### 🛡️ Security (Pilar 1)
- **SEC-01 (Strict Security Headers)**: Added production-grade HTTP security headers to `next.config.mjs`, including Content Security Policy (`default-src 'self'`, strict script/style/font origins), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and HTTP Strict Transport Security (`HSTS`).
- **SEC-02 (Rate Limiting)**: Implemented in-memory rate limiting with sliding windows and automated memory cleanup (`common/libs/rate-limit.ts`). Applied rate limiting across all API endpoints:
  - `/api/email`: 5 requests / 60 seconds
  - `/api/chat`: 20 requests / 60 seconds
  - `/api/projects/sync`: 10 requests / 60 seconds
  - Response headers include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After`.
- **SEC-03 (Input Validation & Sanitization)**: Integrated `zod` schema validation and `isomorphic-dompurify` HTML sanitization across email and chat routes. Sanitized link protocols in `MDXComponent.tsx` (blocking `javascript:` and `data:` schemes, enforcing `rel="noopener noreferrer"`). Sanitized template outputs in `readme-template.ts`.
- **SEC-04 (Supabase RLS & Service Role Hardening)**: Enforced Row Level Security on `public.projects` and `public.audit_logs`. Safeguarded against client leakage of `SUPABASE_SERVICE_ROLE_KEY` in `common/utils/supabase-service.ts`.
- **SEC-05 (Authentication Hardening)**: Fixed typo `GoolgeProvider` -> `GoogleProvider`. Centralized NextAuth options in `common/libs/auth.ts` with typed callbacks (`signIn`, `session`, `jwt`) and warning against weak production secrets.
- **SEC-06 (Build-time Env Validation)**: Created `common/libs/env.ts` with Zod schema validating required environment variables.

### ⚡ Performance (Pilar 3)
- **PERF-01 (Bundle Diet)**: Removed unused legacy dependencies (`firebase`, `@firebase/firestore`, `ogl`, `@emotion/react`, `@emotion/styled`). Replaced CSS-in-JS in `MobileMenuButton.tsx` with pure Tailwind CSS.
- **PERF-02 (Font Optimization)**: Optimized Google Fonts (`fonts.ts`) by dropping unused weights (300 & 800), retaining 400–700 with `display: "swap"` and system fallback stacks.
- **PERF-03 (Icon Tree-Shaking)**: Created `common/constants/icons.ts` barrel from `react-icons/si` and refactored `stacks.tsx` to a unified icon pack.
- **PERF-04 (Code Splitting)**: Dynamically imported heavy dashboard components (`Umami`, `Contributions`, `CodingActive`, `Codewars`) with suspense skeletons in `modules/dashboard/components/Dashboard.tsx`. Converted Chart.js to dynamic client loading (`ssr: false`).
- **PERF-05 (Unified Animation Engine)**: Replaced GSAP, Lenis, and AOS entirely with Framer Motion and lightweight CSS animations:
  - Created `MagicBentoFM.tsx` (pure Framer Motion replacement for `MagicBento.tsx`).
  - Rewrote `ScrambleText.tsx` using `requestAnimationFrame` and pointer events.
  - Rewrote `ScrollStack.tsx` using passive scroll listener and CSS scroll-driven animation fallbacks.
  - Replaced AOS with hardware-accelerated `@keyframes fadeInUp` in `app/globals.css`.
- **PERF-06 (Image Blur Placeholders)**: Added responsive `sizes`, blur placeholders, and quality tuning to `ProjectCard.tsx` and `ProfileHeader.tsx`. Created automated script `scripts/generate-blur.ts`.
- **PERF-07 (Caching & ISR)**: Enforced static rendering on `/projects`, set `revalidate = 300` and CDN cache-control headers on `/api/projects`.
- **PERF-09 (Bundle Analyzer & CI)**: Configured `@next/bundle-analyzer` (`bun run analyze`), Lighthouse CI (`lighthouserc.json`), and GitHub Actions workflow (`.github/workflows/perf.yml`).

### 🏛️ System & Architecture (Pilar 2)
- **SYS-01 (Admin UI CRUD)**: Built a comprehensive protected administrative dashboard (`/admin` and `/admin/projects`) replacing terminal-only workflow.
  - Protected via `getServerSession` and allowlist check against `ADMIN_EMAILS`.
  - Project search, category filtering, and pagination.
  - Create and Edit modal forms with slug auto-generation and tech stack multi-select.
  - Soft-delete (`is_show = false`) and confirmed hard-delete options.
  - Server-side image upload via `/api/admin/upload` with Sharp resizing and direct upload to Supabase Storage.
  - "Sync from GitHub" trigger button calling `/api/projects/sync`.
  - Automatic cache revalidation (`revalidatePath` & `revalidateTag`).
- **SYS-02 (Automated Backup & Restore)**: Created `scripts/backup-supabase.ts` for database dumps to `backups/projects-YYYY-MM-DD.json` and restore via `bun run backup:restore`. Configured daily GitHub Actions backup cron workflow (`.github/workflows/backup.yml`).
- **SYS-03 (Feature Flag System)**: Implemented feature flags system (`common/constants/features.ts` and `common/libs/feature-flags.ts`) supporting `NEXT_PUBLIC_FEATURE_*` variables for toggling components and scripts.
- **SYS-04 (Centralized Logging & Error Boundaries)**: Created structured logger with secret redaction (`common/libs/logger.ts`), standardized API response helpers (`apiSuccess`, `apiError`) with unique `X-Request-Id` headers. Added root error boundary (`app/global-error.tsx`) and localized error boundary (`app/[locale]/error.tsx`).
- **SYS-05 (Single Source of Truth Consolidation)**: Established Supabase as SSOT for projects metadata and MDX content, with local markdown as graceful fallback.
- **SYS-06 (Dynamic Sitemap & SEO)**: Automated `app/sitemap.ts` (multi-language routes + dynamic project pages) and `app/robots.ts` (disallowing admin/api, pointing to sitemap). Added JSON-LD structured data and OpenGraph tags to project detail pages.

### 🎨 Aesthetics & UX (Pilar 4)
- **AES-01 (Design Tokens & Primitives)**: Defined design system tokens in `common/styles/design-tokens.ts`. Created reusable primitive components: `Text`, `Heading`, and `Stack`. Added semantic colors to `tailwind.config.ts`.
- **AES-02 (Animation Policy)**: Removed intrusive glitch animations from `tailwind.config.ts`. Retained clean shine, gradient, and star-movement animations. Added `@media (prefers-reduced-motion: reduce)` support in `app/globals.css`.
- **AES-03 (Hero Section Redesign)**: Redesigned `Introduction.tsx` into an asymmetric 2-column layout on desktop, featuring prominent action CTAs ("View Projects", "Contact Me"), a stats bar ("10+ Projects • 25+ Tech Stacks • 3+ Years Exp"), and an interactive core skills showcase.
- **AES-04 (16:9 Project Cards & Fallbacks)**: Enforced uniform 16:9 aspect ratio on `ProjectCard.tsx` with object-cover, elegant blur placeholder, error fallback cards, non-overlapping status badges, and smooth backdrop-blur hover overlay.
- **AES-05 (Universal Skeletons & Empty States)**: Created universal `SkeletonCard`, `SkeletonText`, and `SkeletonImage`. Enhanced `EmptyState.tsx` with titles and actionable CTA buttons (e.g. "Clear Filter").
- **AES-06 (Page Transitions)**: Implemented smooth page transitions without layout flashes via `PageTransition.tsx` powered by Framer Motion.
- **AES-07 (Accessibility Pass)**: Added accessible "Skip to content" link, `id="main-content"` landmark, and `aria-label` attributes to theme toggles, mobile menu, and interactive buttons.
- **AES-08 (Theme Persistence & System Preference)**: Configured `next-themes` to support system preference (`defaultTheme="system"`) with seamless persistence in local storage and SSR synchronization.
