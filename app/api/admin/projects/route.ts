import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { checkAdminSession } from "@/common/libs/admin-auth";
import { createServiceClient } from "@/common/utils/supabase-service";
import { apiError, apiSuccess, logger } from "@/common/libs/logger";

const createProjectSchema = z.object({
  title: z.string().min(2, "Title is required").max(100),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and dashes"),
  description: z.string().min(5, "Description is required").max(1000),
  category: z
    .enum(["iot", "game", "web", "web-frontend", "web-backend", "web-fullstack"])
    .default("web"),
  stacks: z.array(z.string()).default([]),
  image: z.string().optional().nullable(),
  link_demo: z.string().url().or(z.literal("")).nullish(),
  link_github: z.string().url().or(z.literal("")).nullish(),
  content: z.string().optional().nullable(),
  is_show: z.boolean().default(true),
  is_featured: z.boolean().default(false),
});

export async function GET(request: Request) {
  try {
    const auth = await checkAdminSession();
    if (!auth.authorized) {
      return apiError(
        auth.reason === "FORBIDDEN" ? "Access forbidden: admin only" : "Unauthorized",
        auth.reason || "UNAUTHORIZED",
        auth.reason === "FORBIDDEN" ? 403 : 401
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();
    let query = supabase.from("projects").select("*", { count: "exact" });

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data, error, count } = await query
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error("Supabase error fetching admin projects", error);
      return apiError(error.message, "DATABASE_ERROR", 500);
    }

    return apiSuccess(data || [], {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err: any) {
    logger.error("Admin projects GET failed", err);
    return apiError(err.message, "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await checkAdminSession();
    if (!auth.authorized) {
      return apiError(
        auth.reason === "FORBIDDEN" ? "Access forbidden: admin only" : "Unauthorized",
        auth.reason || "UNAUTHORIZED",
        auth.reason === "FORBIDDEN" ? 403 : 401
      );
    }

    const body = await request.json();
    const parseResult = createProjectSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError(
        parseResult.error.issues[0]?.message || "Validation failed",
        "VALIDATION_ERROR",
        400
      );
    }

    const projectData = {
      ...parseResult.data,
      link_demo: parseResult.data.link_demo || null,
      link_github: parseResult.data.link_github || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("projects")
      .insert([projectData])
      .select()
      .single();

    if (error) {
      logger.error("Supabase insert project error", error);
      return apiError(error.message, "DATABASE_ERROR", 500);
    }

    // Revalidate paths and tags
    revalidatePath("/projects");
    revalidateTag("projects");

    logger.info(`Project created: ${projectData.slug} by ${auth.session?.user?.email}`);
    return apiSuccess(data, { message: "Project created successfully" }, 201);
  } catch (err: any) {
    logger.error("Admin projects POST failed", err);
    return apiError(err.message, "INTERNAL_ERROR", 500);
  }
}
