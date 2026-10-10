import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export function getAdminEmails(): string[] {
  const envVal = process.env.ADMIN_EMAILS || "";
  return envVal
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  // If no admin emails set in dev mode, optionally allow or keep strict
  if (adminEmails.length === 0) {
    if (process.env.NODE_ENV === "development") {
      return true; // convenient for local dev testing
    }
    return false;
  }
  return adminEmails.includes(email.toLowerCase().trim());
}

export async function checkAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return { authorized: false, session: null, reason: "UNAUTHENTICATED" };
  }

  const isAllowed = isAdminEmail(session.user.email);
  if (!isAllowed) {
    return { authorized: false, session, reason: "FORBIDDEN" };
  }

  return { authorized: true, session, reason: null };
}
