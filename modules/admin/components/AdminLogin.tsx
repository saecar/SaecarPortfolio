"use client";

import React from "react";
import { signIn } from "next-auth/react";

interface AdminLoginProps {
  isForbidden?: boolean;
  email?: string | null;
}

export default function AdminLogin({ isForbidden, email }: AdminLoginProps) {
  if (isForbidden) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 shadow-sm dark:border-red-900/30 dark:bg-neutral-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
            ⛔
          </div>
          <h2 className="mt-4 text-xl font-bold text-neutral-900 dark:text-neutral-100">
            Access Forbidden (403)
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Logged in as <strong className="text-neutral-900 dark:text-neutral-200">{email}</strong>, but this account is not in the authorized ADMIN_EMAILS allowlist.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <a
              href="/"
              className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Back to Home
            </a>
            <button
              onClick={() => signIn()}
              className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-neutral-900 hover:bg-amber-300"
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
          🔐
        </div>
        <h2 className="mt-4 text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Admin Portal Authentication
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Please sign in with an authorized administrator account to manage projects.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => signIn("google")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 active:scale-95 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <span>Continue with Google</span>
          </button>
          <button
            onClick={() => signIn("github")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 active:scale-95 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            <span>Continue with GitHub</span>
          </button>
        </div>
      </div>
    </div>
  );
}
