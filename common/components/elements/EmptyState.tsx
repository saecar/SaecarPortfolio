import React from "react";
import Link from "next/link";
import { TbMoodSadSquint as MoodIcon } from "react-icons/tb";

interface EmptyStateProps {
  title?: string;
  message: string;
  actionText?: string;
  actionHref?: string;
  onActionClick?: () => void;
  className?: string;
}

export const EmptyState = ({
  title,
  message,
  actionText,
  actionHref,
  onActionClick,
  className = "",
}: EmptyStateProps) => {
  return (
    <div
      className={`flex flex-col items-center justify-center space-y-3 py-10 text-center text-neutral-500 dark:text-neutral-400 ${className}`}
    >
      <div className="rounded-full bg-neutral-100 p-3 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
        <MoodIcon size={40} />
      </div>
      {title && (
        <h4 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
          {title}
        </h4>
      )}
      <p className="max-w-sm text-sm">{message}</p>
      {actionText && (
        <div className="pt-2">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1 rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-neutral-900 shadow-sm transition hover:bg-amber-300 active:scale-95"
            >
              {actionText}
            </Link>
          ) : onActionClick ? (
            <button
              onClick={onActionClick}
              className="inline-flex items-center gap-1 rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-neutral-900 shadow-sm transition hover:bg-amber-300 active:scale-95"
            >
              {actionText}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
