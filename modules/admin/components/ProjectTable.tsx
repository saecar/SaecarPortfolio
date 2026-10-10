"use client";

import React from "react";
import { AdminProject } from "../types";

interface ProjectTableProps {
  projects: AdminProject[];
  isLoading: boolean;
  onEdit: (project: AdminProject) => void;
  onDelete: (project: AdminProject) => void;
  onToggleVisibility: (project: AdminProject) => void;
}

export default function ProjectTable({
  projects,
  isLoading,
  onEdit,
  onDelete,
  onToggleVisibility,
}: ProjectTableProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <span className="text-sm text-neutral-500">Loading projects...</span>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
          No projects found
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          Try clearing search filters or create a new project.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-neutral-700 dark:text-neutral-300">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
            <tr>
              <th scope="col" className="px-4 py-3">Project</th>
              <th scope="col" className="px-4 py-3">Category</th>
              <th scope="col" className="px-4 py-3">Stacks</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {projects.map((item) => (
              <tr
                key={item.slug}
                className="transition hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40"
              >
                {/* Project Info & Thumb */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-16 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                          No img
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {item.title}
                      </p>
                      <p className="text-xs text-neutral-500 font-mono">
                        /{item.slug}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td className="px-4 py-3">
                  <span className="inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    {item.category || "web"}
                  </span>
                </td>

                {/* Stacks */}
                <td className="px-4 py-3">
                  <div className="flex max-w-[200px] flex-wrap gap-1">
                    {(item.stacks || []).slice(0, 3).map((st) => (
                      <span
                        key={st}
                        className="rounded px-1.5 py-0.5 text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                      >
                        {st}
                      </span>
                    ))}
                    {(item.stacks || []).length > 3 && (
                      <span className="text-[10px] text-neutral-500 self-center">
                        +{(item.stacks || []).length - 3}
                      </span>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleVisibility(item)}
                      title="Click to toggle visibility"
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium transition ${
                        item.is_show
                          ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.is_show ? "bg-emerald-500" : "bg-neutral-400"
                        }`}
                      />
                      {item.is_show ? "Visible" : "Hidden"}
                    </button>
                    {item.is_featured && (
                      <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        ★
                      </span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
