"use client";

import React, { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import ProjectTable from "./ProjectTable";
import ProjectFormModal from "./ProjectFormModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { AdminProject, CategoryOption } from "../types";

interface AdminDashboardProps {
  userEmail: string;
}

const CATEGORIES: { label: string; value: CategoryOption }[] = [
  { label: "All Categories", value: "all" },
  { label: "Web", value: "web" },
  { label: "Frontend", value: "web-frontend" },
  { label: "Backend", value: "web-backend" },
  { label: "Fullstack", value: "web-fullstack" },
  { label: "IoT", value: "iot" },
  { label: "Game", value: "game" },
];

export default function AdminDashboard({ userEmail }: AdminDashboardProps) {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryOption>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<AdminProject | null>(null);
  const [deleteProject, setDeleteProject] = useState<AdminProject | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [alertBanner, setAlertBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (search) params.set("search", search);
      if (category !== "all") params.set("category", category);

      const res = await fetch(`/api/admin/projects?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setProjects(json.data || []);
        setTotalPages(json.meta?.totalPages || 1);
        setTotalCount(json.meta?.total || 0);
      } else {
        setAlertBanner({ type: "error", message: json.error?.message || "Failed to load projects" });
      }
    } catch {
      setAlertBanner({ type: "error", message: "Network error loading projects" });
    } finally {
      setIsLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSyncGitHub = async () => {
    setIsSyncing(true);
    setAlertBanner(null);
    try {
      const res = await fetch("/api/projects/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manual: true }),
      });
      const json = await res.json();
      if (res.ok) {
        setAlertBanner({ type: "success", message: "GitHub projects synchronized successfully!" });
        fetchProjects();
      } else {
        setAlertBanner({ type: "error", message: json.message || "Sync failed" });
      }
    } catch {
      setAlertBanner({ type: "error", message: "Failed to connect to sync endpoint" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleVisibility = async (project: AdminProject) => {
    try {
      const res = await fetch(`/api/admin/projects/${project.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_show: !project.is_show }),
      });
      if (res.ok) {
        fetchProjects();
      }
    } catch {
      setAlertBanner({ type: "error", message: "Failed updating project status" });
    }
  };

  const handleDeleteConfirm = async (slug: string, isHard: boolean) => {
    try {
      const res = await fetch(`/api/admin/projects/${slug}${isHard ? "?hard=true" : ""}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAlertBanner({
          type: "success",
          message: isHard ? "Project deleted permanently" : "Project hidden successfully",
        });
        fetchProjects();
      }
    } catch {
      setAlertBanner({ type: "error", message: "Failed deleting project" });
    }
  };

  const totalVisible = projects.filter((p) => p.is_show).length;
  const totalHidden = projects.filter((p) => !p.is_show).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-3xl">
            Project Management
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Logged in as <span className="font-medium text-neutral-700 dark:text-neutral-300">{userEmail}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSyncGitHub}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 active:scale-95 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <span>{isSyncing ? "Syncing..." : "Sync from GitHub"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingProject(null);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-neutral-900 shadow-sm transition hover:bg-amber-300 active:scale-95"
          >
            <span>+ New Project</span>
          </button>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alertBanner && (
        <div
          className={`flex items-center justify-between rounded-xl p-3 text-sm ${
            alertBanner.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
              : "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300"
          }`}
        >
          <span>{alertBanner.message}</span>
          <button
            onClick={() => setAlertBanner(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-medium text-neutral-500">Total Projects</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {totalCount}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-medium text-neutral-500">Published</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {totalVisible}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-medium text-neutral-500">Hidden / Draft</p>
          <p className="mt-1 text-2xl font-bold text-neutral-500 dark:text-neutral-400">
            {totalHidden}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-medium text-neutral-500">Page</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {page} / {totalPages || 1}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search projects by title, description, or slug..."
            className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-amber-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as CategoryOption);
              setPage(1);
            }}
            className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-amber-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <ProjectTable
        projects={projects}
        isLoading={isLoading}
        onEdit={(p) => {
          setEditingProject(p);
          setIsFormOpen(true);
        }}
        onDelete={(p) => setDeleteProject(p)}
        onToggleVisibility={handleToggleVisibility}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 disabled:opacity-40 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            ← Previous
          </button>
          <span className="text-xs text-neutral-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 disabled:opacity-40 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Next →
          </button>
        </div>
      )}

      {/* Form Modal */}
      <ProjectFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProject(null);
        }}
        project={editingProject}
        onSaved={fetchProjects}
      />

      {/* Delete Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteProject)}
        project={deleteProject}
        onClose={() => setDeleteProject(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
