"use client";

import React, { useState } from "react";
import { AdminProject } from "../types";

interface ConfirmDeleteModalProps {
  project: AdminProject | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (slug: string, isHard: boolean) => Promise<void>;
}

export default function ConfirmDeleteModal({
  project,
  isOpen,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const [isHard, setIsHard] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !project) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(project.slug, isHard);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          Delete Project
        </h3>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Are you sure you want to delete{" "}
          <strong className="text-neutral-900 dark:text-white">
            {project.title}
          </strong>
          ?
        </p>

        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isHard}
              onChange={(e) => setIsHard(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-neutral-700 dark:text-neutral-300">
              Hard delete permanently from database
            </span>
          </label>
          <p className="mt-1 pl-7 text-xs text-neutral-500">
            {isHard
              ? "⚠️ Warning: This will permanently erase the project from database."
              : "Soft delete will simply hide the project (is_show = false)."}
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition ${
              isHard
                ? "bg-red-600 hover:bg-red-700"
                : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {isSubmitting ? "Deleting..." : isHard ? "Hard Delete" : "Soft Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
