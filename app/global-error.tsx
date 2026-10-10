"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[Global Error]:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 font-sans text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <div className="flex max-w-md flex-col items-center space-y-4 text-center">
          <div className="rounded-full bg-red-100 p-4 text-red-600 dark:bg-red-950/50 dark:text-red-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">System Error</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            A critical system error occurred. Our team has been notified.
          </p>
          <button
            onClick={() => reset()}
            className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 active:scale-95 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
