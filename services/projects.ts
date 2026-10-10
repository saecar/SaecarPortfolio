import { unstable_cache } from "next/cache";
import { createClient } from "@/common/utils/server";

export const getProjectsData = unstable_cache(
  async () => {
    try {
      const supabase = createClient();

      let { data, error } = await supabase
        .from("projects")
        .select()
        .eq("is_show", true)
        .order("id", { ascending: false });

      if (error) {
        console.error("[Supabase] Error fetching projects:", error.message);
        return [];
      }
      if (!data) return [];

      return data.map((item) => {
        const { data: imageData } = supabase.storage
          .from("projects")
          .getPublicUrl(`${item.slug}.webp`);

        return {
          ...item,
          image: item.image || imageData?.publicUrl,
        };
      });
    } catch (err: any) {
      console.error("[Projects] Exception in getProjectsData:", err.message);
      return [];
    }
  },
  ["projects-list"],
  { revalidate: 3600, tags: ["projects"] }
);

export const getProjectsDataBySlug = unstable_cache(
  async (slug: string) => {
    try {
      const supabase = createClient();

      let { data, error } = await supabase
        .from("projects")
        .select()
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        console.error(`[Supabase] Error fetching project ${slug}:`, error.message);
        return null;
      }
      if (!data) return null;

      const { data: imageData } = supabase.storage
        .from("projects")
        .getPublicUrl(`${data.slug}.webp`);

      return {
        ...data,
        image: data.image || imageData?.publicUrl,
      };
    } catch (err: any) {
      console.error(`[Projects] Exception in getProjectsDataBySlug:`, err.message);
      return null;
    }
  },
  ["project-detail"],
  { revalidate: 3600, tags: ["projects"] }
);
