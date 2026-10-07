import { createClient } from "@/common/utils/server";

interface GetAchievementsDataProps {
  category?: string;
  search?: string;
}

interface EnumItem {
  enum_value: string;
}

export const getAchievementsData = async ({
  category,
  search,
}: GetAchievementsDataProps) => {
  try {
    const supabase = createClient();

    let query = supabase.from("achievements").select();

    if (category) query = query.eq("category", category);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query;

    if (error || !data) return [];

    return data.map((item) => {
      const { data: imageData } = supabase.storage
        .from("achievements")
        .getPublicUrl(`${item.slug}.webp`);

      return {
        ...item,
        image: imageData.publicUrl,
      };
    });
  } catch {
    return [];
  }
};

export const getAchivementTypes = async () => {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.rpc("get_enum_values", {
      type_name: "achievement_type",
    });

    if (error || !data) return ["Certificate", "Award", "Course"];

    return data.map((item: EnumItem) => item.enum_value);
  } catch {
    return ["Certificate", "Award", "Course"];
  }
};

export const getAchivementCategories = async () => {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.rpc("get_enum_values", {
      type_name: "achievement_category",
    });

    if (error || !data) return ["Tech", "Education", "Competition"];

    return data.map((item: EnumItem) => item.enum_value);
  } catch {
    return ["Tech", "Education", "Competition"];
  }
};
