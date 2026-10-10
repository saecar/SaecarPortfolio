import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import Container from "@/common/components/elements/Container";
import PageHeading from "@/common/components/elements/PageHeading";
import Projects from "@/modules/projects";
import { METADATA } from "@/common/constants/metadata";

import { getProjectsData } from "@/services/projects";

export const revalidate = 3600;
export const dynamic = "force-static";

interface ProjectsPageProps {
  params: { locale: string };
}

export async function generateMetadata({
  params: { locale },
}: ProjectsPageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "ProjectsPage" });

  return {
    title: `${t("title")} ${METADATA.exTitle}`,
    description: t("description"),
    keywords: "portfolio frontend developer, software engineer jambi",
    alternates: {
      canonical: `${process.env.DOMAIN}/${locale}/projects`,
    },
  };
}

const ProjectsPage = async ({ params: { locale } }: ProjectsPageProps) => {
  const t = await getTranslations({ locale, namespace: "ProjectsPage" });
  const projects = await getProjectsData();

  return (
    <Container data-aos="fade-up">
      <PageHeading title={t("title")} description={t("description")} />
      <Projects initialData={projects} />
    </Container>
  );
};

export default ProjectsPage;
