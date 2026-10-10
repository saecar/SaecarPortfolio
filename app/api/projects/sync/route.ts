import { NextResponse } from "next/server";
import { createServiceClient } from "@/common/utils/supabase-service";
import { detectCategory } from "@/common/libs/detect-category";
import { generateReadme } from "@/common/libs/readme-template";
import crypto from "crypto";
import axios from "axios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeSlug(slug: string): string {
  const clean = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!clean || clean.length < 2 || clean.length > 60) {
    throw new Error("Invalid slug after sanitization");
  }
  return clean;
}

import { checkRateLimit, createRateLimitResponse, getClientIp } from "@/common/libs/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`sync_${ip}`, { limit: 10, windowMs: 60000 });
    if (!rateCheck.success) {
      return createRateLimitResponse(rateCheck.reset);
    }

    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    const syncSecret = process.env.SYNC_SECRET;

    if (!webhookSecret || !syncSecret) {
      return NextResponse.json(
        { message: "Server misconfigured: missing secrets" },
        { status: 500 }
      );
    }

    const rawBody = await request.text();

    // HMAC hex verify — GitHub sends sha256=<hex>
    const signature = request.headers.get("x-hub-signature-256");
    if (!signature) {
      return NextResponse.json({ message: "Missing X-Hub-Signature-256" }, { status: 401 });
    }
    const [algo, expectedHex] = signature.split("=");
    if (algo !== "sha256" || !expectedHex) {
      return NextResponse.json({ message: "Unsupported algo" }, { status: 400 });
    }
    const hmac = crypto.createHmac("sha256", webhookSecret).update(rawBody, "utf8").digest("hex");
    if (hmac.length !== expectedHex.length) {
      return NextResponse.json({ message: "Invalid webhook signature" }, { status: 401 });
    }
    const safe = crypto.timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(expectedHex, "hex"));
    if (!safe) {
      return NextResponse.json({ message: "Invalid webhook signature" }, { status: 401 });
    }

    // Bearer verify — lapis 2
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ") || auth.slice(7) !== syncSecret) {
      return NextResponse.json({ message: "Invalid sync secret" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    // Support both GitHub webhook shape (repository) dan custom {repo, slug}
    const repoFullName: string = payload.repository?.full_name || payload.repo || "";
    const repoName: string = payload.repository?.name || payload.name || repoFullName.split("/")[1] || "";
    const rawSlug: string = payload.slug || repoName;
    const topics: string[] = payload.repository?.topics || payload.topics || [];

    if (!repoFullName || !rawSlug) {
      return NextResponse.json({ message: "Missing repo or slug payload" }, { status: 400 });
    }

    // Filter: hanya topic portfolio
    if (!topics.includes("portfolio")) {
      return NextResponse.json({ message: "Repo not marked with topic 'portfolio', skipped" }, { status: 403 });
    }

    const cleanSlug = sanitizeSlug(rawSlug);

    // Auto-detect category dari topics + packageJson jika ada
    let detectedCategory = payload.category as ReturnType<typeof detectCategory> | undefined;
    if (!detectedCategory || !["iot", "game", "web", "web-frontend", "web-backend", "web-fullstack"].includes(detectedCategory)) {
      detectedCategory = detectCategory({
        topics,
        name: repoName,
        files: payload.files || [],
        packageJson: payload.packageJson,
      });
    }

    // Generate README + description via Gemini (with fallback)
    const { description, readme } = await generateReadme({
      repo: repoName,
      slug: cleanSlug,
      category: detectedCategory,
      topics,
      name: repoName,
    });

    // Upsert Supabase — include new columns when migrated, graceful fallback if not yet
    const supa = createServiceClient();
    const baseRow: Record<string, unknown> = {
      slug: cleanSlug,
      title: repoName,
      description,
      stacks: payload.stacks || [],
      content: readme,
      is_show: true,
    };
    const fullRow: Record<string, unknown> = {
      ...baseRow,
      category: detectedCategory,
      auto_generated: true,
      source_repo: repoFullName,
      last_synced_at: new Date().toISOString(),
    };
    const tryUpsert = async (row: Record<string, unknown>) => {
      const { error } = await supa.from("projects").upsert(row, { onConflict: "slug" }).select();
      if (error) throw new Error(error.message);
    };
    try {
      await tryUpsert(fullRow);
    } catch (e: any) {
      if (e.message?.includes("column") || e.message?.includes("category") || e.message?.includes("auto_generated")) {
        console.warn(`[sync] fullRow failed (${e.message}), retry baseRow`);
        await tryUpsert(baseRow);
      } else throw e;
    }

    // Push MDX ke portfolio repo via GitHub Contents API (bukan fs.write — serverless read-only)
    const portfolioToken = process.env.PORTFOLIO_GITHUB_TOKEN || process.env.GITHUB_READ_USER_TOKEN_PERSONAL;
    const portfolioRepo = process.env.PORTFOLIO_REPO || "satriabahari/satriabahari.my.id";

    if (portfolioToken) {
      const mdxPath = `contents/projects/${cleanSlug}.mdx`;
      let sha: string | undefined;
      try {
        const check = await axios.get(`https://api.github.com/repos/${portfolioRepo}/contents/${mdxPath}`, {
          headers: { Authorization: `token ${portfolioToken}`, Accept: "application/vnd.github.v3+json" },
        });
        sha = check.data.sha;
      } catch (e: any) {
        if (e.response?.status !== 404) console.error("[sync] check MDX error:", e.message);
      }

      const mdxBody = readme; // readme already markdown valid for MDX

      await axios.put(
        `https://api.github.com/repos/${portfolioRepo}/contents/${mdxPath}`,
        {
          message: `chore(projects): sync ${cleanSlug} [${detectedCategory}]`,
          content: Buffer.from(mdxBody, "utf8").toString("base64"),
          ...(sha ? { sha } : {}),
        },
        {
          headers: { Authorization: `token ${portfolioToken}`, Accept: "application/vnd.github.v3+json" },
        }
      );
    } else {
      console.warn("[sync] PORTFOLIO_GITHUB_TOKEN missing — MDX push skipped");
    }

    return NextResponse.json({
      success: true,
      slug: cleanSlug,
      category: detectedCategory,
      description,
      message: "Project synced, portfolio updated, README generated",
    });
  } catch (err: any) {
    console.error("[sync] error:", err?.message || err);
    return NextResponse.json({ message: "Internal Server Error", error: err.message }, { status: 500 });
  }
}
