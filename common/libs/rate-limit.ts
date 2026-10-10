import { NextRequest, NextResponse } from "next/server";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Cleanup stale memory records periodically
setInterval(() => {
  const now = Date.now();
  memoryStore.forEach((record, key) => {
    if (now > record.resetTime) {
      memoryStore.delete(key);
    }
  });
}, 60000);

export function getClientIp(req: NextRequest | Request): string {
  if ("headers" in req) {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
  }
  return "127.0.0.1";
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions = { limit: 10, windowMs: 60000 },
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetTime) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + options.windowMs,
    };
    memoryStore.set(key, newRecord);
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      reset: Math.ceil(options.windowMs / 1000),
    };
  }

  if (record.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      reset: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  record.count += 1;
  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - record.count,
    reset: Math.ceil((record.resetTime - now) / 1000),
  };
}

export function createRateLimitResponse(resetSec: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(resetSec),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
