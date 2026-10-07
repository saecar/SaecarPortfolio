import { cache } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";

import BackButton from "@/common/components/elements/BackButton";
import Container from "@/common/components/elements/Container";
import PageHeading from "@/common/components/elements/PageHeading";
import ProjectDetail from "@/modules/projects/components/ProjectDetail";
import { ProjectItem } from "@/common/types/projects";
import { METADATA } from "@/common/constants/metadata";
import { getMdxBySlug, loadMdxFiles } from "@/common/libs/mdx";
import { getProjectsData, getProjectsDataBySlug } from "@/services/projects";
import { routing } from "@/i18n/routing";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const projects = await getProjectsData();
    const mdxList = loadMdxFiles();
    const slugSet = new Set<string>();

    projects.forEach((p) => p.slug && slugSet.add(p.slug));
    mdxList.forEach((m) => m.slug && slugSet.add(m.slug));

    return routing.locales.flatMap((locale) =>
      Array.from(slugSet).map((slug) => ({
        locale,
        slug,
      })),
    );
  } catch {
    return [];
  }
}

interface ProjectDetailPageProps {
  params: {
    slug: string;
    locale: string;
  };
}

const getProjectDetail = cache(async (slug: string): Promise<ProjectItem | null> => {
  const project = await getProjectsDataBySlug(slug);
  const content = getMdxBySlug(slug);

  if (!project && !content) {
    return null;
  }

  const response = {
    ...(project || {}),
    title: project?.title || content?.frontMatter?.title || slug,
    description: project?.description || content?.frontMatter?.description || "",
    slug,
    content: content?.content,
  };

  return JSON.parse(JSON.stringify(response));
});

export const generateMetadata = async ({
  params,
}: ProjectDetailPageProps): Promise<Metadata> => {
  const project = await getProjectDetail(params?.slug);
  const locale = params.locale || "en";

  if (!project || !project.title) {
    return {
      title: `Project Not Found ${METADATA.exTitle}`,
    };
  }

  return {
    title: `${project.title} ${METADATA.exTitle}`,
    description: project.description,
    openGraph: {
      images: project.image,
      url: `${METADATA.openGraph.url}/${project.slug}`,
      siteName: METADATA.openGraph.siteName,
      locale: locale === "id" ? "id_ID" : "en_US",
      type: "article",
      authors: [METADATA.creator],
    },
    keywords: project.title,
    alternates: {
      canonical: `${process.env.DOMAIN}/${locale}/projects/${params.slug}`,
    },
  };
};

const ProjectDetailPage = async ({ params }: ProjectDetailPageProps) => {
  const data = await getProjectDetail(params?.slug);

  if (!data || !data.title) {
    notFound();
  }

  return (
    <Container data-aos="fade-up">
      <BackButton url="/projects" />
      <PageHeading title={data.title} description={data.description} />
      <ProjectDetail {...data} />
    </Container>
  );
};

export default ProjectDetailPage;
