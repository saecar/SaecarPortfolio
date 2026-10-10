import { ProjectItem } from "@/common/types/projects";

export interface AdminProject extends ProjectItem {
  created_at?: string;
  updated_at?: string;
  last_synced_at?: string;
}

export type CategoryOption = "all" | "web" | "web-frontend" | "web-backend" | "web-fullstack" | "iot" | "game";

export interface ProjectFormData {
  title: string;
  slug: string;
  category: string;
  description: string;
  image: string;
  link_demo: string;
  link_github: string;
  stacks: string[];
  content: string;
  is_show: boolean;
  is_featured: boolean;
}
