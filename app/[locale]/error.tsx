"use client";

import { useEffect } from "react";
import { BiRefresh } from "react-icons/bi";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log client-side error to console
    console.error("[App Error Boundary caught]:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 px-4 text-center">
      <div className="rounded-full bg-red-500/10 p-4 text-red-500 dark:bg-red-500/20">
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
      <h2 className="text-xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100 sm:text-2xl">
        Something went wrong!
      </h2>
      <p className="max-w-md text-sm text-neutral-600 dark:text-neutral-400">
        An unexpected error occurred while loading this page. Please try refreshing or return back later.
      </p>
      <div className="pt-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 active:scale-95 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          <BiRefresh className="text-lg" />
          <span>Try again</span>
        </button>
      </div>
    </div>
  );
}
