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
    content: (project?.content && project.content.trim().length > 0) ? project.content : content?.content || null,
  };

  return JSON.parse(JSON.stringify(response));
});

export const generateMetadata = async ({
  params,
}: ProjectDetailPageProps): Promise<Metadata> => {
  const project = await getProjectDetail(params?.slug);
  const locale = params.locale || "en";
  const baseUrl = (process.env.DOMAIN || "https://satriabahari.my.id").replace(/\/+$/, "");

  if (!project || !project.title) {
    return {
      title: `Project Not Found ${METADATA.exTitle}`,
    };
  }

  const imageUrl = project.image?.startsWith("http")
    ? project.image
    : `${baseUrl}${project.image?.startsWith("/") ? "" : "/"}${project.image || "/images/me.png"}`;

  return {
    title: `${project.title} ${METADATA.exTitle}`,
    description: project.description,
    openGraph: {
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: project.title,
        },
      ],
      url: `${baseUrl}/${locale}/projects/${project.slug}`,
      siteName: METADATA.openGraph.siteName,
      locale: locale === "id" ? "id_ID" : "en_US",
      type: "article",
      authors: [METADATA.creator],
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.title} ${METADATA.exTitle}`,
      description: project.description,
      images: [imageUrl],
    },
    keywords: project.title,
    alternates: {
      canonical: `${baseUrl}/${locale}/projects/${params.slug}`,
    },
  };
};

const ProjectDetailPage = async ({ params }: ProjectDetailPageProps) => {
  const data = await getProjectDetail(params?.slug);

  if (!data || !data.title) {
    notFound();
  }

  const baseUrl = (process.env.DOMAIN || "https://satriabahari.my.id").replace(/\/+$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: data.title,
    description: data.description,
    applicationCategory: data.category || "WebApplication",
    operatingSystem: "Web",
    author: {
      "@type": "Person",
      name: METADATA.creator,
      url: baseUrl,
    },
    url: `${baseUrl}/${params.locale}/projects/${data.slug}`,
    image: data.image,
  };

  return (
    <Container data-aos="fade-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BackButton url="/projects" />
      <PageHeading title={data.title} description={data.description} />
      <ProjectDetail {...data} />
    </Container>
  );
};

export default ProjectDetailPage;
