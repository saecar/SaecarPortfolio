import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { checkAdminSession } from "@/common/libs/admin-auth";
import { createServiceClient } from "@/common/utils/supabase-service";
import { apiError, apiSuccess, logger } from "@/common/libs/logger";

const updateProjectSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  description: z.string().min(5).max(1000).optional(),
  category: z
    .enum(["iot", "game", "web", "web-frontend", "web-backend", "web-fullstack"])
    .optional(),
  stacks: z.array(z.string()).optional(),
  image: z.string().optional().nullable(),
  link_demo: z.string().url().or(z.literal("")).nullish(),
  link_github: z.string().url().or(z.literal("")).nullish(),
  content: z.string().optional().nullable(),
  is_show: z.boolean().optional(),
  is_featured: z.boolean().optional(),
});

interface RouteParams {
  params: {
    slug: string;
  };
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const auth = await checkAdminSession();
    if (!auth.authorized) {
      return apiError(
        auth.reason === "FORBIDDEN" ? "Access forbidden: admin only" : "Unauthorized",
        auth.reason || "UNAUTHORIZED",
        auth.reason === "FORBIDDEN" ? 403 : 401
      );
    }

    const { slug } = params;
    const body = await request.json();
    const parseResult = updateProjectSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError(
        parseResult.error.issues[0]?.message || "Validation failed",
        "VALIDATION_ERROR",
        400
      );
    }

    const updateData: Record<string, any> = {
      ...parseResult.data,
      updated_at: new Date().toISOString(),
    };

    if (parseResult.data.link_demo !== undefined) {
      updateData.link_demo = parseResult.data.link_demo || null;
    }
    if (parseResult.data.link_github !== undefined) {
      updateData.link_github = parseResult.data.link_github || null;
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("projects")
      .update(updateData)
      .eq("slug", slug)
      .select()
      .single();

    if (error) {
      logger.error(`Supabase update error for ${slug}`, error);
      return apiError(error.message, "DATABASE_ERROR", 500);
    }

    revalidatePath("/projects");
    revalidatePath(`/projects/${slug}`);
    revalidateTag("projects");

    logger.info(`Project updated: ${slug} by ${auth.session?.user?.email}`);
    return apiSuccess(data, { message: "Project updated successfully" });
  } catch (err: any) {
    logger.error("Admin project PUT failed", err);
    return apiError(err.message, "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const auth = await checkAdminSession();
    if (!auth.authorized) {
      return apiError(
        auth.reason === "FORBIDDEN" ? "Access forbidden: admin only" : "Unauthorized",
        auth.reason || "UNAUTHORIZED",
        auth.reason === "FORBIDDEN" ? 403 : 401
      );
    }

    const { slug } = params;
    const { searchParams } = new URL(request.url);
    const isHard = searchParams.get("hard") === "true";

    const supabase = createServiceClient();

    if (isHard) {
      const { error } = await supabase.from("projects").delete().eq("slug", slug);
      if (error) {
        logger.error(`Hard delete failed for ${slug}`, error);
        return apiError(error.message, "DATABASE_ERROR", 500);
      }
      logger.warn(`Project hard deleted: ${slug} by ${auth.session?.user?.email}`);
    } else {
      // Soft delete: is_show = false
      const { error } = await supabase
        .from("projects")
        .update({ is_show: false, updated_at: new Date().toISOString() })
        .eq("slug", slug);
      if (error) {
        logger.error(`Soft delete failed for ${slug}`, error);
        return apiError(error.message, "DATABASE_ERROR", 500);
      }
      logger.info(`Project soft deleted (hidden): ${slug} by ${auth.session?.user?.email}`);
    }

    revalidatePath("/projects");
    revalidatePath(`/projects/${slug}`);
    revalidateTag("projects");

    return apiSuccess({ slug, deleted: true, hard: isHard });
  } catch (err: any) {
    logger.error("Admin project DELETE failed", err);
    return apiError(err.message, "INTERNAL_ERROR", 500);
  }
}
