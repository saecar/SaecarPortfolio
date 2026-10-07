import { createClient } from "@/common/utils/server";
import { NextResponse } from "next/server";

export const GET = async () => {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.from("messages").select();
    if (error) {
      console.error("Supabase GET messages error:", error);
      return NextResponse.json([], { status: 200 });
    }
    return NextResponse.json(data || [], { status: 200 });
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
};

export const POST = async (req: Request) => {
  const supabase = createClient();
  try {
    const body = await req.json();
    const { error } = await supabase.from("messages").insert([body]);
    if (error) {
      console.error("Supabase insert message error:", error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json("Data saved successfully", { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 },
    );
  }
};