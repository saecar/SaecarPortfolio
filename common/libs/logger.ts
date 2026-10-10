import { NextResponse } from "next/server";

export type LogLevel = "info" | "warn" | "error" | "debug";

const SENSITIVE_KEYS = [
  "token",
  "secret",
  "key",
  "password",
  "authorization",
  "cookie",
  "service_role",
];

function redactSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    // Redact tokens that look like bearer tokens or jwt
    if (obj.length > 24 && (obj.startsWith("Bearer ") || obj.startsWith("eyJ"))) {
      return "[REDACTED]";
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }
  if (typeof obj === "object") {
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.some((sensitive) => k.toLowerCase().includes(sensitive))) {
        sanitized[k] = "[REDACTED]";
      } else {
        sanitized[k] = redactSensitiveData(v);
      }
    }
    return sanitized;
  }
  return obj;
}

export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    const ctx = context ? ` ${JSON.stringify(redactSensitiveData(context))}` : "";
    console.log(`[INFO] [${new Date().toISOString()}] ${message}${ctx}`);
  },
  warn: (message: string, context?: Record<string, any>) => {
    const ctx = context ? ` ${JSON.stringify(redactSensitiveData(context))}` : "";
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}${ctx}`);
  },
  error: (message: string, error?: any, context?: Record<string, any>) => {
    const errMessage = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error || {});
    const ctx = context ? ` Context: ${JSON.stringify(redactSensitiveData(context))}` : "";
    console.error(`[ERROR] [${new Date().toISOString()}] ${message} - ${errMessage}${ctx}`);
  },
};

export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, any>;
  requestId: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
}

export function apiSuccess<T>(
  data: T,
  meta?: Record<string, any>,
  status = 200,
  requestId = generateRequestId()
) {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
    requestId,
  };
  return NextResponse.json(body, {
    status,
    headers: {
      "X-Request-Id": requestId,
    },
  });
}

export function apiError(
  message: string,
  code = "INTERNAL_SERVER_ERROR",
  status = 500,
  requestId = generateRequestId()
) {
  // Never expose raw stack trace to clients
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
    requestId,
  };
  return NextResponse.json(body, {
    status,
    headers: {
      "X-Request-Id": requestId,
    },
  });
}
