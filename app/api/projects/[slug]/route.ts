import { NextResponse } from "next/server";

import { getProjectsDataBySlug } from "@/services/projects";

export const dynamic = "force-dynamic";

export const GET = async (
  req: Request,
  { params }: { params: { slug: string } },
) => {
  try {
    const { slug } = params;
    const data = await getProjectsDataBySlug(slug);

    if (!data) {
      return NextResponse.json(
        { message: `Project with slug '${slug}' not found` },
        { status: 404 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 },
    );
  }
};
