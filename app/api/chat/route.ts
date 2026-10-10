import { createClient } from "@/common/utils/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";
import { checkRateLimit, createRateLimitResponse, getClientIp } from "@/common/libs/rate-limit";
import { generateRequestId, logger } from "@/common/libs/logger";

const chatSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(1000, "Message too long"),
  author: z.string().max(100).optional(),
  name: z.string().max(100).optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional(),
});

export const GET = async () => {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.from("messages").select();
    if (error) {
      console.error("Supabase GET messages error:", error);
      return NextResponse.json([], { status: 200 });
    }
    return NextResponse.json(data || [], { status: 200 });
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
};

export const POST = async (req: Request) => {
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`chat_${ip}`, { limit: 20, windowMs: 60000 });
  if (!rateCheck.success) {
    return createRateLimitResponse(rateCheck.reset);
  }

  const supabase = createClient();
  try {
    const rawBody = await req.json();
    const parseResult = chatSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: parseResult.error.issues[0]?.message || "Validation failed",
          errors: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { message, author, name, email, image } = parseResult.data;
    const sanitizedPayload = {
      message: DOMPurify.sanitize(message),
      name: name ? DOMPurify.sanitize(name) : author ? DOMPurify.sanitize(author) : "Anonymous",
      email: email || null,
      image: image || null,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("messages").insert([sanitizedPayload]);
    if (error) {
      console.error("Supabase insert message error:", error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: "Data saved successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 },
    );
  }
};