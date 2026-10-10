import { NextResponse } from "next/server";
import sharp from "sharp";
import { checkAdminSession } from "@/common/libs/admin-auth";
import { createServiceClient } from "@/common/utils/supabase-service";
import { apiError, apiSuccess, logger } from "@/common/libs/logger";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const slug = formData.get("slug") as string | null;

    if (!file) {
      return apiError("No file provided", "BAD_REQUEST", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError("File size exceeds 2MB limit", "FILE_TOO_LARGE", 400);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return apiError("Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.", "INVALID_MIME", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Resize and optimize with Sharp
    const optimizedBuffer = await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const fileName = slug
      ? `${slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "")}.webp`
      : `project_${Date.now()}.webp`;

    const supabase = createServiceClient();

    // Upload to Supabase Storage 'projects' bucket
    const { error: uploadError } = await supabase.storage
      .from("projects")
      .upload(fileName, optimizedBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      logger.error("Failed uploading image to Supabase Storage", uploadError);
      return apiError(uploadError.message, "STORAGE_ERROR", 500);
    }

    const { data: publicUrlData } = supabase.storage
      .from("projects")
      .getPublicUrl(fileName);

    logger.info(`Image uploaded for ${fileName} by ${auth.session?.user?.email}`);

    return apiSuccess({
      url: publicUrlData.publicUrl,
      fileName,
      size: optimizedBuffer.length,
    });
  } catch (err: any) {
    logger.error("Admin upload failed", err);
    return apiError(err.message, "INTERNAL_ERROR", 500);
  }
}
