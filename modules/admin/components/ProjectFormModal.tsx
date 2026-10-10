"use client";

import React, { useState, useEffect } from "react";
import { STACKS } from "@/common/constants/stacks";
import { AdminProject, ProjectFormData } from "../types";

const CATEGORIES = [
  "web",
  "web-frontend",
  "web-backend",
  "web-fullstack",
  "iot",
  "game",
];

const AVAILABLE_STACKS = Object.keys(STACKS);

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: AdminProject | null;
  onSaved: () => void;
}

export default function ProjectFormModal({
  isOpen,
  onClose,
  project,
  onSaved,
}: ProjectFormModalProps) {
  const isEditing = Boolean(project);

  const [formData, setFormData] = useState<ProjectFormData>({
    title: "",
    slug: "",
    category: "web",
    description: "",
    image: "",
    link_demo: "",
    link_github: "",
    stacks: [],
    content: "",
    is_show: true,
    is_featured: false,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || "",
        slug: project.slug || "",
        category: project.category || "web",
        description: project.description || "",
        image: project.image || "",
        link_demo: project.link_demo || "",
        link_github: project.link_github || "",
        stacks: project.stacks || [],
        content: project.content || "",
        is_show: project.is_show ?? true,
        is_featured: project.is_featured ?? false,
      });
    } else {
      setFormData({
        title: "",
        slug: "",
        category: "web",
        description: "",
        image: "",
        link_demo: "",
        link_github: "",
        stacks: [],
        content: "",
        is_show: true,
        is_featured: false,
      });
    }
    setErrorMsg("");
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    if (!isEditing) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setFormData((prev) => ({ ...prev, title, slug }));
    } else {
      setFormData((prev) => ({ ...prev, title }));
    }
  };

  const handleToggleStack = (stack: string) => {
    setFormData((prev) => {
      const exists = prev.stacks.includes(stack);
      return {
        ...prev,
        stacks: exists
          ? prev.stacks.filter((s) => s !== stack)
          : [...prev.stacks, stack],
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Image size exceeds 2MB limit");
      return;
    }

    setIsUploading(true);
    setErrorMsg("");
    try {
      const data = new FormData();
      data.append("file", file);
      if (formData.slug) data.append("slug", formData.slug);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: data,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed uploading image");
      }

      setFormData((prev) => ({ ...prev, image: json.data.url }));
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const url = isEditing
        ? `/api/admin/projects/${project?.slug}`
        : "/api/admin/projects";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed saving project");
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong saving the project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative my-8 w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4 dark:border-neutral-800">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {isEditing ? `Edit: ${project?.title}` : "Create New Project"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:bg-red-500/20 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Title & Slug */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={handleTitleChange}
                placeholder="e.g. Portfolio Website"
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-sm text-neutral-900 focus:border-amber-500 focus:outline-none dark:border-neutral-700 dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Slug *
              </label>
              <input
                type="text"
                required
                disabled={isEditing}
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))
                }
                placeholder="e.g. portfolio-website"
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-sm text-neutral-900 disabled:opacity-50 focus:border-amber-500 focus:outline-none dark:border-neutral-700 dark:text-neutral-100"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-amber-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Description *
            </label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Brief summary of the project..."
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-sm text-neutral-900 focus:border-amber-500 focus:outline-none dark:border-neutral-700 dark:text-neutral-100"
            />
          </div>

          {/* Image & Upload */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Image URL / Upload
            </label>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={formData.image}
                onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
                placeholder="https://... or upload file"
                className="flex-1 rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-sm text-neutral-900 focus:border-amber-500 focus:outline-none dark:border-neutral-700 dark:text-neutral-100"
              />
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-neutral-300 px-4 py-2 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
                <span>{isUploading ? "Uploading..." : "Upload File"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
            {formData.image && (
              <div className="mt-2 aspect-video w-36 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
                <img
                  src={formData.image}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Links */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Demo Link
              </label>
              <input
                type="url"
                value={formData.link_demo}
                onChange={(e) => setFormData((prev) => ({ ...prev, link_demo: e.target.value }))}
                placeholder="https://demo.example.com"
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-sm text-neutral-900 focus:border-amber-500 focus:outline-none dark:border-neutral-700 dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                GitHub Link
              </label>
              <input
                type="url"
                value={formData.link_github}
                onChange={(e) => setFormData((prev) => ({ ...prev, link_github: e.target.value }))}
                placeholder="https://github.com/..."
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-sm text-neutral-900 focus:border-amber-500 focus:outline-none dark:border-neutral-700 dark:text-neutral-100"
              />
            </div>
          </div>

          {/* Stacks Selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Tech Stacks ({formData.stacks.length} selected)
            </label>
            <div className="mt-2 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-neutral-200 p-2 dark:border-neutral-800">
              {AVAILABLE_STACKS.map((stack) => {
                const isSelected = formData.stacks.includes(stack);
                return (
                  <button
                    type="button"
                    key={stack}
                    onClick={() => handleToggleStack(stack)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      isSelected
                        ? "bg-amber-400 text-neutral-900 font-semibold"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                    }`}
                  >
                    {stack}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content (MDX) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Markdown / MDX Content
            </label>
            <textarea
              rows={4}
              value={formData.content}
              onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Detailed markdown overview or documentation..."
              className="mt-1 w-full font-mono text-xs rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-neutral-900 focus:border-amber-500 focus:outline-none dark:border-neutral-700 dark:text-neutral-100"
            />
          </div>

          {/* Switches: is_show & is_featured */}
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_show}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_show: e.target.checked }))}
                className="h-4 w-4 rounded border-neutral-300 text-amber-500 focus:ring-amber-400"
              />
              <span className="text-neutral-800 dark:text-neutral-200">Visible on site</span>
            </label>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_featured: e.target.checked }))}
                className="h-4 w-4 rounded border-neutral-300 text-amber-500 focus:ring-amber-400"
              />
              <span className="text-neutral-800 dark:text-neutral-200">Featured</span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-neutral-900 shadow-sm hover:bg-amber-300 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
